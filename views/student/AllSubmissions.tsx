
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { StudentSubmission, QuestionPaper, GradingStatus } from '../../types';
import { RainbowButton } from '../../components/RainbowButton';

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
        if (!submission.gradedResults) return { awarded: 0, total: 0, percentage: 0, isGraded: false };
        const paper = getPaperDetails(submission.paperId);
        if (!paper) return { awarded: 0, total: 0, percentage: 0, isGraded: false };

        const awarded = submission.gradedResults.reduce((sum, r) => sum + r.marksAwarded, 0);
        const total = paper.rubric.reduce((sum, q) => sum + q.totalMarks, 0);
        const percentage = total > 0 ? Math.round((awarded / total) * 100) : 0;
        return { awarded, total, percentage, isGraded: true };
    };

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return "text-green-600";
        if (percentage >= 50) return "text-yellow-600";
        return "text-red-500";
    };

    return (
        <div>
            <header>
                <h2 className="text-3xl font-bold text-gray-800">My Submissions</h2>
                <p className="mt-2 text-gray-600">Track your progress and review feedback on your assignments.</p>
            </header>

            <div className="mt-8">
                {mySubmissions.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-dashed border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="text-xl font-bold text-gray-700">No Submissions Yet</h3>
                        <p className="mt-2 text-gray-500">You haven't submitted any answer sheets yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mySubmissions.sort((a,b) => b.submissionDate.getTime() - a.submissionDate.getTime()).map(sub => {
                            const paper = getPaperDetails(sub.paperId);
                            const { awarded, total, percentage, isGraded } = calculateScore(sub);
                            const isFailed = sub.gradingStatus === GradingStatus.ERROR;
                            
                            return (
                                <div key={sub.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
                                    <div className="p-5 flex-grow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-lg line-clamp-1" title={paper?.title}>{paper?.title || 'Unknown Paper'}</h3>
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    {sub.submissionDate.toLocaleDateString()}
                                                </p>
                                            </div>
                                            {isFailed ? (
                                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Grading Failed
                                                </span>
                                            ) : isGraded ? (
                                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    Graded
                                                </span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Pending
                                                </span>
                                            )}
                                        </div>

                                        <div className="py-4 border-t border-gray-100 border-b border-gray-100 mb-4 flex items-center justify-center min-h-[5rem]">
                                            {isFailed ? (
                                                <div className="text-center text-red-500">
                                                    <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    <p className="text-sm font-medium">Please retry grading</p>
                                                </div>
                                            ) : isGraded ? (
                                                <div className="text-center">
                                                    <span className={`text-4xl font-extrabold ${getScoreColor(percentage)}`}>{percentage}%</span>
                                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">Total Score</p>
                                                    <p className="text-sm text-gray-500 font-medium">{awarded} / {total} pts</p>
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-400">
                                                    <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l.477-2.387a2 2 0 00.547-1.806z" /></svg>
                                                    <p className="text-sm font-medium">Waiting for grading...</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-xs text-gray-500 flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                            <span>ID: {sub.id.substring(0, 8)}...</span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(sub.previewUrl, '_blank');
                                                }}
                                                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 hover:underline"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                View Paper
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <RainbowButton
                                        onClick={() => onViewResults(sub)}
                                        className="w-full h-10 text-sm"
                                    >
                                        {isFailed ? 'View Error / Retry' : isGraded ? 'View Detailed Results' : 'Check Status / Grade Instantly'}
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </RainbowButton>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
