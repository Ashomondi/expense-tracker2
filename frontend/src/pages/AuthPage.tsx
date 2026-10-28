import React, { useState } from 'react';
import { ArrowLeft, Check, Circle, Eye, EyeOff } from 'lucide-react';
import { API_BASE } from '../api';
import '../styles/pages/AuthPage.css';

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

    if (mode === 'signup' && !isPasswordValid) {
      setError('Please fulfill all password requirements before creating your account.');
      return;
    }

    setLoading(true);

    const endpoint = mode === 'signup' ? '/api/signup' : '/api/login';
    const payload =
      mode === 'signup' ? { full_name: fullName, email, password } : { email, password };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (mode === 'signup') {
        onNavigate('login');
      } else {
        onSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="ambient-glow auth-glow-blue" aria-hidden />
      <div className="ambient-glow auth-glow-amber" aria-hidden />

      <div className="auth-left">
        <button onClick={() => onNavigate('home')} className="logo-mark auth-logo" type="button">
          <span className="logo-mark-circles" aria-hidden>
            <span />
            <span />
          </span>
          <span className="logo-mark-text">Spendly</span>
        </button>

        <div className="auth-testimonial">
          <span className="testimonial-badge">User Story</span>
          <blockquote className="testimonial-quote">
            "I saved $400 in my first month just by seeing where I was actually overspending."
          </blockquote>
          <p className="testimonial-author">Ashley M., Early User</p>
        </div>

        <div className="auth-stats-grid">
          <div className="auth-stat-card grain">
            <div className="stat-value">$2,450</div>
            <div className="stat-label">Avg monthly tracked</div>
          </div>
          <div className="auth-stat-card grain">
            <div className="stat-value">94%</div>
            <div className="stat-label">Stay on budget</div>
          </div>
          <div className="auth-stat-card grain">
            <div className="stat-value">3 min</div>
            <div className="stat-label">Setup time</div>
          </div>
          <div className="auth-stat-card grain">
            <div className="stat-value">10k+</div>
            <div className="stat-label">Happy users</div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <button onClick={() => onNavigate('home')} className="auth-back-btn" type="button">
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            Back to home
          </button>

          <h1 className="auth-form-title">
            {mode === 'signup' ? 'Get started' : 'Welcome back'}
          </h1>
          <p className="auth-form-subtitle">
            {mode === 'signup'
              ? 'Create your free account today'
              : 'Sign in to your Spendly account'}
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="auth-form-group">
                <label className="auth-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ashley Johnson"
                  className="auth-input"
                />
              </div>
            )}

            <div className="auth-form-group">
              <label className="auth-label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ashley@example.com"
                className="auth-input"
              />
            </div>

            <div className="auth-form-group">
              <label className="auth-label">Password</label>
              <div className="auth-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={2} />
                  ) : (
                    <Eye size={18} strokeWidth={2} />
                  )}
                </button>
              </div>

              {mode === 'signup' && password.length > 0 && (
                <div className="auth-password-rules">
                  <span className={passwordRules.length ? 'rule-met' : 'rule-unmet'}>
                    {passwordRules.length ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden />
                    ) : (
                      <Circle size={14} strokeWidth={2} aria-hidden />
                    )}
                    Min 8 characters
                  </span>
                  <span className={passwordRules.letter ? 'rule-met' : 'rule-unmet'}>
                    {passwordRules.letter ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden />
                    ) : (
                      <Circle size={14} strokeWidth={2} aria-hidden />
                    )}
                    At least 1 letter
                  </span>
                  <span className={passwordRules.number ? 'rule-met' : 'rule-unmet'}>
                    {passwordRules.number ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden />
                    ) : (
                      <Circle size={14} strokeWidth={2} aria-hidden />
                    )}
                    At least 1 number
                  </span>
                  <span className={passwordRules.special ? 'rule-met' : 'rule-unmet'}>
                    {passwordRules.special ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden />
                    ) : (
                      <Circle size={14} strokeWidth={2} aria-hidden />
                    )}
                    Special character (!@#$)
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !isPasswordValid)}
              className="auth-submit-btn"
            >
              {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="auth-toggle-text">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button onClick={() => onNavigate('login')} className="auth-toggle-link" type="button">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button onClick={() => onNavigate('signup')} className="auth-toggle-link" type="button">
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
