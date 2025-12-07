
import React, { useCallback, useMemo, useState } from 'react';
import { QuestionPaper, StudentSubmission, GradedResult } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { FileUpload } from '../../components/FileUpload';
import { GradingInterface } from './GradingInterface';
import { gradeAnswerSheet } from '../../services/geminiService';
import { useToast } from '../../context/ToastContext';

interface GradingDashboardProps {
  paper: QuestionPaper;
  initialSubmissionId?: string;
  onBack: () => void;
}

type UploadMode = 'hidden' | 'choose' | 'individual' | 'bulk';

export const GradingDashboard: React.FC<GradingDashboardProps> = ({ paper, initialSubmissionId, onBack }) => {
  const { studentSubmissions, addStudentSubmission, updateSubmission } = useAppContext();
  const toast = useToast();
  const [uploadMode, setUploadMode] = useState<UploadMode>('hidden');
  
  // State for the focused grading view
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(initialSubmissionId || null);
  // State to trigger auto-grading upon opening the interface
  const [autoGradeTrigger, setAutoGradeTrigger] = useState(false);

  const submissionsForThisPaper = useMemo(() => 
    studentSubmissions.filter(s => s.paperId === paper.id)
    .sort((a, b) => b.submissionDate.getTime() - a.submissionDate.getTime()), 
    [studentSubmissions, paper.id]
  );
  
  const handleStudentSubmissionUpload = useCallback((file: File, previewUrl: string) => {
    console.log(`[GradingDashboard] Individual submission upload started: ${file.name}`);
    const newSubmission: StudentSubmission = {
        id: `sub-${Date.now()}`,
        paperId: paper.id,
        studentName: `Student ${submissionsForThisPaper.length + 1}`,
        file,
        previewUrl,
        submissionDate: new Date(),
        isGrading: false,
        uploadMethod: 'Individual Upload'
    };
    addStudentSubmission(newSubmission);
    toast.success("Student submission added successfully.");
    setUploadMode('hidden');
  }, [paper.id, addStudentSubmission, submissionsForThisPaper.length, toast]);

  const handleBulkCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          const text = e.target?.result as string;
          if (!text) return;

          const lines = text.split('\n');
          let count = 0;
          const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

          for (let i = startIndex; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              const [name, link] = line.split(',').map(s => s.trim());
              
              if (name) {
                  const newSubmission: StudentSubmission = {
                      id: `sub-bulk-${Date.now()}-${i}`,
                      paperId: paper.id,
                      studentName: name,
                      previewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=External+Doc', 
                      submissionDate: new Date(),
                      isGrading: false,
                      uploadMethod: 'Bulk Import'
                  };
                  await addStudentSubmission(newSubmission);
                  count++;
              }
          }
          
          if (count > 0) {
              toast.success(`Successfully imported ${count} submissions.`);
              setUploadMode('hidden');
          } else {
              toast.error("No valid entries found in CSV.");
          }
      };
      reader.readAsText(file);
  };

  const handleGradeSubmission = async (submissionId: string) => {
    const submission = submissionsForThisPaper.find(s => s.id === submissionId)!;
    updateSubmission({ ...submission, isGrading: true });

    try {
        // Validation for demo mode
        if (!submission.file && submission.previewUrl.includes('placehold.co')) {
             throw new Error("Cannot grade this placeholder/bulk submission in demo mode. Please upload a real file.");
        }

        const gradedResults: GradedResult[] = [];
        for (const rubricItem of paper.rubric) {
            const result = await gradeAnswerSheet(submission.file || submission.previewUrl, rubricItem);
            gradedResults.push(result);
        }
        
        updateSubmission({ 
            ...submission, 
            isGrading: false, 
            gradedResults 
        });
        toast.success("Grading complete!");

    } catch (error: any) {
        console.error("Grading failed:", error);
        toast.error(error.message || "Grading failed.");
        updateSubmission({ ...submission, isGrading: false });
    }
  };
  
  const handleGradeOverride = (
      submissionId: string, 
      questionId: string, 
      newMarks: number, 
      comment?: string,
      newStepAnalysis?: GradedResult['stepAnalysis'],
      newKeywordAnalysis?: GradedResult['keywordAnalysis']
  ) => {
     const submission = submissionsForThisPaper.find(s => s.id === submissionId);
     if(submission) {
        const updatedResults = submission.gradedResults?.map(r =>
            r.questionId === questionId ? { 
                ...r, 
                marksAwarded: newMarks, 
                disputed: false, 
                resolutionComment: comment || r.resolutionComment,
                stepAnalysis: newStepAnalysis || r.stepAnalysis,
                keywordAnalysis: newKeywordAnalysis || r.keywordAnalysis
            } : r
        );
        updateSubmission({ ...submission, gradedResults: updatedResults });
        toast.success("Grade updated.");
     }
  };
  
  const downloadTemplate = () => {
      const csvContent = "data:text/csv;charset=utf-8,Student Name,Document Link\nJohn Doe,https://drive.google.com/file/d/...\nJane Smith,https://drive.google.com/file/d/...";
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "bulk_import_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Navigation Logic
  const handleNextStudent = () => {
      if (!activeSubmissionId) return;
      const currentIndex = submissionsForThisPaper.findIndex(s => s.id === activeSubmissionId);
      if (currentIndex < submissionsForThisPaper.length - 1) {
          setActiveSubmissionId(submissionsForThisPaper[currentIndex + 1].id);
          // If moving to next student, we typically don't auto-grade unless implemented specifically
          // keeping it manual for now when navigating via next/prev to prevent accidental API usage
          setAutoGradeTrigger(false); 
      }
  };

  const handlePrevStudent = () => {
      if (!activeSubmissionId) return;
      const currentIndex = submissionsForThisPaper.findIndex(s => s.id === activeSubmissionId);
      if (currentIndex > 0) {
          setActiveSubmissionId(submissionsForThisPaper[currentIndex - 1].id);
          setAutoGradeTrigger(false);
      }
  };

  // --- Render: Full Screen Grading Workspace ---
  if (activeSubmissionId) {
      return (
          <GradingInterface 
              submissionId={activeSubmissionId}
              submissionsList={submissionsForThisPaper} // Passed for context if needed, but we handle nav here
              paper={paper}
              onClose={() => {
                  setActiveSubmissionId(null);
                  setAutoGradeTrigger(false);
              }}
              onNext={handleNextStudent}
              onPrev={handlePrevStudent}
              hasNext={submissionsForThisPaper.findIndex(s => s.id === activeSubmissionId) < submissionsForThisPaper.length - 1}
              hasPrev={submissionsForThisPaper.findIndex(s => s.id === activeSubmissionId) > 0}
              onGradeSubmission={handleGradeSubmission}
              onGradeOverride={handleGradeOverride}
              autoStart={autoGradeTrigger}
          />
      );
  }

  // --- Render: Dashboard List View ---
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-2">&larr; Back to all papers</button>
                <h2 className="text-3xl font-bold text-gray-800">Grading Dashboard</h2>
                <p className="mt-1 text-lg text-gray-600">{paper.title}</p>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={() => setUploadMode(uploadMode === 'hidden' ? 'choose' : 'hidden')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Submission
                </button>
            </div>
        </div>

        {/* Upload Mode Panels */}
        {uploadMode !== 'hidden' && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 animate-slide-up relative">
                 <button onClick={() => setUploadMode('hidden')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">&times;</button>
                 
                 {uploadMode === 'choose' && (
                     <div className="max-w-2xl mx-auto text-center">
                         <h3 className="text-lg font-bold text-gray-800 mb-6">How would you like to add submissions?</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div 
                                onClick={() => setUploadMode('individual')}
                                className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex flex-col items-center gap-3 group"
                             >
                                 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                 </div>
                                 <h4 className="font-bold text-gray-800">Single Upload</h4>
                                 <p className="text-sm text-gray-500">Upload individual PDF or Image answer sheets one by one.</p>
                             </div>

                             <div 
                                onClick={() => setUploadMode('bulk')}
                                className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:shadow-md cursor-pointer transition-all flex flex-col items-center gap-3 group"
                             >
                                 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                 </div>
                                 <h4 className="font-bold text-gray-800">Bulk Import</h4>
                                 <p className="text-sm text-gray-500">Import multiple submissions via a CSV file with links.</p>
                             </div>
                         </div>
                     </div>
                 )}

                 {uploadMode === 'individual' && (
                     <div className="max-w-xl mx-auto relative">
                        <button onClick={() => setUploadMode('choose')} className="text-sm text-blue-600 hover:underline mb-2 absolute left-0 -top-8 flex items-center gap-1">
                            &larr; Back
                        </button>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Upload Single Submission</h3>
                        <FileUpload onFileUpload={handleStudentSubmissionUpload} label="Upload answer sheet (Image/PDF)" acceptedTypes="image/*,application/pdf" />
                     </div>
                 )}

                 {uploadMode === 'bulk' && (
                     <div className="max-w-xl mx-auto text-center relative">
                        <button onClick={() => setUploadMode('choose')} className="text-sm text-blue-600 hover:underline mb-2 absolute left-0 -top-8 flex items-center gap-1">
                            &larr; Back
                        </button>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Bulk Import</h3>
                         <p className="text-sm text-gray-500 mb-4">Upload a CSV with "Student Name" and "Document Link" columns. <span className="text-blue-600 cursor-pointer" onClick={downloadTemplate}>Download Template</span></p>
                        <input type="file" accept=".csv" onChange={handleBulkCSVUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                     </div>
                 )}
            </div>
        )}
        
        {/* Student List Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Student Submissions ({submissionsForThisPaper.length})</h3>
                <div className="flex gap-2">
                     {/* Filter placeholders could go here */}
                </div>
            </div>
            
            {submissionsForThisPaper.length === 0 ? (
                 <div className="p-12 text-center text-gray-500">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <p className="text-lg font-medium">No submissions yet.</p>
                    <p className="text-sm">Upload a submission to start grading.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Student Name</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Method / ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {submissionsForThisPaper.map(sub => {
                                const isGraded = !!sub.gradedResults;
                                const hasDispute = sub.gradedResults?.some(r => r.disputed);
                                const awarded = sub.gradedResults?.reduce((acc, r) => acc + r.marksAwarded, 0) || 0;
                                const total = paper.rubric.reduce((acc, r) => acc + r.totalMarks, 0);
                                const percentage = total > 0 ? Math.round((awarded / total) * 100) : 0;

                                return (
                                    <tr 
                                        key={sub.id} 
                                        className="hover:bg-gray-50 transition-colors cursor-pointer" 
                                        onClick={() => {
                                            setActiveSubmissionId(sub.id);
                                            setAutoGradeTrigger(false); // Just view, don't auto-grade
                                        }}
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {sub.studentName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div>{sub.submissionDate.toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-400">{sub.submissionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-start gap-1.5">
                                                {sub.uploadMethod === 'Bulk Import' ? (
                                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded w-max text-xs text-gray-500 border border-gray-200">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                        Bulk Import
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded w-max text-xs text-blue-700 border border-blue-100">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                        Individual
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-mono text-gray-400 tracking-wide select-all">
                                                    #{sub.id.split('-').slice(1,3).join('-') || sub.id.substring(0, 8)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {sub.isGrading ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                                                    Grading...
                                                </span>
                                            ) : hasDispute ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Disputed
                                                </span>
                                            ) : isGraded ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Graded
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {isGraded ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {percentage}%
                                                    </span>
                                                    <span className="text-xs text-gray-400">({awarded}/{total})</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveSubmissionId(sub.id);
                                                    // Only auto-trigger if not already graded and not currently grading
                                                    if (!isGraded && !sub.isGrading) {
                                                        setAutoGradeTrigger(true);
                                                    } else {
                                                        setAutoGradeTrigger(false);
                                                    }
                                                }}
                                                className="text-blue-600 hover:text-blue-900 font-medium text-sm hover:underline"
                                            >
                                                {isGraded ? 'Review / Edit' : 'Grade Now'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
  );
};
