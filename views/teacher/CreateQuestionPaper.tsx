import React, { useState, useCallback } from 'react';
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
}

export const CreateQuestionPaper: React.FC<CreateQuestionPaperProps> = ({ onPaperCreated }) => {
    const { addQuestionPaper } = useAppContext();
    const toast = useToast();
    const [currentStep, setCurrentStep] = useState<CreatePaperStep>('upload_paper');
    const [paperTitle, setPaperTitle] = useState('');
    
    // Refactored state for better stability
    const [rubric, setRubric] = useState<RubricItem[]>([]);
    const [modelAnswerFile, setModelAnswerFile] = useState<{ file: File; previewUrl: string } | null>(null);

    const [isExtracting, setIsExtracting] = useState(false);
    const [qpuploadKey, setQpuploadKey] = useState(Date.now());
    const [extractedQuestionsForReview, setExtractedQuestionsForReview] = useState<{ question: string; totalMarks: number }[] | null>(null);

    const handleModelAnswerUpload = useCallback((file: File, previewUrl: string) => {
        setModelAnswerFile({ file, previewUrl });
    }, []);

    const handleQuestionPaperUpload = async (file: File) => {
        setIsExtracting(true);
        try {
            const extractedQuestions = await extractQuestionsFromPaper(file);
            setExtractedQuestionsForReview(extractedQuestions);
            setQpuploadKey(Date.now()); // Reset file input
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred during extraction.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleReviewComplete = (reviewedQuestions: { question: string; totalMarks: number }[]) => {
        const newRubricItems: RubricItem[] = reviewedQuestions.map(q => ({
            id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            question: q.question,
            totalMarks: q.totalMarks || 0,
            steps: [],
            keywords: [],
        }));
        setRubric(prev => [...prev, ...newRubricItems]);
        setExtractedQuestionsForReview(null); // Close modal
        setCurrentStep('define_rubric'); // Move to next step
    };

    const handleSavePaper = () => {
        if (!paperTitle.trim()) {
            toast.error("Please enter a title for the question paper.");
            return;
        }
        if (!modelAnswerFile) {
            toast.error("Please upload a model answer sheet.");
            return;
        }
        if (rubric.length === 0) {
            toast.error("Please define at least one question in the rubric.");
            return;
        }
        
        const newPaper: QuestionPaper = {
            id: `paper-${Date.now()}`,
            title: paperTitle,
            modelAnswerFile: modelAnswerFile.file,
            modelAnswerPreviewUrl: modelAnswerFile.previewUrl,
            rubric: rubric,
            createdAt: new Date()
        };

        addQuestionPaper(newPaper);
        onPaperCreated();
    };


    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-gray-800">Create New Paper</h2>
                <p className="mt-2 text-gray-600">Follow the steps below to set up your paper and define the grading criteria.</p>
            </header>
            
            {currentStep === 'upload_paper' && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold mb-2 text-gray-700">Step 1: Extract Questions</h3>
                    <p className="text-gray-600 mb-6">Start by uploading the question paper. The AI will automatically extract the questions and marks for you to review.</p>
                     <FileUpload key={qpuploadKey} onFileUpload={handleQuestionPaperUpload} label="Upload question paper image" />
                        {isExtracting && (
                            <div className="mt-4 text-center">
                                <Spinner text="AI is extracting questions, please wait..." />
                            </div>
                        )}
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
                        <FileUpload onFileUpload={handleModelAnswerUpload} label="Upload the ideal answer sheet as an image" required />
                    </div>

                     <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-400">
                        <h4 className="font-semibold text-blue-800">Pro Tip!</h4>
                        <p className="text-sm text-blue-700">You can add step-by-step marking criteria or specific keywords to make the AI grading even more accurate.</p>
                     </div>
                    <RubricEditor rubric={rubric} onRubricUpdate={setRubric} />
                    <button 
                        onClick={handleSavePaper}
                        className="w-full mt-6 bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                    >
                        Save Paper & Make Available to Students
                    </button>
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