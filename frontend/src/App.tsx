import { useState, useEffect } from "react";
import { LandingPage } from "./components/LandingPage";
import { AuthPage } from "./components/AuthPage"; // <-- Change this line!

interface User {
  id: number;
  full_name: string;
  email: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'signup' | 'dashboard'>('home');
  const [user, setUser] = useState<User | null>(null);

  // Check auth cookie on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setCurrentPage('dashboard');
      }
    } catch (err) {
      setUser(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setCurrentPage('home');
  };

  if (currentPage === 'home') {
    return <LandingPage onNavigate={(page) => setCurrentPage(page)} />;
  }

  if (currentPage === 'login' || currentPage === 'signup') {
    return (
      <AuthPage 
        mode={currentPage} 
        onNavigate={(page) => setCurrentPage(page)}
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setCurrentPage('dashboard');
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-card-bg border border-card-border p-8 rounded-xl shadow-xl">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-card-border">
          <h1 className="text-2xl font-bold text-brand-green">Spendly Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 border border-card-border text-xs rounded-lg hover:bg-white/5"
          >
            Log out
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-serif">Welcome back, {user?.full_name}! 👋</h2>
          <p className="text-text-muted text-sm">Logged in as: {user?.email}</p>
        </div>
      </div>
    </div>
  );
}