
import React, { useState, useCallback, useEffect } from 'react';
import { RubricItem, QuestionPaper } from '../../types';
import { FileUpload } from '../../components/FileUpload';
import { RubricEditor } from './RubricEditor';
import { extractQuestionsFromPaper } from '../../services/geminiService';
import { Spinner } from '../../components/Spinner';
import { QuestionReviewModal } from './QuestionReviewModal';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { RainbowButton } from '../../components/RainbowButton';

type CreatePaperStep = 'upload_paper' | 'define_rubric';

interface CreateQuestionPaperProps {
    onPaperCreated: () => void;
    initialPaper?: QuestionPaper;
    onBack?: () => void;
}

interface ExtractedQuestion {
    question: string;
    totalMarks: number;
    finalAnswer?: string;
    steps?: { description: string; marks: number }[];
    keywords?: { keyword: string; marks: number }[];
}

export const CreateQuestionPaper: React.FC<CreateQuestionPaperProps> = ({ onPaperCreated, initialPaper, onBack }) => {
    const { addQuestionPaper, updateQuestionPaper } = useAppContext();
    const toast = useToast();
    const [currentStep, setCurrentStep] = useState<CreatePaperStep>('upload_paper');
    
    // Paper Details State
    const [paperTitle, setPaperTitle] = useState('');
    const [paperSubject, setPaperSubject] = useState('');
    const [paperDescription, setPaperDescription] = useState('');

    const [rubric, setRubric] = useState<RubricItem[]>([]);
    const [modelAnswerFile, setModelAnswerFile] = useState<{ file?: File; previewUrl: string } | null>(null);

    const [isExtracting, setIsExtracting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [qpuploadKey, setQpuploadKey] = useState(Date.now());
    
    const [extractedQuestionsForReview, setExtractedQuestionsForReview] = useState<ExtractedQuestion[] | null>(null);

    // Populate form if editing
    useEffect(() => {
        if (initialPaper) {
            console.log(`[CreateQuestionPaper] Initializing editing mode for paper: ${initialPaper.title}`);
            setPaperTitle(initialPaper.title);
            setPaperSubject(initialPaper.subject || '');
            setPaperDescription(initialPaper.description || '');
            setRubric(initialPaper.rubric);
            if (initialPaper.modelAnswerPreviewUrl) {
                setModelAnswerFile({ 
                    file: initialPaper.modelAnswerFile, 
                    previewUrl: initialPaper.modelAnswerPreviewUrl 
                });
            }
            setCurrentStep('define_rubric');
        } else {
            // Reset if switching to create mode
            setPaperTitle('');
            setPaperSubject('');
            setPaperDescription('');
            setRubric([]);
            setModelAnswerFile(null);
            setCurrentStep('upload_paper');
        }
    }, [initialPaper]);

    const handleModelAnswerUpload = useCallback((file: File, previewUrl: string) => {
        console.log(`[CreateQuestionPaper] Model answer uploaded: ${file.name}`);
        setModelAnswerFile({ file, previewUrl });
    }, []);

    const handleQuestionPaperUpload = async (file: File) => {
        console.log(`[CreateQuestionPaper] Question paper upload started: ${file.name}`);
        setIsExtracting(true);
        try {
            const extractedQuestions = await extractQuestionsFromPaper(file);
            console.log(`[CreateQuestionPaper] Questions extracted: ${extractedQuestions.length}`);
            setExtractedQuestionsForReview(extractedQuestions);
            setQpuploadKey(Date.now()); // Reset file input
        } catch (error) {
            console.error(`[CreateQuestionPaper] Extraction failed:`, error);
            toast.error(error instanceof Error ? error.message : "An unknown error occurred during extraction.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleReviewComplete = (reviewedQuestions: ExtractedQuestion[]) => {
        console.log(`[CreateQuestionPaper] Review complete. Adding ${reviewedQuestions.length} questions to rubric.`);
        const newRubricItems: RubricItem[] = reviewedQuestions.map(q => ({
            id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            question: q.question,
            totalMarks: q.totalMarks || 0,
            finalAnswer: q.finalAnswer || '', // Map extracted answer to RubricItem
            steps: q.steps || [],
            keywords: q.keywords || [],
        }));
        setRubric(prev => [...prev, ...newRubricItems]);
        setExtractedQuestionsForReview(null); // Close modal
        setCurrentStep('define_rubric'); // Move to next step
    };

    const handleSavePaper = async () => {
        console.log("[CreateQuestionPaper] handleSavePaper: Save requested.");

        // Validation
        if (!paperTitle.trim()) {
            console.warn("[CreateQuestionPaper] Validation failed: Title missing");
            toast.error("Please enter a title for the question paper.");
            return;
        }
        
        // Model answer is now optional
        
        if (rubric.length === 0) {
            console.warn("[CreateQuestionPaper] Validation failed: Rubric empty");
            toast.error("Please define at least one question in the rubric.");
            return;
        }

        setIsSaving(true);
        console.log("[CreateQuestionPaper] Validation passed. Preparing payload...");
        
        const newPaper: QuestionPaper = {
            id: initialPaper ? initialPaper.id : `paper-${Date.now()}`,
            title: paperTitle,
            subject: paperSubject,
            description: paperDescription,
            modelAnswerFile: modelAnswerFile?.file, 
            modelAnswerPreviewUrl: modelAnswerFile?.previewUrl || '',
            rubric: rubric,
            createdAt: initialPaper ? initialPaper.createdAt : new Date()
        };

        try {
            if (initialPaper) {
                console.log("[CreateQuestionPaper] Calling updateQuestionPaper...");
                await updateQuestionPaper(newPaper);
            } else {
                console.log("[CreateQuestionPaper] Calling addQuestionPaper...");
                await addQuestionPaper(newPaper);
            }
            console.log("[CreateQuestionPaper] Save operation completed successfully.");
            onPaperCreated();
        } catch (error) {
            console.error("[CreateQuestionPaper] Failed to save paper:", error);
            // Toast is handled in context, but we keep the user on the page to retry
        } finally {
            setIsSaving(false);
            console.log("[CreateQuestionPaper] handleSavePaper finished.");
        }
    };


    return (
        <div className="space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        {onBack && (
                            <button 
                                onClick={onBack}
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                                &larr; Back to All Papers
                            </button>
                        )}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800">{initialPaper ? 'Edit Question Paper' : 'Create New Paper'}</h2>
                    <p className="mt-2 text-gray-600">{initialPaper ? 'Update the details and rubric below.' : 'Follow the steps below to set up your paper and define the grading criteria.'}</p>
                </div>
            </header>
            
            {currentStep === 'upload_paper' && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold mb-2 text-gray-700">Step 1: Extract Questions</h3>
                    <p className="text-gray-600 mb-6">Start by uploading the question paper (or answer key). The AI will automatically extract questions, marks, expected answers (including tables), and even suggest a marking scheme.</p>
                     <FileUpload 
                        key={qpuploadKey} 
                        onFileUpload={handleQuestionPaperUpload} 
                        label="Upload question paper (Image or PDF)" 
                        acceptedTypes="image/*,application/pdf"
                     />
                        {isExtracting && (
                            <div className="mt-4 text-center">
                                <Spinner text="AI is extracting content and generating marking schemes, please wait..." />
                            </div>
                        )}
                        <div className="mt-6 border-t pt-4 text-center">
                            <button onClick={() => setCurrentStep('define_rubric')} className="text-blue-600 hover:underline text-sm">Skip extraction and create manually</button>
                        </div>
                </div>
            )}

            {currentStep === 'define_rubric' && (
                 <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Step 2: Paper Details & Rubric</h3>
                     
                     <div className="mb-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label htmlFor="paperTitle" className="block text-sm font-medium text-gray-700 mb-1">
                                        Paper Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                        type="text"
                                        id="paperTitle"
                                        value={paperTitle}
                                        onChange={(e) => setPaperTitle(e.target.value)}
                                        placeholder="e.g., Mid-Term Physics Exam"
                                        className="p-2 border rounded-md w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="paperSubject" className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject (Optional)
                                </label>
                                <input
                                        type="text"
                                        id="paperSubject"
                                        value={paperSubject}
                                        onChange={(e) => setPaperSubject(e.target.value)}
                                        placeholder="e.g., Physics, History, Math"
                                        className="p-2 border rounded-md w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="paperDescription" className="block text-sm font-medium text-gray-700 mb-1">
                                    Instructions / Description (Optional)
                            </label>
                            <textarea
                                    id="paperDescription"
                                    value={paperDescription}
                                    onChange={(e) => setPaperDescription(e.target.value)}
                                    placeholder="Enter any instructions for students or details about the exam..."
                                    className="p-2 border rounded-md w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                            />
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <FileUpload 
                                onFileUpload={handleModelAnswerUpload} 
                                label="Upload Model Answer Sheet (Optional)" 
                                required={false} 
                                acceptedTypes="image/*,application/pdf"
                                initialPreviewUrl={modelAnswerFile?.previewUrl}
                                initialFileType={modelAnswerFile?.file?.type}
                            />
                            <p className="text-xs text-gray-500 mt-1">Uploading a model answer helps the AI grade with higher accuracy, but you can also just use the rubric text.</p>
                        </div>
                    </div>

                     <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-400">
                        <h4 className="font-semibold text-blue-800">Rubric</h4>
                        <p className="text-sm text-blue-700">Define the questions and grading criteria below. Step-wise marking and keywords help the AI grade accurately.</p>
                     </div>
                    <RubricEditor rubric={rubric} onRubricUpdate={setRubric} />
                    <div className="flex gap-4 mt-6">
                         <div className="flex-grow">
                             <RainbowButton 
                                onClick={handleSavePaper}
                                disabled={isSaving}
                                className="w-full"
                             >
                                {isSaving ? <Spinner size="sm" /> : null}
                                {isSaving ? 'Saving...' : (initialPaper ? 'Update Paper' : 'Save Paper & Make Available')}
                            </RainbowButton>
                         </div>
                    </div>
                </div>
            )}

            {extractedQuestionsForReview && (
                <QuestionReviewModal
                    initialQuestions={extractedQuestionsForReview}
                    onClose={() => setExtractedQuestionsForReview(null)}
                    onConfirm={handleReviewComplete}
                />
            )}
        </div>
    );
};
