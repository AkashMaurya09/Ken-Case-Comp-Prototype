
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getMockAnalyticsData } from '../../services/seeder';
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

// --- Components for New Design ---

const StatCard: React.FC<{
    title: string;
    value: string | number;
    trend: string;
    trendColor: string;
    iconColor: string;
}> = ({ title, value, trend, trendColor, iconColor }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
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

const BatchReportItem: React.FC<{
    title: string;
    count: number;
    avgScore: number;
    date: Date;
    status: string;
    iconBg: string;
    iconColor: string;
}> = ({ title, count, avgScore, date, status, iconBg, iconColor }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none gap-4">
        <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <svg className={`w-6 h-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
                <h4 className="text-base font-bold text-gray-800">{title}</h4>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{count} papers</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>Avg: {avgScore}%</span>
                </div>
            </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-6 min-w-[200px]">
            <span className="text-sm font-medium text-gray-500">{date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
                {status}
            </span>
        </div>
    </div>
);

const ChartCard: React.FC<{title: string; children: React.ReactNode;}> = ({title, children}) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-96">
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
    const [selectedSubject, setSelectedSubject] = useState<string>('All Subjects');

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

    // --- Dynamic Filters ---
    const subjects = useMemo(() => {
        const subSet = new Set(allQuestionPapers.map(p => p.subject).filter(Boolean) as string[]);
        return ['All Subjects', ...Array.from(subSet)];
    }, [allQuestionPapers]);

    // --- Filtering Logic ---
    const { questionPapers, studentSubmissions } = useMemo(() => {
        if (selectedSubject === 'All Subjects') {
            return { questionPapers: allQuestionPapers, studentSubmissions: allStudentSubmissions };
        }
        const filteredPapers = allQuestionPapers.filter(p => p.subject === selectedSubject);
        const filteredPaperIds = new Set(filteredPapers.map(p => p.id));
        const filteredSubmissions = allStudentSubmissions.filter(s => filteredPaperIds.has(s.paperId));
        return { questionPapers: filteredPapers, studentSubmissions: filteredSubmissions };
    }, [selectedSubject, allQuestionPapers, allStudentSubmissions]);


    // --- Aggregations ---
    const gradedSubmissions = studentSubmissions.filter(s => s.gradedResults);
    const totalPapersGraded = gradedSubmissions.length;
    
    // Calculate Accuracy (Inverse of dispute rate)
    const disputedCount = gradedSubmissions.filter(s => s.gradedResults?.some(r => r.disputed)).length;
    const accuracyRate = totalPapersGraded > 0 ? Math.round(100 - ((disputedCount / totalPapersGraded) * 100)) : 100;

    // Calculate Average Score across all
    let totalScorePct = 0;
    let validScoreCount = 0;
    gradedSubmissions.forEach(s => {
        const p = questionPapers.find(qp => qp.id === s.paperId);
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

    // Batch Reports Data
    const batchReports = questionPapers.map(paper => {
        const subs = studentSubmissions.filter(s => s.paperId === paper.id);
        const graded = subs.filter(s => s.gradedResults);
        
        let pTotal = 0;
        let pEarned = 0;
        
        graded.forEach(s => {
            pEarned += s.gradedResults!.reduce((a,b) => a + b.marksAwarded, 0);
        });
        
        const paperMax = paper.rubric.reduce((a,b) => a + b.totalMarks, 0);
        const avg = (graded.length > 0 && paperMax > 0) ? Math.round(((pEarned / graded.length) / paperMax) * 100) : 0;

        return {
            id: paper.id,
            title: paper.title,
            count: subs.length,
            avg,
            date: paper.createdAt,
            status: (subs.length > 0 && subs.length === graded.length) ? 'completed' : 'in progress'
        };
    }).sort((a,b) => b.date.getTime() - a.date.getTime());

    // Chart Data Preparation (Performance Trend by Assessment)
    const trendData = useMemo(() => {
        // Group by Assessment instead of Date
        const data = questionPapers.map(paper => {
            // Get all graded submissions for this paper
            const paperSubmissions = gradedSubmissions.filter(s => s.paperId === paper.id);
            
            if (paperSubmissions.length === 0) return null;

            let totalPct = 0;
            paperSubmissions.forEach(s => {
                if (s.gradedResults) {
                    const earned = s.gradedResults.reduce((a, b) => a + b.marksAwarded, 0);
                    const max = paper.rubric.reduce((a, b) => a + b.totalMarks, 0);
                    if (max > 0) {
                        totalPct += (earned / max) * 100;
                    }
                }
            });

            return {
                // Shorten title for axis
                name: paper.title.length > 15 ? paper.title.substring(0, 15) + '...' : paper.title,
                fullTitle: paper.title,
                score: Math.round(totalPct / paperSubmissions.length),
                date: paper.createdAt
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        // Sort by creation date to show chronological progression of assessments
        return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [questionPapers, gradedSubmissions]);

    // --- Mistake Analysis Logic ---
    const mistakeData = useMemo(() => {
        const counts: Record<string, number> = {};

        // Subject-specific Concept Mapping
        const subjectMappings: Record<string, Record<string, string[]>> = {
            'Physics': {
                'Newton\'s Laws & Forces': ['newton', 'force', 'mass', 'acceleration', 'f=ma', 'law', 'inertia', 'free body'],
                'Kinematics (Motion)': ['velocity', 'speed', 'displacement', 'time', 'motion', 'kinematic', 'projectile', 'trajectory'],
                'Vectors & Scalars': ['vector', 'scalar', 'magnitude', 'direction', 'component', 'resultant'],
                'Energy & Work': ['energy', 'work', 'power', 'conservation', 'potential', 'kinetic', 'joule'],
                'Units & Conversion': ['unit', 'si', 'conversion', 'meter', 'second', 'kg', 'dimensional'],
                'Circular Motion & Gravity': ['centripetal', 'gravity', 'orbit', 'radius', 'period', 'angular'],
                'Thermodynamics': ['heat', 'temperature', 'entropy', 'thermodynamic', 'cycle', 'efficiency']
            },
            'Mathematics': {
                'Differentiation Rules': ['derivative', 'power rule', 'chain rule', 'differentiation', 'slope', 'rate of change', 'product rule', 'quotient rule'],
                'Limits & Continuity': ['limit', 'continuity', 'indeterminate', 'approach', 'undefined', 'asymptote'],
                'Algebraic Manipulation': ['algebra', 'factor', 'expand', 'simplify', 'equation', 'solve', 'expression', 'polynomial'],
                'Arithmetic Precision': ['calculation', 'sign', 'arithmetic', 'addition', 'subtraction', 'multiplication', 'decimal'],
                'Function Application': ['function', 'domain', 'range', 'substitution', 'inverse', 'composition'],
                'Integration Techniques': ['integral', 'antiderivative', 'area under curve', 'substitution', 'parts'],
                'Trigonometry': ['sin', 'cos', 'tan', 'identity', 'angle', 'radian', 'triangle']
            },
            'Computer Science': {
                'Loop Logic & Iteration': ['loop', 'range', 'iteration', 'for', 'while', 'nested', 'infinite'],
                'Function Implementation': ['function', 'return', 'parameter', 'argument', 'signature', 'call', 'scope'],
                'Edge Case Handling': ['edge case', 'empty', 'negative', 'zero', 'bound', 'null', 'none', 'input validation'],
                'Syntax & Semantics': ['syntax', 'indentation', 'type', 'variable', 'name', 'declaration', 'compilation'],
                'Algorithmic Logic': ['algorithm', 'logic', 'efficiency', 'step', 'condition', 'complexity', 'optimization'],
                'Data Structures': ['list', 'array', 'dictionary', 'map', 'set', 'queue', 'stack', 'tree'],
                'Object-Oriented Concepts': ['class', 'object', 'inheritance', 'method', 'instance', 'constructor']
            },
            'Chemistry': {
                'Reaction Mechanisms': ['mechanism', 'arrow', 'attack', 'nucleophile', 'electrophile', 'substitution', 'elimination'],
                'Stereochemistry': ['inversion', 'chiral', 'stereochemistry', 'configuration', 'isomer', 'optical', 'enantiomer'],
                'Stoichiometry': ['balance', 'equation', 'mole', 'ratio', 'yield', 'reactant', 'product'],
                'Chemical Terminology': ['term', 'definition', 'name', 'structure', 'bond', 'orbital'],
                'Atomic Structure': ['proton', 'neutron', 'electron', 'shell', 'isotope', 'configuration'],
                'Equilibrium & Kinetics': ['rate', 'constant', 'equilibrium', 'le chatelier', 'catalyst', 'activation energy'],
                'Periodic Trends': ['electronegativity', 'radius', 'ionization', 'trend', 'group', 'period']
            },
            'History': {
                'Causal Analysis': ['cause', 'reason', 'trigger', 'led to', 'consequence', 'effect', 'impact'],
                'Chronological Accuracy': ['timeline', 'date', 'order', 'when', 'year', 'sequence'],
                'Historical Context': ['context', 'background', 'environment', 'society', 'culture', 'era'],
                'Key Figures & Terms': ['term', 'figure', 'person', 'treaty', 'alliance', 'empire', 'leader'],
                'Evidence & Sourcing': ['source', 'evidence', 'primary', 'secondary', 'bias', 'perspective'],
                'Ideologies': ['communism', 'capitalism', 'socialism', 'fascism', 'democracy', 'nationalism'],
                'Geopolitics': ['geography', 'border', 'territory', 'resources', 'strategic', 'location']
            }
        };

        const genericMapping: Record<string, string[]> = {
             'Conceptual Understanding': ['concept', 'understand', 'logic', 'theory', 'principle'],
             'Calculation/Procedural': ['calc', 'arithmetic', 'step', 'method', 'process'],
             'Incomplete Answers': ['missing', 'finish', 'incomplete', 'partial'],
             'Formatting & Units': ['format', 'unit', 'presentation', 'notation']
        };

        gradedSubmissions.forEach(s => {
            const paper = allQuestionPapers.find(p => p.id === s.paperId);
            const subject = paper?.subject || 'Generic';
            
            // Determine which mapping to use based on subject
            let mapping = subjectMappings[subject];
            
            // Fallback: Try partial match or generic
            if (!mapping) {
                const foundKey = Object.keys(subjectMappings).find(k => subject.includes(k));
                mapping = foundKey ? subjectMappings[foundKey] : genericMapping;
            }

            s.gradedResults?.forEach(r => {
                r.improvementSuggestions.forEach(suggestion => {
                    const lowerSug = suggestion.toLowerCase();
                    
                    for (const [category, keywords] of Object.entries(mapping)) {
                        if (keywords.some(w => lowerSug.includes(w))) {
                            counts[category] = (counts[category] || 0) + 1;
                            // Break to categorize suggestion into primary bucket only
                            break; 
                        }
                    }
                });
            });
        });

        // Convert to array and filter out zero values
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value) // Sort highest first
            .slice(0, 7); // Top 7 concepts (when All Subjects is chosen, this automatically picks top 7 across all)
    }, [gradedSubmissions, allQuestionPapers]);


    const colors = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600'];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
            
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Reports & Analytics</h1>
                    <p className="text-gray-500 mt-2 text-lg">Comprehensive analytics and performance metrics</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <select className="bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-4 py-2.5 shadow-sm outline-none cursor-pointer hover:border-gray-300 transition-colors">
                        <option>This Month</option>
                        <option>Last Month</option>
                        <option>This Year</option>
                    </select>
                    
                    <select 
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-4 py-2.5 shadow-sm outline-none cursor-pointer hover:border-gray-300 transition-colors"
                    >
                        {subjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                        ))}
                    </select>

                    <button className="bg-[#F97316] hover:bg-[#EA580C] text-white font-bold rounded-lg text-sm px-5 py-2.5 flex items-center gap-2 shadow-md transition-all hover:shadow-lg transform active:scale-95">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                    </button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Papers Graded" 
                    value={totalPapersGraded.toLocaleString()} 
                    trend="+12%" 
                    trendColor="text-green-600" 
                    iconColor="bg-blue-500"
                />
                <StatCard 
                    title="Average Time Saved" 
                    value="18.5 min" // Mocked metric based on image, could be dynamic
                    trend="+8%" 
                    trendColor="text-green-600" 
                    iconColor="bg-green-500"
                />
                <StatCard 
                    title="AI Accuracy Rate" 
                    value={`${accuracyRate}%`} 
                    trend="+5%" 
                    trendColor="text-green-600" 
                    iconColor="bg-purple-500"
                />
                <StatCard 
                    title="Student Satisfaction" 
                    value="4.7/5" 
                    trend="+0.3" 
                    trendColor="text-green-600" 
                    iconColor="bg-orange-500"
                />
            </div>

            {/* Recent Batch Reports */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-900">Recent Batch Reports</h3>
                </div>
                <div className="bg-white">
                    {batchReports.length > 0 ? (
                        batchReports.slice(0, 5).map((report, index) => (
                            <BatchReportItem
                                key={report.id}
                                title={report.title}
                                count={report.count}
                                avgScore={report.avg}
                                date={report.date}
                                status={report.status}
                                iconBg={colors[index % colors.length].split(' ')[0]}
                                iconColor={colors[index % colors.length].split(' ')[1]}
                            />
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No batches found. Create a paper to get started.
                        </div>
                    )}
                </div>
                {batchReports.length > 5 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                        <button className="text-sm font-bold text-blue-600 hover:text-blue-800">View All Reports</button>
                    </div>
                )}
            </div>

            {/* Detailed Analytics Section */}
            <div className="pt-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Detailed Trends</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                        width={160} 
                                        tick={{fontSize: 11, fill: '#4b5563', fontWeight: 600}} 
                                        interval={0}
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                                    />
                                    <Bar dataKey="value" fill="#F87171" radius={[0, 4, 4, 0]} barSize={24} name="Students Impacted" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col">
                                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p>Not enough data to identify concepts.</p>
                            </div>
                        )}
                    </ChartCard>

                    <ChartCard title="Performance Trend (By Assessment)">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} domain={[0, 100]} />
                                <Tooltip 
                                    labelFormatter={(label, payload) => {
                                        // Show full title in tooltip
                                        if (payload && payload.length > 0) {
                                            return payload[0].payload.fullTitle;
                                        }
                                        return label;
                                    }}
                                    contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                                />
                                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" name="Avg Score" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Dispute Analysis">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Resolved', value: totalPapersGraded - disputedCount },
                                        { name: 'Disputed', value: disputedCount }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#10B981" />
                                    <Cell fill="#EF4444" />
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>
        </div>
    );
};
