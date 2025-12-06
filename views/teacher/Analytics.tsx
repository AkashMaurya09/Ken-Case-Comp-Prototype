
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { QuestionPaper, StudentSubmission } from '../../types';

// Helper component for dropdowns, etc.
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
    <div className="bg-white p-4 rounded-lg shadow-md mb-8">
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
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium h-[38px]"
            >
                Reset Filters
            </button>
        </div>
    </div>
);


const ChartCard: React.FC<{title: string; description: string; children: React.ReactNode;}> = ({title, description, children}) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex flex-col h-80">
        <h3 className="text-xl font-semibold text-gray-700 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <div className="flex-grow overflow-y-auto pr-2">
            {children}
        </div>
    </div>
);


const QuestionPerformanceChart: React.FC<{ data: { name: string; performance: number }[] }> = ({ data }) => {
    const getPerfColor = (p: number) => {
        if (p >= 75) return 'bg-green-500';
        if (p >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <ChartCard title="Question Performance" description="Identify which questions were the most challenging for students to guide future lesson planning.">
            <div className="space-y-4 pt-2">
                {data.length > 0 ? data.sort((a,b) => b.performance - a.performance).map(item => (
                    <div key={item.name}>
                        <div className="flex justify-between mb-1">
                            <span className="text-base font-medium text-gray-700 truncate" title={item.name}>{item.name}</span>
                            <span className="text-sm font-medium text-gray-500">{item.performance.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className={`${getPerfColor(item.performance)} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${item.performance}%` }}></div>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 py-8">No questions to display.</p>}
            </div>
        </ChartCard>
    );
};

const PerformanceDistributionChart: React.FC<{data: {range: string, count: number}[]}> = ({ data }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    return (
        <ChartCard title="Class Performance Distribution" description="Understand the overall performance of the class and identify if students are clustered in certain score brackets.">
            <div className="flex flex-col h-full">
                <div className="flex-grow flex justify-around items-end border-b border-gray-300 px-2 gap-2">
                   {data.map((bar, index) => (
                       <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                           <div className="text-sm font-medium text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{bar.count}</div>
                           <div
                               className="w-4/5 bg-blue-400 hover:bg-blue-500 transition-all duration-300 rounded-t-md"
                               style={{ height: `${(bar.count / maxCount) * 100}%` }}
                               title={`${bar.count} students in ${bar.range} range`}
                           ></div>
                       </div>
                   ))}
               </div>
               <div className="flex justify-around text-xs text-gray-500 mt-2 px-2">
                   {data.map((bar, index) => (
                       <div key={index} className="flex-1 text-center">{bar.range}</div>
                   ))}
               </div>
                <p className="text-center text-xs text-gray-600 mt-2 flex-shrink-0">Score Range</p>
           </div>
       </ChartCard>
   );
};

const PerformanceTrendChart: React.FC<{ data: { name: string; score: number }[] }> = ({ data }) => {
    const svgWidth = 500;
    const svgHeight = 200;
    const padding = { top: 10, right: 10, bottom: 30, left: 25 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;
    
    const getCoords = (chartData: {score: number}[]) => {
        if (chartData.length < 2) {
             return chartData.map(point => ({
                x: padding.left + chartWidth / 2,
                y: padding.top + chartHeight - (point.score / 100) * chartHeight
            }));
        }
        return chartData.map((point, i) => ({
            x: padding.left + (i / (chartData.length - 1)) * chartWidth,
            y: padding.top + chartHeight - (point.score / 100) * chartHeight
        }));
    };

    const coords = getCoords(data);
    const pathData = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    
    return (
        <ChartCard title="Average Score by Paper" description="See if class performance is improving or declining over time from one assignment to the next.">
            {data.length > 0 ? (
                <div className="relative h-full w-full">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                        {[100, 75, 50, 25, 0].map(val => (
                             <g key={val}>
                                <line x1={padding.left} x2={svgWidth - padding.right} y1={padding.top + chartHeight - (val / 100) * chartHeight} y2={padding.top + chartHeight - (val / 100) * chartHeight} stroke={val === 0 ? "#9ca3af" : "#e5e7eb"} strokeWidth="1" />
                                 <text x="5" y={padding.top + chartHeight - (val / 100) * chartHeight + 3} className="text-[10px] fill-current text-gray-500">{val}%</text>
                             </g>
                        ))}
                        {data.map((d, i) => (
                            <text key={d.name} x={coords[i].x} y={svgHeight - 5} textAnchor="middle" className="text-[10px] fill-current text-gray-500 truncate">{d.name}</text>
                        ))}
                        <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {coords.map((c, i) => (
                             <g key={i} className="group cursor-pointer">
                                <circle cx={c.x} cy={c.y} r="8" fill="#3b82f6" fillOpacity="0" />
                                <circle cx={c.x} cy={c.y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" className="transition-transform duration-200 group-hover:scale-125" />
                                <text x={c.x} y={c.y - 12} textAnchor="middle" className="text-xs font-bold fill-current text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200">{data[i].score.toFixed(1)}%</text>
                            </g>
                        ))}
                    </svg>
                </div>
            ) : <p className="text-center text-gray-500 py-8">Not enough data for trend analysis.</p>}
        </ChartCard>
    );
};

const DisputedQuestionsChart: React.FC<{ data: { name: string; disputes: number }[] }> = ({ data }) => {
    const maxDisputes = Math.max(...data.map(d => d.disputes), 1);
    return (
        <ChartCard title="Frequently Disputed Questions" description="Highlights questions that students most often dispute, which may indicate ambiguity or rubric issues.">
            <div className="space-y-3 pt-2">
                {data.length > 0 ? data.sort((a,b) => b.disputes - a.disputes).map(item => (
                    <div key={item.name}>
                        <div className="flex justify-between items-center text-sm">
                            <p className="font-medium text-gray-700 truncate" title={item.name}>{item.name}</p>
                            <p className="font-semibold text-gray-600">{item.disputes} dispute{item.disputes !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                                className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(item.disputes / maxDisputes) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 py-8">No disputed questions in this selection.</p>}
            </div>
        </ChartCard>
    );
};

export const Analytics: React.FC = () => {
    const { questionPapers, studentSubmissions } = useAppContext();
    const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [statusFilter, setStatusFilter] = useState<SubmissionStatusFilter>('all');

    const filteredSubmissions = useMemo(() => {
        return studentSubmissions.filter(sub => {
            // Paper Check
            const paperMatch = selectedPaperIds.length === 0 || selectedPaperIds.includes(sub.paperId);
            
            // Date Check
            const submissionDate = sub.submissionDate;
            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;
            
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);
            
            const dateMatch = (!startDate || submissionDate >= startDate) && (!endDate || submissionDate <= endDate);

            // Status Check
            let statusMatch = true;
            if (statusFilter === 'graded') {
                statusMatch = !!sub.gradedResults;
            } else if (statusFilter === 'pending') {
                statusMatch = !sub.gradedResults;
            } else if (statusFilter === 'disputed') {
                statusMatch = sub.gradedResults?.some(r => r.disputed) || false;
            }

            return paperMatch && dateMatch && statusMatch;
        });
    }, [studentSubmissions, selectedPaperIds, dateRange, statusFilter]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const resetFilters = () => {
        setSelectedPaperIds([]);
        setDateRange({ start: '', end: '' });
        setStatusFilter('all');
    };

    const questionPerformanceData = useMemo(() => {
        const stats: { [key: string]: { total: number; count: number; text: string } } = {};
        
        filteredSubmissions.forEach(sub => {
            const paper = questionPapers.find(p => p.id === sub.paperId);
            sub.gradedResults?.forEach(res => {
                const question = paper?.rubric.find(r => r.id === res.questionId);
                if (question) {
                    const perf = (res.marksAwarded / question.totalMarks) * 100;
                    if (!stats[question.id]) {
                        stats[question.id] = { total: 0, count: 0, text: question.question };
                    }
                    stats[question.id].total += perf;
                    stats[question.id].count += 1;
                }
            });
        });
        
        return Object.entries(stats).map(([_, value]) => ({
            name: value.text,
            performance: value.total / value.count
        }));
    }, [filteredSubmissions, questionPapers]);

    const performanceDistributionData = useMemo(() => {
        const bins = { '0-20%': 0, '21-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0 };
        filteredSubmissions.forEach(sub => {
            const paper = questionPapers.find(p => p.id === sub.paperId);
            if (!paper) return;

            const totalAwarded = sub.gradedResults?.reduce((sum, r) => sum + r.marksAwarded, 0) || 0;
            const totalPossible = paper.rubric.reduce((sum, r) => sum + r.totalMarks, 0);
            const score = totalPossible > 0 ? (totalAwarded / totalPossible) * 100 : 0;

            if (score <= 20) bins['0-20%']++;
            else if (score <= 40) bins['21-40%']++;
            else if (score <= 60) bins['41-60%']++;
            else if (score <= 80) bins['61-80%']++;
            else bins['81-100%']++;
        });
        return Object.entries(bins).map(([range, count]) => ({ range, count }));
    }, [filteredSubmissions, questionPapers]);

    const performanceTrendData = useMemo(() => {
        const paperStats: { [key: string]: { total: number; count: number; name: string } } = {};
        filteredSubmissions.forEach(sub => {
            const paper = questionPapers.find(p => p.id === sub.paperId);
            if (!paper) return;
            const totalAwarded = sub.gradedResults?.reduce((sum, r) => sum + r.marksAwarded, 0) || 0;
            const totalPossible = paper.rubric.reduce((sum, r) => sum + r.totalMarks, 0);
            const score = totalPossible > 0 ? (totalAwarded / totalPossible) * 100 : 0;
            
            if(!paperStats[paper.id]) {
                paperStats[paper.id] = {total: 0, count: 0, name: paper.title };
            }
            paperStats[paper.id].total += score;
            paperStats[paper.id].count++;
        });
        return Object.values(paperStats).map(p => ({name: p.name, score: p.total / p.count}));
    }, [filteredSubmissions, questionPapers]);

    const disputedQuestionsData = useMemo(() => {
        const disputeCounts: { [key: string]: { count: number; text: string } } = {};
        
        filteredSubmissions.forEach(sub => {
            const paper = questionPapers.find(p => p.id === sub.paperId);
            sub.gradedResults?.forEach(res => {
                if (res.disputed) {
                    const question = paper?.rubric.find(r => r.id === res.questionId);
                    if (question) {
                        if (!disputeCounts[question.id]) {
                            disputeCounts[question.id] = { count: 0, text: question.question };
                        }
                        disputeCounts[question.id].count++;
                    }
                }
            });
        });

        return Object.values(disputeCounts).map(value => ({
            name: value.text,
            disputes: value.count
        }));
    }, [filteredSubmissions, questionPapers]);


    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800">Performance Analytics</h2>
            <p className="mt-2 text-gray-600">Gain data-driven insights from student performance to enhance your teaching strategies.</p>
            
            <div className="mt-6">
                <FilterPanel
                    questionPapers={questionPapers}
                    selectedPaperIds={selectedPaperIds}
                    onPaperIdChange={setSelectedPaperIds}
                    dateRange={dateRange}
                    onDateChange={handleDateChange}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    onReset={resetFilters}
                />
            </div>
            
            {filteredSubmissions.length === 0 ? (
                 <div className="bg-white p-8 rounded-lg shadow-md text-center mt-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <h3 className="mt-4 text-xl font-semibold text-gray-700">No Data Available</h3>
                     <p className="mt-2 text-gray-500">No submissions match the current filters. Try adjusting your selection.</p>
                 </div>
            ) : (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <QuestionPerformanceChart data={questionPerformanceData} />
                    <PerformanceDistributionChart data={performanceDistributionData} />
                    <PerformanceTrendChart data={performanceTrendData} />
                    <DisputedQuestionsChart data={disputedQuestionsData} />
                </div>
            )}
        </div>
    );
};
