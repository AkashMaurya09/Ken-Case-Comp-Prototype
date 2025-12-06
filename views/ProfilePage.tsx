
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Role, UserProfile } from '../types';

interface ProfilePageProps {
    userProfile: UserProfile;
    onBack: () => void;
    onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile, onBack, onLogout }) => {
    const { questionPapers, studentSubmissions } = useAppContext();

    const isTeacher = userProfile.role === Role.TEACHER;
    const backLabel = isTeacher ? "Back to Teacher Portal" : "Back to Student Portal";

    // --- Mock Data Generators ---
    const getTeacherMockData = () => ({
        institution: "Greenwood High School",
        department: "Department of Physics & Mathematics",
        bio: "Passionate educator with 10+ years of experience in STEM education. Leveraging AI to provide faster, more consistent feedback to students.",
        badges: [
            { label: "Top Grader", color: "bg-yellow-100 text-yellow-700" },
            { label: "Early Adopter", color: "bg-blue-100 text-blue-700" },
            { label: "Rubric Master", color: "bg-purple-100 text-purple-700" }
        ],
        recentActivity: [
            { id: 1, text: "Created 'Physics Mid-Term' paper", time: "2 hours ago" },
            { id: 2, text: "Graded 15 submissions for 'Algebra Quiz'", time: "Yesterday" },
            { id: 3, text: "Updated rubric for 'Thermodynamics'", time: "3 days ago" },
            { id: 4, text: "Resolved 2 student disputes", time: "Last week" },
        ]
    });

    const getStudentMockData = () => ({
        institution: "Greenwood High School",
        details: "Class 12 - Section B | Roll No. 42",
        bio: "Aspiring astrophysicist. Love solving complex problems, coding, and playing chess. Aiming for top universities.",
        badges: [
            { label: "Honor Roll", color: "bg-green-100 text-green-700" },
            { label: "Perfect Attendance", color: "bg-teal-100 text-teal-700" },
            { label: "Physics Whiz", color: "bg-indigo-100 text-indigo-700" }
        ],
        recentActivity: [
            { id: 1, text: "Submitted 'Physics Mid-Term'", time: "1 hour ago" },
            { id: 2, text: "Received Grade A on 'Calculus I'", time: "Yesterday" },
            { id: 3, text: "Raised dispute on 'Lab Report 3'", time: "2 days ago" },
            { id: 4, text: "Joined 'Advanced Mechanics' class", time: "Last week" },
        ]
    });

    const mockData = isTeacher ? getTeacherMockData() : getStudentMockData();

    // --- Stats Calculation ---
    // Combine real app data with some mock stats for a fuller profile look
    const realStats = isTeacher ? [
        { label: 'Papers Created', value: questionPapers.length, icon: '📄', color: 'bg-blue-100 text-blue-600' },
        { label: 'Total Submissions', value: studentSubmissions.length, icon: '📝', color: 'bg-purple-100 text-purple-600' }
    ] : [
        { label: 'Papers Submitted', value: studentSubmissions.filter(s => s.studentName === userProfile.displayName).length, icon: '📤', color: 'bg-green-100 text-green-600' },
        { label: 'Graded Returns', value: studentSubmissions.filter(s => s.studentName === userProfile.displayName && s.gradedResults).length, icon: '✅', color: 'bg-indigo-100 text-indigo-600' }
    ];

    const displayStats = [
        ...realStats,
        isTeacher 
            ? { label: 'Hours Saved', value: '120+', icon: '⏳', color: 'bg-orange-100 text-orange-600' }
            : { label: 'Avg Score', value: '88%', icon: '📈', color: 'bg-pink-100 text-pink-600' }
    ];

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        const d = date instanceof Date ? date : new Date(date.seconds * 1000);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
            <button 
                onClick={onBack} 
                className="group flex items-center gap-3 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-6"
            >
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </div>
                {backLabel}
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Profile Header Background */}
                <div className={`h-36 bg-gradient-to-r ${isTeacher ? 'from-blue-600 to-indigo-600' : 'from-emerald-500 to-teal-600'}`}></div>
                
                <div className="px-8 pb-8 relative">
                    {/* Avatar & Main Info */}
                    <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-6 gap-6">
                        <div className="w-32 h-32 rounded-full bg-white p-1.5 shadow-lg flex-shrink-0 z-10">
                            <div className={`w-full h-full rounded-full flex items-center justify-center text-4xl border border-gray-100 font-bold ${isTeacher ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {userProfile.displayName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        
                        <div className="flex-grow pt-2 md:pt-0">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">{userProfile.displayName}</h1>
                                    <p className="text-gray-500 font-medium">{userProfile.email}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm">
                                        Edit Profile
                                    </button>
                                    <button 
                                        onClick={onLogout}
                                        className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors shadow-sm"
                                    >
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Role Badge & Join Date */}
                    <div className="flex items-center gap-3 mb-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                            isTeacher 
                                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                            {isTeacher ? 'Teacher' : 'Student'}
                        </span>
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Joined {formatDate(userProfile.createdAt)}
                        </span>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 border-t border-gray-100 pt-8">
                        
                        {/* Left Column: Bio & Info */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* About Section */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">About</h3>
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                    <p className="text-gray-700 leading-relaxed mb-4">{mockData.bio}</p>
                                    <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            {mockData.institution}
                                        </div>
                                        {isTeacher ? (
                                             <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l2.387.477a2 2 0 001.806.547a2 2 0 001.022-.547l3.182-3.182a6 6 0 00.517-3.86l.158-.318a6 6 0 00.517 3.86l.477-2.387a2 2 0 00.547-1.806z" /></svg>
                                                {(mockData as any).department}
                                             </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                {(mockData as any).details}
                                             </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                             {/* Stats Section */}
                             <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Statistics</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {displayStats.map((stat, index) => (
                                        <div key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2 ${stat.color}`}>
                                                {stat.icon}
                                            </div>
                                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                             </div>

                             {/* Recent Activity */}
                             <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Activity</h3>
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <ul className="divide-y divide-gray-100">
                                        {mockData.recentActivity.map((activity) => (
                                            <li key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                    <p className="text-sm text-gray-800 font-medium flex-grow">{activity.text}</p>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                             </div>

                        </div>

                        {/* Right Column: Badges & Settings */}
                        <div className="space-y-8">
                             {/* Badges */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Badges & Achievements</h3>
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                    <div className="flex flex-wrap gap-2">
                                        {mockData.badges.map((badge, idx) => (
                                            <span key={idx} className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.color.replace('text', 'border').replace('bg', 'border-opacity-0')}`}>
                                                {badge.label}
                                            </span>
                                        ))}
                                    </div>
                                    <button className="mt-4 w-full text-center text-sm text-blue-600 hover:underline">View All Achievements</button>
                                </div>
                            </div>

                            {/* Account Info Box */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Account Status
                                </h3>
                                <p className="text-sm text-blue-700 mb-3">
                                    Your account is <strong>Active</strong>.
                                </p>
                                <p className="text-xs text-blue-600">
                                    For security reasons, email and password updates are handled by your institution's administrator.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
