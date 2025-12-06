
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

type UploadMode = 'select' | 'individual' | 'bulk';

export const GradingDashboard: React.FC<GradingDashboardProps> = ({ paper, initialSubmissionId, onBack }) => {
  const { studentSubmissions, addStudentSubmission, updateSubmission } = useAppContext();
  const toast = useToast();
  const [uploadMode, setUploadMode] = useState<UploadMode>('select');

  const submissionsForThisPaper = useMemo(() => 
    studentSubmissions.filter(s => s.paperId === paper.id), 
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
    };
    addStudentSubmission(newSubmission);
    toast.success("Student submission added successfully.");
    setUploadMode('select'); // Reset to selection screen
  }, [paper.id, addStudentSubmission, submissionsForThisPaper.length, toast]);

  const handleBulkCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      console.log(`[GradingDashboard] Bulk CSV upload started`);
      const file = event.target.files?.[0];
      if (!file) {
          console.warn(`[GradingDashboard] No CSV file selected`);
          return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
          const text = e.target?.result as string;
          if (!text) return;
          console.log(`[GradingDashboard] CSV read successfully. Parsing...`);

          const lines = text.split('\n');
          let count = 0;
          
          // Skip header row if present (simple check if first row contains "Name" or "Link")
          const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

          for (let i = startIndex; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              // Assume CSV format: Student Name, Document Link
              const [name, link] = line.split(',').map(s => s.trim());
              
              if (name && link) {
                  const newSubmission: StudentSubmission = {
                      id: `sub-bulk-${Date.now()}-${i}`,
                      paperId: paper.id,
                      studentName: name,
                      // Since we can't directly display a Drive link as an image without proxy, 
                      // we use a placeholder or the link if it happens to be a direct image.
                      // For this demo, we use a placeholder that indicates it's an external file.
                      previewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=External+Doc', 
                      submissionDate: new Date(),
                      isGrading: false,
                  };
                  // In a real app, we would store the `link` in a separate field.
                  await addStudentSubmission(newSubmission);
                  count++;
              }
          }
          
          if (count > 0) {
              console.log(`[GradingDashboard] Imported ${count} submissions.`);
              toast.success(`Successfully imported ${count} submissions from CSV.`);
              setUploadMode('select');
          } else {
              console.warn(`[GradingDashboard] No valid entries found in CSV.`);
              toast.error("No valid entries found in CSV. Please check the format.");
          }
      };
      reader.readAsText(file);
  };

  const handleGradeSubmission = async (submissionId: string) => {
    console.log(`[GradingDashboard] handleGradeSubmission: Grading requested for ${submissionId}`);
    const submission = submissionsForThisPaper.find(s => s.id === submissionId)!;
    updateSubmission({ 
        ...submission,
        isGrading: true, 
    });

    try {
        if (!submission) throw new Error("Submission not found");

        // In a real bulk scenario where we only have links, we might need a backend to fetch the file.
        // For this demo, grading only works if we have a file or a valid image URL.
        if (!submission.file && submission.previewUrl.includes('placehold.co')) {
             throw new Error("Cannot grade this bulk submission in demo mode (missing actual file). Please upload a file manually.");
        }

        const gradedResults: GradedResult[] = [];
        for (const rubricItem of paper.rubric) {
            console.log(`[GradingDashboard] Grading question: ${rubricItem.question}`);
            const result = await gradeAnswerSheet(submission.file || submission.previewUrl, rubricItem);
            gradedResults.push(result);
        }
        
        console.log(`[GradingDashboard] Grading complete.`);
        updateSubmission({ 
            ...submission, 
            isGrading: false, 
            gradedResults 
        });

    } catch (error) {
        console.error("[GradingDashboard] Grading failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during grading.";
        toast.error(errorMessage);
        updateSubmission({ ...submission, isGrading: false });
    }
  };
  
  const handleGradeOverride = (submissionId: string, questionId: string, newMarks: number, comment?: string) => {
     const submission = submissionsForThisPaper.find(s => s.id === submissionId);
     if(submission) {
        const updatedResults = submission.gradedResults?.map(r =>
            r.questionId === questionId ? { 
                ...r, 
                marksAwarded: newMarks, 
                disputed: false, 
                resolutionComment: comment || r.resolutionComment 
            } : r
        );
        updateSubmission({ ...submission, gradedResults: updatedResults });
        toast.success("Grade updated & dispute resolved.");
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
  
  return (
    <div className="space-y-6">
        <div>
            <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-4">&larr; Back to all papers</button>
            <h2 className="text-3xl font-bold text-gray-800">Grading Dashboard</h2>
            <p className="mt-1 text-lg text-gray-600">{paper.title}</p>
        </div>

        {/* Upload Selection Area */}
        {uploadMode === 'select' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Option 1: Individual Upload */}
                <div 
                    onClick={() => setUploadMode('individual')}
                    className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group text-center flex flex-col items-center justify-center min-h-[200px]"
                >
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Individual Upload</h3>
                    <p className="text-gray-500 mt-2">Upload a single answer sheet (Image/PDF) directly from your device.</p>
                </div>

                {/* Option 2: Bulk Import */}
                <div 
                    onClick={() => setUploadMode('bulk')}
                    className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer group text-center flex flex-col items-center justify-center min-h-[200px]"
                >
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Bulk Import via CSV</h3>
                    <p className="text-gray-500 mt-2">Import multiple students using a Google Sheet/CSV containing names and drive links.</p>
                </div>
            </div>
        )}

        {/* Individual Upload UI */}
        {uploadMode === 'individual' && (
            <div className="bg-white p-6 rounded-lg shadow-sm relative">
                <button 
                    onClick={() => setUploadMode('select')}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Upload Student Submission</h3>
                <FileUpload 
                    onFileUpload={handleStudentSubmissionUpload} 
                    label="Upload answer sheet file (Image or PDF)" 
                    acceptedTypes="image/*,application/pdf"
                />
            </div>
        )}

        {/* Bulk Upload UI */}
        {uploadMode === 'bulk' && (
            <div className="bg-white p-6 rounded-lg shadow-sm relative">
                <button 
                    onClick={() => setUploadMode('select')}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-xl font-semibold mb-2 text-gray-700">Bulk Import from CSV</h3>
                <p className="text-sm text-gray-600 mb-6">
                    Upload a CSV file with two columns: <strong>Student Name</strong> and <strong>Document Link</strong>.
                    <br />
                    <button onClick={downloadTemplate} className="text-blue-600 hover:underline text-xs font-medium mt-1">
                        Download Template CSV
                    </button>
                </p>
                
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload CSV</span> or drag and drop</p>
                            <p className="text-xs text-gray-500">.CSV files only</p>
                        </div>
                        <input id="dropzone-file" type="file" accept=".csv" className="hidden" onChange={handleBulkCSVUpload} />
                    </label>
                </div>
            </div>
        )}
        
        <GradingInterface 
            submissions={submissionsForThisPaper}
            paper={paper}
            initialSubmissionId={initialSubmissionId}
            onGradeSubmission={handleGradeSubmission}
            onGradeOverride={handleGradeOverride}
        />
    </div>
  );
};
