import { QuestionPaper, StudentSubmission, RubricItem, GradedResult, GradingStatus } from '../types';

const DB_NAME = 'CheckdAIDB';
const DB_VERSION = 1;
const STORE_PAPERS = 'questionPapers';
const STORE_SUBMISSIONS = 'submissions';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_PAPERS)) {
                db.createObjectStore(STORE_PAPERS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_SUBMISSIONS)) {
                db.createObjectStore(STORE_SUBMISSIONS, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

// --- Types for Stored Data (Separating Blob from URL) ---
interface StoredPaper {
    id: string;
    title: string;
    subject?: string;
    description?: string;
    rubric: RubricItem[];
    createdAt: Date;
    modelAnswerBlob?: Blob; // Store binary
    fileType?: string;
    gradingInstructions?: string;
}

interface StoredSubmission {
    id: string;
    paperId: string;
    studentName: string;
    submissionDate: Date;
    fileBlob?: Blob; // Store binary
    fileType?: string;
    gradedResults?: GradedResult[];
    isGrading: boolean;
    uploadMethod?: 'Individual Upload' | 'Bulk Import';
    gradingDuration?: number;
    gradingStatus?: GradingStatus;
}

export const LocalDB = {
    async saveQuestionPaper(paper: QuestionPaper, fileBlob?: Blob): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PAPERS], 'readwrite');
            const store = transaction.objectStore(STORE_PAPERS);

            const storedData: StoredPaper = {
                id: paper.id,
                title: paper.title,
                subject: paper.subject,
                description: paper.description,
                rubric: paper.rubric,
                createdAt: paper.createdAt || new Date(),
                modelAnswerBlob: fileBlob, // Save the blob!
                fileType: paper.modelAnswerFile?.type,
                gradingInstructions: paper.gradingInstructions
            };

            const request = store.put(storedData);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getAllQuestionPapers(): Promise<QuestionPaper[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PAPERS], 'readonly');
            const store = transaction.objectStore(STORE_PAPERS);
            const request = store.getAll();

            request.onsuccess = () => {
                const storedPapers = request.result as StoredPaper[];
                const papers: QuestionPaper[] = storedPapers.map(p => {
                    // Recreate URL from Blob for UI
                    let previewUrl = '';
                    if (p.modelAnswerBlob) {
                        previewUrl = URL.createObjectURL(p.modelAnswerBlob);
                    } else {
                        // Fallback/Optional
                        previewUrl = ''; 
                    }

                    // Reconstruct File object if blob exists and type is known
                    let modelAnswerFile: File | undefined;
                    if (p.modelAnswerBlob && p.fileType) {
                        modelAnswerFile = new File([p.modelAnswerBlob], "model-answer", { type: p.fileType });
                    } else if (p.modelAnswerBlob) {
                         modelAnswerFile = p.modelAnswerBlob as File;
                    }

                    return {
                        id: p.id,
                        title: p.title,
                        subject: p.subject,
                        description: p.description,
                        rubric: p.rubric,
                        createdAt: p.createdAt,
                        modelAnswerPreviewUrl: previewUrl,
                        modelAnswerFile: modelAnswerFile,
                        gradingInstructions: p.gradingInstructions
                    };
                });
                // Sort by desc date
                papers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                resolve(papers);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async deleteQuestionPaper(id: string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PAPERS], 'readwrite');
            const store = transaction.objectStore(STORE_PAPERS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async saveSubmission(submission: StudentSubmission, fileBlob?: Blob): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_SUBMISSIONS], 'readwrite');
            const store = transaction.objectStore(STORE_SUBMISSIONS);

            // Check if existing to preserve blob if not provided
            const getReq = store.get(submission.id);
            getReq.onsuccess = () => {
                const existing = getReq.result as StoredSubmission | undefined;
                
                const storedData: StoredSubmission = {
                    id: submission.id,
                    paperId: submission.paperId,
                    studentName: submission.studentName,
                    submissionDate: submission.submissionDate || new Date(),
                    fileBlob: fileBlob || existing?.fileBlob, // Use new blob or keep old
                    fileType: submission.file?.type || existing?.fileType,
                    gradedResults: submission.gradedResults,
                    isGrading: submission.isGrading,
                    uploadMethod: submission.uploadMethod,
                    gradingDuration: submission.gradingDuration,
                    gradingStatus: submission.gradingStatus
                };

                const putReq = store.put(storedData);
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    async getAllSubmissions(): Promise<StudentSubmission[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_SUBMISSIONS], 'readonly');
            const store = transaction.objectStore(STORE_SUBMISSIONS);
            const request = store.getAll();

            request.onsuccess = () => {
                const storedSubmissions = request.result as StoredSubmission[];
                const submissions: StudentSubmission[] = storedSubmissions.map(s => {
                    let previewUrl = '';
                    if (s.fileBlob) {
                        previewUrl = URL.createObjectURL(s.fileBlob);
                    } else {
                         previewUrl = 'https://placehold.co/600x800/e2e8f0/1e293b?text=External+Doc';
                    }

                    let file: File | undefined;
                    if (s.fileBlob && s.fileType) {
                        file = new File([s.fileBlob], "submission", { type: s.fileType });
                    } else if (s.fileBlob) {
                        file = s.fileBlob as File;
                    }

                    return {
                        id: s.id,
                        paperId: s.paperId,
                        studentName: s.studentName,
                        submissionDate: s.submissionDate,
                        previewUrl: previewUrl,
                        file: file,
                        gradedResults: s.gradedResults,
                        isGrading: s.isGrading,
                        uploadMethod: s.uploadMethod,
                        gradingDuration: s.gradingDuration,
                        gradingStatus: s.gradingStatus
                    };
                });
                submissions.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
                resolve(submissions);
            };
            request.onerror = () => reject(request.error);
        });
    }
};