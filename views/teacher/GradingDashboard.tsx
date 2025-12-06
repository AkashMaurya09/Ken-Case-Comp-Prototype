
import React, { useCallback, useMemo } from 'react';
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

export const GradingDashboard: React.FC<GradingDashboardProps> = ({ paper, initialSubmissionId, onBack }) => {
  const { studentSubmissions, addStudentSubmission, updateSubmission } = useAppContext();
  const toast = useToast();

  const submissionsForThisPaper = useMemo(() => 
    studentSubmissions.filter(s => s.paperId === paper.id), 
    [studentSubmissions, paper.id]
  );
  
  const handleStudentSubmissionUpload = useCallback((file: File, previewUrl: string) => {
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
  }, [paper.id, addStudentSubmission, submissionsForThisPaper.length]);

  const handleGradeSubmission = async (submissionId: string) => {
    const submission = submissionsForThisPaper.find(s => s.id === submissionId)!;
    updateSubmission({ 
        ...submission,
        isGrading: true, 
    });

    try {
        if (!submission) throw new Error("Submission not found");

        const gradedResults: GradedResult[] = [];
        for (const rubricItem of paper.rubric) {
            const result = await gradeAnswerSheet(submission.file, rubricItem);
            gradedResults.push(result);
        }
        
        updateSubmission({ 
            ...submission, 
            isGrading: false, 
            gradedResults 
        });

    } catch (error) {
        console.error("Grading failed:", error);
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
                disputed: false, // Resolve dispute on override
                resolutionComment: comment || r.resolutionComment // Update comment if provided
            } : r
        );
        updateSubmission({ ...submission, gradedResults: updatedResults });
        toast.success("Grade updated & dispute resolved.");
     }
  };
  
  return (
    <div className="space-y-6">
        <div>
            <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-4">&larr; Back to all papers</button>
            <h2 className="text-3xl font-bold text-gray-800">Grading Dashboard</h2>
            <p className="mt-1 text-lg text-gray-600">{paper.title}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Upload Student Submissions</h3>
            <FileUpload onFileUpload={handleStudentSubmissionUpload} label="Upload a student's answer sheet" />
        </div>
        
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