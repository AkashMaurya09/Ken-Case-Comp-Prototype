
import { LocalDB } from './indexedDBService';
import { RubricItem, QuestionPaper, StudentSubmission, GradedResult } from '../types';

// Helper to generate a random number following a normal distribution (approx)
const randn_bm = (): number => {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// --- MASTER DATA DEFINITIONS ---
// These papers contain the "Real" content that will appear in both views.
// NOTE: Marks for steps and keywords are balanced to sum up to the Total Marks.

const MASTER_PAPERS: QuestionPaper[] = [
    {
        id: 'paper-physics-101',
        title: 'Physics Mid-Term: Mechanics',
        subject: 'Physics',
        description: 'Covers Newton\'s laws, kinematics, and basic dynamics. Duration: 60 mins.',
        modelAnswerPreviewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=Model+Answer+Key',
        createdAt: new Date('2023-10-01'),
        rubric: [
            {
                id: 'phy-q1',
                question: 'State Newton\'s Second Law of Motion and provide the mathematical formula.',
                totalMarks: 5,
                finalAnswer: 'Newton\'s Second Law states that the rate of change of momentum of a body is directly proportional to the applied force and takes place in the direction in which the force acts. Formula: F = ma.',
                keywords: [
                    { keyword: 'rate of change of momentum', marks: 1 }, 
                    { keyword: 'proportional', marks: 1 }
                ],
                steps: [
                    { description: 'Statement definition', marks: 2 },
                    { description: 'Mathematical formula (F=ma)', marks: 1 }
                ]
            },
            {
                id: 'phy-q2',
                question: 'A car of mass 1000 kg accelerates from rest to 20 m/s in 5 seconds. Calculate the force required.',
                totalMarks: 5,
                finalAnswer: '4000 N',
                steps: [
                    { description: 'Calculate acceleration (a = (v-u)/t)', marks: 2 }, 
                    { description: 'Apply F = ma', marks: 2 }, 
                    { description: 'Correct units (N)', marks: 1 }
                ],
                keywords: []
            },
            {
                id: 'phy-q3',
                question: 'Explain the difference between scalar and vector quantities with examples.',
                totalMarks: 6,
                finalAnswer: 'Scalar quantities have only magnitude (e.g., speed, mass). Vector quantities have both magnitude and direction (e.g., velocity, force).',
                steps: [
                    { description: 'Definition of Scalar', marks: 2 },
                    { description: 'Definition of Vector', marks: 2 }
                ],
                keywords: [{ keyword: 'magnitude', marks: 1 }, { keyword: 'direction', marks: 1 }]
            }
        ]
    },
    {
        id: 'paper-math-202',
        title: 'Calculus I: Derivatives & Limits',
        subject: 'Mathematics',
        description: 'Assessment on basic differentiation rules and limit evaluation.',
        modelAnswerPreviewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=Math+Key',
        createdAt: new Date('2023-10-10'),
        rubric: [
             { 
                 id: 'math-q1', 
                 question: 'Find the derivative of f(x) = 3x^2 + 2x - 5 using first principles or power rule.', 
                 totalMarks: 4,
                 finalAnswer: '6x + 2',
                 steps: [
                     { description: 'Apply power rule to 3x^2 -> 6x', marks: 2 },
                     { description: 'Apply power rule to 2x -> 2', marks: 1 },
                     { description: 'Derivative of constant is 0', marks: 1 }
                 ]
             },
             { 
                 id: 'math-q2', 
                 question: 'Evaluate the limit: lim(x->2) (x^2 - 4) / (x - 2)', 
                 totalMarks: 6,
                 finalAnswer: '4',
                 steps: [
                     { description: 'Identify 0/0 indeterminate form', marks: 1 },
                     { description: 'Factor numerator (x-2)(x+2)', marks: 3 },
                     { description: 'Cancel (x-2) terms', marks: 1 },
                     { description: 'Substitute x=2 to get 4', marks: 1 }
                 ]
             }
        ]
    },
    {
        id: 'paper-cs-303',
        title: 'CS 101: Intro to Python Programming',
        subject: 'Computer Science',
        description: 'Basics of functions, loops, and list comprehensions.',
        modelAnswerPreviewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=Code+Solution',
        createdAt: new Date('2023-10-20'),
        rubric: [
            {
                id: 'cs-q1',
                question: 'Write a Python function `is_prime(n)` that returns True if a number is prime, else False.',
                totalMarks: 10,
                finalAnswer: 'def is_prime(n):\n  if n <= 1: return False\n  for i in range(2, int(n**0.5) + 1):\n    if n % i == 0: return False\n  return True',
                keywords: [
                    { keyword: 'return', marks: 1 }, 
                    { keyword: 'range', marks: 1 }
                ],
                steps: [
                    { description: 'Correct function signature', marks: 1 },
                    { description: 'Handle edge cases (n <= 1)', marks: 2 },
                    { description: 'Correct loop range (up to sqrt(n))', marks: 3 },
                    { description: 'Modulo operator check', marks: 2 }
                ]
            },
            {
                id: 'cs-q2',
                question: 'Explain the concept of a "List Comprehension" with an example.',
                totalMarks: 5,
                finalAnswer: 'A concise way to create lists. Example: [x**2 for x in range(10)]',
                steps: [],
                keywords: [
                    { keyword: 'concise', marks: 1 },
                    { keyword: 'syntax', marks: 2 },
                    { keyword: 'example', marks: 2 }
                ]
            }
        ]
    },
    {
        id: 'paper-hist-404',
        title: 'World History: The 20th Century',
        subject: 'History',
        description: 'Analysis of major global conflicts and their causes.',
        modelAnswerPreviewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=History+Notes',
        createdAt: new Date('2023-10-25'),
        rubric: [
            {
                id: 'hist-q1',
                question: 'Analyze the main causes of World War I (MAIN acronym).',
                totalMarks: 12,
                finalAnswer: 'Militarism, Alliances, Imperialism, Nationalism. The assassination of Archduke Franz Ferdinand was the spark.',
                steps: [
                    { description: 'Explain Militarism', marks: 2 },
                    { description: 'Explain Alliances', marks: 2 },
                    { description: 'Explain Imperialism', marks: 2 },
                    { description: 'Explain Nationalism', marks: 2 },
                    { description: 'Mention the Assassination', marks: 2 }
                ],
                keywords: [{keyword: 'Franz Ferdinand', marks: 1}, {keyword: 'Triple Entente', marks: 1}]
            }
        ]
    },
    {
        id: 'paper-chem-505',
        title: 'Chemistry: Organic Reactions',
        subject: 'Chemistry',
        description: 'Focus on SN1/SN2 mechanisms and stereochemistry.',
        modelAnswerPreviewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=Chemical+Structures',
        createdAt: new Date('2023-11-01'),
        rubric: [
            {
                id: 'chem-q1',
                question: 'Describe the mechanism of SN2 reaction.',
                totalMarks: 8,
                finalAnswer: 'Nucleophilic substitution, bimolecular. Backside attack, inversion of configuration (Walden inversion), concerted single step.',
                steps: [
                    { description: 'Identify nucleophile attack', marks: 2 },
                    { description: 'Mention transition state', marks: 2 },
                    { description: 'State inversion of configuration', marks: 2 }
                ],
                keywords: [{keyword: 'backside attack', marks: 1}, {keyword: 'concerted', marks: 1}]
            }
        ]
    }
];

// --- GENERATORS ---

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
        const studentName = students[i % students.length];
        
        // Generate score based on normal distribution around targetAverage
        let performance = targetAverage + (randn_bm() * variance);
        performance = Math.min(1, Math.max(0, performance)); // Clamp between 0 and 1

        const isGraded = true; 
        
        let gradedResults: GradedResult[] | undefined = undefined;

        if (isGraded) {
            gradedResults = paper.rubric.map(q => {
                // Individual question performance varies slightly from overall student performance
                const qPerformance = Math.min(1, Math.max(0, performance + (Math.random() * 0.2 - 0.1)));
                
                const isDisputed = Math.random() > 0.95; // 5% dispute rate

                // Generate fake step analysis
                const stepAnalysis = q.steps?.map(s => {
                    const stepPassed = Math.random() < qPerformance;
                    return {
                        stepDescription: s.description,
                        maxMarks: s.marks,
                        marksAwarded: stepPassed ? s.marks : 0,
                        status: stepPassed ? 'Correct' : 'Missing'
                    };
                }) || [];

                // Generate fake keyword analysis
                const keywordAnalysis = q.keywords?.map(k => {
                    const kwPresent = Math.random() < qPerformance;
                    return {
                        keyword: k.keyword,
                        present: kwPresent,
                        marksAwarded: kwPresent ? k.marks : 0,
                        maxMarks: k.marks
                    };
                }) || [];

                // Re-sum marks to match analysis exactly
                const analysisTotal = stepAnalysis.reduce((a,b) => a + b.marksAwarded, 0) + keywordAnalysis.reduce((a,b) => a + b.marksAwarded, 0);
                
                // SAFETY CHECK: Clamp to Total Marks
                const finalMarks = Math.min(analysisTotal, q.totalMarks);

                return {
                    questionId: q.id,
                    marksAwarded: finalMarks, 
                    feedback: finalMarks === q.totalMarks ? "Excellent work. All steps followed correctly." : "Good attempt, but missed some key details as noted in the breakdown.",
                    improvementSuggestions: finalMarks < q.totalMarks ? ["Review key concepts and definitions."] : [],
                    disputed: isDisputed,
                    disputeReason: isDisputed ? "I believe I explained the concept correctly in the second paragraph." : undefined,
                    stepAnalysis: stepAnalysis,
                    keywordAnalysis: keywordAnalysis
                };
            });
        }

        // Spread submission dates out
        const submissionDate = new Date(startDate);
        submissionDate.setHours(9 + Math.random() * 8, Math.random() * 60);

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
    // Select specific papers for the teacher view analytics
    const selectedPapers = [MASTER_PAPERS[0], MASTER_PAPERS[1], MASTER_PAPERS[2], MASTER_PAPERS[3], MASTER_PAPERS[4]];
    
    let studentSubmissions: StudentSubmission[] = [];
    const now = new Date();

    // Generate historical class data for these papers
    selectedPapers.forEach((paper, index) => {
        const date = new Date(now);
        date.setDate(now.getDate() - ((5 - index) * 7)); // Weekly cadence
        
        // Increasing average to show trend
        const targetAvg = 0.60 + (index * 0.05); 
        
        // Physics gets more submissions for the bell curve
        const count = index === 0 ? 40 : 25; 
        
        const subs = generateClassSubmissions(paper, count, date, targetAvg, 0.15);
        studentSubmissions = [...studentSubmissions, ...subs];
    });

    return { questionPapers: selectedPapers, studentSubmissions };
};

