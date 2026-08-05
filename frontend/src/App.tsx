import { useState } from 'react';
import { LandingPage } from './components/LandingPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'signup'>('home');

  if (currentPage === 'home') {
    return <LandingPage onNavigate={(page) => setCurrentPage(page)} />;
  }

  return (
    <div className="min-h-screen bg-bg-dark text-white p-8">
      <button 
        onClick={() => setCurrentPage('home')}
        className="px-4 py-2 border border-card-border rounded-lg text-sm text-text-muted hover:text-white transition-colors"
      >
        &larr; Back to Home
      </button>
      <div className="mt-12 text-center text-2xl font-serif">
        {currentPage === 'login' ? 'Login Page coming next...' : 'Sign Up Page coming next...'}
      </div>
    </div>
  );
}