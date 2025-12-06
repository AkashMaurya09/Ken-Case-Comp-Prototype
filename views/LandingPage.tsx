
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { Role } from '../types';

const StatItem: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-bold text-purple-600">{value}</p>
      <p className="mt-1 text-base text-gray-600">{label}</p>
    </div>
  );
};

interface LandingPageProps {
  onLoginClick: (role: Role) => void;
}

const subjects = [
  { name: 'Computer Science', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  { name: 'Physics', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2m-6-1.414L7.414 4M4 7.414L2.586 6M2 12h2m1.414 6L4 16.586M7.414 20l-1.414-1.414M12 22v-2m6 1.414l-1.414-1.414M20 16.586l1.414 1.414M22 12h-2m-1.414-6l1.414-1.414M16.586 4l1.414-1.414M12 18a6 6 0 100-12 6 6 0 000 12z" /></svg> },
  { name: 'Math', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg> },
  { name: 'Chemistry', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l2.387.477a2 2 0 001.806.547a2 2 0 001.022-.547l3.182-3.182a6 6 0 00.517-3.86l.158-.318a6 6 0 00.517 3.86l.477-2.387a2 2 0 00.547-1.806z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.243 5.757a6 6 0 10-8.486 8.486 6 6 0 008.486-8.486z" /></svg> },
  { name: 'Biology', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-1.026.977-2.19.977-3.418a8.968 8.968 0 00-1.954-5.424A9 9 0 1012 11v3c0 .538.214 1.036.574 1.414M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11" /></svg> },
  { name: 'Engineering', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
];

const subjectExamples = {
  'Physics': {
    question: "Question 2 (5 points total): A cyclist travels 12 km in 36 minutes. If they continue at this speed, how much longer will they have to cycle to cover another 120 km?",
    imageUrl: "https://i.ibb.co/6P2j4v5/physics-answer.jpg",
    totalPoints: "4 / 5 pts",
    breakdown: [
      { id: 1, score: "1/1", reason: "Conversion factor 36/60 justified." },
      { id: 2, score: "0.5/1", reason: "Correct numerical result, missing formula restatement." },
      { id: 3, score: "0.5/1", reason: "Speed value not boxed for reuse in part 2." },
      { id: 4, score: "1/1", reason: "Correct numerical result; full credit maintained." },
      { id: 5, score: "1/1", reason: "Final answer is clearly stated; full credit." },
    ]
  },
  'Math': {
    question: "Question 1 (6 points total): Three natural numbers are in the ratio 2:3:4. If the sum of squares of these numbers is 116, determine the numbers.",
    imageUrl: "https://i.ibb.co/6P2j4v5/physics-answer.jpg", // Reusing image as placeholder
    totalPoints: "6 / 6 pts",
    breakdown: [
      { id: 1, score: "1/1", reason: "Identified variables from the ratio: 2k, 3k, 4k." },
      { id: 2, score: "1/1", reason: "Formed equation using sum of squares: (2k)²+(3k)²+(4k)² = 116." },
      { id: 3, score: "1/1", reason: "Simplified left side to get coefficient of k²: 29k²." },
      { id: 4, score: "1/1", reason: "Solved for k² correctly: k² = 4." },
      { id: 5, score: "1/1", reason: "Took square root and justified positive root: k=2." },
      { id: 6, score: "1/1", reason: "Computed final numbers and presented answer: 4, 6, 8." },
    ]
  },
  'Computer Science': {
    question: "Question 3 (10 points total): Write a Python function to find the maximum element in a list of numbers without using the built-in max() function.",
    imageUrl: "https://i.ibb.co/6P2j4v5/physics-answer.jpg", // Reusing image as placeholder
    totalPoints: "8 / 10 pts",
    breakdown: [
      { id: 1, score: "2/2", reason: "Correct function definition and parameter." },
      { id: 2, score: "1/2", reason: "Handles empty list case but returns None instead of raising an error." },
      { id: 3, score: "3/3", reason: "Initializes max variable correctly with the first element." },
      { id: 4, score: "2/3", reason: "Loop logic is correct, but iterates from the first element again (inefficient)." },
    ]
  },
  'Chemistry': {
    question: "Question 1 (5 points total): Balance the chemical equation: H₂ + O₂ → H₂O.",
    imageUrl: "https://i.ibb.co/6P2j4v5/physics-answer.jpg", // Reusing image as placeholder
    totalPoints: "5 / 5 pts",
    breakdown: [
        { id: 1, score: "2/2", reason: "Correctly identifies reactants and products." },
        { id: 2, score: "3/3", reason: "Applies correct stoichiometric coefficients (2H₂ + O₂ → 2H₂O)." }
    ]
  },
  'Biology': {
    question: "Question 2 (8 points total): Describe the main function of mitochondria in a eukaryotic cell.",
    imageUrl: "https://i.ibb.co/6P2j4v5/physics-answer.jpg", // Reusing image as placeholder
    totalPoints: "6 / 8 pts",
    breakdown: [
        { id: 1, score: "2/2", reason: "Identifies it as the 'powerhouse of the cell'." },
        { id: 2, score: "4/6", reason: "Mentions energy production, but does not explicitly name ATP as the energy currency." }
    ]
  },
  'Engineering': {
    question: "Question 4 (12 points total): Explain the concept of tensile strength in materials science.",
    imageUrl: "https://i.ibb.co/6P2j4v5/physics-answer.jpg", // Reusing image as placeholder
    totalPoints: "10 / 12 pts",
    breakdown: [
        { id: 1, score: "4/4", reason: "Correctly defines tensile strength as resistance to being pulled apart." },
        { id: 2, score: "3/4", reason: "Provides a good example (e.g., a rope under tension)." },
        { id: 3, score: "3/4", reason: "Mentions units of stress (Pascals), but does not fully explain the stress-strain curve." }
    ]
  }
};

const testimonials = [
  {
    avatar: 'https://i.pravatar.cc/150?img=5',
    quote: "The best thing is having the scoring details online. This lets us share more with the students and helps them understand where they need improvement.",
    name: 'Prof. Rajesh Kumar',
    title: 'Computer Science',
    institution: 'IIT BOMBAY'
  },
  {
    avatar: 'https://i.pravatar.cc/150?img=8',
    quote: "IntelliGrade helps me to be a more uniform grader and to adjust scoring on the fly. The AI insights are incredibly valuable for curriculum planning.",
    name: 'Dr. Anjali Patel',
    title: 'Physics',
    institution: 'IIM AHMEDABAD'
  },
  {
    avatar: 'https://i.pravatar.cc/150?img=7',
    quote: "The detailed rubric feedback helps students understand exactly where they lost marks. This has significantly reduced disputes and improved learning outcomes.",
    name: 'Dr. Vikram Singh',
    title: 'Chemistry',
    institution: 'BITS PILANI'
  }
];

const faqs = [
  { question: "Is IntelliGrade suitable for all subjects?", answer: "Yes! IntelliGrade is designed to be versatile. While it excels at STEM subjects with clear rubrics, its flexible criteria editor can be adapted for humanities, arts, and any subject requiring structured feedback." },
  { question: "How accurate is the AI grading?", answer: "Our AI is highly accurate when provided with a clear and detailed rubric. The 'step-wise' and 'keyword' marking features allow you to train the AI to grade exactly like you would. Plus, you always have the final say and can manually override any grade." },
  { question: "Can students cheat by copying answers?", answer: "IntelliGrade focuses on grading based on the provided rubric. While it doesn't have a built-in plagiarism detector, the detailed, per-step feedback often makes it obvious when students have not shown their work, which can discourage cheating." },
  { question: "What learning management systems (LMS) does it integrate with?", answer: "We are actively working on direct integrations with popular LMS platforms like Canvas, Moodle, and Blackboard. Currently, you can easily export grades in a standard CSV format that can be uploaded to any gradebook." },
  { question: "Is my data and my students' data secure?", answer: "Absolutely. We use industry-standard encryption and security protocols to protect all data. We are compliant with data privacy regulations to ensure your and your students' information is always safe." },
];

const FaqItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left text-lg font-medium text-gray-900"
      >
        <span>{question}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-4 text-gray-600">
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
};

const SocialIcon: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} className="text-gray-400 hover:text-white transition-colors">
    {children}
  </a>
);


export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const [activeSubject, setActiveSubject] = useState('Physics');
  const [activeAssignmentType, setActiveAssignmentType] = useState('Exams');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    const checkFirebase = async () => {
        try {
            const q = query(collection(db, 'questionPapers'), limit(1));
            await getDocs(q);
            setConnectionStatus('connected');
        } catch (error) {
            console.error("Firebase connection test failed:", error);
            setConnectionStatus('error');
        }
    };
    checkFirebase();
  }, []);

  const processSteps = [
    {
      step: 1,
      name: 'Connect',
      title: 'Plug into your existing workflow',
      description: 'Easily integrate with your LMS (Canvas, Moodle, Blackboard) or upload assignments manually or via email. No complex setup, no technical expertise needed.',
      color: 'bg-blue-500',
    },
    {
      step: 2,
      name: 'Configure',
      title: 'Define your grading expectations',
      description: 'Set up quizzes, exams, or assignments in seconds by providing basic instructions, rubrics, or preferred grading styles. AI adapts to your needs instantly.',
      color: 'bg-sky-500',
    },
    {
      step: 3,
      name: 'Assess',
      title: 'Review, refine, and publish',
      description: 'IntelliGrade grades automatically, but you stay in control. Quickly review AI-generated grades, make adjustments if needed, and publish results instantly.',
      color: 'bg-purple-500',
    },
    {
      step: 4,
      name: 'Refine',
      title: 'Analyze, resolve, and refine',
      description: 'Review class analytics to spot common misconceptions. Address student-raised disputes. Use these combined insights to adapt your teaching and improve student outcomes.',
      color: 'bg-pink-500',
    },
  ];

  const beforeItems = [
    "Spend 20 hours grading 100 answer sheets manually",
    "Fatigue sets in at sheet 50 and quality drops",
    "Can't explain grades consistently, and you feel defensive",
    "Students challenge marks, and you spend more time defending",
    "No way to know what the whole class struggled with",
    "Continue teaching the same way every year",
  ];

  const afterItems = [
    "Grades 100 papers in minutes, consistent on every single one",
    "Every mark is documented with clear reasoning",
    "Defends grades confidently as the rubric is transparent",
    "Disputes are resolved through documented review",
    "Dashboard shows: \"Class struggled with X concept\"",
    "Teaches better, reteaches what students missed",
  ];

  const assignmentSteps = [
    {
      step: 1,
      icon: <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" /></svg>,
      title: 'Scan Student Work',
      description: 'It pays off: saves time overall, prevents cheating, and frees your office of old exams.',
    },
    {
      step: 2,
      icon: <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      title: 'Grade Submissions',
      description: 'Give detailed feedback while maintaining consistency with a flexible rubric.',
    },
    {
      step: 3,
      icon: <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
      title: 'Send & Export Grades',
      description: 'Send grades to students with a click or export them to your own gradebook.',
    },
    {
      step: 4,
      icon: <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      title: 'Get Detailed Analytics',
      description: 'Get per-question and per-rubric statistics to understand how your students are doing.',
    },
  ];

  return (
    <div className="w-full bg-[#FBF9F6]">
      {/* Hero Section */}
      <div 
        className="relative text-center py-16 md:py-24 px-4 min-h-[calc(100vh-80px)] flex flex-col justify-center items-center"
      >
        <div className="absolute inset-0" style={{background: 'radial-gradient(ellipse at top left, rgba(244, 234, 247, 0.6), transparent 50%), radial-gradient(ellipse at top right, rgba(251, 242, 231, 0.6), transparent 50%)'}}></div>
        
        <div className="relative z-10">
          {/* Connection Status Indicator */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-6 border transition-all duration-300 ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800 border-green-200' :
              connectionStatus === 'error' ? 'bg-red-100 text-red-800 border-red-200' :
              'bg-blue-100 text-blue-800 border-blue-200'
          }`}>
              <span className={`w-2 h-2 mr-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'error' ? 'bg-red-500' :
                  'bg-blue-500 animate-pulse'
              }`}></span>
              {connectionStatus === 'connected' ? 'Database Connected' :
               connectionStatus === 'error' ? 'Database Connection Failed' :
               'Checking Connection...'}
          </div>

          <div className="mb-8 mx-auto bg-black w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-4xl font-bold font-serif italic">I</span>
          </div>
  
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-4 leading-tight max-w-4xl mx-auto">
            Grade an entire class before your coffee gets cold ☕
          </h1>
          
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-8">
            Set your marking criteria, and let IntelliGrade do the rest — stepwise marking, keyword detection, and instant summaries, all in one click.
          </p>
  
          {/* Buttons removed as requested */}
        </div>

        <div className="relative z-10 mt-20 w-full max-w-5xl mx-auto">
          <p className="text-sm text-gray-600">
            Trusted by Educators, Powered by Results
          </p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-8">
            <StatItem value="30+" label="Institutions" />
            <StatItem value="1L+" label="Answer Sheets Graded" />
            <StatItem value="95%" label="Time Saved on Grading" />
            <StatItem value="500+" label="Active Teachers" />
          </div>
        </div>
      </div>
      
      {/* The Grading Reality Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Text Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                The Grading Reality
              </h2>
              <div className="space-y-4 text-lg text-gray-700">
                <p>
                  Grading 100 answer sheets takes 20 hours. You're checking every step, every formula, trying to be fair. But fatigue sets in. Inconsistency creeps in. Some papers get thorough feedback, others don't.
                </p>
                <p>
                  Then students challenge grades. You spend more time defending your marks.
                </p>
                <p>
                  Our software grades exactly like you would, understanding partial credit, following your rubric consistently on every single paper. It handles the grading. You get your time back.
                </p>
                <p>
                  No more late nights. No more grade disputes. Just fair, consistent grading done in minutes.
                </p>
              </div>

              {/* Insight Box */}
              <div className="mt-8 p-6 rounded-lg bg-[#FBF9F6] border-l-4 border-purple-500">
                <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-2">
                  Insight
                </p>
                <p className="text-gray-700">
                  15 hours of grading per week is a 540-hour annual time drain taken away from your students. Get that time back by automating the repetitive work and start grading with confidence.
                </p>
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="flex justify-center items-center">
              <img 
                src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1200&auto=format&fit=crop" 
                alt="A teacher presenting to a class of engaged students"
                className="rounded-xl shadow-lg object-cover w-full h-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Grades Should Talk, Not Just Count
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              One exam. Many insights. Endless improvement. See how IntelliGrade transforms grading into a powerful teaching tool.
            </p>
          </div>

          {/* Stepper */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="flex items-center">
              {processSteps.map((step, index) => (
                <React.Fragment key={step.step}>
                  <div className="flex flex-col items-center text-center w-1/4">
                    <div className={`text-white text-sm font-bold py-2 px-4 rounded-full ${step.color}`}>
                      {step.step}. {step.name}
                    </div>
                    <div className="mt-4 w-6 h-6 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
                       <div className={`w-3 h-3 rounded-full ${step.color} opacity-50`}></div>
                    </div>
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="flex-auto border-t-2 border-gray-300 border-dashed -mt-8"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step) => (
              <div key={step.step} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Use IntelliGrade Section */}
      <section className="bg-[#FBF9F6] py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Why Use IntelliGrade?
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Transform hours of manual grading into minutes of focused teaching. See the difference AI-powered grading makes for educators and students alike.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Before Card */}
            <div className="bg-white border border-red-200 rounded-2xl shadow-lg p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h3 className="text-2xl font-bold text-gray-800">Before IntelliGrade</h3>
              </div>
              <div className="border-t border-red-200 pt-4">
                <ul className="space-y-3">
                  {beforeItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* After Card */}
            <div className="bg-gradient-to-br from-purple-50 via-yellow-50 to-white border border-purple-200 rounded-2xl shadow-lg p-6 md:p-8">
               <div className="flex items-center gap-3 mb-4">
                 <svg className="h-7 w-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <h3 className="text-2xl font-bold text-gray-800">After IntelliGrade</h3>
               </div>
               <div className="border-t border-purple-200 pt-4">
                  <ul className="space-y-3">
                    {afterItems.map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-gray-700">
                         <svg className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                         <span>{item}</span>
                      </li>
                    ))}
                  </ul>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grade All Subjects Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Grade All Subjects
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              IntelliGrade supports variable-length assignments (problem sets & projects) as well as fixed-template assignments (worksheets, quizzes, bubble sheets, and exams).
            </p>
          </div>

          <div className="mt-12 flex justify-center items-center flex-wrap gap-3">
            {subjects.map(subject => (
              <button
                key={subject.name}
                onClick={() => setActiveSubject(subject.name)}
                className={`flex items-center justify-center font-semibold text-sm px-4 py-2 rounded-full transition-colors duration-200 ${
                  activeSubject === subject.name
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {subject.icon}
                {subject.name}
              </button>
            ))}
          </div>

          <div className="mt-10 max-w-6xl mx-auto bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left side: Question and Image */}
                <div className="lg:col-span-3">
                  <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-md border">
                    {subjectExamples[activeSubject as keyof typeof subjectExamples].question}
                  </p>
                  <img
                    src={subjectExamples[activeSubject as keyof typeof subjectExamples].imageUrl}
                    alt={`${activeSubject} answer sheet example`}
                    className="rounded-lg border shadow-sm w-full"
                  />
                </div>
                {/* Right side: Points and Breakdown */}
                <div className="lg:col-span-2">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <p className="text-sm font-bold text-purple-700 uppercase tracking-wider">Total Points</p>
                    <p className="text-4xl font-extrabold text-purple-800 mt-1">
                      {subjectExamples[activeSubject as keyof typeof subjectExamples].totalPoints}
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {subjectExamples[activeSubject as keyof typeof subjectExamples].breakdown.map(item => (
                      <div key={item.id} className="bg-gray-50 p-3 rounded-md flex items-start gap-3">
                        <div className="flex-shrink-0 h-6 w-6 bg-gray-200 text-gray-600 text-xs font-bold rounded-full flex items-center justify-center">
                          {item.id}
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-semibold text-gray-800">{item.score}</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Your Existing Assignments Section */}
      <section className="bg-[#FBF9F6] py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Use Your Existing Assignments
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              No need to alter your assignments. Grade paper-based, digital, and code assignments in half the time.
            </p>
          </div>

          <div className="mt-12 max-w-2xl mx-auto">
            <div className="border-b border-gray-300">
              <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
                {['Exams', 'Homework', 'Code', 'Bubble Sheets'].map(tabName => (
                  <button
                    key={tabName}
                    onClick={() => setActiveAssignmentType(tabName)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors ${
                      activeAssignmentType === tabName
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tabName}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {assignmentSteps.map((step) => (
              <div key={step.step} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-purple-600 text-white text-2xl font-bold rounded-full flex items-center justify-center">{step.step}</div>
                </div>
                <div className="mb-4">{step.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Trusted by Educators Across India
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              See what professors and teachers are saying about IntelliGrade
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm text-center flex flex-col items-center hover:shadow-lg transition-shadow">
                <img src={testimonial.avatar} alt={testimonial.name} className="w-20 h-20 rounded-full mb-4 object-cover ring-2 ring-offset-2 ring-purple-200" />
                <p className="text-gray-600 italic mb-6 flex-grow">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.title}</p>
                  <p className="text-sm font-bold text-blue-600 mt-1">{testimonial.institution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#FBF9F6] py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Have questions? We have answers. If you can't find what you're looking for, feel free to contact us.
            </p>
          </div>
          <div className="mt-12">
            {faqs.map((faq, index) => (
              <FaqItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">Footer</h2>
        <div className="container mx-auto py-12 px-4 md:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8 xl:col-span-1">
              <div className="flex items-center">
                <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="logoGradientFooter" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                  </defs>
                  <path d="M4,10.4C4,8.52288 5.52288,7 7.4,7H40.6C42.4771,7 44,8.52288 44,10.4V25.7512C44,26.784 43.4355,27.7333 42.5448,28.2488L26.5448,38.0488C25.1311,38.9073 23.3333,38.8256 22.0223,37.8633L5.45517,25.2633C4.54203,24.5807 4,23.5432 4,22.4288V10.4Z" fill="url(#logoGradientFooter)" />
                  <path d="M19.9999 31.2L13.5999 24.8L16.3999 22L19.9999 25.6L31.5999 14L34.3999 16.8L19.9999 31.2Z" fill="white" />
                  <path d="M25 12L26.5 15L29 16L26.5 17L25 20L23.5 17L21 16L23.5 15L25 12Z" fill="#A7F3D0" />
                </svg>
                <h1 className="text-2xl font-bold ml-3">
                  <span className="text-gray-200">Intelli</span>
                  <span className="text-blue-400">Grade</span>
                </h1>
              </div>
              <p className="text-gray-400 text-base">Transforming education with AI-powered grading and analytics.</p>
              <div className="flex space-x-6">
                <SocialIcon href="#"><span className="sr-only">Facebook</span><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg></SocialIcon>
                <SocialIcon href="#"><span className="sr-only">Twitter</span><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg></SocialIcon>
                <SocialIcon href="#"><span className="sr-only">LinkedIn</span><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg></SocialIcon>
              </div>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Product</h3>
                  <ul className="mt-4 space-y-4">
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Features</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Pricing</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Analytics</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Security</a></li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Company</h3>
                  <ul className="mt-4 space-y-4">
                     <li><a href="#" className="text-base text-gray-300 hover:text-white">About</a></li>
                     <li><a href="#" className="text-base text-gray-300 hover:text-white">Blog</a></li>
                     <li><a href="#" className="text-base text-gray-300 hover:text-white">Careers</a></li>
                     <li><a href="#" className="text-base text-gray-300 hover:text-white">Contact</a></li>
                  </ul>
                </div>
              </div>
              <div className="md:grid md:grid-cols-2 md:gap-8">
                  <div>
                      <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Legal</h3>
                      <ul className="mt-4 space-y-4">
                          <li><a href="#" className="text-base text-gray-300 hover:text-white">Privacy</a></li>
                          <li><a href="#" className="text-base text-gray-300 hover:text-white">Terms</a></li>
                      </ul>
                  </div>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-700 pt-8">
            <p className="text-base text-gray-400 xl:text-center">&copy; {new Date().getFullYear()} IntelliGrade, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
