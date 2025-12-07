
import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface TeacherDashboardProps {
    onNavigate: (tab: 'create' | 'view' | 'analytics' | 'disputes') => void;
}

// Helper: Simple CSS-based Bar Chart for distribution
const DistributionChart: React.FC<{ distribution: number[] }> = ({ distribution }) => {
    const maxVal = Math.max(...distribution, 1);
    const labels = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
    
    return (
        <div className="flex items-end justify-between h-32 gap-2 mt-4">
            {distribution.map((val, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                    <div className="relative w-full flex items-end justify-center h-full bg-gray-50 rounded-t-sm overflow-hidden">
                        <div 
                            className={`w-full transition-all duration-500 ${
                                idx === 4 ? 'bg-green-500' : idx === 3 ? 'bg-blue-500' : idx === 2 ? 'bg-yellow-500' : 'bg-red-400'
                            }`}
                            style={{ height: `${(val / maxVal) * 100}%` }}
                        ></div>
                        <div className="absolute bottom-0 opacity-0 group-hover:opacity-100 bg-black text-white text-[10px] px-1 rounded -mb-6 transition-all z-10">
                            {val}
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 font-medium">{labels[idx]}</span>
                </div>
            ))}
        </div>
    );
};

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

    // --- Deep Analytics ---
    const dashboardData = useMemo(() => {
        const totalPapers = questionPapers.length;
        const totalSubmissions = studentSubmissions.length;
        
        // Disputes
        const disputedSubmissions = studentSubmissions.filter(s => s.gradedResults?.some(r => r.disputed));
        const pendingDisputes = disputedSubmissions.length;

        // Grading Status
        const gradedCount = studentSubmissions.filter(s => s.gradedResults).length;
        const pendingGradingCount = totalSubmissions - gradedCount;

        // Score Calculation & Distribution
        let totalScorePercentage = 0;
        let gradedPaperCount = 0;
        const distribution = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100

        studentSubmissions.forEach(sub => {
            if (sub.gradedResults && sub.gradedResults.length > 0) {
                const paper = questionPapers.find(p => p.id === sub.paperId);
                if (paper) {
                    const maxScore = paper.rubric.reduce((acc, q) => acc + q.totalMarks, 0);
                    const obtained = sub.gradedResults.reduce((acc, r) => acc + r.marksAwarded, 0);
                    
                    if (maxScore > 0) {
                        const pct = (obtained / maxScore) * 100;
                        totalScorePercentage += pct;
                        gradedPaperCount++;

                        // Distribution
                        if (pct <= 20) distribution[0]++;
                        else if (pct <= 40) distribution[1]++;
                        else if (pct <= 60) distribution[2]++;
                        else if (pct <= 80) distribution[3]++;
                        else distribution[4]++;
                    }
                }
            }
        });

        const averageScore = gradedPaperCount > 0 ? Math.round(totalScorePercentage / gradedPaperCount) : 0;

        // Tasks Queue
        const recentDisputes = disputedSubmissions.slice(0, 3);
        
        // Find papers with pending submissions
        const papersWithPending = questionPapers.map(p => {
            const subs = studentSubmissions.filter(s => s.paperId === p.id);
            const pending = subs.filter(s => !s.gradedResults).length;
            return { title: p.title, pending, total: subs.length };
        }).filter(p => p.pending > 0).sort((a,b) => b.pending - a.pending).slice(0, 3);

        return {
            totalPapers,
            totalSubmissions,
            pendingDisputes,
            gradedCount,
            pendingGradingCount,
            averageScore,
            distribution,
            recentDisputes,
            papersWithPending
        };
    }, [questionPapers, studentSubmissions]);

    // --- Recent Activity Feed ---
    const recentActivity = useMemo(() => {
        const sortedSubmissions = [...studentSubmissions].sort((a, b) => 
            b.submissionDate.getTime() - a.submissionDate.getTime()
        ).slice(0, 6);

        return sortedSubmissions.map(sub => {
            const paper = questionPapers.find(p => p.id === sub.paperId);
            const isDisputed = sub.gradedResults?.some(r => r.disputed);
            const isGraded = !!sub.gradedResults;

            return {
                id: sub.id,
                studentName: sub.studentName,
                paperTitle: paper?.title || 'Unknown Paper',
                date: sub.submissionDate,
                type: isDisputed ? 'dispute' : isGraded ? 'grade' : 'submission'
            };
        });
    }, [studentSubmissions, questionPapers]);

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
                        {greeting}, <span className="text-blue-600">{userProfile?.displayName?.split(' ')[0] || 'Educator'}</span>
                    </h2>
                    <p className="mt-1 text-gray-500 font-medium">Here's what's happening in your classroom today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => onNavigate('create')}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Paper
                    </button>
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-sm font-medium text-gray-600">
                        {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Pending Tasks Card */}
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-5 text-white shadow-md relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('view')}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Pending Grading</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold">{dashboardData.pendingGradingCount}</h3>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white">submissions</span>
                    </div>
                    <p className="text-xs text-blue-100 mt-4 font-medium flex items-center gap-1">
                        Requires action &rarr;
                    </p>
                </div>

                {/* Disputes Card */}
                <div 
                    className={`rounded-xl p-5 shadow-sm border relative overflow-hidden cursor-pointer transition-colors ${dashboardData.pendingDisputes > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                    onClick={() => onNavigate('disputes')}
                >
                    <div className="flex justify-between items-start mb-2">
                        <p className={`text-sm font-medium ${dashboardData.pendingDisputes > 0 ? 'text-red-600' : 'text-gray-500'}`}>Active Disputes</p>
                        <span className={`p-1.5 rounded-md ${dashboardData.pendingDisputes > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                         <h3 className={`text-3xl font-bold ${dashboardData.pendingDisputes > 0 ? 'text-red-700' : 'text-gray-800'}`}>{dashboardData.pendingDisputes}</h3>
                    </div>
                    {dashboardData.pendingDisputes > 0 && (
                        <p className="text-xs text-red-500 mt-4 font-medium">Students waiting for review</p>
                    )}
                </div>

                {/* Avg Score Card */}
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-gray-500">Class Average</p>
                        <span className="p-1.5 rounded-md bg-green-50 text-green-600">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                         <h3 className="text-3xl font-bold text-gray-800">{dashboardData.averageScore}%</h3>
                         <span className="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">Good</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1 mt-4">
                        <div className="bg-green-500 h-1 rounded-full" style={{ width: `${dashboardData.averageScore}%` }}></div>
                    </div>
                </div>

                {/* Activity Stats */}
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-gray-500">Total Graded</p>
                        <span className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800">{dashboardData.gradedCount}</h3>
                    <p className="text-xs text-gray-400 mt-4">Across {dashboardData.totalPapers} active papers</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (2/3): Activity & Charts */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Performance Overview */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800">Class Performance Overview</h3>
                            <button onClick={() => onNavigate('analytics')} className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                                Full Analytics
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">Grade distribution across all graded submissions</p>
                        <DistributionChart distribution={dashboardData.distribution} />
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-800">Live Activity Feed</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {recentActivity.length > 0 ? recentActivity.map((activity) => (
                                <div key={activity.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                        activity.type === 'dispute' ? 'bg-red-500' :
                                        activity.type === 'grade' ? 'bg-green-500' : 'bg-blue-400'
                                    }`}></div>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            <span className="font-bold">{activity.studentName}</span> 
                                            {activity.type === 'dispute' ? ' disputed a grade in ' : 
                                             activity.type === 'grade' ? ' received a grade for ' : ' submitted '}
                                            <span className="text-gray-600">{activity.paperTitle}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {activity.date.toLocaleDateString()}
                                        </p>
                                    </div>
                                    {activity.type === 'dispute' && (
                                        <span className="px-2 py-1 rounded bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wide">
                                            Dispute
                                        </span>
                                    )}
                                </div>
                            )) : (
                                <div className="p-8 text-center text-gray-500">No recent activity.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (1/3): Attention & Quick Links */}
                <div className="space-y-6">
                    
                    {/* Needs Attention Queue */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-orange-50 border-b border-orange-100">
                            <h3 className="font-bold text-orange-800 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Needs Attention
                            </h3>
                        </div>
                        <div className="p-2">
                            {/* Pending Grading List */}
                            {dashboardData.papersWithPending.length > 0 && (
                                <div className="mb-2">
                                    <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Grading Queue</p>
                                    {dashboardData.papersWithPending.map((p, i) => (
                                        <div key={i} className="px-3 py-2 hover:bg-gray-50 rounded flex justify-between items-center cursor-pointer" onClick={() => onNavigate('view')}>
                                            <div className="truncate pr-2">
                                                <p className="text-sm font-medium text-gray-700 truncate">{p.title}</p>
                                                <div className="w-24 bg-gray-200 rounded-full h-1 mt-1.5">
                                                    <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${((p.total - p.pending)/p.total)*100}%`}}></div>
                                                </div>
                                            </div>
                                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                                                {p.pending} left
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Disputes List */}
                            {dashboardData.recentDisputes.length > 0 && (
                                <div>
                                    <div className="border-t border-gray-100 my-2"></div>
                                    <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Disputes</p>
                                    {dashboardData.recentDisputes.map((d, i) => (
                                        <div key={i} className="px-3 py-2 hover:bg-gray-50 rounded flex justify-between items-center cursor-pointer" onClick={() => onNavigate('disputes')}>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">{d.studentName}</p>
                                                <p className="text-xs text-gray-500">Waiting since {d.submissionDate.toLocaleDateString()}</p>
                                            </div>
                                            <span className="text-red-500">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {dashboardData.papersWithPending.length === 0 && dashboardData.recentDisputes.length === 0 && (
                                <div className="p-6 text-center text-gray-400 text-sm">
                                    <p>All caught up! 🎉</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h3 className="font-bold text-gray-800 mb-4">Quick Shortcuts</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => onNavigate('view')} className="p-3 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors text-center">
                                <span className="block text-2xl mb-1">📝</span>
                                <span className="text-xs font-semibold text-gray-600">Grade Papers</span>
                            </button>
                            <button onClick={() => onNavigate('analytics')} className="p-3 bg-gray-50 rounded-lg hover:bg-purple-50 hover:text-purple-600 transition-colors text-center">
                                <span className="block text-2xl mb-1">📊</span>
                                <span className="text-xs font-semibold text-gray-600">Reports</span>
                            </button>
                            <button onClick={() => onNavigate('disputes')} className="p-3 bg-gray-50 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-center">
                                <span className="block text-2xl mb-1">⚖️</span>
                                <span className="text-xs font-semibold text-gray-600">Disputes</span>
                            </button>
                            <button className="p-3 bg-gray-50 rounded-lg hover:bg-green-50 hover:text-green-600 transition-colors text-center" onClick={() => {}}>
                                <span className="block text-2xl mb-1">⚙️</span>
                                <span className="text-xs font-semibold text-gray-600">Settings</span>
                            </button>
                        </div>
                    </div>

                    {/* System Status (Mock) */}
                    <div className="bg-slate-800 rounded-xl p-5 text-white shadow-md">
                        <h3 className="font-bold text-sm uppercase tracking-wide opacity-80 mb-4">System Status</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> AI Grader</span>
                                <span className="text-green-400 font-mono">Operational</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-green-400 rounded-full"></div> Database</span>
                                <span className="text-green-400 font-mono">Connected</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
