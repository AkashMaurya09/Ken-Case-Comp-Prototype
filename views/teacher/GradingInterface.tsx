
import React, { useState, useEffect, useRef } from 'react';
import { StudentSubmission, QuestionPaper, GradedResult } from '../../types';
import { Spinner } from '../../components/Spinner';

interface GradingInterfaceProps {
    submissionId: string;
    submissionsList: StudentSubmission[]; // For context
    paper: QuestionPaper;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    hasNext: boolean;
    hasPrev: boolean;
    onGradeSubmission: (submissionId: string) => void;
    onGradeOverride: (
        submissionId: string, 
        questionId: string, 
        newMarks: number, 
        comment?: string,
        newStepAnalysis?: GradedResult['stepAnalysis'],
        newKeywordAnalysis?: GradedResult['keywordAnalysis']
    ) => void;
    autoStart?: boolean;
}

interface LocalGradingState {
    marksAwarded: number;
    resolutionComment: string;
    stepAnalysis: NonNullable<GradedResult['stepAnalysis']>;
    keywordAnalysis: NonNullable<GradedResult['keywordAnalysis']>;
    isDirty: boolean;
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
    autoStart = false
}) => {
    const activeSubmission = submissionsList.find(s => s.id === submissionId);
    
    // View Mode: Student Answer vs Model Answer
    const [viewMode, setViewMode] = useState<'student' | 'model'>('student');
    
    // Store local edits
    const [gradingEdits, setGradingEdits] = useState<Record<string, LocalGradingState>>({});
    
    // Track if auto-start has fired to prevent double calls
    const autoStartedRef = useRef(false);

    // Reset local edits when switching submissions and handle auto-start
    useEffect(() => {
        setGradingEdits({});
        setViewMode('student');
        autoStartedRef.current = false;
    }, [submissionId]);

    // Auto-Trigger Logic
    useEffect(() => {
        if (activeSubmission && autoStart && !activeSubmission.gradedResults && !activeSubmission.isGrading && !autoStartedRef.current) {
            autoStartedRef.current = true;
            onGradeSubmission(activeSubmission.id);
        }
    }, [activeSubmission, autoStart, onGradeSubmission]);

    if (!activeSubmission) return <div className="p-8 text-center">Submission not found</div>;

    // --- Logic Reuse (Calculations & State Mgmt) ---
    const createInitialState = (result: GradedResult): LocalGradingState => ({
        marksAwarded: result.marksAwarded,
        resolutionComment: result.resolutionComment || '',
        stepAnalysis: JSON.parse(JSON.stringify(result.stepAnalysis || [])),
        keywordAnalysis: JSON.parse(JSON.stringify(result.keywordAnalysis || [])),
        isDirty: false
    });

    const handleStepMarkChange = (questionId: string, stepIndex: number, newMark: number, maxMarks: number) => {
        setGradingEdits(prev => {
            let current = prev[questionId];
            if (!current) {
                const result = activeSubmission?.gradedResults?.find(r => r.questionId === questionId);
                if (!result) return prev;
                current = createInitialState(result);
            }
            const updatedSteps = [...current.stepAnalysis];
            updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], marksAwarded: Math.min(Math.max(0, newMark), maxMarks) };
            
            // Recalc Total
            const stepsSum = updatedSteps.reduce((acc, s) => acc + (s.marksAwarded || 0), 0);
            const keywordsSum = current.keywordAnalysis.reduce((acc, k) => acc + (k.marksAwarded || 0), 0);

            return {
                ...prev,
                [questionId]: {
                    ...current,
                    stepAnalysis: updatedSteps,
                    marksAwarded: stepsSum + keywordsSum,
                    isDirty: true
                }
            };
        });
    };

    const handleKeywordMarkChange = (questionId: string, keywordIndex: number, newMark: number, maxMarks: number) => {
        setGradingEdits(prev => {
            let current = prev[questionId];
            if (!current) {
                const result = activeSubmission?.gradedResults?.find(r => r.questionId === questionId);
                if (!result) return prev;
                current = createInitialState(result);
            }
            const updatedKeywords = [...current.keywordAnalysis];
            const safeMark = Math.min(Math.max(0, newMark), maxMarks);
            updatedKeywords[keywordIndex] = { ...updatedKeywords[keywordIndex], marksAwarded: safeMark, present: safeMark > 0 };
            
            const stepsSum = current.stepAnalysis.reduce((acc, s) => acc + (s.marksAwarded || 0), 0);
            const keywordsSum = updatedKeywords.reduce((acc, k) => acc + (k.marksAwarded || 0), 0);

            return {
                ...prev,
                [questionId]: {
                    ...current,
                    keywordAnalysis: updatedKeywords,
                    marksAwarded: stepsSum + keywordsSum,
                    isDirty: true
                }
            };
        });
    };

    const handleCommentChange = (questionId: string, value: string) => {
        setGradingEdits(prev => {
            let current = prev[questionId];
            if (!current) {
                const result = activeSubmission?.gradedResults?.find(r => r.questionId === questionId);
                if (!result) return prev;
                current = createInitialState(result);
            }
            return { ...prev, [questionId]: { ...current, resolutionComment: value, isDirty: true } };
        });
    };

    const handleSaveChanges = (questionId: string) => {
        const editState = gradingEdits[questionId];
        if (!editState) return;
        onGradeOverride(activeSubmission.id, questionId, editState.marksAwarded, editState.resolutionComment, editState.stepAnalysis, editState.keywordAnalysis);
        setGradingEdits(prev => ({ ...prev, [questionId]: { ...editState, isDirty: false } }));
    };

    const getTotalScore = () => {
        const awarded = activeSubmission.gradedResults?.reduce((acc, r) => acc + r.marksAwarded, 0) || 0;
        const total = paper.rubric.reduce((acc, r) => acc + r.totalMarks, 0);
        return { awarded, total };
    };
    const { awarded, total } = getTotalScore();

    const isPdf = activeSubmission.file?.type === 'application/pdf';
    const isModelPdf = paper.modelAnswerFile?.type === 'application/pdf';

    const renderPdfFallback = (url: string) => (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-gray-500 bg-gray-50">
            <p className="mb-2 text-xs font-semibold">Preview Blocked?</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs bg-blue-50 px-2 py-1 rounded">Open PDF</a>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen">
            {/* 1. Header Navigation */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                    <div className="h-6 w-px bg-gray-300"></div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">{activeSubmission.studentName}</h2>
                        <p className="text-xs text-gray-500">Submitted {activeSubmission.submissionDate.toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Score Display */}
                    <div className="text-right">
                        <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">Total Score</span>
                        <div className="flex items-baseline justify-end gap-1">
                            <span className="text-2xl font-bold text-gray-900">{awarded}</span>
                            <span className="text-sm text-gray-500">/ {total}</span>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button 
                            onClick={onPrev} 
                            disabled={!hasPrev}
                            className="p-2 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                            title="Previous Student"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="px-3 text-xs font-semibold text-gray-500 border-l border-r border-gray-200">
                             {submissionsList.findIndex(s => s.id === submissionId) + 1} of {submissionsList.length}
                        </span>
                        <button 
                            onClick={onNext} 
                            disabled={!hasNext}
                            className="p-2 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                             title="Next Student"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Main Workspace */}
            <div className="flex-grow overflow-hidden">
                <div className="grid grid-cols-12 h-full">
                    
                    {/* LEFT PANEL: Document Viewer */}
                    <div className="col-span-7 bg-gray-100 h-full border-r border-gray-300 flex flex-col">
                        {/* Tab Switcher */}
                        <div className="flex border-b border-gray-300 bg-gray-200">
                            <button 
                                onClick={() => setViewMode('student')}
                                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${viewMode === 'student' ? 'bg-gray-100 text-blue-700 border-t-2 border-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                            >
                                Student Answer Sheet
                            </button>
                            <button 
                                onClick={() => setViewMode('model')}
                                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${viewMode === 'model' ? 'bg-gray-100 text-blue-700 border-t-2 border-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                            >
                                Model Answer
                            </button>
                        </div>

                        {/* Document Canvas */}
                        <div className="flex-grow overflow-auto p-4 flex items-center justify-center bg-gray-500/10 relative">
                            {viewMode === 'student' ? (
                                <div className="bg-white shadow-lg w-full h-full max-w-4xl mx-auto rounded overflow-hidden relative">
                                    {isPdf ? (
                                        <object data={activeSubmission.previewUrl} type="application/pdf" className="w-full h-full">
                                            {renderPdfFallback(activeSubmission.previewUrl)}
                                        </object>
                                    ) : (
                                        <img src={activeSubmission.previewUrl} alt="Student Work" className="w-full h-auto object-contain" />
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white shadow-lg w-full h-full max-w-4xl mx-auto rounded overflow-hidden relative">
                                    {isModelPdf ? (
                                        <object data={paper.modelAnswerPreviewUrl} type="application/pdf" className="w-full h-full">
                                            {renderPdfFallback(paper.modelAnswerPreviewUrl)}
                                        </object>
                                    ) : (
                                        <img src={paper.modelAnswerPreviewUrl} alt="Model Answer" className="w-full h-auto object-contain" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Grading Tools */}
                    <div className="col-span-5 bg-white h-full overflow-y-auto flex flex-col">
                        {!activeSubmission.gradedResults ? (
                            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                                {activeSubmission.isGrading || autoStart ? (
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="relative">
                                            <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-2xl">🤖</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">AI Grading in Progress</h3>
                                            <p className="text-gray-500">Analyzing answer sheet against rubric...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-6 p-6 bg-blue-50 rounded-full">
                                            <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Ready to Grade</h3>
                                        <p className="text-gray-500 mb-8 max-w-xs">Use AI to analyze this submission against your rubric instantly.</p>
                                        <button 
                                            onClick={() => onGradeSubmission(activeSubmission.id)}
                                            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center gap-2"
                                        >
                                            Start AI Grading
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="p-6 space-y-6 pb-20">
                                {activeSubmission.gradedResults.map((result, idx) => {
                                    const question = paper.rubric.find(q => q.id === result.questionId);
                                    const activeState = gradingEdits[result.questionId] || result;
                                    const isDirty = 'isDirty' in activeState ? activeState.isDirty : false;
                                    const stepAnalysis = activeState.stepAnalysis || [];
                                    const keywordAnalysis = activeState.keywordAnalysis || [];

                                    return (
                                        <div key={idx} className={`border rounded-xl shadow-sm transition-all ${result.disputed ? 'border-yellow-300 ring-4 ring-yellow-50' : 'border-gray-200'}`}>
                                            {/* Card Header */}
                                            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-gray-500 uppercase">Question {idx + 1}</span>
                                                        {result.disputed && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded font-bold">⚠️ Disputed</span>}
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 leading-tight">{question?.question}</h4>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <div className="flex items-baseline gap-1 bg-white px-3 py-1 rounded border shadow-sm">
                                                        <span className="text-xl font-bold text-blue-700">{activeState.marksAwarded}</span>
                                                        <span className="text-xs text-gray-500 font-bold">/ {question?.totalMarks}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Grading Body */}
                                            <div className="p-4 space-y-4">
                                                
                                                {/* Steps Editing */}
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Step Breakdown</p>
                                                    <div className="space-y-2">
                                                        {stepAnalysis.map((step, sIdx) => (
                                                            <div key={sIdx} className="flex items-start gap-3">
                                                                <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${step.marksAwarded === step.maxMarks ? 'bg-green-500' : step.marksAwarded > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                                                <div className="flex-grow min-w-0">
                                                                    <p className="text-gray-700 leading-snug text-sm">{step.stepDescription}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1 border border-gray-200 flex-shrink-0">
                                                                    <input 
                                                                        type="number" 
                                                                        className="w-8 bg-transparent text-center font-bold text-gray-800 focus:outline-none text-sm"
                                                                        value={step.marksAwarded}
                                                                        min={0} max={step.maxMarks}
                                                                        onChange={(e) => handleStepMarkChange(result.questionId, sIdx, parseFloat(e.target.value) || 0, step.maxMarks)}
                                                                    />
                                                                    <span className="text-xs text-gray-400 font-medium whitespace-nowrap">/ {step.maxMarks}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Keyword Editing */}
                                                {keywordAnalysis.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Keywords</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {keywordAnalysis.map((kw, kIdx) => (
                                                                <div key={kIdx} className={`px-2 py-1 rounded border text-xs flex items-center gap-2 ${kw.marksAwarded > 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800 opacity-60'}`}>
                                                                    <span className="font-medium whitespace-nowrap">{kw.keyword}</span>
                                                                    <div className="pl-2 border-l border-gray-300 flex items-center gap-1">
                                                                        <input 
                                                                            type="number"
                                                                            className="w-4 bg-transparent text-center font-bold focus:outline-none"
                                                                            value={kw.marksAwarded}
                                                                            min={0} max={kw.maxMarks}
                                                                            onChange={(e) => handleKeywordMarkChange(result.questionId, kIdx, parseFloat(e.target.value) || 0, kw.maxMarks)}
                                                                        />
                                                                        <span className="text-[10px] text-gray-400">/{kw.maxMarks}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Feedback Box */}
                                                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                                    <p className="text-xs font-bold text-blue-800 uppercase mb-1">AI Feedback</p>
                                                    <p className="text-sm text-blue-900">{result.feedback}</p>
                                                </div>

                                                {/* Dispute / Teacher Comment */}
                                                {(result.disputed || activeState.resolutionComment) && (
                                                    <div className={`p-3 rounded border ${result.disputed ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                                                        {result.disputed && (
                                                            <div className="mb-2 pb-2 border-b border-yellow-200">
                                                                <p className="text-xs font-bold text-yellow-800 uppercase">Student Dispute</p>
                                                                <p className="text-sm text-yellow-900 italic">"{result.disputeReason}"</p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-500 uppercase">Teacher Comment / Resolution</label>
                                                            <input 
                                                                type="text" 
                                                                className="w-full mt-1 p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                                placeholder="Add a comment..."
                                                                value={activeState.resolutionComment}
                                                                onChange={(e) => handleCommentChange(result.questionId, e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Action Bar */}
                                                <div className="pt-2 flex justify-end">
                                                    <button 
                                                        onClick={() => handleSaveChanges(result.questionId)}
                                                        disabled={!isDirty && !result.disputed}
                                                        className={`px-4 py-2 rounded text-sm font-bold shadow-sm transition-all ${
                                                            isDirty || result.disputed
                                                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {result.disputed ? 'Resolve Dispute' : isDirty ? 'Save Changes' : 'Saved'}
                                                    </button>
                                                </div>
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
