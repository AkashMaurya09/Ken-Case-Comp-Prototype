
import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getMockStudentData } from '../../services/seeder';

const MOCK_STUDENT_NAME = "Jane Doe";

// A more flexible ChartCard
const ChartCard: React.FC<{title: string; description: string; children: React.ReactNode; className?: string}> = ({title, description, children, className = ''}) => (
    <div className={`bg-white p-6 rounded-lg shadow-md flex flex-col min-h-[20rem] ${className}`}>
        <h3 className="text-xl font-semibold text-gray-700 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <div className="flex-grow">
            {children}
        </div>
    </div>
);

// New component for the comparison chart
const PerformanceComparisonChart: React.FC<{ data: { name: string; userScore: number; classAverage: number }[] }> = ({ data }) => {
    return (
        <div className="w-full h-full flex items-end gap-6 px-4 pb-4 border-l border-b border-gray-200">
            {data.map(item => (
                <div key={item.name} className="flex-1 flex flex-col items-center group">
                    <div className="flex items-end h-full w-full justify-center gap-2">
                         {/* User Score Bar */}
                        <div className="flex flex-col items-center w-1/3" title={`Your Score: ${item.userScore.toFixed(0)}%`}>
                             <p className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">{item.userScore.toFixed(0)}%</p>
                            <div
                                className="bg-blue-500 w-full rounded-t-md hover:opacity-80 transition-all"
                                style={{ height: `${item.userScore}%` }}
                            ></div>
                        </div>
                        {/* Class Average Bar */}
                        <div className="flex flex-col items-center w-1/3" title={`Class Average: ${item.classAverage.toFixed(0)}%`}>
                             <p className="text-xs font-semibold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{item.classAverage.toFixed(0)}%</p>
                            <div
                                className="bg-gray-300 w-full rounded-t-md hover:opacity-80 transition-all"
                                style={{ height: `${item.classAverage}%` }}
                            ></div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 truncate w-full text-center">{item.name}</p>
                </div>
            ))}
        </div>
    );
};

// Trend Chart Component
const ScoreTrendChart: React.FC<{ data: { name: string; score: number }[] }> = ({ data }) => {
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
    );
};


export const MyAnalytics: React.FC = () => {
    const { questionPapers: realPapers, studentSubmissions: realSubmissions } = useAppContext();

    // --- Mock Data Handling ---
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

    // Data for "Performance vs. Class Average" chart
    const performanceComparisonData = useMemo(() => {
        const paperIds = [...new Set(myGradedSubmissions.map(s => s.paperId))];

        return paperIds.map(paperId => {
            const paper = questionPapers.find(p => p.id === paperId)!;
            const submissionsForPaper = studentSubmissions.filter(s => s.paperId === paperId && s.gradedResults);
            
            const totalPossible = paper.rubric.reduce((sum, q) => sum + q.totalMarks, 0);

            // Calculate user score
            const mySubmission = submissionsForPaper.find(s => s.studentName === MOCK_STUDENT_NAME)!;
            const myTotalAwarded = mySubmission.gradedResults!.reduce((sum, r) => sum + r.marksAwarded, 0);
            const userScore = totalPossible > 0 ? (myTotalAwarded / totalPossible) * 100 : 0;

            // Calculate class average
            const totalClassScores = submissionsForPaper.reduce((total, sub) => {
                const awarded = sub.gradedResults!.reduce((sum, r) => sum + r.marksAwarded, 0);
                return total + (totalPossible > 0 ? (awarded / totalPossible) * 100 : 0);
            }, 0);
            const classAverage = submissionsForPaper.length > 0 ? totalClassScores / submissionsForPaper.length : 0;

            return {
                name: paper.title,
                userScore,
                classAverage
            };
        });
    }, [myGradedSubmissions, studentSubmissions, questionPapers]);

    // Data for "Overall Score Trend" chart
    const scoreTrendData = useMemo(() => {
        return myGradedSubmissions
            .sort((a, b) => a.submissionDate.getTime() - b.submissionDate.getTime())
            .map(sub => {
                const paper = questionPapers.find(p => p.id === sub.paperId);
                if (!paper) return null;

                const totalAwarded = sub.gradedResults!.reduce((sum, r) => sum + r.marksAwarded, 0);
                const totalPossible = paper.rubric.reduce((sum, q) => sum + q.totalMarks, 0);
                const score = totalPossible > 0 ? (totalAwarded / totalPossible) * 100 : 0;
                
                return { name: paper.title, score };
            }).filter(Boolean) as { name: string; score: number }[];
    }, [myGradedSubmissions, questionPapers]);

    // Data for "Common Improvement Areas" chart
    const improvementAreasData = useMemo(() => {
        const suggestions = myGradedSubmissions.flatMap(s => s.gradedResults?.flatMap(r => r.improvementSuggestions) || []);
        const counts: {[key: string]: number} = suggestions.reduce((acc, suggestion) => {
            acc[suggestion] = (acc[suggestion] || 0) + 1;
            return acc;
        }, {} as {[key: string]: number});

        return Object.entries(counts)
            .map(([suggestion, count]) => ({ suggestion, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Show top 5
    }, [myGradedSubmissions]);

    return (
        <div>
            <header>
                <h2 className="text-3xl font-bold text-gray-800">My Analytics</h2>
                <p className="mt-2 text-gray-600">Visualize your performance to identify strengths and areas for improvement.</p>
            </header>

            {usingMockData && (
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-lg mt-4 flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <strong>Preview Mode:</strong> Showing sample performance data because you haven't completed any assignments yet.
                </div>
            )}

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard 
                    title="Performance vs. Class Average" 
                    description="See how your score (blue) compares to the class average (gray) for each paper."
                    className="lg:col-span-2"
                >
                    <PerformanceComparisonChart data={performanceComparisonData} />
                </ChartCard>
                
                <ChartCard title="Overall Score Trend" description="Track your performance over time across all submitted papers.">
                    {scoreTrendData.length > 0 ? (
                        <ScoreTrendChart data={scoreTrendData} />
                    ) : (
                        <p className="text-gray-500">Not enough data to show a trend.</p>
                    )}
                </ChartCard>

                <ChartCard title="Common Improvement Areas" description="Based on AI feedback, these are your most frequent suggestions.">
                    <div className="w-full h-full flex flex-wrap gap-4 justify-center items-center">
                        {improvementAreasData.length > 0 ? (
                            improvementAreasData.map(({suggestion, count}) => (
                                    <div key={suggestion} className="relative group">
                                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-4 py-2 rounded-full">{suggestion}</span>
                                        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Suggested {count} time{count > 1 ? 's' : ''}
                                        </span>
                                    </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No specific improvement areas identified yet. Keep up the great work!</p>
                        )}
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};
