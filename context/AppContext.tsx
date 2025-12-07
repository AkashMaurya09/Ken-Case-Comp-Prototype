
import React, { createContext, useState, useContext, ReactNode, FC, useEffect } from 'react';
import { QuestionPaper, StudentSubmission } from '../types';
import { useToast } from './ToastContext';
import { LocalDB } from '../services/indexedDBService';

interface AppContextType {
  questionPapers: QuestionPaper[];
  studentSubmissions: StudentSubmission[];
  addQuestionPaper: (paper: QuestionPaper) => Promise<void>;
  updateQuestionPaper: (paper: QuestionPaper) => Promise<void>;
  deleteQuestionPaper: (paperId: string) => Promise<void>;
  addStudentSubmission: (submission: StudentSubmission) => Promise<void>;
  updateSubmission: (updatedSubmission: StudentSubmission) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for client-side image compression
const compressImage = (file: File): Promise<Blob> => {
    console.log(`[AppContext] compressImage: Starting compression for ${file.name} (${file.size} bytes)`);
    return new Promise((resolve) => {
        // Only compress images
        if (!file.type.match(/image.*/)) {
            console.log(`[AppContext] compressImage: File is not an image, returning raw file.`);
            return resolve(file);
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200; 
                const scaleSize = MAX_WIDTH / img.width;
                const width = (scaleSize < 1) ? MAX_WIDTH : img.width;
                const height = (scaleSize < 1) ? img.height * scaleSize : img.height;

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.warn(`[AppContext] compressImage: Failed to get canvas context.`);
                    return resolve(file);
                }

                // Draw white background to handle transparency
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (!blob) {
                         console.warn(`[AppContext] compressImage: Failed to create blob.`);
                         return resolve(file);
                    }
                    console.log(`[AppContext] compressImage: Compression finished. New size: ${blob.size} bytes`);
                    resolve(blob);
                }, 'image/jpeg', 0.7);
            };
            img.onerror = () => {
                console.error(`[AppContext] compressImage: Image loading error.`);
                resolve(file);
            };
        };
        reader.onerror = () => {
            console.error(`[AppContext] compressImage: FileReader error.`);
            resolve(file);
        };
    });
};

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const refreshData = async () => {
      try {
          const papers = await LocalDB.getAllQuestionPapers();
          setQuestionPapers(papers);
          const submissions = await LocalDB.getAllSubmissions();
          setStudentSubmissions(submissions);
      } catch (e) {
          console.error("Failed to refresh local data", e);
      }
  };

  useEffect(() => {
    setIsLoading(true);
    refreshData().finally(() => setIsLoading(false));
  }, []);

  const addQuestionPaper = async (paper: QuestionPaper) => {
    console.log(`[AppContext] addQuestionPaper: Triggered for paper ID: ${paper.id}`);
    try {
        let blobToStore: Blob | undefined = undefined;

        if (paper.modelAnswerFile) {
            console.log(`[AppContext] STEP 1: Compressing model answer file...`);
            blobToStore = await compressImage(paper.modelAnswerFile);
        } else {
            console.log(`[AppContext] No new file provided.`);
        }

        console.log(`[AppContext] STEP 2: Saving to Local IndexedDB...`);
        await LocalDB.saveQuestionPaper(paper, blobToStore);
        
        console.log(`[AppContext] STEP 3: Save successful. Refreshing state.`);
        await refreshData();
        toast.success("Question paper saved locally!");

    } catch (error: any) {
        console.error("[AppContext] Error adding question paper:", error);
        toast.error(`Save failed: ${error.message}`);
        throw error;
    }
  };

  const updateQuestionPaper = async (updatedPaper: QuestionPaper) => {
    console.log(`[AppContext] updateQuestionPaper: Triggered for paper ID: ${updatedPaper.id}`);
    try {
        let blobToStore: Blob | undefined = undefined;

        if (updatedPaper.modelAnswerFile) {
            if (updatedPaper.modelAnswerFile instanceof File) {
                console.log(`[AppContext] updateQuestionPaper: New file detected. Compressing...`);
                blobToStore = await compressImage(updatedPaper.modelAnswerFile);
            } else {
                console.log(`[AppContext] updateQuestionPaper: Existing Blob detected. Preserving.`);
                // We cast here because if it's not a File, it must be a Blob from previous state
                blobToStore = updatedPaper.modelAnswerFile as unknown as Blob;
            }
        }

        await LocalDB.saveQuestionPaper(updatedPaper, blobToStore);
        await refreshData();
        toast.success("Question paper updated locally.");
    } catch (error) {
        console.error("[AppContext] Error updating question paper:", error);
        toast.error("Failed to update question paper.");
        throw error;
    }
  };

  const deleteQuestionPaper = async (paperId: string) => {
      console.log(`[AppContext] deleteQuestionPaper: Triggered for ID: ${paperId}`);
      try {
          await LocalDB.deleteQuestionPaper(paperId);
          await refreshData();
          toast.success("Question paper deleted.");
      } catch (error) {
          console.error("[AppContext] Error deleting question paper:", error);
          toast.error("Failed to delete question paper.");
          throw error;
      }
  }

  const addStudentSubmission = async (submission: StudentSubmission) => {
    console.log(`[AppContext] addStudentSubmission: Triggered for Submission ID: ${submission.id}`);
    try {
        let blobToStore: Blob | undefined = undefined;

        if (submission.file) {
            console.log(`[AppContext] addStudentSubmission: Compressing submission file...`);
            blobToStore = await compressImage(submission.file);
        }

        console.log(`[AppContext] addStudentSubmission: Saving to LocalDB...`);
        // saveSubmission will handle the uploadMethod field since it's part of the submission object
        await LocalDB.saveSubmission(submission, blobToStore);
        
        await refreshData();
        console.log(`[AppContext] addStudentSubmission: Saved successfully.`);
        toast.success("Submission uploaded locally!");

    } catch (error) {
        console.error("[AppContext] Error adding submission:", error);
        toast.error("Failed to save submission.");
        throw error;
    }
  };

  const updateSubmission = async (updatedSubmission: StudentSubmission) => {
    try {
        // When updating grades, we just save the object. 
        // We don't usually change the file here, so pass undefined for blob to preserve existing.
        await LocalDB.saveSubmission(updatedSubmission);
        await refreshData();
    } catch (error) {
        console.error("[AppContext] Error updating submission:", error);
        toast.error("Failed to update submission.");
        throw error;
    }
  };

  return (
    <AppContext.Provider value={{ questionPapers, studentSubmissions, addQuestionPaper, updateQuestionPaper, deleteQuestionPaper, addStudentSubmission, updateSubmission, isLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
