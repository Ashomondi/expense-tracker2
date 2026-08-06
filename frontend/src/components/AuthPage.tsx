import React, { useState } from 'react';

interface AuthPageProps {
  mode: 'login' | 'signup';
  onNavigate: (page: 'home' | 'login' | 'signup') => void;
  onSuccess: (user: { id: number; full_name: string; email: string }) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onNavigate, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔒 Password requirement checks
  const passwordRules = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Pre-flight check during signup
    if (mode === 'signup' && !isPasswordValid) {
      setError('Please fulfill all password requirements before creating your account.');
      return;
    }

    setLoading(true);

    const endpoint = mode === 'signup' ? '/api/signup' : '/api/login';
    const payload = mode === 'signup' 
      ? { full_name: fullName, email, password }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (mode === 'signup') {
        // Automatically switch to login after successful registration
        onNavigate('login');
      } else {
        // Login successful
        onSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white font-sans grid grid-cols-1 lg:grid-cols-2">
      {/* --- Left Column: Testimonial & Social Proof --- */}
      <div className="p-8 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-card-border bg-bg-dark">
        <div>
          <button 
            onClick={() => onNavigate('home')} 
            className="text-2xl font-bold text-brand-green tracking-tight"
          >
            Spendly
          </button>
        </div>

        <div className="my-12 max-w-lg">
          <span className="inline-block px-3 py-1 bg-white/5 border border-card-border rounded text-[10px] font-mono tracking-widest text-brand-green uppercase mb-6">
            User Story
          </span>
          <blockquote className="text-2xl md:text-3xl font-serif italic leading-snug mb-4">
            "I saved $400 in my first month just by seeing where I was actually overspending."
          </blockquote>
          <p className="text-sm text-brand-green font-medium">Ashley M., Early User</p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card-bg border border-card-border p-5 rounded-xl">
            <div className="text-2xl font-serif font-bold text-brand-green">$2,450</div>
            <div className="text-xs text-text-muted mt-1">Avg monthly tracked</div>
          </div>
          <div className="bg-card-bg border border-card-border p-5 rounded-xl">
            <div className="text-2xl font-serif font-bold text-brand-green">94%</div>
            <div className="text-xs text-text-muted mt-1">Stay on budget</div>
          </div>
          <div className="bg-card-bg border border-card-border p-5 rounded-xl">
            <div className="text-2xl font-serif font-bold text-brand-green">3 min</div>
            <div className="text-xs text-text-muted mt-1">Setup time</div>
          </div>
          <div className="bg-card-bg border border-card-border p-5 rounded-xl">
            <div className="text-2xl font-serif font-bold text-brand-green">10k+</div>
            <div className="text-xs text-text-muted mt-1">Happy users</div>
          </div>
        </div>
      </div>

      {/* --- Right Column: Auth Form --- */}
      <div className="p-8 lg:p-16 flex flex-col justify-center items-center bg-bg-dark">
        <div className="w-full max-w-md">
          <button 
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-white mb-8 transition-colors"
          >
            &larr; Back to home
          </button>

          <h1 className="text-4xl font-serif font-bold mb-2">
            {mode === 'signup' ? 'Get started' : 'Welcome back'}
          </h1>
          <p className="text-sm text-text-muted mb-8">
            {mode === 'signup' ? 'Create your free account today' : 'Sign in to your Spendly account'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ashley Johnson"
                  className="w-full bg-white/5 border border-card-border rounded-lg px-4 py-3 text-sm focus:border-brand-green outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-muted mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ashley@example.com"
                className="w-full bg-white/5 border border-card-border rounded-lg px-4 py-3 text-sm focus:border-brand-green outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-card-border rounded-lg px-4 py-3 text-sm focus:border-brand-green outline-none transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Live Password Hints (Signup only) */}
              {mode === 'signup' && password.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <span className={passwordRules.length ? 'text-brand-green' : 'text-text-muted'}>
                    {passwordRules.length ? '✓' : '○'} Min 8 characters
                  </span>
                  <span className={passwordRules.letter ? 'text-brand-green' : 'text-text-muted'}>
                    {passwordRules.letter ? '✓' : '○'} At least 1 letter
                  </span>
                  <span className={passwordRules.number ? 'text-brand-green' : 'text-text-muted'}>
                    {passwordRules.number ? '✓' : '○'} At least 1 number
                  </span>
                  <span className={passwordRules.special ? 'text-brand-green' : 'text-text-muted'}>
                    {passwordRules.special ? '✓' : '○'} Special character (!@#$)
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !isPasswordValid)}
              className="w-full py-3.5 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-hover transition-colors text-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-8">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button onClick={() => onNavigate('login')} className="text-brand-green font-semibold hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button onClick={() => onNavigate('signup')} className="text-brand-green font-semibold hover:underline">
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};