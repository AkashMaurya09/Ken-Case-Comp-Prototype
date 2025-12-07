
import { LocalDB } from './indexedDBService';
import { RubricItem, QuestionPaper, StudentSubmission, GradedResult } from '../types';

// Helper to generate a random number following a normal distribution (approx)
const randn_bm = (): number => {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// Exported so it can be used by Analytics.tsx for local mocking
export const generateClassSubmissions = (
    paper: QuestionPaper, 
    count: number, 
    startDate: Date,
    targetAverage: number = 0.75, // 0 to 1
    variance: number = 0.15
): StudentSubmission[] => {
    const students = [
        "Liam Smith", "Olivia Johnson", "Noah Williams", "Emma Brown", "Oliver Jones",
        "Ava Garcia", "Elijah Miller", "Sophia Davis", "James Rodriguez", "Isabella Martinez",
        "William Hernandez", "Mia Lopez", "Benjamin Gonzalez", "Charlotte Wilson", "Lucas Anderson",
        "Amelia Thomas", "Henry Taylor", "Harper Moore", "Alexander Jackson", "Evelyn Martin",
        "Jack White", "Lily Harris", "Logan Martin", "Zoe Thompson", "Luke Garcia",
        "Grace Martinez", "Daniel Robinson", "Chloe Clark", "Owen Rodriguez", "Ella Lewis",
        "Wyatt Lee", "Scarlett Walker", "Carter Hall", "Madison Allen", "Jayden Young",
        "Sofia King", "Dylan Wright", "Avery Scott", "Grayson Torres", "Ria Nguyen",
        "Gabriel Hill", "Riley Flores", "Julian Green", "Ariana Adams", "Mateo Nelson",
        "David Baker", "Sarah Hall", "Joseph Rivera", "Victoria Campbell", "Samuel Mitchell"
    ];

    const submissions: StudentSubmission[] = [];

    for (let i = 0; i < count; i++) {
        // Use modulus to cycle through names if count > students length
        const studentName = students[i % students.length];
        
        // Generate score based on normal distribution around targetAverage
        let performance = targetAverage + (randn_bm() * variance);
        performance = Math.min(1, Math.max(0, performance)); // Clamp between 0 and 1

        const isGraded = true; // All graded for analytics demo
        
        let gradedResults: GradedResult[] | undefined = undefined;

        if (isGraded) {
            gradedResults = paper.rubric.map(q => {
                // Individual question performance varies slightly from overall student performance
                const qPerformance = Math.min(1, Math.max(0, performance + (Math.random() * 0.2 - 0.1)));
                const marksAwarded = Math.round(q.totalMarks * qPerformance);
                
                const isDisputed = Math.random() > 0.95; // 5% dispute rate

                return {
                    questionId: q.id,
                    marksAwarded,
                    feedback: marksAwarded === q.totalMarks ? "Excellent work." : "Good attempt, but missed some details.",
                    improvementSuggestions: marksAwarded < q.totalMarks ? ["Review key concepts."] : [],
                    disputed: isDisputed,
                    disputeReason: isDisputed ? "I believe I deserved more marks here." : undefined,
                    stepAnalysis: [],
                    keywordAnalysis: []
                };
            });
        }

        // Spread submission dates out slightly
        const submissionDate = new Date(startDate);
        submissionDate.setHours(9 + Math.random() * 8, Math.random() * 60); // Random time during day

        submissions.push({
            id: `sub-gen-${paper.id}-${i}`,
            paperId: paper.id,
            studentName: studentName,
            previewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=Student+Work',
            submissionDate: submissionDate,
            isGrading: false,
            uploadMethod: Math.random() > 0.5 ? 'Individual Upload' : 'Bulk Import',
            gradedResults
        });
    }
    return submissions;
};

// New function to generate data in-memory without saving to DB
export const getMockAnalyticsData = () => {
    const questionPapers: QuestionPaper[] = [];
    let studentSubmissions: StudentSubmission[] = [];
    const now = new Date();

    // 1. Historical Trends: Weekly Quizzes
    for (let i = 1; i <= 5; i++) {
        const quizDate = new Date(now);
        quizDate.setDate(now.getDate() - ((6 - i) * 14)); 

        const paper: QuestionPaper = {
            id: `paper-quiz-${i}`,
            title: `Bi-Weekly Quiz ${i}: Mechanics`,
            modelAnswerPreviewUrl: '',
            createdAt: quizDate,
            rubric: [
                { id: `q${i}-1`, question: 'Define the core concept.', totalMarks: 10 },
                { id: `q${i}-2`, question: 'Solve the application problem.', totalMarks: 10 }
            ]
        };
        questionPapers.push(paper);

        const targetAvg = 0.55 + (i * 0.06); 
        const subs = generateClassSubmissions(paper, 25, quizDate, targetAvg, 0.15);
        studentSubmissions = [...studentSubmissions, ...subs];
    }

    // 2. Final Exam (Distribution)
    const finalExam: QuestionPaper = {
        id: 'paper-final-exam',
        title: 'End of Term Final Exam',
        modelAnswerPreviewUrl: '',
        createdAt: new Date(),
        rubric: [
            { id: 'f1', question: 'Essay: The Impact of AI on Education', totalMarks: 20 },
            { id: 'f2', question: 'Calculus: Optimization Problem', totalMarks: 20 },
            { id: 'f3', question: 'Physics: Rotational Dynamics', totalMarks: 20 },
            { id: 'f4', question: 'Chemistry: Organic Reaction Mechanisms', totalMarks: 20 },
            { id: 'f5', question: 'History: Causes of WWI', totalMarks: 20 }
        ]
    };
    questionPapers.push(finalExam);
    const finalSubs = generateClassSubmissions(finalExam, 50, new Date(), 0.72, 0.12);
    studentSubmissions = [...studentSubmissions, ...finalSubs];

    return { questionPapers, studentSubmissions };
};

export const seedDatabase = async () => {
    console.log("Seeding database with rich analytics mock data...");
    
    // Reuse the generation logic
    const { questionPapers, studentSubmissions } = getMockAnalyticsData();

    // Save generated data to DB
    for(const paper of questionPapers) {
        await LocalDB.saveQuestionPaper(paper);
    }
    for(const sub of studentSubmissions) {
        await LocalDB.saveSubmission(sub);
    }

    // --- Add Specific Static Demo Papers (Physics, Math, CS) ---
    // Physics
    const physicsPaper: QuestionPaper = {
        id: 'paper-physics-101',
        title: 'Physics Mid-Term: Mechanics',
        modelAnswerPreviewUrl: '', 
        createdAt: new Date('2023-10-01'),
        rubric: [
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
        ]
    };
    await LocalDB.saveQuestionPaper(physicsPaper);

    // Math
    const mathPaper: QuestionPaper = {
        id: 'paper-math-202',
        title: 'Calculus I: Derivatives',
        modelAnswerPreviewUrl: '',
        createdAt: new Date('2023-10-10'),
        rubric: [
             { id: 'm1', question: 'Find derivative of f(x) = 3x^2', totalMarks: 5 },
             { id: 'm2', question: 'Integral of 2x', totalMarks: 5 }
        ]
    };
    await LocalDB.saveQuestionPaper(mathPaper);

    // Computer Science
    const csPaper: QuestionPaper = {
        id: 'paper-cs-303',
        title: 'CS 101: Intro to Python',
        modelAnswerPreviewUrl: '',
        createdAt: new Date('2023-10-20'),
        rubric: [
            {
                id: 'c1',
                question: 'Write a function to check if a number is prime.',
                totalMarks: 10,
                keywords: [{ keyword: 'def is_prime', marks: 2 }, { keyword: 'return True', marks: 1 }, { keyword: 'modulo', marks: 2 }],
                steps: [{ description: 'Function definition', marks: 2 }, { description: 'Loop logic', marks: 4 }, { description: 'Edge case (1 or <1)', marks: 2 }, { description: 'Return correct boolean', marks: 2 }]
            }
        ]
    };
    await LocalDB.saveQuestionPaper(csPaper);

    // Specific Student Submissions
    await LocalDB.saveSubmission({
        id: 'sub-jane-phy',
        paperId: physicsPaper.id,
        studentName: 'Jane Doe',
        previewUrl: '',
        submissionDate: new Date('2023-10-05T10:00:00'),
        isGrading: false,
        uploadMethod: 'Individual Upload',
        gradedResults: [{ questionId: 'q1', marksAwarded: 4 } as GradedResult, { questionId: 'q2', marksAwarded: 3 } as GradedResult]
    }); 

    await LocalDB.saveSubmission({
        id: 'sub-jane-math',
        paperId: mathPaper.id,
        studentName: 'Jane Doe',
        previewUrl: '',
        submissionDate: new Date('2023-10-15T14:00:00'),
        isGrading: false,
        uploadMethod: 'Individual Upload',
        gradedResults: [{ questionId: 'm1', marksAwarded: 5 } as GradedResult, { questionId: 'm2', marksAwarded: 4 } as GradedResult]
    });

    console.log("Database seeded successfully.");
};
