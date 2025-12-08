
import React, { useState } from 'react';
import { CreateQuestionPaper } from './teacher/CreateQuestionPaper';
import { ViewQuestionPapers } from './teacher/ViewQuestionPapers';
import { Analytics } from './teacher/Analytics';
import { ResolveDisputes } from './teacher/ResolveDisputes';
import { TeacherDashboard } from './teacher/TeacherDashboard';
import { QuestionPaper } from '../types';

type TeacherTab = 'dashboard' | 'create' | 'view' | 'analytics' | 'disputes';

interface NavItemProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            isActive 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
        {icon}
        <span className="ml-3">{label}</span>
    </button>
);


export const TeacherView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TeacherTab>('dashboard');
    
    // State to handle navigation from Disputes to Grading Dashboard
    const [navigationState, setNavigationState] = useState<{ paperId: string; submissionId: string } | null>(null);
    const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);

    const handlePaperCreated = () => {
        setEditingPaper(null);
        setActiveTab('view');
    };
    
    const handleEditPaper = (paper: QuestionPaper) => {
        setEditingPaper(paper);
        setActiveTab('create');
    };

    const handleReviewDispute = (paperId: string, submissionId: string) => {
        console.log(`[TeacherView] Navigating to dispute: Paper ${paperId}, Submission ${submissionId}`);
        setNavigationState({ paperId, submissionId });
        setActiveTab('view');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <TeacherDashboard onNavigate={(tab) => setActiveTab(tab)} />;
            case 'create':
                return (
                    <CreateQuestionPaper 
                        initialPaper={editingPaper || undefined}
                        onPaperCreated={handlePaperCreated}
                        onBack={() => {
                            setEditingPaper(null);
                            setActiveTab('view');
                        }}
                    />
                );
            case 'view':
                return (
                    <ViewQuestionPapers 
                        initialPaperId={navigationState?.paperId}
                        initialSubmissionId={navigationState?.submissionId}
                        onEdit={handleEditPaper}
                        // Reset nav state after it's consumed
                        onNavigationComplete={() => setNavigationState(null)}
                    />
                );
            case 'disputes':
                return <ResolveDisputes onReview={handleReviewDispute} />;
            case 'analytics':
                return <Analytics />;
            default:
                return <TeacherDashboard onNavigate={(tab) => setActiveTab(tab)} />;
        }
    };

    const navItems: { id: TeacherTab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
        },
        {
            id: 'create',
            label: 'Create Paper',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
        {
            id: 'view',
            label: 'View All Papers',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
        },
        {
            id: 'disputes',
            label: 'Resolve Disputes',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944a11.955 11.955 0 0118 0c0-1.282-.21-2.517-.618-3.706" /></svg>,
        },
        {
            id: 'analytics',
            label: 'Analytics',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        },
    ];

    return (
        <div className="flex h-[calc(100vh-80px)]">
            {/* Sidebar Drawer */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4">
                    <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wider">Teacher Menu</h2>
                </div>
                <nav className="flex-grow px-4 space-y-1">
                    {navItems.map(item => (
                         <NavItem 
                            key={item.id}
                            label={item.label}
                            icon={item.icon}
                            isActive={activeTab === item.id}
                            onClick={() => {
                                setNavigationState(null); // Clear nav state if clicking manually
                                setEditingPaper(null); // Clear edit state
                                setActiveTab(item.id);
                            }}
                        />
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-grow bg-slate-50 overflow-y-auto">
                <div className="p-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};
