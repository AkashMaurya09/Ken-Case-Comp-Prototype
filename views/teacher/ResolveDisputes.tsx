
import React from 'react';
import { useAppContext } from '../../context/AppContext';

interface ResolveDisputesProps {
    onReview?: (paperId: string, submissionId: string) => void;
}

export const ResolveDisputes: React.FC<ResolveDisputesProps> = ({ onReview }) => {
    const { questionPapers, studentSubmissions } = useAppContext();

    const allDisputedItems = studentSubmissions.flatMap(submission => {
        const paper = questionPapers.find(p => p.id === submission.paperId);
        if (!paper || !submission.gradedResults) return [];

        return submission.gradedResults
            .filter(result => result.disputed)
            .map(result => {
                const question = paper.rubric.find(q => q.id === result.questionId);
                return {
                    paperId: paper.id,
                    submissionId: submission.id,
                    paperTitle: paper.title,
                    studentName: submission.studentName,
                    questionText: question?.question || "Question not found",
                    feedback: result.feedback,
                    marksAwarded: result.marksAwarded,
                    totalMarks: question?.totalMarks || 0,
                    disputeReason: result.disputeReason || "No reason provided.",
                };
            });
    });

    const displayedDisputes = allDisputedItems.slice(0, 6);

    return (
        <div>
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Resolve Disputes</h2>
                    <p className="mt-2 text-gray-600">Review student-raised disputes and adjust grades if necessary.</p>
                </div>
                {allDisputedItems.length > 6 && (
                    <p className="text-sm text-gray-500 italic mb-1">Showing 6 of {allDisputedItems.length} active disputes</p>
                )}
            </div>
            
            <div className="mt-8">
                {displayedDisputes.length === 0 ? (
                    <div className="bg-white p-8 rounded-lg shadow-md text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-4 text-xl font-semibold text-gray-700">All Clear!</h3>
                        <p className="mt-2 text-gray-500">There are no pending disputes from students.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayedDisputes.map((item, index) => (
                            <div key={index} className="bg-white p-5 rounded-lg shadow-sm border border-yellow-300">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">{item.paperTitle}</p>
                                        <p className="text-lg font-semibold text-gray-800">{item.questionText}</p>
                                        <p className="text-sm text-gray-600 mt-1">Submitted by: <span className="font-semibold">{item.studentName}</span></p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-xl font-bold text-gray-800">{item.marksAwarded} / {item.totalMarks}</p>
                                        <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Disputed</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                     <blockquote className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                                        <p className="font-semibold">Student's Reason for Dispute:</p>
                                        <p className="italic">"{item.disputeReason}"</p>
                                     </blockquote>
                                     <p className="text-sm text-gray-600 mt-3"><span className="font-semibold">Original Feedback:</span> {item.feedback}</p>
                                     <div className="mt-4 text-right">
                                        <button 
                                            onClick={() => onReview && onReview(item.paperId, item.submissionId)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors"
                                        >
                                            Review Submission
                                        </button>
                                     </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
