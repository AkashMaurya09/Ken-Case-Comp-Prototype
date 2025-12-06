
import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface TeacherDashboardProps {
    onNavigate: (tab: 'create' | 'view' | 'analytics' | 'disputes') => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate }) => {
    const { questionPapers, studentSubmissions } = useAppContext();
    const { userProfile } = useAuth();

    // --- Time-based Greeting ---
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 5) return "Burning the midnight oil";
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    }, []);

    // --- Statistics Calculations ---
    const stats = useMemo(() => {
        const totalPapers = questionPapers.length;
        const totalSubmissions = studentSubmissions.length;
        
        const pendingDisputes = studentSubmissions.filter(s => 
            s.gradedResults?.some(r => r.disputed)
        ).length;

        const gradedCount = studentSubmissions.filter(s => s.gradedResults).length;

        // Calculate Average Class Score
        let totalScorePercentage = 0;
        let gradedPaperCount = 0;

        studentSubmissions.forEach(sub => {
            if (sub.gradedResults && sub.gradedResults.length > 0) {
                const paper = questionPapers.find(p => p.id === sub.paperId);
                if (paper) {
                    const maxScore = paper.rubric.reduce((acc, q) => acc + q.totalMarks, 0);
                    const obtained = sub.gradedResults.reduce((acc, r) => acc + r.marksAwarded, 0);
                    if (maxScore > 0) {
                        totalScorePercentage += (obtained / maxScore) * 100;
                        gradedPaperCount++;
                    }
                }
            }
        });

        const averageScore = gradedPaperCount > 0 ? Math.round(totalScorePercentage / gradedPaperCount) : 0;

        return {
            totalPapers,
            totalSubmissions,
            pendingDisputes,
            gradedCount,
            averageScore
        };
    }, [questionPapers, studentSubmissions]);

    // --- Recent Activity Feed ---
    const recentActivity = useMemo(() => {
        const sortedSubmissions = [...studentSubmissions].sort((a, b) => 
            b.submissionDate.getTime() - a.submissionDate.getTime()
        ).slice(0, 5); // Top 5

        return sortedSubmissions.map(sub => {
            const paper = questionPapers.find(p => p.id === sub.paperId);
            const isDisputed = sub.gradedResults?.some(r => r.disputed);
            const isGraded = !!sub.gradedResults;

            return {
                id: sub.id,
                studentName: sub.studentName,
                paperTitle: paper?.title || 'Unknown Paper',
                date: sub.submissionDate,
                status: isDisputed ? 'Disputed' : isGraded ? 'Graded' : 'Pending',
                statusColor: isDisputed ? 'text-red-600 bg-red-100' : isGraded ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
            };
        });
    }, [studentSubmissions, questionPapers]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">
                        {greeting}, {userProfile?.displayName ? userProfile.displayName.split(' ')[0] : 'Educator'}
                    </h2>
                    <p className="mt-2 text-gray-600">Your grading command center is ready. Here is the latest overview.</p>
                </div>
                <div className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Pending Disputes */}
                <div 
                    onClick={() => onNavigate('disputes')}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pending Disputes</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.pendingDisputes}</h3>
                        </div>
                        <div className={`p-3 rounded-lg ${stats.pendingDisputes > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 group-hover:text-blue-600 transition-colors">Review & Resolve &rarr;</p>
                </div>

                {/* Papers Created */}
                <div 
                    onClick={() => onNavigate('view')}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Active Papers</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalPapers}</h3>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 group-hover:text-blue-600 transition-colors">View All Papers &rarr;</p>
                </div>

                {/* Submissions Graded */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Submissions Graded</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.gradedCount} <span className="text-lg text-gray-400 font-normal">/ {stats.totalSubmissions}</span></h3>
                        </div>
                        <div className="p-3 rounded-lg bg-green-100 text-green-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                        <div 
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${stats.totalSubmissions > 0 ? (stats.gradedCount / stats.totalSubmissions) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>

                {/* Average Score */}
                <div 
                    onClick={() => onNavigate('analytics')}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Class Avg. Score</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.averageScore}%</h3>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 group-hover:text-blue-600 transition-colors">View Detailed Analytics &rarr;</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">Recent Student Activity</h3>
                        <button onClick={() => onNavigate('view')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
                    </div>
                    {recentActivity.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {recentActivity.map(activity => (
                                <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                            {activity.studentName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{activity.studentName}</p>
                                            <p className="text-xs text-gray-500">Submitted: {activity.paperTitle}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${activity.statusColor}`}>
                                            {activity.status}
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {activity.date.toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No recent activity found.
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button 
                            onClick={() => onNavigate('create')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-gray-600"
                        >
                            <div className="bg-blue-100 p-2 rounded-md">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <span className="font-medium">Create New Paper</span>
                        </button>

                        <button 
                            onClick={() => onNavigate('view')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all text-gray-600"
                        >
                            <div className="bg-green-100 p-2 rounded-md">
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <span className="font-medium">Grade Submissions</span>
                        </button>
                        
                        <button 
                            onClick={() => onNavigate('analytics')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all text-gray-600"
                        >
                            <div className="bg-purple-100 p-2 rounded-md">
                                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <span className="font-medium">View Analytics</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
