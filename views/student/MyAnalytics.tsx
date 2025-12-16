
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getMockStudentData } from '../../services/seeder';
import { RetroGrid } from '../../components/RetroGrid';
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
  Area,
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  Cell
} from 'recharts';

const MOCK_STUDENT_NAME = "Jane Doe";

// --- Components ---

const StatCard: React.FC<{
    title: string;
    value: string | number;
    subValue?: string;
    trend?: string;
    trendColor?: string;
    iconColor: string;
}> = ({ title, value, subValue, trend, trendColor, iconColor }) => (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start z-10">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
                {subValue && <p className="text-xs text-gray-400 mt-1 font-medium">{subValue}</p>}
            </div>
            <div className={`w-10 h-10 rounded-lg ${iconColor} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
        </div>
        {trend && (
            <div className="mt-auto z-10">
                 <span className={`text-sm font-bold ${trendColor} flex items-center gap-1`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    {trend}
                 </span>
            </div>
        )}
        {/* Decorative background blob */}
        <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${iconColor} opacity-5 group-hover:scale-110 transition-transform`}></div>
    </div>
);

const ChartCard: React.FC<{title: string; children: React.ReactNode; className?: string}> = ({title, children, className}) => (
    <div className={`bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-96 ${className}`}>
        <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
        <div className="flex-grow min-h-0">
            {children}
        </div>
    </div>
);

// Palette for improvement areas (Warm/Alert colors)
const IMPROVEMENT_COLORS = [
    '#F87171', // Red 400
    '#FB923C', // Orange 400
    '#FBBF24', // Amber 400
    '#F472B6', // Pink 400
    '#FB7185', // Rose 400
    '#C084FC', // Purple 400
    '#A78BFA', // Violet 400
];

