
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getMockAnalyticsData } from '../../services/seeder';
import { RetroGrid } from '../../components/RetroGrid';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

// --- Constants & Helpers ---

const SECTIONS = ['Section A', 'Section B', 'Section C'];

const getStudentSection = (name: string) => {
    return SECTIONS[name.length % SECTIONS.length];
};

// Flattened list of all concepts for the filter dropdown
const ALL_CONCEPTS_LIST = [
    'Newton\'s Laws & Forces', 'Kinematics (Motion)', 'Vectors & Scalars', 'Energy & Work',
    'Differentiation Rules', 'Limits & Continuity', 'Algebraic Manipulation',
    'Loop Logic & Iteration', 'Function Implementation', 'Edge Case Handling',
    'Reaction Mechanisms', 'Stoichiometry', 'Chemical Terminology',
    'Causal Analysis', 'Chronological Accuracy', 'Historical Context'
].sort();

// --- Components ---

const StatCard: React.FC<{
    title: string;
    value: string | number;
    trend: string;
    trendColor: string;
    iconColor: string;
}> = ({ title, value, trend, trendColor, iconColor }) => (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start z-10">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-lg ${iconColor} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
        </div>
        <div className="mt-auto z-10">
             <span className={`text-sm font-bold ${trendColor} flex items-center gap-1`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                {trend}
             </span>
        </div>
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

// --- Analytics View ---

export const Analytics: React.FC = () => {
    const { questionPapers: realPapers, studentSubmissions: realSubmissions } = useAppContext();
    
    // --- Filters State ---
    const [selectedSubject, setSelectedSubject] = useState<string>('All Subjects');
    const [selectedSection, setSelectedSection] = useState<string>('All Sections');
    const [selectedStudent, setSelectedStudent] = useState<string>('All Students');
    const [selectedConcept, setSelectedConcept] = useState<string>('All Concepts');

    // Auto-generate mock data locally if real data is empty for better visualization
    const mockData = useMemo(() => {
        if (realSubmissions.length === 0) {
            return getMockAnalyticsData();
        }
        return null;
    }, [realSubmissions.length]);

    const usingMockData = !!mockData;
    const allQuestionPapers = usingMockData ? mockData!.questionPapers : realPapers;
    const allStudentSubmissions = usingMockData ? mockData!.studentSubmissions : realSubmissions;

    // --- Derived Options ---
    const subjects = useMemo(() => {
        const subSet = new Set(allQuestionPapers.map(p => p.subject).filter(Boolean) as string[]);
        return ['All Subjects', ...Array.from(subSet)];
    }, [allQuestionPapers]);

    const students = useMemo(() => {
        const studSet = new Set(allStudentSubmissions.map(s => s.studentName));
        return ['All Students', ...Array.from(studSet).sort()];
    }, [allStudentSubmissions]);

    // --- Master Filter Logic ---
    const { filteredPapers, filteredSubmissions } = useMemo(() => {
        let papers = allQuestionPapers;
        let submissions = allStudentSubmissions;

        // 1. Filter by Subject
        if (selectedSubject !== 'All Subjects') {
            papers = papers.filter(p => p.subject === selectedSubject);
            const paperIds = new Set(papers.map(p => p.id));
            submissions = submissions.filter(s => paperIds.has(s.paperId));
        }

        // 2. Filter by Section
        if (selectedSection !== 'All Sections') {
            submissions = submissions.filter(s => getStudentSection(s.studentName) === selectedSection);
        }

        // 3. Filter by Student
        if (selectedStudent !== 'All Students') {
            submissions = submissions.filter(s => s.studentName === selectedStudent);
        }

        // 4. Filter by Concept (Advanced)
        // If a concept is selected, we only keep submissions that have suggestions matching that concept key words
        if (selectedConcept !== 'All Concepts') {
            const conceptKeywords = selectedConcept.toLowerCase().split(' ').filter(w => w.length > 3);
            submissions = submissions.filter(s => {
                if (!s.gradedResults) return false;
                // Check if any suggestion contains words from the concept title
                return s.gradedResults.some(r => 
                    r.improvementSuggestions.some(sug => 
                        conceptKeywords.some(cw => sug.toLowerCase().includes(cw))
                    )
                );
            });
        }

        return { filteredPapers: papers, filteredSubmissions: submissions };
    }, [selectedSubject, selectedSection, selectedStudent, selectedConcept, allQuestionPapers, allStudentSubmissions]);


    // --- Aggregations ---
    const gradedSubmissions = filteredSubmissions.filter(s => s.gradedResults);
    const totalPapersGraded = gradedSubmissions.length;
    
    // Accuracy
    const disputedCount = gradedSubmissions.filter(s => s.gradedResults?.some(r => r.disputed)).length;
    const accuracyRate = totalPapersGraded > 0 ? Math.round(100 - ((disputedCount / totalPapersGraded) * 100)) : 100;

    // Avg Score
    let totalScorePct = 0;
    let validScoreCount = 0;
    gradedSubmissions.forEach(s => {
        const p = allQuestionPapers.find(qp => qp.id === s.paperId);
        if (p && s.gradedResults) {
            const earned = s.gradedResults.reduce((a, b) => a + b.marksAwarded, 0);
            const total = p.rubric.reduce((a, b) => a + b.totalMarks, 0);
            if (total > 0) {
                totalScorePct += (earned / total);
                validScoreCount++;
            }
        }
    });
    const avgScore = validScoreCount > 0 ? Math.round((totalScorePct / validScoreCount) * 100) : 0;

    // --- Chart Data: Subject Performance Comparison ---
    const subjectPerformanceData = useMemo(() => {
        // Group filtered submissions by Subject
        const subjectGroups: Record<string, { totalPct: number; count: number }> = {};

        gradedSubmissions.forEach(s => {
            const p = allQuestionPapers.find(qp => qp.id === s.paperId);
            const subj = p?.subject || 'Other';
            
            if (p && s.gradedResults) {
                const earned = s.gradedResults.reduce((a, b) => a + b.marksAwarded, 0);
                const total = p.rubric.reduce((a, b) => a + b.totalMarks, 0);
                if (total > 0) {
                    if (!subjectGroups[subj]) subjectGroups[subj] = { totalPct: 0, count: 0 };
                    subjectGroups[subj].totalPct += (earned / total);
                    subjectGroups[subj].count++;
                }
            }
        });

        return Object.entries(subjectGroups).map(([subject, data]) => ({
            subject,
            score: Math.round((data.totalPct / data.count) * 100),
            count: data.count
        })).sort((a, b) => b.score - a.score);
    }, [gradedSubmissions, allQuestionPapers]);

    // --- Chart Data: Paper Performance Comparison ---
    const paperPerformanceData = useMemo(() => {
        const data = filteredPapers.map(paper => {
            const paperSubmissions = gradedSubmissions.filter(s => s.paperId === paper.id);
            if (paperSubmissions.length === 0) return null;

            let totalPct = 0;
            paperSubmissions.forEach(s => {
                if (s.gradedResults) {
                    const earned = s.gradedResults.reduce((a, b) => a + b.marksAwarded, 0);
                    const max = paper.rubric.reduce((a, b) => a + b.totalMarks, 0);
                    if (max > 0) totalPct += (earned / max) * 100;
                }
            });

            return {
                name: paper.title,
                score: Math.round(totalPct / paperSubmissions.length),
                count: paperSubmissions.length
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        // Sort by Score Ascending (Highlight hardest papers on left)
        return data.sort((a, b) => a.score - b.score);
    }, [filteredPapers, gradedSubmissions]);

    // --- Chart Data: Performance Trend ---
    const trendData = useMemo(() => {
        // Group by Assessment
        const data = filteredPapers.map(paper => {
            const paperSubmissions = gradedSubmissions.filter(s => s.paperId === paper.id);
            if (paperSubmissions.length === 0) return null;

            let totalPct = 0;
            paperSubmissions.forEach(s => {
                if (s.gradedResults) {
                    const earned = s.gradedResults.reduce((a, b) => a + b.marksAwarded, 0);
                    const max = paper.rubric.reduce((a, b) => a + b.totalMarks, 0);
                    if (max > 0) totalPct += (earned / max) * 100;
                }
            });

            return {
                name: paper.title.length > 15 ? paper.title.substring(0, 15) + '...' : paper.title,
                fullTitle: paper.title,
                score: Math.round(totalPct / paperSubmissions.length),
                date: paper.createdAt
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredPapers, gradedSubmissions]);

    // --- Chart Data: Mistake Analysis ---
    const mistakeData = useMemo(() => {
        const counts: Record<string, number> = {};
        
        gradedSubmissions.forEach(s => {
            s.gradedResults?.forEach(r => {
                r.improvementSuggestions.forEach(suggestion => {
                    const lowerSug = suggestion.toLowerCase();
                    for (const concept of ALL_CONCEPTS_LIST) {
                        const keywords = concept.toLowerCase().split(' ').filter(w => w.length > 3);
                        if (keywords.some(k => lowerSug.includes(k))) {
                            counts[concept] = (counts[concept] || 0) + 1;
                            break; 
                        }
                    }
                });
            });
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);
    }, [gradedSubmissions]);


    return (
        <div className="relative">
            {/* Background Grid */}
            <RetroGrid className="fixed inset-0 z-0 !h-[120%] -top-20" />
            
            <div className="relative z-10 max-w-7xl mx-auto space-y-8 animate-slide-up pb-12">
            
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Analytics & Insights</h1>
                    <p className="text-gray-500 mt-2 text-lg">Deep dive into class performance, identifying gaps across subjects and sections.</p>
                </div>

                {/* Filter Toolbar */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-xs font-bold text-gray-400 uppercase">Filters:</span>
                            
                            {/* Subject Filter */}
                            <select 
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer hover:text-blue-600"
                            >
                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <span className="text-gray-300">|</span>

                            {/* Section Filter */}
                            <select 
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer hover:text-blue-600"
                            >
                                <option value="All Sections">All Sections</option>
                                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <span className="text-gray-300">|</span>

                            {/* Student Filter */}
                            <select 
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer hover:text-blue-600 max-w-[150px]"
                            >
                                {students.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Concept Filter (Drill Down) */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
                            <span className="text-xs font-bold text-purple-400 uppercase">Focus Area:</span>
                            <select 
                                value={selectedConcept}
                                onChange={(e) => setSelectedConcept(e.target.value)}
                                className="bg-transparent text-sm font-semibold text-purple-700 outline-none cursor-pointer"
                            >
                                <option value="All Concepts">All Concepts</option>
                                {ALL_CONCEPTS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="text-xs text-gray-400 font-medium">
                        Showing data for <span className="text-gray-900 font-bold">{totalPapersGraded}</span> submissions
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Papers Analyzed" 
                        value={totalPapersGraded.toLocaleString()} 
                        trend={totalPapersGraded > 0 ? "Active" : "No Data"} 
                        trendColor="text-blue-600" 
                        iconColor="bg-blue-500"
                    />
                    <StatCard 
                        title="Average Score" 
                        value={`${avgScore}%`}
                        trend={avgScore >= 80 ? "Excellent" : avgScore >= 60 ? "Good" : "Needs Focus"}
                        trendColor={avgScore >= 80 ? "text-green-600" : avgScore >= 60 ? "text-blue-600" : "text-orange-600"}
                        iconColor={avgScore >= 80 ? "bg-green-500" : "bg-orange-500"}
                    />
                    <StatCard 
                        title="Grading Accuracy" 
                        value={`${accuracyRate}%`} 
                        trend={`${disputedCount} Disputes`} 
                        trendColor="text-purple-600" 
                        iconColor="bg-purple-500"
                    />
                    <StatCard 
                        title="Weak Concepts" 
                        value={mistakeData.length} 
                        trend="Identified" 
                        trendColor="text-red-600" 
                        iconColor="bg-red-500"
                    />
                </div>

                {/* Detailed Analytics Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* 1. Performance Across Papers (New) */}
                    <ChartCard title="Performance Across Papers" className="lg:col-span-2">
                        {paperPerformanceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paperPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#6b7280', fontSize: 11}} 
                                        interval={0}
                                        angle={-15}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[0, 100]} />
                                    <Tooltip 
                                        cursor={{ fill: '#f9fafb' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40} name="Avg Score (%)">
                                        {paperPerformanceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10B981' : entry.score >= 60 ? '#3B82F6' : '#EF4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 flex-col">
                                <p>No graded papers found for the selected filters.</p>
                            </div>
                        )}
                    </ChartCard>

                    {/* 2. Cross-Subject Performance */}
                    <ChartCard title="Subject Proficiency">
                        {subjectPerformanceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjectPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[0, 100]} />
                                    <Tooltip 
                                        cursor={{ fill: '#f9fafb' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="score" fill="#8884d8" radius={[6, 6, 0, 0]} barSize={50} name="Avg Score (%)">
                                        {subjectPerformanceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10B981' : entry.score >= 60 ? '#3B82F6' : '#F59E0B'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 flex-col">
                                <p>Not enough data to compare subjects.</p>
                            </div>
                        )}
                    </ChartCard>

                    {/* 3. Concepts Needing Improvement */}
                    <ChartCard title="Concepts Needing Improvement">
                        {mistakeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={mistakeData}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={150} 
                                        tick={{fontSize: 11, fill: '#4b5563', fontWeight: 600}} 
                                        interval={0}
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                                    />
                                    <Bar dataKey="value" fill="#F87171" radius={[0, 4, 4, 0]} barSize={20} name="Students Struggling" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col">
                                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p>No major conceptual gaps identified.</p>
                            </div>
                        )}
                    </ChartCard>

                    {/* 4. Performance Trend */}
                    <ChartCard title="Assessment Timeline">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} domain={[0, 100]} />
                                <Tooltip 
                                    labelFormatter={(label, payload) => {
                                        if (payload && payload.length > 0) return payload[0].payload.fullTitle;
                                        return label;
                                    }}
                                    contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                                />
                                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" name="Avg Score" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* 5. Dispute Analysis */}
                    <ChartCard title="Dispute Resolution">
                        <div className="flex items-center justify-center h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Resolved / No Issue', value: totalPapersGraded - disputedCount },
                                            { name: 'Disputed', value: disputedCount }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#10B981" />
                                        <Cell fill="#EF4444" />
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>
                </div>

                {/* Detailed Reports Section */}
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Paper Reports</h2>
                    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-4">Assessment Title</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Subject</th>
                                        <th className="px-6 py-4">Avg Score</th>
                                        <th className="px-6 py-4">Key Insight</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPapers.map((paper) => {
                                        // Calculate simple stats for the row
                                        const paperSubs = gradedSubmissions.filter(s => s.paperId === paper.id);
                                        const avg = paperSubs.length > 0 
                                            ? Math.round(paperSubs.reduce((acc, s) => acc + (s.gradedResults?.reduce((a,r)=>a+r.marksAwarded,0)||0), 0) / paperSubs.length / paper.rubric.reduce((a,q)=>a+q.totalMarks,0) * 100)
                                            : 0;
                                        
                                        return (
                                            <tr key={paper.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900">{paper.title}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{paper.createdAt.toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {paper.subject || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                            <div className={`h-1.5 rounded-full ${avg >= 80 ? 'bg-green-500' : avg >= 60 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{width: `${avg}%`}}></div>
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-700">{avg}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {avg > 80 ? 'Class excelled in application questions.' : avg < 50 ? 'Struggled with core concepts.' : 'Mixed performance in section B.'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold hover:underline">
                                                        View Report
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredPapers.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                                                No papers found for the selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
