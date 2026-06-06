import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import AdminDashboard from './components/AdminDashboard';
import AgentDashboard from './components/AgentDashboard';
import ClientDashboard from './components/ClientDashboard';
import { getCurrentSessionUser, setCurrentSessionUser } from './dataStore';
import { User } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Navigation states: 'home' | 'login' | 'register' | 'dashboard'
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'register' | 'dashboard'>('home');

  // Load existing session on boot
  useEffect(() => {
    const sessionUser = getCurrentSessionUser();
    if (sessionUser) {
      setCurrentUser(sessionUser);
      setCurrentView('dashboard');
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('bg_auth_token');
    setCurrentSessionUser(null);
    setCurrentUser(null);
    setCurrentView('home');
  };

  // Router layout
  return (
    <div className="font-sans antialiased text-slate-800 bg-slate-50 min-h-screen">
      {currentView === 'home' && (
        <LandingPage 
          onNavigate={(target) => setCurrentView(target)} 
          currentUser={currentUser}
        />
      )}

      {(currentView === 'login' || currentView === 'register') && (
        <AuthPage
          initialMode={currentView}
          onLoginSuccess={handleLoginSuccess}
          onBackToHome={() => setCurrentView('home')}
        />
      )}

      {currentView === 'dashboard' && currentUser && (
        <>
          {currentUser.role === 'admin' && (
            <AdminDashboard 
              user={currentUser} 
              onLogout={handleLogout} 
              onGoHome={() => setCurrentView('home')}
            />
          )}

          {currentUser.role === 'agent' && (
            <AgentDashboard 
              user={currentUser} 
              onLogout={handleLogout} 
              onGoHome={() => setCurrentView('home')}
            />
          )}

          {currentUser.role === 'client' && (
            <ClientDashboard 
              user={currentUser} 
              onLogout={handleLogout} 
              onGoHome={() => setCurrentView('home')}
            />
          )}
        </>
      )}
    </div>
  );
}