export const MyAnalytics: React.FC = () => {
    const { questionPapers: realPapers, studentSubmissions: realSubmissions } = useAppContext();

    // --- Data Prep & Mock Fallback ---
    const mockData = useMemo(() => {
        const hasRealData = realSubmissions.some(s => s.studentName === MOCK_STUDENT_NAME);
        if (!hasRealData) {
            return getMockStudentData();
        }
        return null;
    }, [realSubmissions]);

    const usingMockData = !!mockData;
    const questionPapers = usingMockData ? mockData!.questionPapers : realPapers;
    const studentSubmissions = usingMockData ? mockData!.studentSubmissions : realSubmissions;

    const myGradedSubmissions = useMemo(() => {
        return studentSubmissions.filter(s => s.studentName === MOCK_STUDENT_NAME && s.gradedResults);
    }, [studentSubmissions]);

    // --- Key Metrics Calculation ---
    
    // 1. Overall Average
    const overallAvgScore = useMemo(() => {
        if (myGradedSubmissions.length === 0) return 0;
        let totalPct = 0;
        myGradedSubmissions.forEach(s => {
            const paper = questionPapers.find(p => p.id === s.paperId);
            if (paper) {
                const awarded = s.gradedResults!.reduce((acc, r) => acc + r.marksAwarded, 0);
                const total = paper.rubric.reduce((acc, r) => acc + r.totalMarks, 0);
                if (total > 0) totalPct += (awarded / total);
            }
        });
        return Math.round((totalPct / myGradedSubmissions.length) * 100);
    }, [myGradedSubmissions, questionPapers]);

    // 2. Subject Performance Map
    const subjectStats = useMemo(() => {
        const stats: Record<string, { totalPct: number; count: number }> = {};
        
        myGradedSubmissions.forEach(s => {
            const paper = questionPapers.find(p => p.id === s.paperId);
            const subject = paper?.subject || 'General';
            
            if (paper) {
                const awarded = s.gradedResults!.reduce((acc, r) => acc + r.marksAwarded, 0);
                const total = paper.rubric.reduce((acc, r) => acc + r.totalMarks, 0);
                
                if (total > 0) {
                    if (!stats[subject]) stats[subject] = { totalPct: 0, count: 0 };
                    stats[subject].totalPct += (awarded / total);
                    stats[subject].count++;
                }
            }
        });

        const result = Object.entries(stats).map(([subject, data]) => ({
            subject,
            score: Math.round((data.totalPct / data.count) * 100),
            count: data.count
        }));

        return result.sort((a, b) => b.score - a.score);
    }, [myGradedSubmissions, questionPapers]);

    const strongestSubject = subjectStats.length > 0 ? subjectStats[0] : null;
    const weakestSubject = subjectStats.length > 0 ? subjectStats[subjectStats.length - 1] : null;

    // 3. Trend Data
    const trendData = useMemo(() => {
        return myGradedSubmissions
            .sort((a, b) => a.submissionDate.getTime() - b.submissionDate.getTime())
            .map(sub => {
                const paper = questionPapers.find(p => p.id === sub.paperId);
                const awarded = sub.gradedResults!.reduce((sum, r) => sum + r.marksAwarded, 0);
                const total = paper?.rubric.reduce((sum, q) => sum + q.totalMarks, 0) || 0;
                const score = total > 0 ? Math.round((awarded / total) * 100) : 0;
                
                return { 
                    name: paper?.title.substring(0, 15) + '...',
                    fullName: paper?.title,
                    score,
                    date: sub.submissionDate.toLocaleDateString()
                };
            });
    }, [myGradedSubmissions, questionPapers]);

    // 4. Improvement Areas (Frequency Analysis)
    const improvementAreasData = useMemo(() => {
        const suggestions = myGradedSubmissions.flatMap(s => s.gradedResults?.flatMap(r => r.improvementSuggestions) || []);
        const counts: Record<string, number> = {};
        
        // Simple NLP-ish aggregation: grouping by common keywords could happen here
        // For now, we take exact string matches from the AI output or manual grouping
        suggestions.forEach(s => {
            // Clean up string slightly to group better
            const clean = s.replace(/[.,]/g, '').trim(); 
            counts[clean] = (counts[clean] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([suggestion, count]) => ({ suggestion, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7); // Show top 7
    }, [myGradedSubmissions]);

    // 5. Comparison Data (My Score vs Class Avg)
    const comparisonData = useMemo(() => {
        // Group by subject for cleaner chart
        const data = subjectStats.map(stat => {
            // Calculate Class Average for this subject
            // Find ALL submissions for this subject, not just mine
            const subjectPapers = questionPapers.filter(p => p.subject === stat.subject).map(p => p.id);
            const classSubmissions = studentSubmissions.filter(s => subjectPapers.includes(s.paperId) && s.gradedResults);
            
            let classTotalPct = 0;
            classSubmissions.forEach(s => {
                const p = questionPapers.find(qp => qp.id === s.paperId);
                const awarded = s.gradedResults!.reduce((a, r) => a + r.marksAwarded, 0);
                const total = p?.rubric.reduce((a, r) => a + r.totalMarks, 0) || 1;
                classTotalPct += (awarded / total);
            });
            
            const classAvg = classSubmissions.length > 0 ? Math.round((classTotalPct / classSubmissions.length) * 100) : 0;

            return {
                subject: stat.subject,
                myScore: stat.score,
                classAvg: classAvg
            };
        });
        return data;
    }, [subjectStats, questionPapers, studentSubmissions]);


    return (
        <div className="relative">
            {/* Background Grid */}
            <RetroGrid className="fixed inset-0 z-0 !h-[120%] -top-20" />
            
            <div className="relative z-10 max-w-7xl mx-auto space-y-8 animate-slide-up pb-12">
            
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Performance Analytics</h1>
                    <p className="text-gray-500 mt-2 text-lg">Visualize your progress, identify strengths, and spot areas for improvement.</p>
                </div>

                {/* Banner for Mock Data */}
                {usingMockData && (
                    <div className="bg-indigo-50/90 backdrop-blur-sm border border-indigo-200 text-indigo-700 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
                        <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-medium">Preview Mode: Showing sample analytics because you have no graded submissions yet.</span>
                    </div>
                )}

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Average Score" 
                        value={`${overallAvgScore}%`}
                        subValue={`Across ${myGradedSubmissions.length} assignments`}
                        trend={overallAvgScore >= 80 ? "Top Tier" : "Keep Pushing"}
                        trendColor={overallAvgScore >= 80 ? "text-green-600" : "text-blue-600"}
                        iconColor={overallAvgScore >= 80 ? "bg-green-500" : "bg-blue-500"}
                    />
                    <StatCard 
                        title="Strongest Subject" 
                        value={strongestSubject ? strongestSubject.subject : 'N/A'}
                        subValue={strongestSubject ? `${strongestSubject.score}% Average` : ''}
                        iconColor="bg-purple-500"
                    />
                    <StatCard 
                        title="Needs Focus" 
                        value={weakestSubject ? weakestSubject.subject : 'N/A'}
                        subValue={weakestSubject ? `${weakestSubject.score}% Average` : ''}
                        trend="Action Needed"
                        trendColor="text-orange-600"
                        iconColor="bg-orange-500"
                    />
                    <StatCard 
                        title="Completion Rate" 
                        value="92%" 
                        subValue="On time submissions"
                        trend="Consistent" 
                        trendColor="text-teal-600" 
                        iconColor="bg-teal-500"
                    />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* 1. Overall Score Trend */}
                    <ChartCard title="Grade Trajectory" className="lg:col-span-2">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScoreStudent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                                        labelFormatter={(label, payload) => {
                                            if (payload && payload.length > 0) return payload[0].payload.fullName;
                                            return label;
                                        }}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScoreStudent)" name="Score" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">Not enough data to show trends.</div>
                        )}
                    </ChartCard>

                    {/* 2. Subject Radar Chart */}
                    <ChartCard title="Subject Proficiency Balance">
                        {subjectStats.length > 2 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectStats}>
                                    <PolarGrid stroke="#e5e7eb" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 600 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="My Score"
                                        dataKey="score"
                                        stroke="#8884d8"
                                        strokeWidth={3}
                                        fill="#8884d8"
                                        fillOpacity={0.5}
                                    />
                                    <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col">
                                <p>Submit assignments in at least 3 subjects to see your proficiency map.</p>
                            </div>
                        )}
                    </ChartCard>

                    {/* 3. Performance vs Class Average */}
                    <ChartCard title="Performance vs. Class Average">
                        {comparisonData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[0, 100]} />
                                    <Tooltip 
                                        cursor={{ fill: '#f9fafb' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
                                    <Bar dataKey="myScore" name="My Score" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Bar dataKey="classAvg" name="Class Average" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                No comparison data available.
                            </div>
                        )}
                    </ChartCard>

                    {/* 4. Improvement Areas */}
                    <ChartCard title="Top Areas for Improvement" className="lg:col-span-2">
                        {improvementAreasData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={improvementAreasData}
                                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="suggestion" 
                                        type="category" 
                                        width={200} 
                                        tick={{fontSize: 12, fill: '#4b5563', fontWeight: 500}} 
                                        interval={0}
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                                        formatter={(value) => [`${value} times`, 'Frequency']}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} name="Frequency">
                                        {improvementAreasData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={IMPROVEMENT_COLORS[index % IMPROVEMENT_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col">
                                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p>Great job! No recurring improvement areas detected yet.</p>
                            </div>
                        )}
                    </ChartCard>

                </div>
            </div>
        </div>
    );
};
