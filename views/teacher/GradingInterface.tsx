
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

    const isModelAnswerPdf = paper.modelAnswerFile?.type === 'application/pdf';
    const isStudentPdf = activeSubmission?.file?.type === 'application/pdf';

    const renderPdfFallback = (url: string) => (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-gray-500 bg-gray-50">
            <p className="mb-2 text-xs font-semibold">Preview Blocked?</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs bg-blue-50 px-2 py-1 rounded">
                Open PDF
            </a>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Grade Submissions</h3>
            {submissions.length === 0 ? (
                 <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="font-medium">No student submissions yet.</p>
                    <p className="text-sm">Upload a student's answer sheet to begin grading.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
                    {/* Submissions List (Sidebar) */}
                    <div className="lg:col-span-3 border-r pr-4 h-full overflow-y-auto">
                        <h4 className="font-bold text-gray-700 mb-3 uppercase text-xs tracking-wider">Student List</h4>
                        <ul className="space-y-2">
                            {submissions.map(sub => {
                                const {awarded, total} = getTotalMarks(sub);
                                const isSelected = activeSubmissionId === sub.id;
                                return (
                                    <li key={sub.id}>
                                        <button 
                                            onClick={() => setActiveSubmissionId(sub.id)}
                                            className={`w-full text-left p-3 rounded-lg transition-all border ${
                                                isSelected 
                                                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                                : 'border-transparent hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <p className={`font-semibold text-sm ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>{sub.studentName}</p>
                                                {sub.gradedResults?.some(r => r.disputed) && (
                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {sub.gradedResults ? (
                                                    <span className={isSelected ? 'text-blue-600 font-medium' : ''}>Score: {awarded}/{total}</span>
                                                ) : (
                                                    <span className="italic">Not Graded</span>
                                                )}
                                            </p>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Grading Details (Main Area) */}
                    <div className="lg:col-span-9 h-full overflow-y-auto pl-2 pr-2">
                        {!activeSubmission ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <p>Select a student submission to view details.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Header / Controls */}
                                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">{activeSubmission.studentName}</h4>
                                        <p className="text-xs text-gray-500 font-mono">ID: {activeSubmission.id}</p>
                                    </div>
                                    <button
                                        onClick={() => onGradeSubmission(activeSubmission.id)}
                                        disabled={activeSubmission.isGrading}
                                        className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm ${
                                            activeSubmission.isGrading 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                                        }`}
                                    >
                                        {activeSubmission.isGrading ? (
                                            <><Spinner size="sm"/> Grading...</> 
                                        ) : (
                                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Grade with AI</>
                                        )}
                                    </button>
                                </div>

                                {/* Comparison View */}
                                <div className="grid grid-cols-2 gap-4 h-[350px]">
                                    <div className="flex flex-col h-full">
                                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Student Answer</h5>
                                        <div className="flex-grow bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative">
                                            {isStudentPdf ? (
                                                 <object 
                                                    data={activeSubmission.previewUrl} 
                                                    type="application/pdf"
                                                    className="w-full h-full" 
                                                >
                                                    {renderPdfFallback(activeSubmission.previewUrl)}
                                                </object>
                                            ) : (
                                                <img src={activeSubmission.previewUrl} alt="Student submission" className="w-full h-full object-contain" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col h-full">
                                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Model Answer</h5>
                                        <div className="flex-grow bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative">
                                            {isModelAnswerPdf ? (
                                                <object 
                                                    data={paper.modelAnswerPreviewUrl} 
                                                    type="application/pdf"
                                                    className="w-full h-full" 
                                                >
                                                    {renderPdfFallback(paper.modelAnswerPreviewUrl)}
                                                </object>
                                            ) : (
                                                <img src={paper.modelAnswerPreviewUrl} alt="Model Answer" className="w-full h-full object-contain" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {activeSubmission.isGrading && (
                                    <div className="p-8 text-center bg-blue-50 rounded-xl border border-blue-100 animate-pulse">
                                        <div className="mx-auto mb-3"><Spinner size="lg" /></div>
                                        <p className="text-blue-800 font-medium">Analyzing submission against rubric...</p>
                                        <p className="text-sm text-blue-600">Identifying steps, keywords, and improvement areas.</p>
                                    </div>
                                )}

                                {activeSubmission.gradedResults && (
                                    <div className="space-y-6 pt-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <h5 className="text-xl font-bold text-gray-800">Grading Results</h5>
                                        </div>
                                        
                                        {activeSubmission.gradedResults.map((result, index) => {
                                            const question = paper.rubric.find(q => q.id === result.questionId);
                                            const currentInputValue = overrideMarks[result.questionId];
                                            const isChanged = currentInputValue !== undefined && parseInt(currentInputValue, 10) !== result.marksAwarded;
                                            const hasComment = resolutionComments[result.questionId]?.length > 0;
                                            
                                            // Extract detailed analysis
                                            const stepAnalysis = result.stepAnalysis;
                                            const keywordAnalysis = result.keywordAnalysis;

                                            return (
                                                <div key={index} className={`rounded-xl border shadow-sm overflow-hidden transition-all ${
                                                    result.disputed ? 'border-yellow-300 ring-4 ring-yellow-50' : 'border-gray-200 bg-white'
                                                }`}>
                                                    {/* Card Header */}
                                                    <div className="bg-white p-5 flex flex-col sm:flex-row justify-between gap-4 border-b border-gray-100">
                                                        <div className="flex-grow">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded">Q{index + 1}</span>
                                                                {result.disputed && <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">⚠️ Disputed</span>}
                                                            </div>
                                                            <p className="font-bold text-gray-900 text-lg">{question?.question}</p>
                                                        </div>
                                                        
                                                        {/* Score Editor */}
                                                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 flex-shrink-0">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs text-gray-500 font-medium uppercase">Marks</span>
                                                                <div className="flex items-baseline gap-1">
                                                                    <input 
                                                                        type="number"
                                                                        value={currentInputValue ?? ''}
                                                                        onChange={(e) => handleMarksChange(result.questionId, e.target.value)}
                                                                        max={question?.totalMarks}
                                                                        min={0}
                                                                        className="w-12 text-right font-bold text-lg bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none p-0"
                                                                        aria-label={`Override marks for question ${index + 1}`}
                                                                    />
                                                                    <span className="text-gray-400 font-medium text-sm">/ {question?.totalMarks}</span>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleOverrideClick(result.questionId)}
                                                                disabled={!isChanged && !result.disputed && !hasComment}
                                                                className={`ml-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded transition-colors ${
                                                                    isChanged || result.disputed || hasComment
                                                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                {result.disputed ? 'Resolve' : 'Update'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {/* Step Analysis Column */}
                                                        <div>
                                                            <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                                Step-by-Step Breakdown
                                                            </h5>
                                                            
                                                            {stepAnalysis && stepAnalysis.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {stepAnalysis.map((step, idx) => (
                                                                        <div key={idx} className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                                                                            step.status === 'Correct' ? 'bg-emerald-50 border-emerald-100' :
                                                                            step.status === 'Partial' ? 'bg-amber-50 border-amber-100' :
                                                                            'bg-rose-50 border-rose-100'
                                                                        }`}>
                                                                            <div className="flex-shrink-0 mt-0.5">
                                                                                {step.status === 'Correct' ? (
                                                                                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                                                                ) : step.status === 'Partial' ? (
                                                                                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                                                                ) : (
                                                                                    <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-grow min-w-0">
                                                                                <p className={`text-sm ${step.status === 'Missing' ? 'text-rose-800' : 'text-gray-800'}`}>
                                                                                    {step.stepDescription}
                                                                                </p>
                                                                            </div>
                                                                            <div className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${
                                                                                step.status === 'Correct' ? 'bg-emerald-100 text-emerald-800' :
                                                                                step.status === 'Partial' ? 'bg-amber-100 text-amber-800' :
                                                                                'bg-rose-100 text-rose-800'
                                                                            }`}>
                                                                                {step.marksAwarded} / {step.maxMarks}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-500 italic">No detailed steps available.</p>
                                                            )}

                                                            {/* Keywords */}
                                                            {keywordAnalysis && keywordAnalysis.length > 0 && (
                                                                <div className="mt-4">
                                                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Keywords Found</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {keywordAnalysis.map((kw, idx) => (
                                                                            <span key={idx} className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 whitespace-nowrap ${
                                                                                kw.present 
                                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                                                                : 'bg-gray-50 border-gray-200 text-gray-400 decoration-gray-400 line-through opacity-75'
                                                                            }`} title={kw.maxMarks ? `Max: ${kw.maxMarks} marks` : ''}>
                                                                                {kw.keyword} {kw.marksAwarded !== undefined ? `(${kw.marksAwarded}/${kw.maxMarks || '-'})` : ''}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Feedback Column */}
                                                        <div className="flex flex-col gap-4">
                                                            {result.disputed && (
                                                                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400 shadow-sm">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                        <p className="text-sm font-bold text-yellow-800 uppercase">Student Dispute</p>
                                                                    </div>
                                                                    <p className="text-sm text-yellow-900 italic mb-3">"{result.disputeReason}"</p>
                                                                    
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-yellow-800 mb-1">Resolution Comment</label>
                                                                        <input 
                                                                            type="text"
                                                                            placeholder="Reply to student..."
                                                                            className="w-full text-sm p-2 border border-yellow-300 rounded bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                                                            value={resolutionComments[result.questionId] || ''}
                                                                            onChange={(e) => handleCommentChange(result.questionId, e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                                                                <h5 className="text-sm font-bold text-blue-800 uppercase mb-2 flex items-center gap-2">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                                    AI Feedback
                                                                </h5>
                                                                <p className="text-sm text-blue-900 leading-relaxed">{result.feedback}</p>
                                                            </div>
                                                            
                                                            {result.improvementSuggestions && result.improvementSuggestions.length > 0 && (
                                                                <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                                                                    <h5 className="text-sm font-bold text-purple-800 uppercase mb-2 flex items-center gap-2">
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                        Suggestions
                                                                    </h5>
                                                                    <ul className="list-disc list-inside space-y-1">
                                                                        {result.improvementSuggestions.map((s, i) => (
                                                                            <li key={i} className="text-sm text-purple-900">{s}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            {result.resolutionComment && !result.disputed && (
                                                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                                                                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    <div>
                                                                        <span className="text-xs font-bold text-green-800 uppercase block mb-0.5">Resolved</span>
                                                                        <p className="text-sm text-green-800">{result.resolutionComment}</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
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
