
export enum Role {
  UNSELECTED,
  TEACHER,
  STUDENT,
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: Role;
    createdAt: Date;
}

export interface RubricItem {
  id: string;
  question: string;
  totalMarks: number;
  finalAnswer?: string;
  steps?: { description: string; marks: number }[];
  keywords?: { keyword: string; marks: number }[];
}

// Represents a finalized assignment created by a teacher
export interface QuestionPaper {
  id: string;
  title: string;
  subject?: string;
  description?: string;
  modelAnswerFile?: File; // Optional: Only present during creation
  modelAnswerPreviewUrl?: string;
  rubric: RubricItem[];
  createdAt: Date;
  gradingInstructions?: string; // High-level guidelines for the AI
}

export enum GradingStatus {
    IDLE,
    GRADING,
    SUCCESS,
    ERROR
}

export interface StudentSubmission {
  id: string;
  paperId: string; // Link to the QuestionPaper
  studentName: string;
  file?: File; // Optional: Only present during upload
  previewUrl: string;
  submissionDate: Date;
  gradedResults?: GradedResult[];
  isGrading: boolean;
  uploadMethod?: 'Individual Upload' | 'Bulk Import';
  gradingDuration?: number; // Duration in milliseconds
  gradingStatus?: GradingStatus;
}

export interface GradedResult {
  questionId: string;
  marksAwarded: number;
  feedback: string;
  improvementSuggestions: string[];
  disputed: boolean;
  disputeReason?: string;
  resolutionComment?: string;
  teacherComments?: {
      text: string;
      timestamp: Date;
  }[];
  stepAnalysis?: {
      stepDescription: string;
      marksAwarded: number;
      maxMarks: number;
      status: string; // 'Correct' | 'Partial' | 'Missing' | 'ECF'
  }[];
  keywordAnalysis?: {
      keyword: string;
      present: boolean;
      marksAwarded: number;
      maxMarks: number;
  }[];
}

// This type is used during the paper creation process
export interface ModelAnswer {
  file: File;
  previewUrl: string;
  rubric: RubricItem[];
}