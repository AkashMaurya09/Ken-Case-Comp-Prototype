
import React, { createContext, useState, useContext, ReactNode, FC, useEffect } from 'react';
import { QuestionPaper, StudentSubmission } from '../types';
import { db, storage } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from './ToastContext';

interface AppContextType {
  questionPapers: QuestionPaper[];
  studentSubmissions: StudentSubmission[];
  addQuestionPaper: (paper: QuestionPaper) => Promise<void>;
  addStudentSubmission: (submission: StudentSubmission) => Promise<void>;
  updateSubmission: (updatedSubmission: StudentSubmission) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setIsLoading(true);
    // Subscribe to Question Papers
    const qpQuery = query(collection(db, 'questionPapers'), orderBy('createdAt', 'desc')); 
    const unsubscribeQP = onSnapshot(qpQuery, (snapshot) => {
        const papers = snapshot.docs.map(doc => {
             const data = doc.data();
             if (data.createdAt && data.createdAt.toDate) {
                 data.createdAt = data.createdAt.toDate();
             }
             return { id: doc.id, ...data } as QuestionPaper;
        });
        setQuestionPapers(papers);
    }, (error) => {
        console.error("Error fetching question papers:", error);
        // Only show error if it's not a permission error (which happens before login)
        if (error.code !== 'permission-denied') {
            toast.error("Failed to load question papers.");
        }
    });

    // Subscribe to Submissions
    const subQuery = query(collection(db, 'submissions'), orderBy('submissionDate', 'desc'));
    const unsubscribeSub = onSnapshot(subQuery, (snapshot) => {
        const submissions = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamp to Date
            if (data.submissionDate && data.submissionDate.toDate) {
                data.submissionDate = data.submissionDate.toDate();
            }
            return { id: doc.id, ...data } as StudentSubmission;
        });
        setStudentSubmissions(submissions);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching submissions:", error);
        if (error.code !== 'permission-denied') {
            toast.error("Failed to load submissions.");
        }
        setIsLoading(false);
    });

    return () => {
        unsubscribeQP();
        unsubscribeSub();
    };
  }, []);

  const addQuestionPaper = async (paper: QuestionPaper) => {
    try {
        let downloadURL = paper.modelAnswerPreviewUrl;

        // Upload file if it exists (which it should for new papers)
        if (paper.modelAnswerFile) {
            const storageRef = ref(storage, `papers/${paper.id}/${paper.modelAnswerFile.name}`);
            await uploadBytes(storageRef, paper.modelAnswerFile);
            downloadURL = await getDownloadURL(storageRef);
        }

        const paperData = { ...paper, createdAt: new Date() };
        delete paperData.modelAnswerFile; // Don't store File object in Firestore
        paperData.modelAnswerPreviewUrl = downloadURL;

        await setDoc(doc(db, 'questionPapers', paper.id), paperData);
        toast.success("Question paper created successfully!");

    } catch (error) {
        console.error("Error adding question paper:", error);
        toast.error("Failed to save question paper.");
        throw error;
    }
  };

  const addStudentSubmission = async (submission: StudentSubmission) => {
    try {
        let downloadURL = submission.previewUrl;

        if (submission.file) {
            const storageRef = ref(storage, `submissions/${submission.id}/${submission.file.name}`);
            await uploadBytes(storageRef, submission.file);
            downloadURL = await getDownloadURL(storageRef);
        }

        const submissionData = { ...submission };
        delete submissionData.file; // Don't store File object
        submissionData.previewUrl = downloadURL;

        await setDoc(doc(db, 'submissions', submission.id), submissionData);
        toast.success("Submission uploaded successfully!");

    } catch (error) {
        console.error("Error adding submission:", error);
        toast.error("Failed to save submission.");
        throw error;
    }
  };

  const updateSubmission = async (updatedSubmission: StudentSubmission) => {
    try {
        const submissionRef = doc(db, 'submissions', updatedSubmission.id);
        const dataToUpdate = { ...updatedSubmission };
        delete dataToUpdate.file; // Ensure no File objects

        await updateDoc(submissionRef, dataToUpdate);
        // Toast is handled by the calling component usually, or we can add here
        // toast.success("Submission updated.");
    } catch (error) {
        console.error("Error updating submission:", error);
        toast.error("Failed to update submission.");
        throw error;
    }
  };

  return (
    <AppContext.Provider value={{ questionPapers, studentSubmissions, addQuestionPaper, addStudentSubmission, updateSubmission, isLoading }}>
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
