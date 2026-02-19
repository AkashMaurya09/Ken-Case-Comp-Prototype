import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { GradingDashboard } from './GradingDashboard';
import { QuestionPaper } from '../../types';
import { useToast } from '../../context/ToastContext';
import { RainbowButton } from '../../components/RainbowButton';
import { Spinner } from '../../components/Spinner';

interface ViewQuestionPapersProps {
    initialPaperId?: string;
    initialSubmissionId?: string;
    onNavigationComplete?: () => void;
    onEdit?: (paper: QuestionPaper) => void;
}

export const ViewQuestionPapers: React.FC<ViewQuestionPapersProps> = ({ 
    initialPaperId, 
    initialSubmissionId,
    onNavigationComplete,
    onEdit
}) => {
    const { questionPapers, studentSubmissions, deleteQuestionPaper, loadSamples, isLoading } = useAppContext();
    const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
    const [isSeeding, setIsSeeding] = useState(false);
    const toast = useToast();

    // Handle incoming navigation request
    useEffect(() => {
        if (initialPaperId && questionPapers.length > 0) {
            const paper = questionPapers.find(p => p.id === initialPaperId);
            if (paper) {
                setSelectedPaper(paper);
                if (onNavigationComplete) onNavigationComplete();
            }
        }
    }, [initialPaperId, questionPapers, onNavigationComplete]);

    const getSubmissionCount = (paperId: string) => {
        return studentSubmissions.filter(s => s.paperId === paperId).length;
    };

    const handleDelete = async (paper: QuestionPaper) => {
        if (window.confirm(`Are you sure you want to delete "${paper.title}"? This will remove it from local storage.`)) {
            try {
                await deleteQuestionPaper(paper.id);
            } catch (error) {}
        }
    };

    const handleLoadSamples = async () => {
        setIsSeeding(true);
        await loadSamples();
        setIsSeeding(false);
    };

    if (selectedPaper) {
        return (
            <GradingDashboard 
                paper={selectedPaper} 
                initialSubmissionId={initialSubmissionId}
                onBack={() => setSelectedPaper(null)} 
            />
        );
    }

    return (
        <div className="animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Local Question Papers</h2>
                {questionPapers.length > 0 && (
                    <button 
                        onClick={handleLoadSamples}
                        disabled={isSeeding}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors flex items-center gap-2"
                    >
                        {isSeeding ? <Spinner size="sm" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                        {isSeeding ? 'Importing...' : 'Restore Sample Papers'}
                    </button>
                )}
            </div>

            <div className="mt-6">
                {isLoading ? (
                    <div className="py-20 flex justify-center"><Spinner size="lg" text="Syncing local database..." /></div>
                ) : questionPapers.length === 0 ? (
                    <div className="mt-8 bg-white p-12 rounded-2xl shadow-sm border border-dashed border-gray-300 text-center">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">Local Database Empty</h3>
                        <p className="mt-2 text-gray-500 max-w-md mx-auto">Create a new paper manually or initialize your workspace with our curated sample papers for Physics, Math, and CS.</p>
                        
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <RainbowButton onClick={handleLoadSamples} disabled={isSeeding} className="px-8 h-12">
                                {isSeeding ? <Spinner size="sm" /> : <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                {isSeeding ? 'Importing Samples...' : 'Load Sample Papers'}
                            </RainbowButton>
                            <span className="text-gray-400 font-medium">or</span>
                            <button 
                                onClick={() => window.dispatchEvent(new CustomEvent('navigate-teacher', { detail: 'create' }))} 
                                className="text-blue-600 font-bold hover:underline py-2"
                            >
                                Start from Scratch
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {questionPapers.map(paper => (
                            <div key={paper.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-blue-300 hover:shadow-md group">
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl font-bold text-gray-900 truncate">{paper.title}</h3>
                                        {paper.subject && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-100">
                                                {paper.subject}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            {getSubmissionCount(paper.id)} submissions
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            {new Date(paper.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onEdit?.(paper)}
                                        className="p-2.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Edit Paper"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(paper)}
                                        className="p-2.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Delete Paper"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                    <RainbowButton
                                        onClick={() => setSelectedPaper(paper)}
                                        className="h-10 px-5 text-sm"
                                    >
                                        Grade Class
                                    </RainbowButton>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};