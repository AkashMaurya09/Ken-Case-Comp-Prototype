
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { QuestionPaper, StudentSubmission } from '../../types';
import { seedDatabase, getMockAnalyticsData } from '../../services/seeder';
import { useToast } from '../../context/ToastContext';
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

// --- Helper Components ---

const PaperFilterDropdown: React.FC<{
    papers: QuestionPaper[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}> = ({ papers, selectedIds, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (paperId: string) => {
        const newSelectedIds = selectedIds.includes(paperId)
            ? selectedIds.filter(id => id !== paperId)
            : [...selectedIds, paperId];
        onChange(newSelectedIds);
    };

    const summaryText = selectedIds.length === 0
        ? 'All Papers'
        : selectedIds.length === 1
            ? papers.find(p => p.id === selectedIds[0])?.title
            : `${selectedIds.length} papers selected`;

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm h-[38px]"
            >
                <span className="block truncate">{summaryText}</span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </span>
            </button>
            {isOpen && (
                <div className="absolute mt-1 w-full rounded-md bg-white shadow-lg z-10 max-h-60 overflow-auto">
                    <ul className="py-1 text-base ring-1 ring-black ring-opacity-5">
                        {papers.map(paper => (
                            <li key={paper.id} className="text-gray-900 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100">
                                <label className="flex items-center w-full cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(paper.id)}
                                        onChange={() => handleSelect(paper.id)}
                                        className="h-4 w-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 block font-normal truncate">{paper.title}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

type SubmissionStatusFilter = 'all' | 'pending' | 'graded' | 'disputed';

const FilterPanel: React.FC<{
    questionPapers: QuestionPaper[],
    selectedPaperIds: string[],
    onPaperIdChange: (ids: string[]) => void,
    dateRange: { start: string, end: string },
    onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    statusFilter: SubmissionStatusFilter,
    onStatusChange: (status: SubmissionStatusFilter) => void,
    onReset: () => void,
}> = ({ questionPapers, selectedPaperIds, onPaperIdChange, dateRange, onDateChange, statusFilter, onStatusChange, onReset }) => (
    <div className="bg-white p-4 rounded-lg shadow-md mb-8 border border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Paper</label>
                <PaperFilterDropdown papers={questionPapers} selectedIds={selectedPaperIds} onChange={onPaperIdChange} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Submission Status</label>
                <select
                    value={statusFilter}
                    onChange={(e) => onStatusChange(e.target.value as SubmissionStatusFilter)}
                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-[38px] px-3"
                >
                    <option value="all">All Statuses</option>
                    <option value="graded">Graded</option>
                    <option value="pending">Pending Grading</option>
                    <option value="disputed">Has Disputes</option>
                </select>
            </div>
            <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" id="startDate" name="start" value={dateRange.start} onChange={onDateChange} className="w-full bg-white border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-[38px] px-3" />
            </div>
            <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" id="endDate" name="end" value={dateRange.end} onChange={onDateChange} className="w-full bg-white border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-[38px] px-3" />
            </div>
            <button
                onClick={onReset}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium h-[38px]"
            >
                Reset Filters
            </button>
        </div>
    </div>
);

const ChartCard: React.FC<{title: string; description: string; children: React.ReactNode;}> = ({title, description, children}) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 flex flex-col h-96">
        <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="flex-grow min-h-0">
            {children}
        </div>
    </div>
);

// --- Analytics View ---

export const Analytics: React.FC = () => {
    const { questionPapers: realPapers, studentSubmissions: realSubmissions } = useAppContext();
    const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [statusFilter, setStatusFilter] = useState<SubmissionStatusFilter>('all');

    // Auto-generate mock data locally if real data is empty
    const mockData = useMemo(() => {
        if (realSubmissions.length === 0) {
            return getMockAnalyticsData();
        }
        return null;
    }, [realSubmissions.length]);

    const usingMockData = !!mockData;
    const questionPapers = usingMockData ? mockData!.questionPapers : realPapers;
    const studentSubmissions = usingMockData ? mockData!.studentSubmissions : realSubmissions;

    const filteredSubmissions = useMemo(() => {
        return studentSubmissions.filter(sub => {
            const paperMatch = selectedPaperIds.length === 0 || selectedPaperIds.includes(sub.paperId);
            
            const submissionDate = new Date(sub.submissionDate);
            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;
            
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);
            
            const dateMatch = (!startDate || submissionDate >= startDate) && (!endDate || submissionDate <= endDate);

            let statusMatch = true;
            if (statusFilter === 'graded') statusMatch = !!sub.gradedResults;
            else if (statusFilter === 'pending') statusMatch = !sub.gradedResults;
            else if (statusFilter === 'disputed') statusMatch = sub.gradedResults?.some(r => r.disputed) || false;

            return paperMatch && dateMatch && statusMatch;
        });
    }, [studentSubmissions, selectedPaperIds, dateRange, statusFilter]);

    // --- Data Preparation for Recharts ---

    const questionPerformanceData = useMemo(() => {
        const stats: { [key: string]: { total: number; count: number; name: string } } = {};
        
        filteredSubmissions.forEach(sub => {
            const paper = questionPapers.find(p => p.id === sub.paperId);
            sub.gradedResults?.forEach(res => {
                const question = paper?.rubric.find(r => r.id === res.questionId);
                if (question) {
                    const perf = (res.marksAwarded / question.totalMarks) * 100;
                    // Use a unique key for the question (paper title + Q index) to avoid collisions
                    const qIndex = paper?.rubric.findIndex(r => r.id === res.questionId) ?? 0;
                    const uniqueKey = `${paper?.title.substring(0, 10)}... Q${qIndex + 1}`;
                    
                    if (!stats[uniqueKey]) {
                        stats[uniqueKey] = { total: 0, count: 0, name: uniqueKey };
                    }
                    stats[uniqueKey].total += perf;
                    stats[uniqueKey].count += 1;
                }
            });
        });
        
        return Object.values(stats)
            .map(s => ({ name: s.name, score: Math.round(s.total / s.count) }))
            .sort((a, b) => a.score - b.score) // Sort by performance (lowest first)
            .slice(0, 10); // Top 10 hardest
    }, [filteredSubmissions, questionPapers]);

    const distributionData = useMemo(() => {
        const bins = [
            { name: '0-20%', count: 0 },
            { name: '21-40%', count: 0 },
            { name: '41-60%', count: 0 },
            { name: '61-80%', count: 0 },
            { name: '81-100%', count: 0 }
        ];

        filteredSubmissions.forEach(sub => {
            if (!sub.gradedResults) return;
            const paper = questionPapers.find(p => p.id === sub.paperId);
            if (!paper) return;

            const totalAwarded = sub.gradedResults.reduce((sum, r) => sum + r.marksAwarded, 0);
            const totalPossible = paper.rubric.reduce((sum, r) => sum + r.totalMarks, 0);
            const score = totalPossible > 0 ? (totalAwarded / totalPossible) * 100 : 0;

            if (score <= 20) bins[0].count++;
            else if (score <= 40) bins[1].count++;
            else if (score <= 60) bins[2].count++;
            else if (score <= 80) bins[3].count++;
            else bins[4].count++;
        });
        return bins;
    }, [filteredSubmissions, questionPapers]);

    const trendData = useMemo(() => {
        // Group by paper or date? Let's group by paper for clarity
        const paperStats: { [key: string]: { total: number; count: number; date: Date } } = {};
        
        filteredSubmissions.forEach(sub => {
            if (!sub.gradedResults) return;
            const paper = questionPapers.find(p => p.id === sub.paperId);
            if (!paper) return;

            const totalAwarded = sub.gradedResults.reduce((sum, r) => sum + r.marksAwarded, 0);
            const totalPossible = paper.rubric.reduce((sum, r) => sum + r.totalMarks, 0);
            const score = totalPossible > 0 ? (totalAwarded / totalPossible) * 100 : 0;

            if (!paperStats[paper.title]) {
                paperStats[paper.title] = { total: 0, count: 0, date: paper.createdAt };
            }
            paperStats[paper.title].total += score;
            paperStats[paper.title].count++;
        });

        return Object.entries(paperStats)
            .map(([name, stat]) => ({
                name,
                score: Math.round(stat.total / stat.count),
                date: stat.date
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [filteredSubmissions, questionPapers]);

    const disputeData = useMemo(() => {
        let totalQuestions = 0;
        let disputedQuestions = 0;

        filteredSubmissions.forEach(sub => {
            sub.gradedResults?.forEach(res => {
                totalQuestions++;
                if (res.disputed) disputedQuestions++;
            });
        });

        const noDispute = totalQuestions - disputedQuestions;
        // Avoid showing empty chart if no data
        if (totalQuestions === 0) return [];

        return [
            { name: 'Resolved / No Dispute', value: noDispute },
            { name: 'Disputed', value: disputedQuestions }
        ];
    }, [filteredSubmissions]);

    // Colors
    const COLORS = ['#00C49F', '#FF8042'];

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800">Performance Analytics</h2>
            <p className="mt-2 text-gray-600">Visualize class performance trends and identify areas for improvement.</p>
            
            {usingMockData && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mt-4 flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <strong>Preview Mode:</strong> Showing sample data because you haven't graded any papers yet.
                </div>
            )}

            <div className="mt-6">
                <FilterPanel
                    questionPapers={questionPapers}
                    selectedPaperIds={selectedPaperIds}
                    onPaperIdChange={setSelectedPaperIds}
                    dateRange={dateRange}
                    onDateChange={(e) => setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    onReset={() => {
                        setSelectedPaperIds([]);
                        setDateRange({ start: '', end: '' });
                        setStatusFilter('all');
                    }}
                />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Class Performance Trend */}
                <ChartCard 
                    title="Class Average Trend" 
                    description="Average score per paper over time. Identifies progression."
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 2. Score Distribution */}
                <ChartCard 
                    title="Grade Distribution" 
                    description="Number of students in each score range."
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={distributionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                            <YAxis allowDecimals={false} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorCount)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 3. Question Difficulty Analysis */}
                <ChartCard 
                    title="Question Difficulty (Lowest Scores)" 
                    description="Questions with the lowest average scores. Focus review here."
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={questionPerformanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                            <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '8px' }} formatter={(value: number) => [`${value}%`, 'Avg Score']} />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                                {questionPerformanceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.score < 50 ? '#ef4444' : entry.score < 75 ? '#eab308' : '#22c55e'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 4. Dispute Ratio */}
                <ChartCard 
                    title="Dispute Ratio" 
                    description="Proportion of graded questions that were disputed by students."
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={disputeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {disputeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

            </div>
        </div>
    );
};
