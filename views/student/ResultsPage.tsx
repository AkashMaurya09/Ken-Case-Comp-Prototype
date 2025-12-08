
import React, { useState } from 'react';
import { StudentSubmission, QuestionPaper, GradedResult } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { gradeAnswerSheet } from '../../services/geminiService';
import { useToast } from '../../context/ToastContext';
import { Spinner } from '../../components/Spinner';
import { triggerConfetti } from '../../utils/confetti';
import { RainbowButton } from '../../components/RainbowButton';

interface ResultsPageProps {
    submission: StudentSubmission;
    questionPaper: QuestionPaper;
    onDispute: (questionId: string, reason: string) => void;
}

interface DisputeModalProps {
    result: GradedResult;
    questionText: string;
    onClose: () => void;
    onSubmit: (reason: string) => void;
}

const DisputeModal: React.FC<DisputeModalProps> = ({ result, questionText, onClose, onSubmit }) => {
    const [comment, setComment] = useState('');
    const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
    const [selectedKeywords, setSelectedKeywords] = useState<number[]>([]);

    const toggleStep = (idx: number) => {
        setSelectedSteps(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    };

    const toggleKeyword = (idx: number) => {
        setSelectedKeywords(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    };

    const handleSubmit = () => {
        if (!comment.trim() && selectedSteps.length === 0 && selectedKeywords.length === 0) {
            alert("Please provide a reason or select specific items to dispute.");
            return;
        }

        let constructedReason = comment.trim();
        const disputedParts = [];
        
        if (selectedSteps.length > 0) {
            const stepsText = selectedSteps.map(i => `"${result.stepAnalysis?.[i].stepDescription}"`).join(', ');
            disputedParts.push(`Steps: ${stepsText}`);
        }
        
        if (selectedKeywords.length > 0) {
            const kwText = selectedKeywords.map(i => `"${result.keywordAnalysis?.[i].keyword}"`).join(', ');
            disputedParts.push(`Keywords: ${kwText}`);
        }

        if (disputedParts.length > 0) {
            constructedReason += `\n\n--- Specific Items Disputed ---\n${disputedParts.join('\n')}`;
        }

        onSubmit(constructedReason);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-dropdown" onClick={e => e.stopPropagation()}>
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Raise a Dispute
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <p className="text-sm text-gray-600 mb-4 font-medium">{questionText}</p>
                    
                    <div className="space-y-4">
                        {/* Steps Selection */}
                        {result.stepAnalysis && result.stepAnalysis.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Select Disputed Steps (Optional)</p>
                                <div className="space-y-2 border rounded-lg p-2 bg-gray-50">
                                    {result.stepAnalysis.map((step, idx) => (
                                        <label key={idx} className="flex items-start gap-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedSteps.includes(idx)}
                                                onChange={() => toggleStep(idx)}
                                                className="mt-1 rounded text-red-600 focus:ring-red-500 bg-white"
                                            />
                                            <span className="text-sm text-gray-700">{step.stepDescription} ({step.marksAwarded}/{step.maxMarks})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Keywords Selection */}
                        {result.keywordAnalysis && result.keywordAnalysis.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Select Disputed Keywords (Optional)</p>
                                <div className="flex flex-wrap gap-2 border rounded-lg p-2 bg-gray-50">
                                    {result.keywordAnalysis.map((kw, idx) => (
                                        <label key={idx} className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded border text-xs ${selectedKeywords.includes(idx) ? 'bg-red-100 border-red-300 text-red-800' : 'bg-white border-gray-200 text-gray-700'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedKeywords.includes(idx)}
                                                onChange={() => toggleKeyword(idx)}
                                                className="rounded text-red-600 focus:ring-red-500 bg-white"
                                            />
                                            <span>{kw.keyword}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Comment */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason for Dispute <span className="text-red-500">*</span></label>
                            <textarea 
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white text-gray-900"
                                rows={4}
                                placeholder="Explain why you believe the grading is incorrect..."
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
                    <button 
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
                    >
                        Submit Dispute
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ResultsPage: React.FC<ResultsPageProps> = ({ submission, questionPaper }) => {
    const { updateSubmission } = useAppContext();
    const { gradedResults } = submission;
    const toast = useToast();
    const [isGrading, setIsGrading] = useState(false);
    
    // Progress State
    const [gradingProgress, setGradingProgress] = useState(0);
    const [gradingStatus, setGradingStatus] = useState("Initializing AI...");

    // Modal State
    const [showAnswerSheet, setShowAnswerSheet] = useState(false);
    const [disputeModalData, setDisputeModalData] = useState<{ questionId: string; result: GradedResult; questionText: string } | null>(null);

    const handleDisputeClick = (questionId: string) => {
        const result = submission.gradedResults?.find(r => r.questionId === questionId);
        const question = questionPaper.rubric.find(q => q.id === questionId);
        
        if (result && question) {
            setDisputeModalData({
                questionId,
                result,
                questionText: question.question
            });
        }
    };

    const handleDisputeSubmit = (reason: string) => {
        if (!disputeModalData) return;
        
        if (submission.gradedResults) {
            const updatedResults = submission.gradedResults.map(r =>
                r.questionId === disputeModalData.questionId ? { ...r, disputed: true, disputeReason: reason } : r
            );
            updateSubmission({ ...submission, gradedResults: updatedResults });
            toast.success("Dispute submitted successfully.");
        }
        setDisputeModalData(null);
    };

    // Allows the student to trigger AI grading instantly (Demo/Practice Mode)
    const handleInstantGrade = async () => {
        console.log(`[StudentPortal] Instant grading triggered for submission: ${submission.id}`);
        setIsGrading(true);
        setGradingProgress(0);
        setGradingStatus("Preparing document for analysis...");

        try {
             // In demo mode with local blobs, we need to ensure we have a valid source
             const source = submission.file || submission.previewUrl;
             
             // Validate source for demo
             if (!submission.file && submission.previewUrl.includes('placehold.co')) {
                 console.warn(`[StudentPortal] Grading blocked: Placeholder image detected.`);
                 toast.error("Cannot grade this placeholder submission. Please upload a real file.");
                 setIsGrading(false);
                 return;
             }

             const newGradedResults: GradedResult[] = [];
             const totalQuestions = questionPaper.rubric.length;
             console.log(`[StudentPortal] Starting grading loop for ${totalQuestions} questions.`);
             
             for (let i = 0; i < totalQuestions; i++) {
                 const rubricItem = questionPaper.rubric[i];
                 
                 // Update Status UI
                 setGradingStatus(`Analyzing Question ${i + 1}/${totalQuestions}: "${rubricItem.question.substring(0, 30)}..."`);
                 setGradingProgress(Math.round((i / totalQuestions) * 100));

                 console.log(`[StudentPortal] Grading Question ID: ${rubricItem.id}`);
                 const result = await gradeAnswerSheet(source, rubricItem);
                 newGradedResults.push(result);
                 
                 // Small artificial delay to let the user see the progress bar moving (optional, improves UX feel)
                 await new Promise(r => setTimeout(r, 500));
             }

             setGradingStatus("Finalizing results...");
             setGradingProgress(100);

             console.log(`[StudentPortal] All questions graded. Updating submission...`);
             await updateSubmission({
                 ...submission,
                 gradedResults: newGradedResults,
                 isGrading: false
             });
             console.log(`[StudentPortal] Submission updated successfully.`);
             toast.success("Grading complete! View your detailed results below.");
             triggerConfetti();

        } catch (error: any) {
            console.error("[StudentPortal] Instant grading failed:", error);
            toast.error(error.message || "Failed to grade submission.");
        } finally {
            setIsGrading(false);
            setGradingProgress(0);
        }
    };

    const isPdf = submission.file?.type === 'application/pdf';

    const renderPdfFallback = (url: string) => (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mb-2 font-semibold">Preview not available inline.</p>
            <p className="text-sm mb-4">Your browser may be blocking the PDF preview.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline bg-blue-50 px-4 py-2 rounded-lg font-medium">
                Open PDF in New Tab
            </a>
        </div>
    );

    if (!gradedResults) {
        return (
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Success Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Submission Successful!</h1>
                    <p className="text-lg text-gray-600">
                        Your answer sheet for <span className="font-bold text-gray-900">{questionPaper.title}</span> has been received.
                    </p>
                    <p className="text-sm text-gray-400 mt-2">Submission ID: {submission.id}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Actions & Status */}
                    <div className="space-y-6">
                        {/* Instant Grade Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
                             {/* Decorative background circles */}
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>

                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                    AI Instant Grading
                                </h3>
                                <p className="text-blue-100 mb-8 leading-relaxed">
                                    Don't wait for manual review. Our AI can analyze your submission against the rubric and provide detailed feedback instantly.
                                </p>

                                {!isGrading ? (
                                    <RainbowButton 
                                        onClick={handleInstantGrade}
                                        className="w-full"
                                    >
                                        <span>Get My Grade Now</span>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </RainbowButton>
                                ) : (
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                                        <div className="flex justify-between mb-2 text-sm font-medium text-blue-100">
                                            <span>{gradingStatus}</span>
                                            <span>{gradingProgress}%</span>
                                        </div>
                                        <div className="w-full bg-black/20 rounded-full h-3">
                                            <div 
                                                className="bg-green-400 h-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(74,222,128,0.5)]" 
                                                style={{ width: `${gradingProgress}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-blue-200 mt-4 text-center animate-pulse">Analyzing steps & keywords...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col h-full min-h-[400px]">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Document Preview
                        </h4>
                        <div className="flex-grow bg-gray-100 rounded-xl border border-gray-200 overflow-hidden relative group">
                            {isPdf ? (
                                <div className="w-full h-full min-h-[300px]">
                                    <object data={submission.previewUrl} type="application/pdf" className="w-full h-full">
                                        {renderPdfFallback(submission.previewUrl)}
                                    </object>
                                </div>
                            ) : (
                                <img src={submission.previewUrl} alt="Submission" className="w-full h-full object-contain" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <p className="text-white font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">Hover to view</p>
                            </div>
                        </div>
                         <button 
                            onClick={() => window.open(submission.previewUrl, '_blank')}
                            className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-800 font-medium"
                        >
                            Open in new tab
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const totalAwarded = gradedResults.reduce((sum, result) => sum + result.marksAwarded, 0);
    const totalPossible = questionPaper.rubric.reduce((sum, item) => sum + item.totalMarks, 0);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Grading Results: <span className="text-blue-600">{questionPaper.title}</span></h3>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            if (window.confirm("Regrade this submission? This will overwrite the current results.")) {
                                handleInstantGrade();
                            }
                        }}
                        className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regrade
                    </button>
                    <button 
                        onClick={() => setShowAnswerSheet(true)}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm hover:shadow"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Answer Sheet
                    </button>
                </div>
            </div>
            
            {/* If currently regarding, show overlay/spinner in place of results or on top */}
            {isGrading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
                        <Spinner size="lg" />
                        <p className="mt-4 text-lg font-bold text-gray-800">Regrading...</p>
                        <p className="text-sm text-gray-500 mt-2 text-center">{gradingStatus}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${gradingProgress}%` }}></div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="my-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                    <p className="text-lg font-medium text-gray-600">Total Score</p>
                    <div className="flex items-baseline gap-2">
                         <p className="text-4xl font-extrabold text-blue-700">{totalAwarded}</p>
                         <p className="text-xl font-medium text-gray-500">/ {totalPossible}</p>
                    </div>
                </div>
                <div className="text-right hidden sm:block">
                     <p className="text-sm text-blue-600 font-semibold uppercase tracking-wider">Performance</p>
                     <p className="text-2xl font-bold text-gray-800">{Math.round((totalAwarded/totalPossible)*100)}%</p>
                </div>
            </div>
            
            <div className="mt-8 space-y-8">
                {gradedResults.map((result, index) => {
                    const question = questionPaper.rubric.find(q => q.id === result.questionId);
                    
                    // Access extra AI details safely
                    const stepAnalysis = result.stepAnalysis;
                    const keywordAnalysis = result.keywordAnalysis;

                    const fullMarks = result.marksAwarded === question?.totalMarks;

                    return (
                        <div key={index} className={`rounded-xl border-2 overflow-hidden transition-all ${result.disputed ? 'border-yellow-300 shadow-md' : 'border-gray-200 hover:border-blue-300'}`}>
                            {/* Header */}
                            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-start gap-4">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">Q{index + 1}: {question?.question}</h4>
                                    <div className="flex gap-2 mt-1">
                                         {fullMarks && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Perfect Score</span>}
                                         {result.disputed && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">Disputed</span>}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                                    <p className="text-2xl font-bold text-gray-900">{result.marksAwarded}</p>
                                    <p className="text-xs text-gray-500 uppercase font-bold">out of {question?.totalMarks}</p>
                                </div>
                            </div>
                            
                            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: Detailed Step Analysis (Where marks were given/cut) */}
                                <div>
                                    <h5 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                        Step-by-Step Breakdown
                                    </h5>
                                    
                                    {stepAnalysis && stepAnalysis.length > 0 ? (
                                        <div className="space-y-3">
                                            {stepAnalysis.map((step, idx) => {
                                                const isECF = step.status === 'ECF';
                                                
                                                return (
                                                <div key={idx} className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                                                    step.status === 'Correct' ? 'bg-green-50 border-green-100' : 
                                                    step.status === 'Partial' ? 'bg-yellow-50 border-yellow-100' : 
                                                    isECF ? 'bg-amber-50 border-amber-200' :
                                                    'bg-red-50 border-red-100'
                                                }`}>
                                                    <div className="flex-1 flex items-start gap-2 min-w-0">
                                                        <div className={`mt-0.5 flex-shrink-0 ${
                                                            step.status === 'Correct' ? 'text-green-500' : 
                                                            step.status === 'Partial' ? 'text-yellow-500' : 
                                                            isECF ? 'text-amber-500' :
                                                            'text-red-500'
                                                        }`}>
                                                            {step.status === 'Correct' ? (
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            ) : isECF ? (
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            ) : (
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap ${
                                                                    step.status === 'Correct' ? 'bg-green-200 text-green-800' : 
                                                                    step.status === 'Partial' ? 'bg-yellow-200 text-yellow-800' : 
                                                                    isECF ? 'bg-amber-100 text-amber-800' :
                                                                    'bg-red-200 text-red-800'
                                                                }`}>
                                                                    {step.marksAwarded} / {step.maxMarks}
                                                                </span>
                                                                {isECF && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1 rounded border border-amber-100">ECF applied</span>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm ${step.status === 'Missing' ? 'text-gray-500 line-through decoration-red-300' : 'text-gray-800'}`}>
                                                                    {step.stepDescription}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No specific steps defined for this question.</p>
                                    )}

                                    {/* Keywords Section */}
                                    {keywordAnalysis && keywordAnalysis.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-xs font-semibold text-gray-500 mb-2">KEYWORD CHECK:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {keywordAnalysis.map((kw, idx) => (
                                                    <span key={idx} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 flex-shrink-0 whitespace-nowrap ${
                                                        kw.present 
                                                        ? 'bg-green-50 border-green-200 text-green-700' 
                                                        : 'bg-red-50 border-red-200 text-red-400 opacity-70'
                                                    }`} title={kw.maxMarks ? `Max: ${kw.maxMarks} marks` : ''}>
                                                        {kw.present ? '✓' : '✗'} {kw.keyword} {kw.marksAwarded !== undefined ? `(${kw.marksAwarded}/${kw.maxMarks || '-'})` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Feedback & Suggestions */}
                                <div className="space-y-4">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <h5 className="text-sm font-bold text-blue-800 uppercase mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                            Detailed AI Feedback
                                        </h5>
                                        <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{result.feedback}</p>
                                    </div>

                                    {result.improvementSuggestions && result.improvementSuggestions.length > 0 && (
                                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                            <h5 className="text-sm font-bold text-purple-800 uppercase mb-2 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                To Improve
                                            </h5>
                                            <ul className="list-disc list-inside space-y-1">
                                                {result.improvementSuggestions.map((s, i) => (
                                                    <li key={i} className="text-sm text-purple-900">{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {/* Resolution Comment Display */}
                                    {((result.teacherComments && result.teacherComments.length > 0) || result.resolutionComment) && (
                                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                            <h5 className="text-sm font-bold text-green-800 uppercase mb-2">Teacher's Notes</h5>
                                            
                                            {/* Legacy single comment fallback */}
                                            {result.resolutionComment && (!result.teacherComments || result.teacherComments.length === 0) && (
                                                <p className="text-sm text-green-700">{result.resolutionComment}</p>
                                            )}

                                            {/* Full history */}
                                            {result.teacherComments && result.teacherComments.length > 0 && (
                                                <div className="space-y-3 max-h-40 overflow-y-auto">
                                                    {result.teacherComments.map((comment, i) => (
                                                        <div key={i} className="bg-white/60 p-2 rounded border border-green-100">
                                                            <p className="text-sm text-green-900 whitespace-pre-wrap">{comment.text}</p>
                                                            <span className="text-[10px] text-green-600 block mt-1 text-right">
                                                                {new Date(comment.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end">
                                {result.disputed ? (
                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-md">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Dispute Sent for Review
                                    </span>
                                ) : (result.resolutionComment || (result.teacherComments && result.teacherComments.length > 0)) ? (
                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-md">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Dispute Resolved
                                    </span>
                                ) : (
                                    <button 
                                        onClick={() => handleDisputeClick(result.questionId)}
                                        className="text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
                                    >
                                        Raise a Dispute
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-12">
                 <h4 className="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">Original Answer Sheet</h4>
                 {isPdf ? (
                    <div className="rounded-lg border shadow-sm w-full h-[600px] bg-gray-100 overflow-hidden">
                         <object data={submission.previewUrl} type="application/pdf" className="w-full h-full">
                             {renderPdfFallback(submission.previewUrl)}
                         </object>
                    </div>
                 ) : (
                    <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                         <img src={submission.previewUrl} alt="Your answer sheet" className="rounded shadow-sm w-full max-w-4xl mx-auto" />
                    </div>
                 )}
            </div>

             {/* Floating Action Button for Answer Sheet */}
            <button
                onClick={() => setShowAnswerSheet(true)}
                className="fixed bottom-8 right-8 z-40 bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105 flex items-center gap-2"
                title="View Answer Sheet"
            >
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="font-semibold hidden sm:inline">View Answer Sheet</span>
            </button>

            {/* Answer Sheet Modal */}
            {showAnswerSheet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm" onClick={() => setShowAnswerSheet(false)}>
                    <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-dropdown" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg">Original Answer Sheet</h3>
                            <button 
                                onClick={() => setShowAnswerSheet(false)}
                                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-grow overflow-auto p-4 bg-gray-100 flex justify-center">
                             {isPdf ? (
                                <div className="w-full h-full">
                                    <object data={submission.previewUrl} type="application/pdf" className="w-full h-full rounded bg-white shadow-sm">
                                        {renderPdfFallback(submission.previewUrl)}
                                    </object>
                                </div>
                            ) : (
                                <img src={submission.previewUrl} alt="Original Submission" className="max-w-full h-auto object-contain rounded shadow-sm" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Dispute Modal */}
            {disputeModalData && (
                <DisputeModal
                    result={disputeModalData.result}
                    questionText={disputeModalData.questionText}
                    onClose={() => setDisputeModalData(null)}
                    onSubmit={handleDisputeSubmit}
                />
            )}
        </div>
    );
};
