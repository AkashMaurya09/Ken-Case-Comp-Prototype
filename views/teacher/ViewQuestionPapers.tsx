
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
}

export const ViewQuestionPapers: React.FC<ViewQuestionPapersProps> = ({ 
    initialPaperId, 
    initialSubmissionId,
    onNavigationComplete
}) => {
    const { questionPapers, studentSubmissions } = useAppContext();
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
        setIsSeeding(true);
        try {
            await seedDatabase();
            toast.success("Demo data loaded! Database structure created.");
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to load demo data. Check permissions.");
        } finally {
            setIsSeeding(false);
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
            <h2 className="text-3xl font-bold text-gray-800">All Question Papers</h2>
            <div className="mt-6">
                {questionPapers.length === 0 ? (
                    <div className="mt-8 bg-white p-8 rounded-lg shadow-md text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <h3 className="mt-4 text-xl font-semibold text-gray-700">No Papers Created Yet</h3>
                        <p className="mt-2 text-gray-500">Go to the "Create Paper" tab to set up your first assignment.</p>
                        
                        <div className="mt-6 pt-6 border-t border-gray-100">
                             <p className="text-sm text-gray-400 mb-3">Starting fresh? Create the database structure automatically:</p>
                             <button 
                                onClick={handleSeedData}
                                disabled={isSeeding}
                                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                             >
                                {isSeeding ? 'Creating Tables...' : 'Load Demo Data'}
                             </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questionPapers.map(paper => (
                            <div key={paper.id} className="bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{paper.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                        <span>{getSubmissionCount(paper.id)} student submission(s)</span>
                                        {paper.createdAt && (
                                            <span>• {paper.createdAt.toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPaper(paper)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                                >
                                    Grade Submissions
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};