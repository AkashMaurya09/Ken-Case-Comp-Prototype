
import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { RainbowButton } from '../../components/RainbowButton';

interface StudentDashboardProps {
    onNavigate: (tab: 'submit' | 'submissions' | 'analytics' | 'disputes') => void;
}

const STUDENT_NAME = "Jane Doe"; // Matching the mock data used in other student views

const TrendChart: React.FC<{ data: { label: string; score: number }[] }> = ({ data }) => {
    if (data.length < 2) {
        return (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm italic border border-dashed border-gray-200 rounded-lg">
                Submit more papers to see your trend!
            </div>
        );
    }

    const maxScore = 100;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - d.score;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="relative h-40 w-full mt-4">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Background Lines */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="#f3f4f6" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="0.5" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#f3f4f6" strokeWidth="0.5" />
                
                {/* Trend Line */}
                <polyline
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2"
                    points={points}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
                
                {/* Data Points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * 100;
                    const y = 100 - d.score;
                    return (
                        <g key={i} className="group">
                            <circle cx={`${x}%`} cy={`${y}%`} r="3" fill="white" stroke="#4f46e5" strokeWidth="2" />
                            {/* Tooltip-like label */}
                            <text 
                                x={`${x}%`} 
                                y={`${y - 5}%`} 
                                textAnchor="middle" 
                                className="text-[3px] fill-gray-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                            >
                                {d.score}%
                            </text>
                        </g>
                    )
                })}
            </svg>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>{data[0].label}</span>
                <span>{data[data.length - 1].label}</span>
            </div>
        </div>
    );
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
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

    const dashboardData = useMemo(() => {
        const mySubmissions = studentSubmissions.filter(s => s.studentName === STUDENT_NAME);
        const gradedSubmissions = mySubmissions.filter(s => s.gradedResults);
        
        // 1. Available Papers (Not submitted yet)
        const submittedPaperIds = new Set(mySubmissions.map(s => s.paperId));
        const availablePapers = questionPapers.filter(p => !submittedPaperIds.has(p.id));

        // 2. Average Score
        let totalScorePct = 0;
        const trendData: { label: string; score: number }[] = [];

        gradedSubmissions.sort((a,b) => a.submissionDate.getTime() - b.submissionDate.getTime()).forEach(sub => {
            const paper = questionPapers.find(p => p.id === sub.paperId);
            if (paper && sub.gradedResults) {
                const awarded = sub.gradedResults.reduce((acc, r) => acc + r.marksAwarded, 0);
                const total = paper.rubric.reduce((acc, r) => acc + r.totalMarks, 0);
                if (total > 0) {
                    const pct = Math.round((awarded / total) * 100);
                    totalScorePct += pct;
                    trendData.push({ 
                        label: paper.title.split(' ').slice(0, 2).join(' '), // Short label 
                        score: pct 
                    });
                }
            }
        });

        const avgScore = gradedSubmissions.length > 0 ? Math.round(totalScorePct / gradedSubmissions.length) : 0;

        // 3. Pending
        const pendingCount = mySubmissions.length - gradedSubmissions.length;
        
        // 4. Latest Feedback
        const latestGraded = gradedSubmissions.length > 0 
            ? gradedSubmissions[gradedSubmissions.length - 1] 
            : null;
        
        let latestPaperTitle = '';
        let latestScore = 0;
        let latestTotal = 0;
        
        if (latestGraded) {
            const p = questionPapers.find(x => x.id === latestGraded.paperId);
            latestPaperTitle = p?.title || 'Unknown';
            latestScore = latestGraded.gradedResults!.reduce((a, b) => a + b.marksAwarded, 0);
            latestTotal = p?.rubric.reduce((a, b) => a + b.totalMarks, 0) || 0;
        }

        return {
            availablePapers: availablePapers.slice(0, 3), // Show top 3
            availableCount: availablePapers.length,
            avgScore,
            submissionsCount: mySubmissions.length,
            pendingCount,
            trendData: trendData.slice(-5), // Last 5 scores
            latestGraded: latestGraded ? { title: latestPaperTitle, score: latestScore, total: latestTotal } : null
        };
    }, [questionPapers, studentSubmissions]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
                        {greeting}, <span className="text-indigo-600">{STUDENT_NAME.split(' ')[0]}</span>
                    </h2>
                    <p className="mt-1 text-gray-500 font-medium">Ready to continue your learning journey?</p>
                </div>
                <div className="flex items-center gap-3">
                    <RainbowButton 
                        onClick={() => onNavigate('submit')}
                        className="h-10 px-6 text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Submit Paper
                    </RainbowButton>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Average Score */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-24 h-24 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Average Score</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className={`text-3xl font-extrabold ${dashboardData.avgScore >= 80 ? 'text-green-600' : dashboardData.avgScore >= 50 ? 'text-yellow-600' : 'text-gray-800'}`}>
                            {dashboardData.avgScore}%
                        </h3>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                        <div 
                            className={`h-1.5 rounded-full ${dashboardData.avgScore >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                            style={{ width: `${dashboardData.avgScore}%` }}
                        ></div>
                    </div>
                </div>

                {/* Submissions */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('submissions')}>
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Submissions</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-extrabold text-gray-800">{dashboardData.submissionsCount}</h3>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">Lifetime</span>
                    </div>
                    <p className="text-xs text-indigo-600 mt-4 font-medium flex items-center gap-1 hover:underline">
                        View history &rarr;
                    </p>
                </div>

                {/* Pending Results */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <p className="text-gray-500 text-sm font-medium mb-1">Pending Results</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-extrabold text-gray-800">{dashboardData.pendingCount}</h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 font-medium">
                        Submissions waiting for grading
                    </p>
                </div>

                {/* Available Papers */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-xl shadow-md text-white cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate('submit')}>
                    <p className="text-indigo-100 text-sm font-medium mb-1">Available Papers</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-extrabold">{dashboardData.availableCount}</h3>
                    </div>
                    <p className="text-xs text-indigo-100 mt-4 font-medium flex items-center gap-1">
                        Start a new assignment &rarr;
                    </p>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Performance Graph */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-800">Performance Trend</h3>
                            <button onClick={() => onNavigate('analytics')} className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100">
                                Detailed Analytics
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">Your score progression over the last 5 graded assignments</p>
                        <TrendChart data={dashboardData.trendData} />
                    </div>

                    {/* Latest Feedback Highlight */}
                    {dashboardData.latestGraded ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-green-100 flex justify-between items-center">
                                <h3 className="font-bold text-green-900 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Latest Feedback
                                </h3>
                                <span className="text-xs font-bold text-green-700 bg-white px-2 py-1 rounded border border-green-200">
                                    {Math.round((dashboardData.latestGraded.score / dashboardData.latestGraded.total) * 100)}%
                                </span>
                            </div>
                            <div className="p-6">
                                <h4 className="text-lg font-bold text-gray-800 mb-1">{dashboardData.latestGraded.title}</h4>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                    <span>Score: <strong>{dashboardData.latestGraded.score}/{dashboardData.latestGraded.total}</strong></span>
                                </div>
                                <button 
                                    onClick={() => onNavigate('submissions')}
                                    className="text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                >
                                    View Full Feedback &rarr;
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center">
                            <p className="text-gray-500 font-medium">No graded papers yet.</p>
                            <p className="text-sm text-gray-400">Complete an assignment to get detailed AI feedback.</p>
                        </div>
                    )}
                </div>

                {/* Right Column (1/3) */}
                <div className="space-y-6">
                    {/* Available Papers Queue */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-800">Up Next</h3>
                        </div>
                        <div className="p-2 flex-grow">
                            {dashboardData.availablePapers.length > 0 ? (
                                <div className="space-y-2">
                                    {dashboardData.availablePapers.map(paper => (
                                        <div key={paper.id} className="p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all group">
                                            <p className="font-semibold text-gray-800 text-sm mb-1 truncate">{paper.title}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{paper.rubric.length} Questions</span>
                                                <button 
                                                    onClick={() => onNavigate('submit')}
                                                    className="text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-700"
                                                >
                                                    Start
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                    <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    <p className="text-sm">You're all caught up!</p>
                                </div>
                            )}
                        </div>
                        {dashboardData.availablePapers.length > 0 && (
                            <div className="p-3 border-t border-gray-100 text-center">
                                <button onClick={() => onNavigate('submit')} className="text-xs font-bold text-indigo-600 hover:underline">
                                    View All Available
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
