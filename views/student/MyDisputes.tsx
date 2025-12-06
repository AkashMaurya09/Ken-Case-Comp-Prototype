import React from 'react';
import { useAppContext } from '../../context/AppContext';

const MOCK_STUDENT_NAME = "Jane Doe";

export const MyDisputes: React.FC = () => {
    const { questionPapers, studentSubmissions } = useAppContext();

    const disputedItems = studentSubmissions.flatMap(submission => {
        if (submission.studentName !== MOCK_STUDENT_NAME) return [];

        const paper = questionPapers.find(p => p.id === submission.paperId);
        if (!paper || !submission.gradedResults) return [];

        return submission.gradedResults
            .filter(result => result.disputed)
            .map(result => {
                const question = paper.rubric.find(q => q.id === result.questionId);
                return {
                    submissionId: submission.id,
                    paperTitle: paper.title,
                    questionText: question?.question || "Question not found",
                    disputeReason: result.disputeReason || "No reason provided.",
                    status: "Pending Teacher Review" // Mock status
                };
            });
    });

    return (
        <div>
            <header>
                <h2 className="text-3xl font-bold text-gray-800">My Disputes</h2>
                <p className="mt-2 text-gray-600">Track the status of your grade reviews here.</p>
            </header>
            
            <div className="mt-8">
                {disputedItems.length === 0 ? (
                    <div className="bg-white p-8 rounded-lg shadow-md text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-4 text-xl font-semibold text-gray-700">No Pending Disputes</h3>
                        <p className="mt-2 text-gray-500">You have not raised any disputes on your graded submissions.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {disputedItems.map((item, index) => (
                            <div key={index} className="bg-white p-5 rounded-lg shadow-sm border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">{item.paperTitle}</p>
                                        <p className="text-lg font-semibold text-gray-800">{item.questionText}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                         <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">{item.status}</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                     <blockquote className="mt-2 p-3 bg-gray-50 border-l-4 border-gray-300 text-gray-800">
                                        <p className="font-semibold">Your Reason for Dispute:</p>
                                        <p className="italic">"{item.disputeReason}"</p>
                                     </blockquote>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
