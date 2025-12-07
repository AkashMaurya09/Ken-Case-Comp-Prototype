
import React, { useState, useEffect } from 'react';
import { QuestionPaper, StudentSubmission, GradedResult } from '../../types';
import { Spinner } from '../../components/Spinner';

interface GradingInterfaceProps {
    submissionId: string;
    submissionsList: StudentSubmission[];
    paper: QuestionPaper;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    hasNext: boolean;
    hasPrev: boolean;
    onGradeSubmission: (id: string) => Promise<void>;
    onGradeOverride: (
        submissionId: string, 
        questionId: string, 
        newMarks: number, 
        comment?: string,
        newStepAnalysis?: GradedResult['stepAnalysis'],
        newKeywordAnalysis?: GradedResult['keywordAnalysis']
    ) => void;
    autoStart: boolean;
}

export const GradingInterface: React.FC<GradingInterfaceProps> = ({
    submissionId,
    submissionsList,
    paper,
    onClose,
    onNext,
    onPrev,
    hasNext,
    hasPrev,
    onGradeSubmission,
    onGradeOverride,
    autoStart
}) => {
    const submission = submissionsList.find(s => s.id === submissionId);
    
    // Local state to track edits before saving
    const [editingResults, setEditingResults] = useState<{[key: string]: GradedResult}>({});

    // Reset local edits when switching students
    useEffect(() => {
        setEditingResults({});
    }, [submissionId]);

    useEffect(() => {
        if (submission && !submission.gradedResults && !submission.isGrading && autoStart) {
            onGradeSubmission(submission.id);
        }
    }, [submission, autoStart, onGradeSubmission]);

    if (!submission) return null;

    const isPdf = submission.file?.type === 'application/pdf' || submission.previewUrl?.endsWith('.pdf');

    // Helper to get the current result state (edited or original)
    const getResult = (questionId: string): GradedResult | undefined => {
        return editingResults[questionId] || submission.gradedResults?.find(r => r.questionId === questionId);
    };

    const handleCommentChange = (questionId: string, value: string) => {
        const currentResult = getResult(questionId);
        if (!currentResult) return;

        setEditingResults(prev => ({
            ...prev,
            [questionId]: { ...currentResult, resolutionComment: value }
        }));
    };
    
    // Updates the Total Score manually
    const handleScoreChange = (questionId: string, newScore: number) => {
        const currentResult = getResult(questionId);
        if (!currentResult) return;

        setEditingResults(prev => ({
            ...prev,
            [questionId]: { ...currentResult, marksAwarded: newScore }
        }));
    };

    // --- Granular Editing Logic ---

    const handleStepMarkChange = (questionId: string, stepIndex: number, newMarks: number) => {
        const currentResult = getResult(questionId);
        if (!currentResult || !currentResult.stepAnalysis) return;

        // 1. Create copy of steps
        const newStepAnalysis = [...currentResult.stepAnalysis];
        
        // 2. Validate and Update specific step
        const step = newStepAnalysis[stepIndex];
        const clampedMarks = Math.min(Math.max(0, newMarks), step.maxMarks);
        
        newStepAnalysis[stepIndex] = {
            ...step,
            marksAwarded: clampedMarks,
            status: clampedMarks === step.maxMarks ? 'Correct' : clampedMarks > 0 ? 'Partial' : 'Missing'
        };

        // 3. Recalculate Total Score
        const stepTotal = newStepAnalysis.reduce((sum, s) => sum + s.marksAwarded, 0);
        const keywordTotal = currentResult.keywordAnalysis?.reduce((sum, k) => sum + k.marksAwarded, 0) || 0;
        
        // Ensure total doesn't exceed question total
        const question = paper.rubric.find(q => q.id === questionId);
        const newTotalScore = Math.min(stepTotal + keywordTotal, question?.totalMarks || 0);

        setEditingResults(prev => ({
            ...prev,
            [questionId]: { 
                ...currentResult, 
                marksAwarded: newTotalScore,
                stepAnalysis: newStepAnalysis
            }
        }));
    };

    const handleKeywordMarkChange = (questionId: string, keywordIndex: number, newMarks: number) => {
        const currentResult = getResult(questionId);
        if (!currentResult || !currentResult.keywordAnalysis) return;

        const newKeywordAnalysis = [...currentResult.keywordAnalysis];
        const kw = newKeywordAnalysis[keywordIndex];
        const clampedMarks = Math.min(Math.max(0, newMarks), kw.maxMarks);

        newKeywordAnalysis[keywordIndex] = {
            ...kw,
            marksAwarded: clampedMarks,
            present: clampedMarks > 0
        };

        const stepTotal = currentResult.stepAnalysis?.reduce((sum, s) => sum + s.marksAwarded, 0) || 0;
        const keywordTotal = newKeywordAnalysis.reduce((sum, k) => sum + k.marksAwarded, 0);
        
        const question = paper.rubric.find(q => q.id === questionId);
        const newTotalScore = Math.min(stepTotal + keywordTotal, question?.totalMarks || 0);

        setEditingResults(prev => ({
            ...prev,
            [questionId]: { 
                ...currentResult, 
                marksAwarded: newTotalScore,
                keywordAnalysis: newKeywordAnalysis
            }
        }));
    };

    const handleSaveChanges = (questionId: string) => {
        const result = editingResults[questionId];
        if (result) {
            onGradeOverride(
                submission.id,
                questionId,
                result.marksAwarded,
                result.resolutionComment,
                result.stepAnalysis,
                result.keywordAnalysis
            );
            // Clear dirty state for this question
            setEditingResults(prev => {
                const newState = { ...prev };
                delete newState[questionId];
                return newState;
            });
        }
    };

    const handleCancelChanges = (questionId: string) => {
        setEditingResults(prev => {
            const newState = { ...prev };
            delete newState[questionId];
            return newState;
        });
    };

    const renderPdfFallback = (url: string) => (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mb-2 font-semibold">Preview not available inline.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline bg-blue-50 px-4 py-2 rounded-lg font-medium">
                Open PDF in New Tab
            </a>
        </div>
    );

    // Helper to check if a specific item is mentioned in the dispute reason
    const isItemDisputed = (reason: string | undefined, itemText: string) => {
        if (!reason) return false;
        // The ResultPage formats it as: "Description"
        return reason.includes(`"${itemText}"`);
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col h-screen animate-slide-up">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">{submission.studentName}</h2>
                        <p className="text-xs text-gray-500">{paper.title} • Submitted {submission.submissionDate.toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                     <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button 
                            onClick={onPrev} 
                            disabled={!hasPrev}
                            className="p-2 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-xs font-bold text-gray-500 px-3">
                            {submissionsList.findIndex(s => s.id === submissionId) + 1} / {submissionsList.length}
                        </span>
                        <button 
                            onClick={onNext} 
                            disabled={!hasNext}
                            className="p-2 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    
                    {!submission.isGrading ? (
                        !submission.gradedResults ? (
                            <button 
                                onClick={() => onGradeSubmission(submissionId)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Run AI Grading
                            </button>
                        ) : (
                            <button 
                                onClick={() => {
                                    if(window.confirm("Are you sure? This will overwrite the existing grading results.")) {
                                        onGradeSubmission(submissionId);
                                    }
                                }}
                                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Regrade with AI
                            </button>
                        )
                    ) : (
                        <button disabled className="bg-blue-100 text-blue-400 px-4 py-2 rounded-lg text-sm font-bold cursor-not-allowed flex items-center gap-2">
                            <Spinner size="sm" />
                            Grading...
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow flex overflow-hidden">
                {/* Left Panel: Preview */}
                <div className="w-1/2 bg-gray-100 border-r border-gray-200 overflow-hidden relative flex flex-col">
                    <div className="flex-grow overflow-auto p-4 flex items-center justify-center">
                        {isPdf ? (
                             <object data={submission.previewUrl} type="application/pdf" className="w-full h-full min-h-[500px] bg-white shadow-sm rounded-lg">
                                {renderPdfFallback(submission.previewUrl)}
                            </object>
                        ) : (
                            <img src={submission.previewUrl} alt="Submission" className="max-w-full max-h-full object-contain shadow-lg rounded" />
                        )}
                    </div>
                </div>

                {/* Right Panel: Grading & Rubric */}
                <div className="w-1/2 bg-white overflow-y-auto p-6">
                    {submission.isGrading ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                            <Spinner size="lg" />
                            <p className="text-lg font-medium animate-pulse">AI is analyzing the answer sheet...</p>
                            <p className="text-sm max-w-xs text-center">This involves text recognition (OCR), rubric matching, and semantic analysis.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 pb-20">
                            {paper.rubric.map((question, index) => {
                                const result = getResult(question.id);
                                const score = result ? result.marksAwarded : 0;
                                const isDirty = editingResults[question.id] !== undefined;
                                
                                return (
                                    <div key={question.id} className={`border rounded-xl overflow-hidden transition-all ${result?.disputed ? 'border-yellow-300 ring-4 ring-yellow-50' : 'border-gray-200'} ${isDirty ? 'ring-2 ring-blue-200 border-blue-300' : ''}`}>
                                        <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-start">
                                            <div className="flex-grow">
                                                <h4 className="font-bold text-gray-800 text-base">Q{index + 1}: {question.question}</h4>
                                                <p className="text-xs text-gray-500 mt-1">Max Marks: {question.totalMarks}</p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max={question.totalMarks}
                                                    value={result ? score : ''} 
                                                    onChange={(e) => handleScoreChange(question.id, parseFloat(e.target.value) || 0)}
                                                    placeholder="-"
                                                    className="w-16 p-2 text-center font-bold text-lg border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                                />
                                                <span className="text-gray-400 font-medium">/ {question.totalMarks}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            {/* Expected Answer Accordion */}
                                            <div className="text-sm">
                                                <p className="font-semibold text-gray-600 mb-1">Expected Answer / Criteria:</p>
                                                <div className="bg-gray-50 p-3 rounded text-gray-700 whitespace-pre-wrap font-mono text-xs border border-gray-200">
                                                    {question.finalAnswer || 'No specific model answer provided.'}
                                                </div>
                                            </div>

                                            {/* AI Feedback / Result */}
                                            {result ? (
                                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                    <div className="mb-4">
                                                        <p className="text-xs font-bold text-blue-700 uppercase mb-2">General Feedback</p>
                                                        <p className="text-sm text-gray-800 leading-relaxed">{result.feedback}</p>
                                                    </div>
                                                    
                                                    {/* Step Analysis Breakdown (EDITABLE) */}
                                                    {result.stepAnalysis && result.stepAnalysis.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-blue-200">
                                                            <p className="text-xs font-semibold text-blue-800 mb-2">Step-wise Breakdown (Editable):</p>
                                                            <div className="space-y-2">
                                                                {result.stepAnalysis.map((step, idx) => {
                                                                    const highlighted = result.disputed && isItemDisputed(result.disputeReason, step.stepDescription);
                                                                    
                                                                    return (
                                                                        <div key={idx} className={`flex items-center justify-between gap-3 p-2 rounded transition-all ${
                                                                            highlighted ? 'bg-red-50 border border-red-300 ring-2 ring-red-200' : 'hover:bg-blue-100/50'
                                                                        }`}>
                                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                                <div className={`flex-shrink-0 ${step.status === 'Correct' ? 'text-green-600' : step.status === 'Partial' ? 'text-yellow-600' : 'text-red-500'}`}>
                                                                                    {step.status === 'Correct' ? '✓' : step.status === 'Partial' ? '~' : '✗'}
                                                                                </div>
                                                                                <span className={`text-xs text-gray-700 truncate flex-1 ${highlighted ? 'font-bold text-red-800' : ''}`} title={step.stepDescription}>
                                                                                    {step.stepDescription}
                                                                                </span>
                                                                                <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                                                    Max: {step.maxMarks}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <input 
                                                                                    type="number" 
                                                                                    value={step.marksAwarded} 
                                                                                    min="0"
                                                                                    max={step.maxMarks}
                                                                                    step="0.5"
                                                                                    onChange={(e) => handleStepMarkChange(question.id, idx, parseFloat(e.target.value) || 0)}
                                                                                    className={`w-14 p-1 text-xs text-center border rounded font-mono font-medium focus:ring-1 focus:ring-blue-500 outline-none ${highlighted ? 'border-red-300 bg-red-50 text-red-900' : 'border-gray-300 bg-white text-gray-900'}`}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Keyword Analysis (EDITABLE) */}
                                                    {result.keywordAnalysis && result.keywordAnalysis.length > 0 && (
                                                        <div className="mt-4 pt-3 border-t border-blue-200">
                                                            <p className="text-xs font-semibold text-blue-800 mb-2">Keyword Check (Editable):</p>
                                                            <div className="flex flex-wrap gap-3">
                                                                {result.keywordAnalysis.map((kw, idx) => {
                                                                    const highlighted = result.disputed && isItemDisputed(result.disputeReason, kw.keyword);

                                                                    return (
                                                                        <div key={idx} className={`flex items-center gap-1 border rounded px-2 py-1 ${
                                                                            highlighted ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-white border-blue-200'
                                                                        }`}>
                                                                            <span className={`text-xs ${kw.present ? 'text-green-700' : 'text-red-400 opacity-70'} mr-1`}>
                                                                                {kw.present ? '✓' : '✗'}
                                                                            </span>
                                                                            <span className={`text-xs text-gray-700 flex-shrink-0 ${highlighted ? 'font-bold text-red-800' : ''}`}>{kw.keyword}</span>
                                                                            <div className="h-3 w-px bg-gray-300 mx-1"></div>
                                                                            <input 
                                                                                type="number" 
                                                                                value={kw.marksAwarded} 
                                                                                min="0"
                                                                                max={kw.maxMarks}
                                                                                step="0.5"
                                                                                onChange={(e) => handleKeywordMarkChange(question.id, idx, parseFloat(e.target.value) || 0)}
                                                                                className={`w-8 p-0 text-xs text-center font-mono font-medium focus:outline-none rounded ${highlighted ? 'bg-red-50 text-red-900' : 'bg-white text-gray-900'}`}
                                                                            />
                                                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">/{kw.maxMarks}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center p-4 border border-dashed border-gray-300 rounded-lg text-gray-400 text-sm italic">
                                                    Not graded yet. Run AI grading or enter marks manually.
                                                </div>
                                            )}

                                            {/* Dispute / Teacher Comment Section */}
                                            {(result?.disputed || result?.resolutionComment || editingResults[question.id]) && (
                                                 <div className={`p-3 rounded border ${result?.disputed ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                                                    {result?.disputed && (
                                                        <div className="mb-2 pb-2 border-b border-yellow-200">
                                                            <p className="text-xs font-bold text-yellow-800 uppercase flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                Student Dispute
                                                            </p>
                                                            <p className="text-sm text-yellow-900 italic mt-1 whitespace-pre-wrap">"{result.disputeReason}"</p>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase">Teacher Comment / Resolution</label>
                                                        <input 
                                                            type="text" 
                                                            className="w-full mt-1 p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                                            placeholder="Add a comment to resolve..."
                                                            value={result?.resolutionComment || ''}
                                                            onChange={(e) => handleCommentChange(question.id, e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Dispute Trigger (if manual resolving needed) */}
                                            {result?.disputed && !result.resolutionComment && !editingResults[question.id] && (
                                                <button 
                                                    onClick={() => handleCommentChange(question.id, '')}
                                                    className="text-xs text-blue-600 font-medium hover:underline"
                                                >
                                                    Add Resolution Comment
                                                </button>
                                            )}

                                            {/* SAVE / CANCEL ACTIONS */}
                                            {isDirty && (
                                                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-200 animate-slide-up">
                                                    <span className="text-xs text-gray-500 italic mr-auto">Unsaved changes...</span>
                                                    <button 
                                                        onClick={() => handleCancelChanges(question.id)}
                                                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSaveChanges(question.id)}
                                                        className="px-4 py-1.5 text-sm font-bold text-white bg-green-600 rounded shadow-md hover:bg-green-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Save Changes
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
