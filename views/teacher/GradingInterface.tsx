
import React, { useState, useEffect, useMemo } from 'react';
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
    onCancelGrading?: (id: string) => void;
    onRegradeQuestion: (submissionId: string, questionId: string) => Promise<void>;
    onGradeOverride: (
        submissionId: string, 
        questionId: string, 
        newMarks: number, 
        comment?: string,
        newStepAnalysis?: GradedResult['stepAnalysis'],
        newKeywordAnalysis?: GradedResult['keywordAnalysis'],
        teacherComments?: { text: string; timestamp: Date }[]
    ) => Promise<void>;
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
    onCancelGrading,
    onRegradeQuestion,
    onGradeOverride,
    autoStart
}) => {
    const submission = submissionsList.find(s => s.id === submissionId);
    
    // Local state to track edits before saving
    const [editingResults, setEditingResults] = useState<{[key: string]: GradedResult}>({});
    const [expandedAnswers, setExpandedAnswers] = useState<{[key: string]: boolean}>({});
    const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});
    const [regradingQuestions, setRegradingQuestions] = useState<Record<string, boolean>>({});
    const [savingQuestions, setSavingQuestions] = useState<Record<string, boolean>>({}); // Loading state for save buttons
    const [showStrategyTooltip, setShowStrategyTooltip] = useState(false);

    const autoGradeTriggeredRef = React.useRef<string | null>(null);

    // Reset local edits when switching students
    useEffect(() => {
        setEditingResults({});
        setExpandedAnswers({});
        setCommentInputs({});
        setRegradingQuestions({});
        setSavingQuestions({});
    }, [submissionId]);

    // Handle Auto-Start Grading
    useEffect(() => {
        // Reset ref if ID changes to allow grading new student
        if (autoGradeTriggeredRef.current !== submissionId) {
            autoGradeTriggeredRef.current = null;
        }

        if (submission && !submission.gradedResults && !submission.isGrading && autoStart) {
            // Only trigger if we haven't already for this submission ID
            if (autoGradeTriggeredRef.current !== submissionId) {
                autoGradeTriggeredRef.current = submissionId;
                onGradeSubmission(submission.id);
            }
        }
    }, [submission, autoStart, onGradeSubmission, submissionId]);

    if (!submission) return null;

    const isPdf = submission.file?.type === 'application/pdf' || submission.previewUrl?.endsWith('.pdf');

    // Helper to get the current result state (edited or original)
    const getResult = (questionId: string): GradedResult | undefined => {
        return editingResults[questionId] || submission.gradedResults?.find(r => r.questionId === questionId);
    };

    // Calculate total score dynamically based on current state (including unsaved edits)
    const currentTotalScore = useMemo(() => {
        return paper.rubric.reduce((acc, q) => {
            const result = getResult(q.id);
            return acc + (result?.marksAwarded || 0);
        }, 0);
    }, [paper.rubric, editingResults, submission.gradedResults]);

    const maxTotalScore = useMemo(() => {
        return paper.rubric.reduce((acc, q) => acc + q.totalMarks, 0);
    }, [paper.rubric]);

    const handleCommentInputChange = (questionId: string, value: string) => {
        setCommentInputs(prev => ({
            ...prev,
            [questionId]: value
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

    const toggleAnswerExpansion = (questionId: string) => {
        setExpandedAnswers(prev => ({...prev, [questionId]: !prev[questionId]}));
    };

    const handleRegradeClick = async (questionId: string) => {
        setRegradingQuestions(prev => ({...prev, [questionId]: true}));
        await onRegradeQuestion(submissionId, questionId);
        setRegradingQuestions(prev => ({...prev, [questionId]: false}));
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
        
        // Determine status based on marks
        let newStatus = 'Missing';
        if (clampedMarks === step.maxMarks) newStatus = 'Correct';
        else if (clampedMarks > 0) newStatus = 'Partial';
        
        // Preserve ECF status if we are just adjusting marks but it was ECF
        if (step.status === 'ECF' && clampedMarks > 0) newStatus = 'ECF';

        newStepAnalysis[stepIndex] = {
            ...step,
            marksAwarded: clampedMarks,
            status: newStatus
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

    const handleSaveChanges = async (questionId: string) => {
        const result = getResult(questionId);
        if (result) {
            setSavingQuestions(prev => ({ ...prev, [questionId]: true }));
            
            try {
                const newCommentText = commentInputs[questionId];
                let updatedComments = result.teacherComments ? [...result.teacherComments] : [];
                
                if (newCommentText && newCommentText.trim()) {
                    updatedComments.push({
                        text: newCommentText.trim(),
                        timestamp: new Date()
                    });
                }

                // Also update legacy resolutionComment for backward compatibility
                const resolutionComment = newCommentText ? newCommentText.trim() : result.resolutionComment;

                await onGradeOverride(
                    submission.id,
                    questionId,
                    result.marksAwarded,
                    resolutionComment,
                    result.stepAnalysis,
                    result.keywordAnalysis,
                    updatedComments
                );
                
                // Clear dirty state for this question ONLY after save is complete
                setEditingResults(prev => {
                    const newState = { ...prev };
                    delete newState[questionId];
                    return newState;
                });
                // Clear comment input
                setCommentInputs(prev => {
                    const newState = { ...prev };
                    delete newState[questionId];
                    return newState;
                });
            } catch (error) {
                console.error("Failed to save changes", error);
            } finally {
                setSavingQuestions(prev => ({ ...prev, [questionId]: false }));
            }
        }
    };

    const handleCancelChanges = (questionId: string) => {
        setEditingResults(prev => {
            const newState = { ...prev };
            delete newState[questionId];
            return newState;
        });
        setCommentInputs(prev => {
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

    const isItemDisputed = (reason: string | undefined, itemText: string) => {
        if (!reason) return false;
        return reason.includes(`"${itemText}"`);
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col h-screen animate-slide-up">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-30 h-16">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-lg font-bold text-gray-900">{submission.studentName}</h2>
                            <span className="text-xs text-gray-500 font-mono hidden md:inline">ID: {submission.id.substring(0,8)}</span>
                        </div>
                        <p className="text-xs text-gray-500 hidden sm:block">{paper.title}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                     <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                        <button 
                            onClick={onPrev} 
                            disabled={!hasPrev}
                            title="Previous Student"
                            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-xs font-bold text-gray-600 px-3 min-w-[60px] text-center border-l border-r border-gray-200 mx-1">
                            {submissionsList.findIndex(s => s.id === submissionId) + 1} of {submissionsList.length}
                        </span>
                        <button 
                            onClick={onNext} 
                            disabled={!hasNext}
                            title="Next Student"
                            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    
                    {!submission.isGrading ? (
                        !submission.gradedResults ? (
                            <button 
                                onClick={() => onGradeSubmission(submissionId)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Grade with AI
                            </button>
                        ) : (
                            <button 
                                onClick={() => {
                                    if(window.confirm("Are you sure? This will overwrite existing results for ALL questions.")) {
                                        onGradeSubmission(submissionId);
                                    }
                                }}
                                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Regrade All
                            </button>
                        )
                    ) : (
                        <button 
                            onClick={() => onCancelGrading && onCancelGrading(submissionId)}
                            className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-colors"
                        >
                            <span className="animate-spin h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full mr-1"></span>
                            Stop Grading
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow flex overflow-hidden">
                {/* Left Panel: Preview */}
                <div className="w-1/2 lg:w-3/5 bg-slate-100 border-r border-gray-200 overflow-hidden relative flex flex-col">
                    <div className="flex-grow overflow-auto p-4 flex items-center justify-center">
                        {isPdf ? (
                             <object data={submission.previewUrl} type="application/pdf" className="w-full h-full bg-white shadow-lg rounded-lg">
                                {renderPdfFallback(submission.previewUrl)}
                            </object>
                        ) : (
                            <img src={submission.previewUrl} alt="Submission" className="max-w-full max-h-full object-contain shadow-lg rounded-lg border border-gray-200" />
                        )}
                    </div>
                </div>

                {/* Right Panel: Grading & Rubric */}
                <div className="w-1/2 lg:w-2/5 bg-white overflow-hidden flex flex-col shadow-xl z-20">
                    
                    {/* Sticky Grading Header */}
                    <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-800 text-lg">Grading</h3>
                                {paper.gradingInstructions && (
                                    <div className="relative">
                                        <button 
                                            onMouseEnter={() => setShowStrategyTooltip(true)}
                                            onMouseLeave={() => setShowStrategyTooltip(false)}
                                            className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-purple-200 cursor-help"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Strategy Active
                                        </button>
                                        {showStrategyTooltip && (
                                            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 text-white text-xs p-3 rounded shadow-lg z-50 animate-slide-up">
                                                <p className="font-bold mb-1 border-b border-gray-700 pb-1">Grading Instructions</p>
                                                <p className="leading-relaxed opacity-90">{paper.gradingInstructions}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">Reviewing {paper.rubric.length} questions</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline gap-1 justify-end">
                                <span className="text-3xl font-black text-blue-600 tracking-tight">{currentTotalScore}</span>
                                <span className="text-gray-400 text-sm font-medium"> / {maxTotalScore}</span>
                            </div>
                            <div className="w-32 bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden ml-auto">
                                <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(currentTotalScore/maxTotalScore)*100}%`}}></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-6 bg-slate-50">
                        {submission.isGrading ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 min-h-[300px]">
                                <Spinner size="lg" />
                                <p className="text-lg font-medium animate-pulse text-blue-600">AI is analyzing the answer sheet...</p>
                                <p className="text-sm max-w-xs text-center text-gray-400">Identifying handwriting, checking logic, and verifying Error Carried Forward.</p>
                                <button 
                                    onClick={() => onCancelGrading && onCancelGrading(submissionId)}
                                    className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-600 hover:text-red-600 hover:border-red-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 pb-12">
                                {paper.rubric.map((question, index) => {
                                    const result = getResult(question.id);
                                    const score = result ? result.marksAwarded : 0;
                                    const isDirty = editingResults[question.id] !== undefined || (commentInputs[question.id] && commentInputs[question.id] !== '');
                                    const isExpanded = expandedAnswers[question.id];
                                    const isRegrading = regradingQuestions[question.id];
                                    const isSaving = savingQuestions[question.id];
                                    
                                    return (
                                        <div key={question.id} className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${result?.disputed ? 'border-yellow-300 ring-4 ring-yellow-50' : 'border-gray-200'} ${isDirty ? 'ring-2 ring-blue-100 border-blue-400' : ''}`}>
                                            
                                            {/* Question Header */}
                                            <div className="p-4 border-b border-gray-100 flex gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                                                    Q{index + 1}
                                                </div>
                                                <div className="flex-grow">
                                                    <h4 className="text-sm font-bold text-gray-900 leading-snug">{question.question}</h4>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button 
                                                            onClick={() => toggleAnswerExpansion(question.id)}
                                                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition-colors"
                                                        >
                                                            {isExpanded ? 'Hide Model Answer' : 'Show Model Answer'}
                                                            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>

                                                        <button 
                                                            onClick={() => handleRegradeClick(question.id)}
                                                            disabled={isRegrading || isSaving}
                                                            className="text-xs font-semibold text-gray-500 hover:text-blue-600 flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded transition-colors hover:border-blue-300 ml-2"
                                                            title="Regrade this question with AI"
                                                        >
                                                            <svg className={`w-3 h-3 ${isRegrading ? 'animate-spin text-blue-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                            {isRegrading ? 'Regrading...' : 'Regrade'}
                                                        </button>
                                                    </div>
                                                    
                                                    {isExpanded && (
                                                        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700 whitespace-pre-wrap animate-slide-up">
                                                            <strong className="block text-slate-500 mb-1 uppercase text-[10px]">Expected Answer:</strong>
                                                            {question.finalAnswer || 'No specific answer provided.'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            max={question.totalMarks}
                                                            value={result ? score : ''} 
                                                            onChange={(e) => handleScoreChange(question.id, parseFloat(e.target.value) || 0)}
                                                            className="w-12 text-center font-bold text-lg bg-transparent outline-none text-gray-900 p-0"
                                                        />
                                                        <span className="text-xs text-gray-400 font-medium border-l border-gray-200 pl-1">/{question.totalMarks}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-4">
                                                {/* AI Feedback */}
                                                {result ? (
                                                    <div className={`text-sm ${isRegrading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-4">
                                                            <p className="text-xs font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                AI Feedback
                                                            </p>
                                                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.feedback}</p>
                                                            {result.improvementSuggestions && result.improvementSuggestions.length > 0 && (
                                                                <div className="mt-3 pt-3 border-t border-blue-200">
                                                                    <p className="text-xs font-bold text-blue-700 uppercase mb-1">Areas for Improvement</p>
                                                                    <ul className="list-disc list-inside text-blue-900/80 pl-1 space-y-0.5">
                                                                        {result.improvementSuggestions.map((suggestion, idx) => (
                                                                            <li key={idx}>{suggestion}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Step Analysis Table */}
                                                        {result.stepAnalysis && result.stepAnalysis.length > 0 && (
                                                            <div className="mb-4">
                                                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Step Breakdown</p>
                                                                <div className="space-y-2">
                                                                    {result.stepAnalysis.map((step, idx) => {
                                                                        const highlighted = result.disputed && isItemDisputed(result.disputeReason, step.stepDescription);
                                                                        const isFull = step.marksAwarded === step.maxMarks;
                                                                        const isZero = step.marksAwarded === 0;
                                                                        const isECF = step.status === 'ECF';

                                                                        return (
                                                                            <div key={idx} className={`group flex items-center justify-between gap-3 p-2 rounded-lg border transition-all ${
                                                                                highlighted ? 'bg-red-50 border-red-300' : 
                                                                                isECF ? 'bg-amber-50 border-amber-200' :
                                                                                'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'
                                                                            }`}>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                                        <span className={`w-2 h-2 rounded-full ${isECF ? 'bg-amber-500' : isFull ? 'bg-green-500' : isZero ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                                                                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max: {step.maxMarks}</span>
                                                                                        {isECF && (
                                                                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 ml-1">
                                                                                                Logic Correct (ECF)
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className={`text-sm ${highlighted ? 'font-bold text-red-800' : 'text-gray-700'}`}>{step.stepDescription}</p>
                                                                                </div>
                                                                                
                                                                                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 group-hover:bg-white transition-colors">
                                                                                    {/* Quick Action Buttons */}
                                                                                    <button 
                                                                                        onClick={() => handleStepMarkChange(question.id, idx, 0)}
                                                                                        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-colors ${isZero ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                                                                                        title="Zero Marks"
                                                                                    >
                                                                                        ✗
                                                                                    </button>
                                                                                    
                                                                                    <input 
                                                                                        type="number" 
                                                                                        value={step.marksAwarded} 
                                                                                        min="0"
                                                                                        max={step.maxMarks}
                                                                                        step="0.5"
                                                                                        onChange={(e) => handleStepMarkChange(question.id, idx, parseFloat(e.target.value) || 0)}
                                                                                        className={`w-10 text-center text-sm font-bold bg-transparent outline-none ${highlighted ? 'text-red-700' : 'text-gray-800'}`}
                                                                                    />
                                                                                    
                                                                                    <button 
                                                                                        onClick={() => handleStepMarkChange(question.id, idx, step.maxMarks)}
                                                                                        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-colors ${isFull ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-green-50 hover:text-green-500'}`}
                                                                                        title="Full Marks"
                                                                                    >
                                                                                        ✓
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Keyword Analysis */}
                                                        {result.keywordAnalysis && result.keywordAnalysis.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Keyword Check</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {result.keywordAnalysis.map((kw, idx) => {
                                                                        const highlighted = result.disputed && isItemDisputed(result.disputeReason, kw.keyword);
                                                                        const isPresent = kw.marksAwarded > 0;

                                                                        return (
                                                                            <div key={idx} className={`flex items-center gap-1 pl-2 pr-1 py-1 rounded border text-xs cursor-pointer transition-colors ${
                                                                                highlighted ? 'bg-red-50 border-red-300' : 
                                                                                isPresent ? 'bg-green-50 border-green-200 hover:border-green-300' : 
                                                                                'bg-white border-gray-200 border-dashed hover:border-gray-300'
                                                                            }`}>
                                                                                <span className={`font-medium ${highlighted ? 'text-red-800' : isPresent ? 'text-green-800' : 'text-gray-500 line-through'}`}>{kw.keyword}</span>
                                                                                
                                                                                <div className="flex items-center ml-2 border-l border-gray-200 pl-1 gap-1">
                                                                                    <input 
                                                                                        type="number" 
                                                                                        className="w-6 text-center bg-transparent outline-none font-bold"
                                                                                        value={kw.marksAwarded}
                                                                                        onChange={(e) => handleKeywordMarkChange(question.id, idx, parseFloat(e.target.value) || 0)}
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => handleKeywordMarkChange(question.id, idx, isPresent ? 0 : kw.maxMarks)}
                                                                                        className={`w-4 h-4 rounded-full flex items-center justify-center ${isPresent ? 'text-green-600 hover:bg-red-100 hover:text-red-600' : 'text-gray-300 hover:text-green-600'}`}
                                                                                    >
                                                                                        {isPresent ? '✓' : '+'}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                                        <p className="text-sm text-gray-500 mb-2">No grade yet.</p>
                                                        <button 
                                                            onClick={() => onRegradeQuestion(submissionId, question.id)}
                                                            className="text-blue-600 font-bold hover:underline text-sm"
                                                        >
                                                            Run AI Grading for this question
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Dispute / Teacher Comment Section */}
                                                <div className={`p-4 rounded-lg border text-sm ${result?.disputed ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                                                    {result?.disputed && (
                                                        <div className="mb-3 pb-3 border-b border-yellow-200/50">
                                                            <p className="text-xs font-bold text-yellow-800 uppercase flex items-center gap-1 mb-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                Student Dispute
                                                            </p>
                                                            <p className="text-yellow-900 italic">"{result.disputeReason}"</p>
                                                        </div>
                                                    )}
                                                    
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Teacher Comments / History</label>
                                                        
                                                        {/* Comment History List */}
                                                        {result?.teacherComments && result.teacherComments.length > 0 && (
                                                            <div className="space-y-3 mb-4 max-h-40 overflow-y-auto pr-1">
                                                                {result.teacherComments.map((comment, i) => (
                                                                    <div key={i} className="bg-white p-3 rounded border border-gray-200 shadow-sm relative">
                                                                        <p className="text-gray-800 text-sm whitespace-pre-wrap">{comment.text}</p>
                                                                        <span className="text-[10px] text-gray-400 block mt-1 text-right">
                                                                            {new Date(comment.timestamp).toLocaleString(undefined, {
                                                                                dateStyle: 'short',
                                                                                timeStyle: 'short'
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Add New Comment */}
                                                        <textarea 
                                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 resize-none h-20 placeholder-gray-400"
                                                            placeholder="Add a new comment or resolution..."
                                                            value={commentInputs[question.id] || ''}
                                                            onChange={(e) => handleCommentInputChange(question.id, e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {/* SAVE / CANCEL ACTIONS */}
                                                {isDirty && (
                                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 animate-slide-up bg-blue-50/30 -mx-4 px-4 pb-2">
                                                        <span className="text-xs text-blue-600 font-medium italic">Unsaved changes</span>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleCancelChanges(question.id)}
                                                                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                                                disabled={isSaving}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSaveChanges(question.id)}
                                                                disabled={isSaving}
                                                                className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 rounded shadow-md hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-70 disabled:cursor-wait"
                                                            >
                                                                {isSaving ? (
                                                                    <>
                                                                        <Spinner size="sm" />
                                                                        Saving...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                        Save
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
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
        </div>
    );
};
