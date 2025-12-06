
import React, { useState, useEffect } from 'react';

interface Question {
    question: string;
    totalMarks: number;
    finalAnswer?: string;
    steps?: { description: string; marks: number }[];
    keywords?: { keyword: string; marks: number }[];
}

interface QuestionReviewModalProps {
    initialQuestions: Question[];
    onConfirm: (reviewedQuestions: Question[]) => void;
    onClose: () => void;
}

export const QuestionReviewModal: React.FC<QuestionReviewModalProps> = ({ initialQuestions, onConfirm, onClose }) => {
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<number | null>(0);
    const [hasValidationErrors, setHasValidationErrors] = useState(false);

    useEffect(() => {
        setQuestions(initialQuestions);
    }, [initialQuestions]);

    // Validation Effect
    useEffect(() => {
        const hasErrors = questions.some(q => {
            const stepTotal = q.steps?.reduce((sum, s) => sum + s.marks, 0) || 0;
            const keywordTotal = q.keywords?.reduce((sum, k) => sum + k.marks, 0) || 0;
            const breakdownTotal = stepTotal + keywordTotal;
            return breakdownTotal !== q.totalMarks;
        });
        setHasValidationErrors(hasErrors);
    }, [questions]);

    const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
        setQuestions(updatedQuestions);
    };

    // --- Step Handling ---
    const addStep = (qIndex: number) => {
        const updated = [...questions];
        const steps = updated[qIndex].steps || [];
        updated[qIndex].steps = [...steps, { description: '', marks: 0 }];
        setQuestions(updated);
    };

    const updateStep = (qIndex: number, sIndex: number, field: 'description' | 'marks', value: any) => {
        const updated = [...questions];
        if (updated[qIndex].steps) {
            updated[qIndex].steps![sIndex] = { ...updated[qIndex].steps![sIndex], [field]: value };
            setQuestions(updated);
        }
    };

    const removeStep = (qIndex: number, sIndex: number) => {
        const updated = [...questions];
        if (updated[qIndex].steps) {
            updated[qIndex].steps = updated[qIndex].steps!.filter((_, i) => i !== sIndex);
            setQuestions(updated);
        }
    };

    // --- Keyword Handling ---
    const addKeyword = (qIndex: number) => {
        const updated = [...questions];
        const keywords = updated[qIndex].keywords || [];
        updated[qIndex].keywords = [...keywords, { keyword: '', marks: 0 }];
        setQuestions(updated);
    };

    const updateKeyword = (qIndex: number, kIndex: number, field: 'keyword' | 'marks', value: any) => {
        const updated = [...questions];
        if (updated[qIndex].keywords) {
            updated[qIndex].keywords![kIndex] = { ...updated[qIndex].keywords![kIndex], [field]: value };
            setQuestions(updated);
        }
    };

    const removeKeyword = (qIndex: number, kIndex: number) => {
        const updated = [...questions];
        if (updated[qIndex].keywords) {
            updated[qIndex].keywords = updated[qIndex].keywords!.filter((_, i) => i !== kIndex);
            setQuestions(updated);
        }
    };

    const handleRemoveQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
        if (expandedQuestionIndex === index) setExpandedQuestionIndex(null);
    };

    const handleConfirm = () => {
        if (!hasValidationErrors) {
            onConfirm(questions);
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-white rounded-xl shadow-2xl p-6 m-4 max-w-4xl w-full max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Review Rubric</h2>
                        <p className="text-sm text-gray-500">The AI has generated questions and suggested a marking scheme. Please review.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl font-light">&times;</button>
                </div>

                <div className="overflow-y-auto flex-grow pr-2 space-y-4">
                    {questions.length > 0 ? (
                        questions.map((q, qIndex) => {
                            const stepTotal = q.steps?.reduce((sum, s) => sum + s.marks, 0) || 0;
                            const keywordTotal = q.keywords?.reduce((sum, k) => sum + k.marks, 0) || 0;
                            const breakdownTotal = stepTotal + keywordTotal;
                            const isMatch = breakdownTotal === q.totalMarks;

                            return (
                                <div key={qIndex} className={`p-4 border rounded-lg space-y-3 ${isMatch ? 'border-gray-200 bg-gray-50' : 'border-red-300 bg-red-50'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="w-full mr-4">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question {qIndex + 1}</label>
                                            <textarea
                                                value={q.question}
                                                onChange={e => handleQuestionChange(qIndex, 'question', e.target.value)}
                                                className="p-3 border border-gray-300 rounded-md w-full text-base font-medium bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-shadow"
                                                rows={2}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveQuestion(qIndex)}
                                            className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                            title="Remove Question"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expected Answer (Markdown Supported)</label>
                                            <textarea
                                                value={q.finalAnswer || ''}
                                                onChange={e => handleQuestionChange(qIndex, 'finalAnswer', e.target.value)}
                                                className="p-3 border border-gray-300 rounded-md w-full text-sm font-mono bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none h-24 resize-none transition-shadow"
                                                placeholder="Markdown supported for tables..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Marks</label>
                                            <input
                                                type="number"
                                                value={q.totalMarks}
                                                onChange={e => handleQuestionChange(qIndex, 'totalMarks', parseInt(e.target.value) || 0)}
                                                className="p-3 border border-gray-300 rounded-md w-full text-base font-bold text-center bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                            />
                                            {/* Validation Status */}
                                            <div className="mt-2 text-center">
                                                {isMatch ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Valid
                                                    </span>
                                                ) : (
                                                    <div className="text-xs font-bold text-red-600 bg-white border border-red-200 px-2 py-1 rounded shadow-sm">
                                                        Mismatch!<br/>
                                                        Total: {q.totalMarks} vs Breakdown: {breakdownTotal}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Accordion for Steps/Keywords */}
                                    <div className="mt-2">
                                        <button 
                                            onClick={() => setExpandedQuestionIndex(expandedQuestionIndex === qIndex ? null : qIndex)}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                        >
                                            {expandedQuestionIndex === qIndex ? 'Hide Marking Scheme' : 'Edit Marking Scheme (Steps & Keywords)'}
                                            <svg className={`w-3 h-3 transform transition-transform ${expandedQuestionIndex === qIndex ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>

                                        {expandedQuestionIndex === qIndex && (
                                            <div className="mt-3 pl-4 border-l-2 border-blue-200 space-y-4 animate-slide-up">
                                                {/* Steps */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-600 uppercase">Step-wise Marking</span>
                                                        <button onClick={() => addStep(qIndex)} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">+ Add Step</button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {q.steps?.map((step, sIndex) => (
                                                            <div key={sIndex} className="flex gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={step.description} 
                                                                    onChange={e => updateStep(qIndex, sIndex, 'description', e.target.value)}
                                                                    className="flex-grow p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                                                    placeholder="Step description"
                                                                />
                                                                <input 
                                                                    type="number" 
                                                                    value={step.marks} 
                                                                    onChange={e => updateStep(qIndex, sIndex, 'marks', parseFloat(e.target.value))}
                                                                    className="w-20 p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 text-center focus:ring-1 focus:ring-blue-500 outline-none"
                                                                    placeholder="M"
                                                                />
                                                                <button onClick={() => removeStep(qIndex, sIndex)} className="text-gray-400 hover:text-red-500 px-1">&times;</button>
                                                            </div>
                                                        ))}
                                                        {(!q.steps || q.steps.length === 0) && <p className="text-xs text-gray-400 italic">No steps defined.</p>}
                                                    </div>
                                                </div>

                                                {/* Keywords */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-600 uppercase">Keywords</span>
                                                        <button onClick={() => addKeyword(qIndex)} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">+ Add Keyword</button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {q.keywords?.map((kw, kIndex) => (
                                                            <div key={kIndex} className="flex gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={kw.keyword} 
                                                                    onChange={e => updateKeyword(qIndex, kIndex, 'keyword', e.target.value)}
                                                                    className="flex-grow p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                                                    placeholder="Keyword"
                                                                />
                                                                <input 
                                                                    type="number" 
                                                                    value={kw.marks} 
                                                                    onChange={e => updateKeyword(qIndex, kIndex, 'marks', parseFloat(e.target.value))}
                                                                    className="w-20 p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 text-center focus:ring-1 focus:ring-blue-500 outline-none"
                                                                    placeholder="M"
                                                                />
                                                                <button onClick={() => removeKeyword(qIndex, kIndex)} className="text-gray-400 hover:text-red-500 px-1">&times;</button>
                                                            </div>
                                                        ))}
                                                        {(!q.keywords || q.keywords.length === 0) && <p className="text-xs text-gray-400 italic">No keywords defined.</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No questions found.
                        </div>
                    )}
                </div>

                {hasValidationErrors && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4 border border-red-200 text-center font-medium animate-slide-up">
                        ⚠️ Please adjust Step-wise or Keyword marks to match the Total Marks for each question highlighted in red.
                    </div>
                )}

                <div className="mt-2 pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={questions.length === 0 || hasValidationErrors}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium text-sm shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        Confirm & Create Rubric
                    </button>
                </div>
            </div>
        </div>
    );
};
