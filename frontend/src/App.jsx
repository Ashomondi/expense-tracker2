import React, { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { ExpensesPage } from './pages/ExpensesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { API_BASE } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('KES');

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me`, {
          credentials: 'include',
        });

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
      await fetch(`${API_BASE}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
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

  if (user) {
    return (
      <div className="flex min-h-screen bg-[#0E1310] text-white">
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

        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-white/10 bg-[#0E1310] p-4 flex items-center justify-end">
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Currency</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <Dashboard user={user} onLogout={handleLogout} selectedCurrency={selectedCurrency} />
          )}
          {activeTab === 'expenses' && (
            <ExpensesPage selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />
          )}
          {activeTab === 'budgets' && <BudgetsPage selectedCurrency={selectedCurrency} />}
        </div>
      </div>
    );
  }

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
}
