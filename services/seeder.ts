
import { LocalDB } from './indexedDBService';
import { RubricItem, QuestionPaper, StudentSubmission } from '../types';

export const seedDatabase = async () => {
    // 1. Create a Sample Question Paper
    const paperId = 'demo-paper-physics-101';
    
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

    // For demo data, we don't have a blob, so LocalDB will use a placeholder URL automatically if blob is missing.
    const demoPaper: QuestionPaper = {
        id: paperId,
        title: 'Demo: Physics Mid-Term',
        modelAnswerPreviewUrl: '', // Will be handled by service
        rubric: demoRubric,
        createdAt: new Date()
    };

    await LocalDB.saveQuestionPaper(demoPaper);

    // 2. Create a Sample Student Submission
    const subId = 'demo-sub-student-1';
    
    const demoSubmission: StudentSubmission = {
        id: subId,
        paperId: paperId,
        studentName: 'Demo Student',
        previewUrl: '', // Will be handled by service
        submissionDate: new Date(),
        isGrading: false,
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

    await LocalDB.saveSubmission(demoSubmission);
};
