
import React, { useState, useEffect } from 'react';
import { StudentSubmission, QuestionPaper } from '../../types';
import { Spinner } from '../../components/Spinner';

interface GradingInterfaceProps {
    submissions: StudentSubmission[];
    paper: QuestionPaper;
    initialSubmissionId?: string;
    onGradeSubmission: (submissionId: string) => void;
    onGradeOverride: (submissionId: string, questionId: string, newMarks: number, comment?: string) => void;
}

export const GradingInterface: React.FC<GradingInterfaceProps> = ({ submissions, paper, initialSubmissionId, onGradeSubmission, onGradeOverride }) => {
    const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
    
    // State to manage override input values
    const [overrideMarks, setOverrideMarks] = useState<Record<string, string>>({});
    // State to manage resolution comments
    const [resolutionComments, setResolutionComments] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialSubmissionId && submissions.some(s => s.id === initialSubmissionId)) {
            setActiveSubmissionId(initialSubmissionId);
        } else if (!activeSubmissionId && submissions.length > 0) {
             setActiveSubmissionId(submissions[0].id);
        }
    }, [initialSubmissionId, submissions, activeSubmissionId]);

    const activeSubmission = submissions.find(s => s.id === activeSubmissionId);
    
    // Populate override marks when active submission changes or results are loaded
    useEffect(() => {
        if (activeSubmission?.gradedResults) {
            const initialMarks = activeSubmission.gradedResults.reduce((acc, result) => {
                acc[result.questionId] = result.marksAwarded.toString();
                return acc;
            }, {} as Record<string, string>);
            setOverrideMarks(initialMarks);
            setResolutionComments({}); // Reset comments
        } else {
            setOverrideMarks({}); 
            setResolutionComments({});
        }
    }, [activeSubmission]);

    const handleMarksChange = (questionId: string, value: string) => {
        setOverrideMarks(prev => ({ ...prev, [questionId]: value }));
    };
    
    const handleCommentChange = (questionId: string, value: string) => {
        setResolutionComments(prev => ({ ...prev, [questionId]: value }));
    };

    const handleOverrideClick = (questionId: string) => {
        if (!activeSubmission) return;

        const question = paper.rubric.find(q => q.id === questionId);
        if (!question) return;

        const newMarksRaw = parseInt(overrideMarks[questionId], 10);
        
        if (isNaN(newMarksRaw)) return;

        const clampedMarks = Math.max(0, Math.min(newMarksRaw, question.totalMarks));
        
        if (clampedMarks.toString() !== overrideMarks[questionId]) {
            handleMarksChange(questionId, clampedMarks.toString());
        }

        const comment = resolutionComments[questionId];
        onGradeOverride(activeSubmission.id, questionId, clampedMarks, comment);
    };

    const getTotalMarks = (submission: StudentSubmission) => {
        const awarded = submission.gradedResults?.reduce((acc, r) => acc + r.marksAwarded, 0) || 0;
        const total = paper.rubric.reduce((acc, r) => acc + r.totalMarks, 0);
        return { awarded, total };
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Grade Submissions</h3>
            {submissions.length === 0 ? (
                 <div className="text-center py-10 text-gray-500">
                    <p>No student submissions yet for this paper.</p>
                    <p className="text-sm">Upload a student's answer sheet to begin grading.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Submissions List */}
                    <div className="col-span-1 border-r pr-4">
                        <h4 className="font-bold mb-2">Student List</h4>
                        <ul className="space-y-2">
                            {submissions.map(sub => {
                                const {awarded, total} = getTotalMarks(sub);
                                return (
                                    <li key={sub.id}>
                                        <button 
                                            onClick={() => setActiveSubmissionId(sub.id)}
                                            className={`w-full text-left p-3 rounded-md transition-colors ${activeSubmissionId === sub.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                                        >
                                            <p className="font-semibold">{sub.studentName}</p>
                                            <p className="text-sm text-gray-600">
                                                {sub.gradedResults ? `Score: ${awarded}/${total}` : 'Not Graded'}
                                            </p>
                                            {sub.gradedResults?.some(r => r.disputed) && <span className="text-xs text-red-500 font-bold">Disputed</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Grading Details */}
                    <div className="col-span-2">
                        {!activeSubmission ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <p>Select a student submission to view details.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-lg font-bold">{activeSubmission.studentName}</h4>
                                        <p className="text-sm text-gray-500">Submission ID: {activeSubmission.id}</p>
                                    </div>
                                    <button
                                        onClick={() => onGradeSubmission(activeSubmission.id)}
                                        disabled={activeSubmission.isGrading}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                                    >
                                        {activeSubmission.isGrading ? 'Grading...' : 'Grade with AI'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="font-semibold mb-2">Student's Answer Sheet</h5>
                                        <img src={activeSubmission.previewUrl} alt={`${activeSubmission.studentName}'s submission`} className="rounded-lg border shadow-sm w-full" />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold mb-2">Model Answer Sheet</h5>
                                        <img src={paper.modelAnswerPreviewUrl} alt="Model Answer" className="rounded-lg border shadow-sm w-full" />
                                    </div>
                                </div>
                                
                                {activeSubmission.isGrading && (
                                    <div className="p-4 text-center">
                                        <Spinner text="AI is grading, please wait..."/>
                                        <p className="text-xs text-gray-500 mt-2">This may take a moment depending on the complexity of the rubric.</p>
                                    </div>
                                )}

                                {activeSubmission.gradedResults && (
                                    <div className="space-y-4 pt-4">
                                        <h5 className="text-lg font-bold">Grading Results</h5>
                                        {activeSubmission.gradedResults.map((result, index) => {
                                            const question = paper.rubric.find(q => q.id === result.questionId);
                                            const currentInputValue = overrideMarks[result.questionId];
                                            const isChanged = currentInputValue !== undefined && parseInt(currentInputValue, 10) !== result.marksAwarded;
                                            const hasComment = resolutionComments[result.questionId]?.length > 0;
                                            
                                            return (
                                                <div key={index} className={`p-4 rounded-lg border-2 ${result.disputed ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-transparent'}`}>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <p className="font-semibold flex-grow">{index + 1}. {question?.question}</p>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <input 
                                                                type="number"
                                                                value={currentInputValue ?? ''}
                                                                onChange={(e) => handleMarksChange(result.questionId, e.target.value)}
                                                                max={question?.totalMarks}
                                                                min={0}
                                                                className="p-1 border rounded-md w-20 bg-white text-center"
                                                                aria-label={`Override marks for question ${index + 1}`}
                                                            />
                                                            <span className="text-gray-600">/ {question?.totalMarks}</span>
                                                            <button 
                                                                onClick={() => handleOverrideClick(result.questionId)}
                                                                disabled={!isChanged && !result.disputed && !hasComment}
                                                                className="bg-blue-600 text-white px-3 py-1 text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                            >
                                                                {result.disputed ? 'Resolve & Set' : 'Set'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {result.disputed && (
                                                        <div className="mt-3 bg-red-100 p-3 rounded border border-red-200">
                                                            <p className="text-xs font-bold text-red-700 uppercase mb-1">Dispute Reason</p>
                                                            <p className="text-sm text-red-800 italic">"{result.disputeReason}"</p>
                                                            
                                                            <div className="mt-2">
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">Resolution Comment</label>
                                                                <input 
                                                                    type="text"
                                                                    placeholder="Add a note for the student explaining the change..."
                                                                    className="w-full text-sm p-2 border border-red-300 rounded bg-white"
                                                                    value={resolutionComments[result.questionId] || ''}
                                                                    onChange={(e) => handleCommentChange(result.questionId, e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <p className="text-sm text-gray-600 mt-2"><span className="font-medium">Feedback:</span> {result.feedback}</p>
                                                    <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                                                        <span className="font-medium">Suggestions:</span>
                                                        {result.improvementSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                    {result.resolutionComment && !result.disputed && (
                                                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                                                            <span className="font-bold">Resolution Note:</span> {result.resolutionComment}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};