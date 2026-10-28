import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  LogOut,
  Receipt,
  Smartphone,
  Target,
} from 'lucide-react';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { ExpensesPage } from './pages/ExpensesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { MpesaPage } from './pages/MpesaPage';
import { API_BASE } from './api';

interface User {
  id: number;
  full_name: string;
  email: string;
}

type AppTab = 'dashboard' | 'expenses' | 'budgets' | 'mpesa';

const NAV_ITEMS: { id: AppTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
];

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<'KES' | 'USD' | 'EUR' | 'GBP'>('KES');

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
      <div className="min-h-screen bg-bg-dark text-white flex items-center justify-center font-sans">
        <p className="text-sm text-text-muted tracking-wide">Loading Spendly...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen bg-bg-dark text-white font-sans">
        <aside className="w-64 border-r border-white/10 bg-bg-elevated/60 p-5 flex flex-col justify-between shrink-0">
          <div>
            <div className="logo-mark mb-8 px-1">
              <span className="logo-mark-circles" aria-hidden>
                <span />
                <span />
              </span>
              <span className="logo-mark-text">Spendly</span>
            </div>

            <nav className="space-y-1.5">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 text-left px-3.5 py-2.5 font-semibold rounded-xl text-sm transition-colors ${
                      active
                        ? 'bg-brand text-white shadow-[0_0_24px_rgba(59,130,246,0.35)]'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={18} strokeWidth={2.1} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-white/10 pt-4 px-1">
            <div className="mb-3">
              <p className="font-semibold text-sm tracking-tight">{user.full_name}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
            >
              <LogOut size={14} strokeWidth={2.25} aria-hidden />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="border-b border-white/10 bg-bg-dark/90 backdrop-blur-md sticky top-0 z-20 p-4 flex items-center justify-end">
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                Currency
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) =>
                  setSelectedCurrency(e.target.value as 'KES' | 'USD' | 'EUR' | 'GBP')
                }
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand"
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
            <ExpensesPage
              selectedCurrency={selectedCurrency}
              onCurrencyChange={setSelectedCurrency}
            />
          )}
          {activeTab === 'budgets' && <BudgetsPage selectedCurrency={selectedCurrency} />}
          {activeTab === 'mpesa' && <MpesaPage selectedCurrency={selectedCurrency} />}
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
};

export default App;
