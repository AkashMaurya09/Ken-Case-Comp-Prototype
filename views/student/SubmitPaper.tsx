
import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { QuestionPaper, StudentSubmission } from '../../types';
import { FileUpload } from '../../components/FileUpload';

// In a real app, this would come from authentication
const MOCK_STUDENT_NAME = "Jane Doe"; 

interface SubmitPaperProps {
    onSubmissionComplete?: () => void;
}

export const SubmitPaper: React.FC<SubmitPaperProps> = ({ onSubmissionComplete }) => {
    const { questionPapers, studentSubmissions, addStudentSubmission } = useAppContext();
    const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);

    const submittedPaperIds = useMemo(() => {
        return new Set(studentSubmissions
            .filter(s => s.studentName === MOCK_STUDENT_NAME)
            .map(s => s.paperId)
        );
    }, [studentSubmissions]);

    const availablePapers = useMemo(() => {
        return questionPapers.filter(p => !submittedPaperIds.has(p.id));
    }, [questionPapers, submittedPaperIds]);

    const handleFileUpload = useCallback((file: File, previewUrl: string) => {
        if (!selectedPaper) return;

        const newSubmission: StudentSubmission = {
            id: `stud-${Date.now()}`,
            paperId: selectedPaper.id,
            studentName: MOCK_STUDENT_NAME,
            file,
            previewUrl,
            submissionDate: new Date(),
            isGrading: false,
        };
        addStudentSubmission(newSubmission);
        setSelectedPaper(null); // Reset after submission
        if (onSubmissionComplete) {
            onSubmissionComplete();
        }
    }, [selectedPaper, addStudentSubmission, onSubmissionComplete]);

    if (selectedPaper) {
        return (
             <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
                <button onClick={() => setSelectedPaper(null)} className="text-sm text-blue-600 hover:underline mb-4">&larr; Back to all papers</button>
                <h3 className="text-xl font-semibold mb-2 text-gray-700">Submit for: {selectedPaper.title}</h3>
                <p className="text-gray-600 mb-6">Please upload a clear image or PDF of your completed answer sheet to receive your grade and feedback.</p>
                <FileUpload 
                    onFileUpload={handleFileUpload} 
                    label="Upload your answer sheet (Image or PDF)" 
                    acceptedTypes="image/*,application/pdf"
                />
            </div>
        )
    }

    return (
        <div>
            <header>
                <h2 className="text-3xl font-bold text-gray-800">Submit a New Paper</h2>
                <p className="mt-2 text-gray-600">Select an available question paper to upload your answer sheet.</p>
            </header>
            <div className="mt-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Available Question Papers</h3>
                    {availablePapers.length === 0 ? (
                        <p className="text-gray-600">You have submitted all available papers. Great job!</p>
                    ) : (
                        <ul className="space-y-3">
                            {availablePapers.map(paper => (
                                <li key={paper.id}>
                                    <button 
                                        onClick={() => setSelectedPaper(paper)}
                                        className="w-full text-left p-4 rounded-md bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-colors"
                                    >
                                        <p className="font-semibold text-gray-800">{paper.title}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
