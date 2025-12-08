
import React, { useState, useEffect } from 'react';
import { Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './Spinner';

interface LoginModalProps {
    onClose: () => void;
    initialRole?: Role;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, initialRole = Role.TEACHER }) => {
    const { login, signup } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Active Role Tab (Defaults to prop, can be switched)
    const [activeRole, setActiveRole] = useState<Role>(initialRole === Role.UNSELECTED ? Role.TEACHER : initialRole);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        if (initialRole !== Role.UNSELECTED) {
            setActiveRole(initialRole);
        }
    }, [initialRole]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isSignup) {
                await signup(email, password, name, activeRole);
            } else {
                await login(email, password);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const isTeacher = activeRole === Role.TEACHER;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full m-4 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header / Tabs */}
                <div className="flex text-center border-b border-gray-100">
                    <button 
                        className={`flex-1 py-6 text-sm font-bold uppercase tracking-wider transition-colors ${
                            isTeacher 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveRole(Role.TEACHER)}
                    >
                        Educator Login
                    </button>
                    <button 
                        className={`flex-1 py-6 text-sm font-bold uppercase tracking-wider transition-colors ${
                            !isTeacher 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveRole(Role.STUDENT)}
                    >
                        Student Portal
                    </button>
                </div>

                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={`text-2xl font-bold ${isTeacher ? 'text-blue-600' : 'text-indigo-600'}`}>
                            {isSignup ? "Create Account" : "Welcome Back"}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl font-light leading-none">&times;</button>
                    </div>

                    <p className="text-gray-500 text-sm mb-6">
                        {isTeacher 
                            ? "Log in to grade papers, manage rubrics, and view class analytics." 
                            : "Log in to submit your assignments and view your graded results."}
                    </p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm mb-4 animate-slide-up">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignup && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent focus:ring-blue-500"
                                    placeholder={isTeacher ? "Prof. Alex Smith" : "Jane Doe"}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input 
                                type="email" 
                                required 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={`w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${
                                    isTeacher ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                                }`}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input 
                                type="password" 
                                required 
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className={`w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${
                                    isTeacher ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                                }`}
                                placeholder="••••••"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-transform active:scale-95 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-6 ${
                                isTeacher 
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                                    : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
                            }`}
                        >
                            {loading ? <Spinner size="sm" /> : (isSignup ? "Sign Up" : "Login")}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button 
                            onClick={() => {
                                setIsSignup(!isSignup);
                                setError(null);
                            }}
                            className={`font-bold hover:underline ${isTeacher ? 'text-blue-600' : 'text-indigo-600'}`}
                        >
                            {isSignup ? "Login" : "Sign Up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
