import React, { useState } from 'react';
import { AllSubmissions } from './student/AllSubmissions';
import { MyAnalytics } from './student/MyAnalytics';
import { MyDisputes } from './student/MyDisputes';
import { SubmitPaper } from './student/SubmitPaper';
import { StudentSubmission, QuestionPaper } from '../types';
import { useAppContext } from '../context/AppContext';
import { ResultsPage } from './student/ResultsPage';


type StudentTab = 'submit' | 'submissions' | 'analytics' | 'disputes';

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


export const StudentView: React.FC = () => {
    const { questionPapers } = useAppContext();
    const [activeTab, setActiveTab] = useState<StudentTab>('submissions');
    const [viewingSubmission, setViewingSubmission] = useState<StudentSubmission | null>(null);

    const handleViewResults = (submission: StudentSubmission) => {
        setViewingSubmission(submission);
    };
    
    const handleBackToSubmissions = () => {
        setViewingSubmission(null);
    }
    
    const paperForSubmission = viewingSubmission ? questionPapers.find(p => p.id === viewingSubmission.paperId) : null;

    // This is the detailed results view, which takes over the screen
    if (viewingSubmission && paperForSubmission) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <button onClick={handleBackToSubmissions} className="text-sm text-blue-600 hover:underline mb-4">&larr; Back to all submissions</button>
                <ResultsPage
                    submission={viewingSubmission}
                    questionPaper={paperForSubmission}
                    onDispute={() => {}} // Dispute logic is handled in ResultsPage via context
                />
            </div>
        )
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'submit':
                return <SubmitPaper />;
            case 'submissions':
                return <AllSubmissions onViewResults={handleViewResults} />;
            case 'disputes':
                return <MyDisputes />;
            case 'analytics':
                return <MyAnalytics />;
            default:
                return <AllSubmissions onViewResults={handleViewResults} />;
        }
    };
    
    const navItems: { id: StudentTab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'submissions',
            label: 'My Submissions',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
        },
        {
            id: 'submit',
            label: 'Submit Paper',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
        },
        {
            id: 'disputes',
            label: 'My Disputes',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
        },
        {
            id: 'analytics',
            label: 'My Analytics',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
        },
    ];

    return (
        <div className="flex h-[calc(100vh-80px)]">
            {/* Sidebar Drawer */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4">
                    <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wider">Student Menu</h2>
                </div>
                <nav className="flex-grow px-4 space-y-1">
                    {navItems.map(item => (
                         <NavItem 
                            key={item.id}
                            label={item.label}
                            icon={item.icon}
                            isActive={activeTab === item.id}
                            onClick={() => setActiveTab(item.id)}
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
