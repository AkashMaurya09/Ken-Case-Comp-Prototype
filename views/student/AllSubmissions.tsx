import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { StudentSubmission, QuestionPaper } from '../../types';

interface AllSubmissionsProps {
    onViewResults: (submission: StudentSubmission) => void;
}

const MOCK_STUDENT_NAME = "Jane Doe";

export const AllSubmissions: React.FC<AllSubmissionsProps> = ({ onViewResults }) => {
    const { studentSubmissions, questionPapers } = useAppContext();

    const mySubmissions = studentSubmissions.filter(s => s.studentName === MOCK_STUDENT_NAME);

    const getPaperDetails = (paperId: string): QuestionPaper | undefined => {
        return questionPapers.find(p => p.id === paperId);
    };

    const calculateScore = (submission: StudentSubmission) => {
        if (!submission.gradedResults) return { awarded: 0, total: 0, isGraded: false };
        const paper = getPaperDetails(submission.paperId);
        if (!paper) return { awarded: 0, total: 0, isGraded: false };

        const awarded = submission.gradedResults.reduce((sum, r) => sum + r.marksAwarded, 0);
        const total = paper.rubric.reduce((sum, q) => sum + q.totalMarks, 0);
        return { awarded, total, isGraded: true };
    };

    return (
        <div>
            <header>
                <h2 className="text-3xl font-bold text-gray-800">My Submissions</h2>
                <p className="mt-2 text-gray-600">Here is a history of all your submitted papers and their results.</p>
            </header>

             <div className="mt-8">
                {mySubmissions.length === 0 ? (
                    <div className="bg-white p-8 rounded-lg shadow-md text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="mt-4 text-xl font-semibold text-gray-700">No Submissions Yet</h3>
                        <p className="mt-2 text-gray-500">Go to the "Submit Paper" tab to upload your first answer sheet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {mySubmissions.sort((a,b) => b.submissionDate.getTime() - a.submissionDate.getTime()).map(sub => {
                            const paper = getPaperDetails(sub.paperId);
                            const { awarded, total, isGraded } = calculateScore(sub);
                            return (
                                <div key={sub.id} className="bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">{paper?.title || 'Unknown Paper'}</h3>
                                        <p className="text-sm text-gray-600">Submitted on: {sub.submissionDate.toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        {isGraded ? (
                                            <div className="text-center sm:text-right">
                                                <p className="font-bold text-lg text-blue-600">{awarded} / {total}</p>
                                                <p className="text-xs text-gray-500">Score</p>
                                            </div>
                                        ) : (
                                            <div className="text-center sm:text-right">
                                                <p className="font-semibold text-lg text-gray-500">Pending</p>
                                                <p className="text-xs text-gray-500">Grading</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => onViewResults(sub)}
                                            disabled={!isGraded}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            View Results
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
