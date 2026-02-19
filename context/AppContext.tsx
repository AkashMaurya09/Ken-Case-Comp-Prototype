import React, { createContext, useState, useContext, ReactNode, FC, useEffect } from 'react';
import { QuestionPaper, StudentSubmission } from '../types';
import { useToast } from './ToastContext';
import { LocalDB } from '../services/indexedDBService';
import { seedDatabase } from '../services/seeder';

interface AppContextType {
  questionPapers: QuestionPaper[];
  studentSubmissions: StudentSubmission[];
  addQuestionPaper: (paper: QuestionPaper) => Promise<void>;
  updateQuestionPaper: (paper: QuestionPaper) => Promise<void>;
  deleteQuestionPaper: (paperId: string) => Promise<void>;
  addStudentSubmission: (submission: StudentSubmission) => Promise<void>;
  updateSubmission: (updatedSubmission: StudentSubmission) => Promise<void>;
  loadSamples: () => Promise<void>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for client-side image compression
const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
        if (!file.type.match(/image.*/)) {
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
                if (!ctx) return resolve(file);

                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (!blob) return resolve(file);
                    resolve(blob);
                }, 'image/jpeg', 0.7);
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
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
          return papers;
      } catch (e) {
          console.error("Failed to refresh local data", e);
          return [];
      }
  };

  const loadSamples = async () => {
      try {
          setIsLoading(true);
          await seedDatabase();
          await refreshData();
          toast.success("Sample papers and submissions loaded into local storage.");
      } catch (e) {
          toast.error("Failed to load samples.");
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    const initializeData = async () => {
        setIsLoading(true);
        try {
            const papers = await refreshData();
            // Automatically preload if database is empty
            if (papers.length === 0) {
                console.log("[AppContext] No papers found. Preloading sample data...");
                await seedDatabase();
                await refreshData();
            }
        } catch (error) {
            console.error("[AppContext] Initialization error:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    initializeData();
  }, []);

  const addQuestionPaper = async (paper: QuestionPaper) => {
    try {
        let blobToStore: Blob | undefined = undefined;
        if (paper.modelAnswerFile) {
            blobToStore = await compressImage(paper.modelAnswerFile);
        }
        await LocalDB.saveQuestionPaper(paper, blobToStore);
        await refreshData();
        toast.success("Paper saved to local browser storage.");
    } catch (error: any) {
        toast.error(`Save failed: ${error.message}`);
        throw error;
    }
  };

  const updateQuestionPaper = async (updatedPaper: QuestionPaper) => {
    try {
        let blobToStore: Blob | undefined = undefined;
        if (updatedPaper.modelAnswerFile) {
            if (updatedPaper.modelAnswerFile instanceof File) {
                blobToStore = await compressImage(updatedPaper.modelAnswerFile);
            } else {
                blobToStore = updatedPaper.modelAnswerFile as unknown as Blob;
            }
        }
        await LocalDB.saveQuestionPaper(updatedPaper, blobToStore);
        await refreshData();
        toast.success("Paper updated locally.");
    } catch (error) {
        toast.error("Failed to update paper.");
        throw error;
    }
  };

  const deleteQuestionPaper = async (paperId: string) => {
      try {
          await LocalDB.deleteQuestionPaper(paperId);
          await refreshData();
          toast.success("Paper removed from local storage.");
      } catch (error) {
          toast.error("Failed to delete paper.");
          throw error;
      }
  }

  const addStudentSubmission = async (submission: StudentSubmission) => {
    try {
        let blobToStore: Blob | undefined = undefined;
        if (submission.file) {
            blobToStore = await compressImage(submission.file);
        }
        await LocalDB.saveSubmission(submission, blobToStore);
        await refreshData();
    } catch (error) {
        toast.error("Failed to save submission locally.");
        throw error;
    }
  };

  const updateSubmission = async (updatedSubmission: StudentSubmission) => {
    try {
        await LocalDB.saveSubmission(updatedSubmission);
        await refreshData();
    } catch (error) {
        toast.error("Failed to update submission.");
        throw error;
    }
  };

  return (
    <AppContext.Provider value={{ 
        questionPapers, 
        studentSubmissions, 
        addQuestionPaper, 
        updateQuestionPaper, 
        deleteQuestionPaper, 
        addStudentSubmission, 
        updateSubmission, 
        loadSamples,
        isLoading, 
        refreshData 
    }}>
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