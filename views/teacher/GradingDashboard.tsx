
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { QuestionPaper, StudentSubmission, GradedResult, GradingStatus } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { FileUpload } from '../../components/FileUpload';
import { GradingInterface } from './GradingInterface';
import { gradeAnswerSheet } from '../../services/geminiService';
import { useToast } from '../../context/ToastContext';
import { triggerConfetti } from '../../utils/confetti';
import { RainbowButton } from '../../components/RainbowButton';
import { Spinner } from '../../components/Spinner';

interface GradingDashboardProps {
  paper: QuestionPaper;
  initialSubmissionId?: string;
  onBack: () => void;
}

type UploadMode = 'hidden' | 'choose' | 'individual' | 'bulk';

// Helper for promise cancellation
const waitForSignal = (signal: AbortSignal) => new Promise<never>((_, reject) => {
    if (signal.aborted) reject(new Error("ABORTED"));
    signal.addEventListener('abort', () => reject(new Error("ABORTED")), { once: true });
});

export const GradingDashboard: React.FC<GradingDashboardProps> = ({ paper, initialSubmissionId, onBack }) => {
  const { studentSubmissions, addStudentSubmission, updateSubmission } = useAppContext();
  const toast = useToast();
  const [uploadMode, setUploadMode] = useState<UploadMode>('hidden');
  
  // State for the focused grading view
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(initialSubmissionId || null);
  // State to trigger auto-grading upon opening the interface
  const [autoGradeTrigger, setAutoGradeTrigger] = useState(false);
  
  // State for student name input during upload
  const [studentNameInput, setStudentNameInput] = useState('');
  
  // Lock to prevent double grading triggers (e.g. from StrictMode effects or rapid clicks)
  const gradingLocks = useRef<Set<string>>(new Set());
  // Controllers for aborting grading
  const gradingControllers = useRef<Map<string, AbortController>>(new Map());

  const submissionsForThisPaper = useMemo(() => 
    studentSubmissions.filter(s => s.paperId === paper.id)
    .sort((a, b) => b.submissionDate.getTime() - a.submissionDate.getTime()), 
    [studentSubmissions, paper.id]
  );

  const gradingCount = submissionsForThisPaper.filter(s => s.isGrading).length;

  // Calculate Header Statistics
  const stats = useMemo(() => {
      const total = submissionsForThisPaper.length;
      const graded = submissionsForThisPaper.filter(s => s.gradedResults);
      const gradedCount = graded.length;
      const totalPossible = paper.rubric.reduce((acc, q) => acc + q.totalMarks, 0);
      
      let avg = 0;
      if (gradedCount > 0 && totalPossible > 0) {
          const sumPct = graded.reduce((acc, s) => {
              const score = s.gradedResults!.reduce((a, r) => a + r.marksAwarded, 0);
              return acc + (score / totalPossible);
          }, 0);
          avg = Math.round((sumPct / gradedCount) * 100);
      }
      return { total, gradedCount, avg };
  }, [submissionsForThisPaper, paper.rubric]);

  const handleCancelGrading = useCallback((submissionId: string) => {
      const controller = gradingControllers.current.get(submissionId);
      if (controller) {
          controller.abort();
      }
  }, []);

  const handleCancelAllGrading = useCallback(() => {
      if (gradingControllers.current.size > 0) {
          gradingControllers.current.forEach(c => c.abort());
          toast.info("Stopping all active grading processes...");
      }
  }, [toast]);

  const handleGradeSubmission = useCallback(async (submissionId: string, directSubmission?: StudentSubmission) => {
    // Check lock to prevent duplicate calls
    if (gradingLocks.current.has(submissionId)) {
        console.log("[GradingDashboard] Grading already in progress (lock active) for", submissionId);
        return;
    }

    const submission = directSubmission || submissionsForThisPaper.find(s => s.id === submissionId);
    
    if (!submission) {
        console.error("Submission not found for grading");
        return;
    }
    
    // Check state just in case
    if (submission.isGrading) return;

    // Set lock & Controller
    gradingLocks.current.add(submissionId);
    const controller = new AbortController();
    gradingControllers.current.set(submissionId, controller);
    
    // Optimistic update
    updateSubmission({ ...submission, isGrading: true, gradingStatus: GradingStatus.GRADING });

    try {
        // Validation for demo mode
        if (!submission.file && submission.previewUrl.includes('placehold.co')) {
             throw new Error("Cannot grade this placeholder/bulk submission in demo mode. Please upload a real file.");
        }

        const startTime = performance.now();
        const gradedResults: GradedResult[] = [];
        for (const rubricItem of paper.rubric) {
            // Race grading call against abort signal for immediate cancellation
            const result = await Promise.race([
                gradeAnswerSheet(submission.file || submission.previewUrl, rubricItem),
                waitForSignal(controller.signal)
            ]);
            
            // CRITICAL: Check for Fatal Validation Error from AI
            if (result.feedback.includes("FATAL_ERROR: INVALID_IMAGE_CONTENT")) {
                throw new Error("Invalid Document: The AI detected that this is likely a non-academic image (e.g., photo of a person, object). Grading aborted.");
            }

            // Merge existing comments/history if this is a regrade
            if (submission.gradedResults) {
                const existingResult = submission.gradedResults.find(r => r.questionId === rubricItem.id);
                if (existingResult) {
                    result.teacherComments = existingResult.teacherComments;
                    result.resolutionComment = existingResult.resolutionComment;
                }
            }
            
            gradedResults.push(result);
        }
        const endTime = performance.now();
        const gradingDuration = endTime - startTime;
        
        updateSubmission({ 
            ...submission, 
            isGrading: false, 
            gradedResults,
            gradingDuration,
            gradingStatus: GradingStatus.SUCCESS
        });
        toast.success("Grading complete!");
        triggerConfetti();

    } catch (error: any) {
        if (error.message === "ABORTED") {
            console.log("Grading aborted for", submissionId);
            toast.info("Grading stopped.");
            updateSubmission({
                ...submission,
                isGrading: false,
                gradingStatus: GradingStatus.IDLE
            });
        } else {
            console.error("Grading failed:", error);
            toast.error(error.message || "Grading failed.");
            updateSubmission({ 
                ...submission, 
                isGrading: false, 
                gradingStatus: GradingStatus.ERROR
            });
        }
    } finally {
        // Release lock & controller
        gradingLocks.current.delete(submissionId);
        gradingControllers.current.delete(submissionId);
    }
  }, [submissionsForThisPaper, updateSubmission, paper.rubric, toast]);
  
  const handleStudentSubmissionUpload = useCallback(async (file: File, previewUrl: string) => {
    console.log(`[GradingDashboard] Individual submission upload started: ${file.name}`);
    
    const finalStudentName = studentNameInput.trim() || `Student ${submissionsForThisPaper.length + 1}`;

    const newSubmissionId = `sub-${Date.now()}`;
    const newSubmission: StudentSubmission = {
        id: newSubmissionId,
        paperId: paper.id,
        studentName: finalStudentName,
        file,
        previewUrl,
        submissionDate: new Date(),
        isGrading: false,
        uploadMethod: 'Individual Upload',
        gradingStatus: GradingStatus.IDLE
    };

    // 1. Add to Database
    await addStudentSubmission(newSubmission);
    
    toast.success(`Submission for ${finalStudentName} added. Auto-grading started...`);
    
    setStudentNameInput(''); // Reset name input
    setUploadMode('hidden');

    // 2. Trigger Auto-Grading (Async)
    // We pass the new object directly to avoid waiting for context refresh cycle
    handleGradeSubmission(newSubmissionId, newSubmission);

  }, [paper.id, addStudentSubmission, submissionsForThisPaper.length, toast, handleGradeSubmission, studentNameInput]);

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
                      uploadMethod: 'Bulk Import',
                      gradingStatus: GradingStatus.IDLE
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

  const handleRegradeQuestion = async (submissionId: string, questionId: string) => {
    const submission = submissionsForThisPaper.find(s => s.id === submissionId);
    if (!submission) return;

    const rubricItem = paper.rubric.find(q => q.id === questionId);
    if (!rubricItem) return;

    try {
        const result = await gradeAnswerSheet(submission.file || submission.previewUrl, rubricItem);
        
        // Find existing result to preserve comments
        const existingResult = submission.gradedResults?.find(r => r.questionId === questionId);
        
        const mergedResult = {
            ...result,
            // Preserve history
            teacherComments: existingResult?.teacherComments || [],
            resolutionComment: existingResult?.resolutionComment,
        };
        
        const currentResults = submission.gradedResults || [];
        const updatedResults = currentResults.some(r => r.questionId === questionId)
           ? currentResults.map(r => r.questionId === questionId ? mergedResult : r)
           : [...currentResults, mergedResult];

        updateSubmission({
            ...submission,
            gradedResults: updatedResults
        });
        triggerConfetti();
        toast.success("Question regraded successfully.");
    } catch (e: any) {
        console.error("Regrade failed:", e);
        toast.error("Failed to regrade question.");
    }
  };
  
  const handleGradeOverride = (
      submissionId: string, 
      questionId: string, 
      newMarks: number, 
      comment?: string,
      newStepAnalysis?: GradedResult['stepAnalysis'],
      newKeywordAnalysis?: GradedResult['keywordAnalysis'],
      teacherComments?: { text: string; timestamp: Date }[]
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
                keywordAnalysis: newKeywordAnalysis || r.keywordAnalysis,
                teacherComments: teacherComments || r.teacherComments
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
              onCancelGrading={handleCancelGrading}
              onGradeOverride={handleGradeOverride}
              onRegradeQuestion={handleRegradeQuestion}
              autoStart={autoGradeTrigger}
          />
      );
  }

  // --- Render: Dashboard List View ---
  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
                <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-3 flex items-center gap-1">
                    &larr; Back to all papers
                </button>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Grading Dashboard</p>
                <h2 className="text-3xl font-bold text-gray-800">{paper.title}</h2>
                
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                    {paper.subject && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200">
                            {paper.subject}
                        </span>
                    )}
                    
                    <div className="flex items-center gap-2 text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span><span className="font-bold text-gray-900">{stats.total}</span> Submissions</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <span><span className="font-bold text-gray-900">{stats.gradedCount}</span> Graded</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        <span>Avg Score: <span className={`font-bold ${stats.avg >= 80 ? 'text-green-600' : stats.avg >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{stats.avg}%</span></span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 self-start mt-8 md:mt-0">
                 <RainbowButton 
                    onClick={() => setUploadMode(uploadMode === 'hidden' ? 'choose' : 'hidden')}
                    className="h-10 px-4 text-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Submission
                </RainbowButton>
            </div>
        </div>

        {/* Grading Status Banner */}
        {gradingCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3 animate-slide-up shadow-sm">
                <div className="flex items-center gap-3">
                    <Spinner size="sm" />
                    <p className="text-blue-700 font-medium text-sm">
                        AI is currently grading {gradingCount} submission{gradingCount !== 1 ? 's' : ''}. This requires complex reasoning and may take a moment.
                    </p>
                </div>
                <button 
                    onClick={handleCancelAllGrading} 
                    className="text-xs font-bold text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
                >
                    Stop Grading
                </button>
            </div>
        )}

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
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Student Name (Optional)</label>
                            <input 
                                type="text" 
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                placeholder="Enter student name e.g. John Doe"
                                value={studentNameInput}
                                onChange={(e) => setStudentNameInput(e.target.value)}
                            />
                        </div>

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
                                <th className="px-6 py-4">Time</th>
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
                                const isFailed = sub.gradingStatus === GradingStatus.ERROR;

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
                                                    {sub.gradedResults ? 'Regrading...' : 'Grading...'}
                                                </span>
                                            ) : isFailed ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Failed
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
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {sub.gradingDuration ? `${(sub.gradingDuration / 1000).toFixed(1)}s` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // If grading, offer abort
                                                    if (sub.isGrading) {
                                                        handleCancelGrading(sub.id);
                                                        return;
                                                    }
                                                    
                                                    setActiveSubmissionId(sub.id);
                                                    // Only auto-trigger if not already graded and not currently grading
                                                    if (!isGraded && !sub.isGrading) {
                                                        setAutoGradeTrigger(true);
                                                    } else {
                                                        setAutoGradeTrigger(false);
                                                    }
                                                }}
                                                className={`font-medium text-sm hover:underline ${sub.isGrading ? 'text-red-600 hover:text-red-800' : 'text-blue-600 hover:text-blue-900'}`}
                                            >
                                                {sub.isGrading ? 'Cancel' : isFailed ? 'Retry Grading' : isGraded ? 'Review / Edit' : 'Grade Now'}
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
