import React, { useState } from 'react';
import { TeacherView } from './views/TeacherView';
import { StudentView } from './views/StudentView';
import { Header } from './components/Header';
import { Role, UserProfile } from './types';
import { LandingPage } from './views/LandingPage';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Spinner } from './components/Spinner';
import { ProfilePage } from './views/ProfilePage';

const MainContent: React.FC = () => {
    const { userProfile: authUserProfile, loading, logout: authLogout } = useAuth();
    const [demoRole, setDemoRole] = useState<Role | null>(null);
    const [currentView, setCurrentView] = useState<'dashboard' | 'profile'>('dashboard');

    // Reset view to dashboard when user state changes (e.g. logout)
    React.useEffect(() => {
        if (!authUserProfile && !demoRole) {
            setCurrentView('dashboard');
        }
    }, [authUserProfile, demoRole]);

    // Create a composite user profile that prefers the Auth user but falls back to a Demo user if bypass is active
    const activeUserProfile: UserProfile | null = authUserProfile || (demoRole ? {
        uid: 'demo-user',
        email: 'demo@checkdai.com',
        displayName: demoRole === Role.TEACHER ? 'Prof. Alex Smith' : 'Jane Doe',
        role: demoRole,
        createdAt: new Date()
    } : null);

    const isLoggedIn = !!activeUserProfile;
    const role = activeUserProfile?.role;

    const handleOpenLogin = (role: Role = Role.TEACHER) => {
        // Direct redirect logic: Set demo mode instead of opening modal
        setDemoRole(role);
        setCurrentView('dashboard');
    };

    const handleLogout = () => {
        if (demoRole) {
            setDemoRole(null);
            setCurrentView('dashboard');
        } else {
            authLogout();
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50">
                <Spinner size="lg" text="Loading..." />
            </div>
        );
    }

    // This class ensures the dashboard takes full width/height correctly
    const mainContainerClass = isLoggedIn ? "h-full" : "";

    const renderContent = () => {
        // 1. Not Logged In -> Landing Page
        if (!isLoggedIn) {
            return <LandingPage onLoginClick={handleOpenLogin} />;
        }

        // 2. Profile View Request -> Profile Page
        if (currentView === 'profile' && activeUserProfile) {
            return <ProfilePage 
                userProfile={activeUserProfile} 
                onBack={() => setCurrentView('dashboard')} 
                onLogout={handleLogout} 
            />;
        }

        // 3. Logged In -> Redirect based on Role
        // Note: AuthContext ensures role is never UNSELECTED for a logged-in user.
        if (role === Role.STUDENT) {
            return <StudentView />;
        } 
        
        // Default to Teacher View for TEACHER or any fallback case to ensure user sees a portal
        return <TeacherView />;
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Header 
                isLoggedIn={isLoggedIn}
                userProfile={activeUserProfile}
                onLoginClick={handleOpenLogin}
                onLogoutClick={handleLogout}
                onProfileClick={() => setCurrentView('profile')}
            />
            <main className={mainContainerClass}>
                {renderContent()}
            </main>
        </div>
    );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
          <AppProvider>
            <MainContent />
          </AppProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;