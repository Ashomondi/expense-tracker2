import React, { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage'; // Adjust path if needed
import { Dashboard } from './components/Dashboard'; // Adjust path if needed

interface User {
  id: number;
  full_name: string;
  email: string;
}

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'signup'>('login');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already logged in via HTTP-only cookie on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (err) {
        console.error('Failed to authenticate session:', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
      setCurrentPage('login');
      setAuthMode('login');
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0E1310] text-white flex items-center justify-center font-sans">
        <p className="text-sm text-gray-400">Loading Spendly...</p>
      </div>
    );
  }

  // 1. If User is Logged In -> Render the Full Dashboard
  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  // 2. Navigation Handler for Auth / Landing Page
  const handleNavigate = (page: 'home' | 'login' | 'signup') => {
    setCurrentPage(page);
    if (page === 'login' || page === 'signup') {
      setAuthMode(page);
    }
  };

  // 3. Render Auth Page (Login / Signup)
  return (
    <AuthPage
      mode={authMode}
      onNavigate={handleNavigate}
      onSuccess={(loggedInUser) => setUser(loggedInUser)}
    />
  );
};

export default App;