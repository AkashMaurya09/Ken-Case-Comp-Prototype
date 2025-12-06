
import React, { useState, useCallback, useEffect } from 'react';
import { RubricItem, QuestionPaper } from '../../types';
import { FileUpload } from '../../components/FileUpload';
import { RubricEditor } from './RubricEditor';
import { extractQuestionsFromPaper } from '../../services/geminiService';
import { Spinner } from '../../components/Spinner';
import { QuestionReviewModal } from './QuestionReviewModal';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';

type CreatePaperStep = 'upload_paper' | 'define_rubric';

interface CreateQuestionPaperProps {
    onPaperCreated: () => void;
    initialPaper?: QuestionPaper;
}

interface ExtractedQuestion {
    question: string;
    totalMarks: number;
    finalAnswer?: string;
    steps?: { description: string; marks: number }[];
    keywords?: { keyword: string; marks: number }[];
}

export const CreateQuestionPaper: React.FC<CreateQuestionPaperProps> = ({ onPaperCreated, initialPaper }) => {
    const { addQuestionPaper, updateQuestionPaper } = useAppContext();
    const toast = useToast();
    const [currentStep, setCurrentStep] = useState<CreatePaperStep>('upload_paper');
    const [paperTitle, setPaperTitle] = useState('');
    
    // Refactored state for better stability
    const [rubric, setRubric] = useState<RubricItem[]>([]);
    const [modelAnswerFile, setModelAnswerFile] = useState<{ file?: File; previewUrl: string } | null>(null);

    const [isExtracting, setIsExtracting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [qpuploadKey, setQpuploadKey] = useState(Date.now());
    
    // Updated state type to include finalAnswer and detailed grading
    const [extractedQuestionsForReview, setExtractedQuestionsForReview] = useState<ExtractedQuestion[] | null>(null);

    // Populate form if editing
    useEffect(() => {
        if (initialPaper) {
            console.log(`[CreateQuestionPaper] Initializing editing mode for paper: ${initialPaper.title}`);
            setPaperTitle(initialPaper.title);
            setRubric(initialPaper.rubric);
            setModelAnswerFile({ 
                file: initialPaper.modelAnswerFile, 
                previewUrl: initialPaper.modelAnswerPreviewUrl 
            });
            setCurrentStep('define_rubric');
        } else {
            // Reset if switching to create mode
            setPaperTitle('');
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
        if (!modelAnswerFile) {
            console.warn("[CreateQuestionPaper] Validation failed: Model answer missing");
            toast.error("Please upload a model answer sheet.");
            return;
        }
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
            modelAnswerFile: modelAnswerFile.file, // Might be undefined if editing and not changed, which matches optional type
            modelAnswerPreviewUrl: modelAnswerFile.previewUrl,
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
            <header>
                <h2 className="text-3xl font-bold text-gray-800">{initialPaper ? 'Edit Question Paper' : 'Create New Paper'}</h2>
                <p className="mt-2 text-gray-600">{initialPaper ? 'Update the details and rubric below.' : 'Follow the steps below to set up your paper and define the grading criteria.'}</p>
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
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Step 2: Define Rubric & Model Answer</h3>
                     
                     <div className="mb-6 space-y-4">
                        <div>
                           <label htmlFor="paperTitle" className="block text-sm font-medium text-gray-700 mb-1">
                                Paper Title
                                <span className="text-red-500 ml-1">*</span>
                           </label>
                           <input
                                type="text"
                                id="paperTitle"
                                value={paperTitle}
                                onChange={(e) => setPaperTitle(e.target.value)}
                                placeholder="e.g., Mid-Term Physics Exam"
                                className="p-2 border rounded-md w-full bg-white"
                           />
                        </div>
                        <FileUpload 
                            onFileUpload={handleModelAnswerUpload} 
                            label="Upload the ideal answer sheet (Image or PDF)" 
                            required 
                            acceptedTypes="image/*,application/pdf"
                            initialPreviewUrl={modelAnswerFile?.previewUrl}
                            initialFileType={modelAnswerFile?.file?.type}
                        />
                    </div>

                     <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-400">
                        <h4 className="font-semibold text-blue-800">Pro Tip!</h4>
                        <p className="text-sm text-blue-700">Use the extracted steps and keywords to ensure consistent grading. You can manually edit any AI suggestion below.</p>
                     </div>
                    <RubricEditor rubric={rubric} onRubricUpdate={setRubric} />
                    <div className="flex gap-4 mt-6">
                         {initialPaper && (
                            <button
                                onClick={() => onPaperCreated()} // Cancel edit
                                className="w-1/3 bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                         )}
                        <button 
                            onClick={handleSavePaper}
                            disabled={isSaving}
                            className="flex-grow bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 flex justify-center items-center gap-2"
                        >
                            {isSaving ? <Spinner size="sm" /> : null}
                            {isSaving ? 'Saving...' : (initialPaper ? 'Update Paper' : 'Save Paper & Make Available')}
                        </button>
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
