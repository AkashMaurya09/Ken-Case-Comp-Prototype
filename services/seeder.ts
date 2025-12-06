
import { db } from './firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { RubricItem } from '../types';

export const seedDatabase = async () => {
    const batch = writeBatch(db);

    // 1. Create a Sample Question Paper
    const paperId = 'demo-paper-physics-101';
    const paperRef = doc(db, 'questionPapers', paperId);
    
    const demoRubric: RubricItem[] = [
        {
            id: 'q1',
            question: 'Explain Newton\'s Second Law of Motion.',
            totalMarks: 5,
            keywords: [{ keyword: 'F=ma', marks: 2 }, { keyword: 'acceleration', marks: 1 }, { keyword: 'mass', marks: 1 }],
            steps: [{ description: 'Definition statement', marks: 1 }]
        },
        {
            id: 'q2',
            question: 'Calculate the force required to accelerate a 10kg mass at 5m/s².',
            totalMarks: 5,
            finalAnswer: '50N',
            steps: [{ description: 'Formula usage', marks: 2 }, { description: 'Calculation', marks: 2 }, { description: 'Units', marks: 1 }]
        }
    ];

    // Using a placeholder image for the demo model answer
    const demoPaper = {
        id: paperId,
        title: 'Demo: Physics Mid-Term',
        modelAnswerPreviewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=Model+Answer+Sheet',
        rubric: demoRubric,
        createdAt: new Date()
    };

    batch.set(paperRef, demoPaper);

    // 2. Create a Sample Student Submission
    const subId = 'demo-sub-student-1';
    const subRef = doc(db, 'submissions', subId);
    
    const demoSubmission = {
        id: subId,
        paperId: paperId,
        studentName: 'Demo Student',
        previewUrl: 'https://placehold.co/600x800/white/black?text=Student+Answer+Sheet',
        submissionDate: new Date(),
        isGrading: false,
        // Pre-graded for visual effect
        gradedResults: [
            {
                questionId: 'q1',
                marksAwarded: 4,
                feedback: 'Good definition, missed explicitly mentioning vector quantity.',
                improvementSuggestions: ['Review vector nature of force'],
                disputed: false
            },
            {
                questionId: 'q2',
                marksAwarded: 5,
                feedback: 'Perfect calculation and unit usage.',
                improvementSuggestions: [],
                disputed: false
            }
        ]
    };

    batch.set(subRef, demoSubmission);

    await batch.commit();
};
