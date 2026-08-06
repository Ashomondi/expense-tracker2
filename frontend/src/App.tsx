import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { ExpensesPage } from './components/ExpensesPage';
import { BudgetsPage } from './components/BudgetsPage';
import { API_BASE } from './api';

interface User {
  id: number;
  full_name: string;
  email: string;
}

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // 1. Updated activeTab state to include 'budgets'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'budgets'>('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me`);
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

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
      setCurrentPage('landing');
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

  // 1. Authenticated Main Layout
  if (user) {
    return (
      <div className="flex min-h-screen bg-[#0E1310] text-white">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/10 p-6 flex flex-col justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-[#10B981] mb-8">Spendly</h1>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition-colors ${
                  activeTab === 'dashboard' ? 'bg-[#10B981] text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition-colors ${
                  activeTab === 'expenses' ? 'bg-[#10B981] text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                Expenses
              </button>

              {/* 2. Added Budgets Nav Link */}
              <button
                onClick={() => setActiveTab('budgets')}
                className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition-colors ${
                  activeTab === 'budgets' ? 'bg-[#10B981] text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                Budgets
              </button>
            </nav>
          </div>

          <div>
            <div className="mb-4">
              <p className="font-semibold text-sm">{user.full_name}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <button onClick={handleLogout} className="text-xs text-red-400 hover:underline">
              Log out
            </button>
          </div>
        </aside>

        {/* 3. Dynamic Main View with Budgets Page */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <Dashboard user={user} onLogout={handleLogout} />}
          {activeTab === 'expenses' && <ExpensesPage onAddExpenseClick={() => setActiveTab('dashboard')} />}
          {activeTab === 'budgets' && <BudgetsPage />}
        </div>
      </div>
    );
  }

  // 2. Landing Page
  if (currentPage === 'landing') {
    return (
      <LandingPage
        onNavigate={(page) => {
          setAuthMode(page);
          setCurrentPage('auth');
        }}
      />
    );
  }

  // 3. Auth Page
  return (
    <AuthPage
      mode={authMode}
      onNavigate={(page) => {
        if (page === 'home') setCurrentPage('landing');
        else {
          setAuthMode(page);
          setCurrentPage('auth');
        }
      }}
      onSuccess={(loggedInUser) => setUser(loggedInUser)}
    />
  );
};

export default App;