// Generate specific history for the "Student View" mock
export const getMockStudentData = () => {
    const questionPapers = MASTER_PAPERS; // Use same master papers
    let studentSubmissions: StudentSubmission[] = [];
    const now = new Date();
    const MOCK_STUDENT_NAME = "Jane Doe";

    // Create a history for Jane Doe across the master papers
    questionPapers.forEach((paper, i) => {
        const date = new Date(now);
        date.setDate(now.getDate() - ((questionPapers.length - i) * 7));

        // Jane's score improves over time
        const userScorePct = 0.65 + (i * 0.06); 
        const performance = Math.min(0.98, userScorePct);

        // Generate detailed graded results for Jane matching the rubric
        const gradedResults: GradedResult[] = paper.rubric.map(q => {
            const qPerformance = performance; // Simplified uniform performance
            
            const stepAnalysis = q.steps?.map(s => {
                const passed = Math.random() < qPerformance;
                return {
                    stepDescription: s.description,
                    maxMarks: s.marks,
                    marksAwarded: passed ? s.marks : 0,
                    status: passed ? 'Correct' : 'Missing'
                };
            }) || [];

            const keywordAnalysis = q.keywords?.map(k => {
                const passed = Math.random() < qPerformance;
                return {
                    keyword: k.keyword,
                    maxMarks: k.marks,
                    marksAwarded: passed ? k.marks : 0,
                    present: passed
                };
            }) || [];

            const totalAwarded = stepAnalysis.reduce((a,b)=>a+b.marksAwarded,0) + keywordAnalysis.reduce((a,b)=>a+b.marksAwarded,0);
            
            // SAFETY CHECK: Clamp to Total Marks
            const finalMarks = Math.min(totalAwarded, q.totalMarks);

            return {
                questionId: q.id,
                marksAwarded: finalMarks,
                feedback: finalMarks === q.totalMarks ? "Perfect answer!" : "Good effort. See breakdown for missed points.",
                improvementSuggestions: finalMarks < q.totalMarks ? ["Review the model answer."] : [],
                disputed: false,
                stepAnalysis,
                keywordAnalysis
            };
        });

        studentSubmissions.push({
            id: `mock-sub-jane-${i}`,
            paperId: paper.id,
            studentName: MOCK_STUDENT_NAME,
            previewUrl: 'https://placehold.co/600x800/e2e8f0/1e293b?text=My+Answer+Sheet',
            submissionDate: date,
            isGrading: false,
            uploadMethod: 'Individual Upload',
            gradedResults
        });
    });

    return { questionPapers, studentSubmissions };
};

export const seedDatabase = async () => {
    console.log("Seeding database with rich mock data...");
    
    // Combine analytics data (class) + student data (Jane)
    // We use Set to dedup papers since they come from the same MASTER_PAPERS list
    const { studentSubmissions: classSubmissions } = getMockAnalyticsData();
    const { studentSubmissions: janeSubmissions } = getMockStudentData();

    // MASTER_PAPERS is the source of truth for papers
    for(const paper of MASTER_PAPERS) {
        await LocalDB.saveQuestionPaper(paper);
    }

    // Save all submissions
    const allSubmissions = [...classSubmissions, ...janeSubmissions];
    for(const sub of allSubmissions) {
        await LocalDB.saveSubmission(sub);
    }

    console.log(`Seeded ${MASTER_PAPERS.length} papers and ${allSubmissions.length} submissions.`);
};
