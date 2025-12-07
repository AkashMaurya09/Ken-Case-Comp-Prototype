
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { GradingDashboard } from './GradingDashboard';
import { QuestionPaper } from '../../types';
import { seedDatabase } from '../../services/seeder';
import { useToast } from '../../context/ToastContext';

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
    const { questionPapers, studentSubmissions, deleteQuestionPaper } = useAppContext();
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

    const handleSeedData = async () => {
        if (questionPapers.length > 0 && !window.confirm("This will reload/reset the demo data. Continue?")) {
            return;
        }
        
        setIsSeeding(true);
        try {
            await seedDatabase();
            toast.success("Demo data refreshed! You should see new papers and submissions.");
            // Force a reload of the page to ensure context picks up fresh data if needed, 
            // though context should update automatically via AppProvider's internal logic if it was watching DB.
            // Since AppProvider doesn't auto-watch DB events (it loads on mount), we might need to trigger a refresh.
            // For this demo, clicking the button triggers the seeder, but AppContext needs to reload.
            // We'll rely on the user refreshing or the AppContext's exposed reload method if we had one.
            // A simple page reload is the most robust way for a pure client-side demo without complex subscription logic.
            setTimeout(() => window.location.reload(), 1000); 
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to load demo data.");
        } finally {
            setIsSeeding(false);
        }
    };

    const handleDelete = async (paper: QuestionPaper) => {
        if (window.confirm(`Are you sure you want to delete "${paper.title}"? This action cannot be undone.`)) {
            try {
                await deleteQuestionPaper(paper.id);
            } catch (error) {
                // Error handled in context
            }
        }
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
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-gray-800">All Question Papers</h2>
                <button 
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
                >
                    <svg className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isSeeding ? 'Reloading...' : 'Reload Demo Data'}
                </button>
            </div>

            <div className="mt-6">
                {questionPapers.length === 0 ? (
                    <div className="mt-8 bg-white p-8 rounded-lg shadow-md text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <h3 className="mt-4 text-xl font-semibold text-gray-700">No Papers Found</h3>
                        <p className="mt-2 text-gray-500">Go to the "Create Paper" tab to set up your first assignment.</p>
                        
                        <div className="mt-6">
                             <p className="text-sm text-gray-400 mb-3">Or click "Reload Demo Data" above to start with examples.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questionPapers.map(paper => (
                            <div key={paper.id} className="bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{paper.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                        <span>{getSubmissionCount(paper.id)} student submission(s)</span>
                                        {paper.createdAt && (
                                            <span>• {paper.createdAt.toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onEdit && (
                                        <button
                                            onClick={() => onEdit(paper)}
                                            className="bg-gray-50 text-gray-600 p-2 rounded-md hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-transparent transition-all"
                                            title="Edit Paper"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(paper)}
                                        className="bg-red-50 text-red-500 p-2 rounded-md border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                                        title="Delete Paper"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setSelectedPaper(paper)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm hover:shadow"
                                    >
                                        Grade Submissions
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
