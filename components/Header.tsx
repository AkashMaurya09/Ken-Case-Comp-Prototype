
import React, { useState, useRef, useEffect } from 'react';
import { ProfileDropdown } from './ProfileDropdown';
import { useAuth } from '../context/AuthContext';
import { Role, UserProfile } from '../types';

interface HeaderProps {
    isLoggedIn: boolean;
    userProfile?: UserProfile | null;
    onLoginClick: (role?: Role) => void;
    onLogoutClick: () => void;
    onProfileClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isLoggedIn, userProfile: propUserProfile, onLoginClick, onLogoutClick, onProfileClick }) => {
  const { userProfile: authUserProfile } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const loginDropdownRef = useRef<HTMLDivElement>(null);

  // Use the prop if provided (for demo/override), otherwise fall back to auth context
  const userProfile = propUserProfile !== undefined ? propUserProfile : authUserProfile;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target as Node)) {
            setIsLoginOpen(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 h-20 flex items-center">
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center cursor-pointer" onClick={() => window.location.reload()}>
            {/* New Professional IntelliGrade Logo */}
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
              </defs>
              <path 
                d="M4,10.4C4,8.52288 5.52288,7 7.4,7H40.6C42.4771,7 44,8.52288 44,10.4V25.7512C44,26.784 43.4355,27.7333 42.5448,28.2488L26.5448,38.0488C25.1311,38.9073 23.3333,38.8256 22.0223,37.8633L5.45517,25.2633C4.54203,24.5807 4,23.5432 4,22.4288V10.4Z" 
                fill="url(#logoGradient)"
              />
              <path 
                d="M19.9999 31.2L13.5999 24.8L16.3999 22L19.9999 25.6L31.5999 14L34.3999 16.8L19.9999 31.2Z" 
                fill="white"
              />
              {/* Spark for AI element */}
              <path d="M25 12L26.5 15L29 16L26.5 17L25 20L23.5 17L21 16L23.5 15L25 12Z" fill="#A7F3D0"/>
            </svg>
            <h1 className="text-2xl font-bold ml-3">
              <span className="text-gray-800">Intelli</span>
              <span className="text-blue-600">Grade</span>
            </h1>
        </div>
        {isLoggedIn && userProfile ? (
            <div className="flex items-center gap-4">
                 <span className="hidden md:block text-sm font-medium text-gray-700">
                    Hi, {userProfile.displayName || "User"}
                 </span>
                 <ProfileDropdown onLogoutClick={onLogoutClick} onProfileClick={onProfileClick} />
            </div>
        ) : (
            <div className="relative" ref={loginDropdownRef}>
                <button 
                    onClick={() => setIsLoginOpen(!isLoginOpen)} 
                    className="group text-sm font-semibold bg-gray-900 text-white px-5 py-2.5 rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 ring-2 ring-transparent hover:ring-gray-200"
                >
                    Get Started
                    <svg className={`w-4 h-4 transition-transform duration-200 ${isLoginOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                
                {isLoginOpen && (
                    <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 z-50 animate-dropdown origin-top-right overflow-hidden border border-gray-100">
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => {
                                    onLoginClick(Role.TEACHER);
                                    setIsLoginOpen(false);
                                }}
                                className="w-full group flex items-start gap-4 p-3 rounded-lg hover:bg-blue-50 transition-all duration-200"
                            >
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900 group-hover:text-blue-700">Teacher Portal</p>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">Create papers, define rubrics & automate grading.</p>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    onLoginClick(Role.STUDENT);
                                    setIsLoginOpen(false);
                                }}
                                className="w-full group flex items-start gap-4 p-3 rounded-lg hover:bg-indigo-50 transition-all duration-200"
                            >
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900 group-hover:text-indigo-700">Student Portal</p>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">Submit assignments & view detailed analytics.</p>
                                </div>
                            </button>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 text-xs text-center text-gray-500 border-t border-gray-100 font-medium">
                            First time here? <span className="text-blue-600">No account required.</span>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </header>
  );
};
