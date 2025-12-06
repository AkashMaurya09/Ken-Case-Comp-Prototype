
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    User,
    updateProfile as updateAuthProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Role, UserProfile } from '../types';
import { useToast } from './ToastContext';

interface AuthContextType {
    currentUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    signup: (email: string, pass: string, name: string, role: Role) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        
                        // Safely handle Firestore Timestamp conversion
                        const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function'
                            ? data.createdAt.toDate()
                            : new Date(data.createdAt || Date.now());

                        // ROBUST ROLE PARSING:
                        // Ensure we never end up with an undefined or UNSELECTED role in the app state.
                        // If the DB has garbage or 0 (UNSELECTED), default to TEACHER to unblock the user.
                        let safeRole = Role.TEACHER; 
                        if (data.role !== undefined && data.role !== null) {
                            const parsedRole = Number(data.role);
                            // If it's a valid number and not UNSELECTED (0), use it. 
                            // Otherwise fallback to TEACHER (1).
                            if (!isNaN(parsedRole) && parsedRole !== Role.UNSELECTED) {
                                safeRole = parsedRole;
                            }
                        }

                        setUserProfile({ 
                            ...data, 
                            uid: user.uid, 
                            role: safeRole,
                            createdAt 
                        } as UserProfile);
                    } else {
                         // Fallback: If Auth exists but Firestore doc is missing (e.g. legacy user or create fail),
                         // auto-create the profile to unblock the user.
                         console.warn("User profile missing in Firestore. Creating default profile.");
                         const newProfile: UserProfile = {
                            uid: user.uid,
                            email: user.email || "",
                            displayName: user.displayName || "User",
                            role: Role.TEACHER, // Default to Teacher to allow access
                            createdAt: new Date()
                        };
                        await setDoc(docRef, newProfile);
                        setUserProfile(newProfile);
                    }
                } catch (err) {
                    console.error("Error fetching user profile", err);
                    // Don't log out, just let the UI handle the error state if needed
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const mapAuthError = (error: any): Error => {
        console.error("Auth Error:", error);
        switch (error.code) {
            case 'auth/configuration-not-found':
            case 'auth/operation-not-allowed':
                return new Error("Email/Password login is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.");
            case 'auth/email-already-in-use':
                return new Error("This email is already registered. Please log in.");
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return new Error("Invalid email or password.");
            case 'auth/weak-password':
                return new Error("Password should be at least 6 characters.");
            case 'auth/network-request-failed':
                return new Error("Network error. Please check your internet connection.");
            default:
                return new Error(error.message || "An authentication error occurred.");
        }
    };

    const signup = async (email: string, pass: string, name: string, role: Role) => {
        try {
            // Ensure we never sign up with UNSELECTED
            const finalRole = role === Role.UNSELECTED ? Role.TEACHER : role;

            const res = await createUserWithEmailAndPassword(auth, email, pass);
            
            // Try to update the Auth profile display name immediately
            try {
                await updateAuthProfile(res.user, { displayName: name });
            } catch (e) {
                console.warn("Failed to update auth profile name", e);
            }

            const newUser: UserProfile = {
                uid: res.user.uid,
                email: email,
                displayName: name,
                role: finalRole,
                createdAt: new Date()
            };
            
            // Store user details in Firestore
            await setDoc(doc(db, 'users', res.user.uid), newUser);
            
            // Optimistically update state to prevent flicker
            setUserProfile(newUser);
            
            toast.success("Account created successfully!");
        } catch (error: any) {
            throw mapAuthError(error);
        }
    };

    const login = async (email: string, pass: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            toast.success("Logged in successfully!");
        } catch (error: any) {
            throw mapAuthError(error);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUserProfile(null);
            toast.info("Logged out.");
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ currentUser, userProfile, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
