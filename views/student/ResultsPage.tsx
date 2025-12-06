import React from 'react';
import { StudentSubmission, QuestionPaper } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface ResultsPageProps {
    submission: StudentSubmission;
    questionPaper: QuestionPaper;
    onDispute: (questionId: string, reason: string) => void; // This prop is kept for structure, but logic is context-driven
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ submission, questionPaper }) => {
    const { updateSubmission } = useAppContext();
    const { gradedResults } = submission;

    const handleDisputeClick = (questionId: string) => {
        const reason = prompt("Please provide a brief reason for your dispute:");
        if (reason && reason.trim()) {
            if (submission.gradedResults) {
                const updatedResults = submission.gradedResults.map(r =>
                    r.questionId === questionId ? { ...r, disputed: true, disputeReason: reason.trim() } : r
                );
                updateSubmission({ ...submission, gradedResults: updatedResults });
            }
        } else if (reason !== null) {
            alert("A reason is required to raise a dispute.");
        }
    };

    if (!gradedResults) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <h3 className="text-2xl font-bold text-gray-800">Submission Received!</h3>
                <p className="mt-2 text-gray-600">Your answer sheet for <span className="font-semibold">{questionPaper.title}</span> has been submitted successfully.</p>
                <p className="mt-1 text-gray-600">Your teacher will grade it soon. Please check back later for your results.</p>
                 <div className="mt-8">
                    <h4 className="text-xl font-semibold text-gray-700 mb-4">Your Submission</h4>
                    <img src={submission.previewUrl} alt="Your answer sheet" className="rounded-lg border shadow-sm w-full max-w-2xl mx-auto" />
                </div>
            </div>
        );
    }

    const totalAwarded = gradedResults.reduce((sum, result) => sum + result.marksAwarded, 0);
    const totalPossible = questionPaper.rubric.reduce((sum, item) => sum + item.totalMarks, 0);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold text-gray-800">Your Graded Results for <span className="text-blue-600">{questionPaper.title}</span></h3>
            <div className="my-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                <p className="text-lg font-medium text-gray-700">Total Score</p>
                <p className="text-3xl font-bold text-blue-600">{totalAwarded} / {totalPossible}</p>
            </div>
            
            <div className="mt-6">
                <h4 className="text-xl font-semibold text-gray-700 mb-4">Detailed Breakdown</h4>
                <div className="space-y-4">
                    {gradedResults.map((result, index) => {
                        const question = questionPaper.rubric.find(q => q.id === result.questionId);
                        return (
                            <div key={index} className={`p-4 rounded-lg border ${result.disputed ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{index + 1}. {question?.question}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg">{result.marksAwarded} / {question?.totalMarks}</p>
                                    </div>
                                </div>
                                <div className="mt-3 text-sm space-y-2">
                                    <p><strong className="text-gray-600">AI Feedback:</strong> <span className="text-gray-700">{result.feedback}</span></p>
                                    <div>
                                        <strong className="text-gray-600">Improvement Suggestions:</strong>
                                        <ul className="list-disc list-inside pl-2 text-gray-700">
                                            {result.improvementSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                </div>
                                <div className="mt-4 text-right">
                                    {result.disputed ? (
                                        <span className="text-sm font-medium text-yellow-700">Dispute sent for review</span>
                                    ) : (
                                        <button 
                                            onClick={() => handleDisputeClick(result.questionId)}
                                            className="text-sm bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                                        >
                                            Raise Dispute
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-8">
                 <h4 className="text-xl font-semibold text-gray-700 mb-4">Your Submission</h4>
                 <img src={submission.previewUrl} alt="Your answer sheet" className="rounded-lg border shadow-sm w-full max-w-2xl mx-auto" />
            </div>
        </div>
    );
};
