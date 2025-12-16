
import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { RainbowButton } from '../../components/RainbowButton';
import { AuroraText } from '../../components/AuroraText';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface StudentDashboardProps {
    onNavigate: (tab: 'submit' | 'submissions' | 'analytics' | 'disputes') => void;
}

const STUDENT_NAME = "Jane Doe"; // Matching the mock data used in other student views

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

        // 2. Data processing for charts
        let totalScorePct = 0;
        const comparisonData: any[] = [];
        const trendData: any[] = [];

        // Sort by date ascending for trend
        const sortedGraded = [...gradedSubmissions].sort((a,b) => a.submissionDate.getTime() - b.submissionDate.getTime());

        sortedGraded.forEach(sub => {
            const paper = questionPapers.find(p => p.id === sub.paperId);
            if (paper && sub.gradedResults) {
                const awarded = sub.gradedResults.reduce((acc, r) => acc + r.marksAwarded, 0);
                const total = paper.rubric.reduce((acc, r) => acc + r.totalMarks, 0);
                
                if (total > 0) {
                    const myPct = Math.round((awarded / total) * 100);
                    totalScorePct += myPct;

                    // Calculate Class Average for this specific paper
                    const allSubsForPaper = studentSubmissions.filter(s => s.paperId === sub.paperId && s.gradedResults);
                    let classTotalPct = 0;
                    let validClassCount = 0;
                    allSubsForPaper.forEach(s => {
                        const sAwarded = s.gradedResults!.reduce((acc, r) => acc + r.marksAwarded, 0);
                        // Recalculate paper total in case rubric changed (unlikely but safe)
                        const sPaper = questionPapers.find(p => p.id === s.paperId); 
                        const sTotal = sPaper?.rubric.reduce((acc, r) => acc + r.totalMarks, 0) || total;
                        if(sTotal > 0) {
                            classTotalPct += (sAwarded / sTotal) * 100;
                            validClassCount++;
                        }
                    });
                    const classAvg = validClassCount > 0 ? Math.round(classTotalPct / validClassCount) : 0;

                    const dataPoint = {
                        name: paper.title.length > 15 ? paper.title.substring(0, 15) + '...' : paper.title,
                        fullTitle: paper.title,
                        myScore: myPct,
                        classAvg: classAvg,
                        date: sub.submissionDate.toLocaleDateString()
                    };

                    comparisonData.push(dataPoint);
                    trendData.push(dataPoint);
                }
            }
        });

        const avgScore = gradedSubmissions.length > 0 ? Math.round(totalScorePct / gradedSubmissions.length) : 0;

        // 3. Pending Grading Count
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

        // Mock Rank (Top 10%)
        const classRank = "Top 10%"; 

        return {
            availablePapers: availablePapers.slice(0, 3), // Show top 3
            availableCount: availablePapers.length,
            avgScore,
            submissionsCount: mySubmissions.length,
            pendingCount,
            trendData: trendData.slice(-10), // Last 10 for trend
            comparisonData: comparisonData.slice(-5), // Last 5 for bar chart comparison
            latestGraded: latestGraded ? { title: latestPaperTitle, score: latestScore, total: latestTotal } : null,
            classRank
        };
    }, [questionPapers, studentSubmissions]);

    // Dynamic color for average score card
    const scoreColor = dashboardData.avgScore >= 80 ? 'text-green-600' : dashboardData.avgScore >= 60 ? 'text-blue-600' : 'text-orange-600';
    const scoreBg = dashboardData.avgScore >= 80 ? 'bg-green-500' : dashboardData.avgScore >= 60 ? 'bg-blue-500' : 'bg-orange-500';

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
                        <AuroraText className="font-extrabold text-4xl">
                            {greeting}, {userProfile?.displayName?.split(' ')[0] || STUDENT_NAME.split(' ')[0]}
                        </AuroraText>
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

            {/* Stats Grid - Aligned with Teacher Dashboard Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Average Score */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-500 text-sm font-medium">Average Score</p>
                        <span className={`p-1.5 rounded-md bg-opacity-10 ${scoreColor.replace('text', 'bg')}`}>
                             <svg className={`w-4 h-4 ${scoreColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-extrabold text-gray-800">{dashboardData.avgScore}%</h3>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                        <div className={`h-1.5 rounded-full ${scoreBg}`} style={{ width: `${dashboardData.avgScore}%` }}></div>
                    </div>
                </div>

                {/* Assignments Completed */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('submissions')}>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-500 text-sm font-medium">Completed</p>
                        <span className="p-1.5 rounded-md bg-blue-50">
                             <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-gray-800">{dashboardData.submissionsCount}</h3>
                    <p className="text-xs text-blue-600 mt-4 font-medium flex items-center gap-1 hover:underline">
                        View history &rarr;
                    </p>
                </div>

                {/* Pending Review */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-500 text-sm font-medium">Pending Review</p>
                        <span className="p-1.5 rounded-md bg-yellow-50">
                             <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-gray-800">{dashboardData.pendingCount}</h3>
                    <p className="text-xs text-gray-400 mt-4 font-medium">Waiting for grading</p>
                </div>

                {/* Class Rank (Mock) */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-xl shadow-md text-white">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-indigo-100 text-sm font-medium">Class Rank</p>
                        <span className="p-1.5 rounded-md bg-white/20">
                             <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                        </span>
                    </div>
                    <h3 className="text-3xl font-extrabold">{dashboardData.classRank}</h3>
                    <p className="text-xs text-indigo-100 mt-4 font-medium">Keep it up!</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (2/3): Charts */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Comparison Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-gray-800">Performance vs. Class Average</h3>
                                <p className="text-sm text-gray-500 mt-1">Comparing your score against the class average for recent assignments.</p>
                            </div>
                            <button onClick={() => onNavigate('analytics')} className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100">
                                Full Analytics
                            </button>
                        </div>
                        
                        <div className="flex-grow w-full min-h-0">
                            {dashboardData.comparisonData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboardData.comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }} barGap={0}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[0, 100]} />
                                        <Tooltip 
                                            cursor={{ fill: '#f9fafb' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload.length > 0) return payload[0].payload.fullTitle;
                                                return label;
                                            }}
                                        />
                                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                                        <Bar dataKey="myScore" name="My Score" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Bar dataKey="classAvg" name="Class Average" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col border border-dashed border-gray-100 rounded bg-gray-50/50">
                                    <p>Submit assignments to see performance comparisons.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Performance Trend Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[300px]">
                        <h3 className="font-bold text-gray-800 mb-2">Score Trajectory</h3>
                        <p className="text-sm text-gray-500 mb-6">Your overall grade progression over time.</p>
                        
                        <div className="flex-grow w-full min-h-0">
                            {dashboardData.trendData.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dashboardData.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} dy={10} hide />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} domain={[0, 100]} />
                                        <Tooltip 
                                            contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload.length > 0) return payload[0].payload.fullTitle;
                                                return label;
                                            }}
                                        />
                                        <Area type="monotone" dataKey="myScore" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" name="Score %" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col">
                                    <p>Not enough data for trend analysis yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (1/3): Quick Actions & Lists */}
                <div className="space-y-6">
                    
                    {/* Latest Feedback */}
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
                            <div className="p-5">
                                <h4 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1" title={dashboardData.latestGraded.title}>{dashboardData.latestGraded.title}</h4>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                    <span>Score: <strong>{dashboardData.latestGraded.score}/{dashboardData.latestGraded.total}</strong></span>
                                </div>
                                <button 
                                    onClick={() => onNavigate('submissions')}
                                    className="w-full py-2 text-sm text-center text-indigo-600 font-bold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                    View Detailed Feedback
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6 text-center">
                            <p className="text-gray-500 font-medium">No graded papers yet.</p>
                            <p className="text-sm text-gray-400 mt-1">Complete an assignment to get detailed AI feedback.</p>
                        </div>
                    )}

                    {/* Available Papers Queue */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-800">Up Next</h3>
                        </div>
                        <div className="p-2">
                            {dashboardData.availablePapers.length > 0 ? (
                                <div className="space-y-1">
                                    {dashboardData.availablePapers.map(paper => (
                                        <div key={paper.id} className="p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all group cursor-default">
                                            <p className="font-semibold text-gray-800 text-sm mb-1 truncate">{paper.title}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{paper.rubric.length} Questions</span>
                                                <button 
                                                    onClick={() => onNavigate('submit')}
                                                    className="text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-700 shadow-sm"
                                                >
                                                    Start
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400">
                                    <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
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
