import React from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  ChartLine,
  Lock,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import '../styles/pages/LandingPage.css';

interface LandingPageProps {
  onNavigate: (page: 'login' | 'signup') => void;
}

const features = [
  {
    icon: Wallet,
    name: 'Real-Time Tracking',
    description:
      'Log expenses instantly and watch your spending update live. Every purchase categorized automatically across 6 smart categories.',
  },
  {
    icon: ChartLine,
    name: 'Smart Budgets',
    description:
      'Set monthly limits per category. Get alerted before you overspend — not after. Budget management that actually changes behavior.',
  },
  {
    icon: BarChart3,
    name: 'Deep Analytics',
    description:
      'Understand your patterns with detailed charts, category breakdowns, and monthly trend analysis that reveals where money really goes.',
  },
  {
    icon: Lock,
    name: 'Secure & Private',
    description:
      'Bank-level encryption, JWT authentication, and bcrypt password hashing. Your financial data is yours — period.',
  },
  {
    icon: Bell,
    name: 'Budget Alerts',
    description:
      'Configurable notifications when you approach or exceed limits. Stay in control without constantly checking your dashboard.',
  },
  {
    icon: Zap,
    name: 'Instant Insights',
    description:
      'Monthly summaries and financial insights delivered automatically. Spot trends early and make smarter decisions before month-end.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="landing-container">
      <div className="ambient-glow landing-glow-blue" aria-hidden />
      <div className="ambient-glow landing-glow-amber" aria-hidden />

      <header className="landing-header">
        <div className="landing-header-content">
          <a href="#" className="logo-mark landing-logo">
            <span className="logo-mark-circles" aria-hidden>
              <span />
              <span />
            </span>
            <span className="logo-mark-text">Spendly</span>
          </a>

          <nav className="landing-nav">
            <a href="#features">
              Features
              <Sparkles size={12} strokeWidth={2} aria-hidden />
            </a>
            <a href="#how-it-works">How it Works</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="landing-header-buttons">
            <button onClick={() => onNavigate('login')} className="landing-login-btn">
              Log in
            </button>
            <button onClick={() => onNavigate('signup')} className="landing-signup-btn">
              Get Started
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-badge">
              <Sparkles size={14} strokeWidth={2} aria-hidden />
              Personal Finance, Reimagined
            </div>

            <h1 className="hero-title">
              Stop guessing where your <em>money</em> goes.
            </h1>

            <p className="hero-description">
              Expense tracking, smart budgets, and real-time analytics — all in one clean
              dashboard built for modern life.
            </p>

            <div className="hero-buttons">
              <button onClick={() => onNavigate('signup')} className="hero-cta-btn">
                Start for Free
                <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
              </button>
              <button onClick={() => onNavigate('login')} className="hero-secondary-btn">
                Sign in
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-preview grain">
              <div className="preview-header">
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-title">Spendly Dashboard</span>
              </div>
              <div className="preview-grid">
                <aside className="preview-sidebar">
                  <div className="preview-logo">Spendly</div>
                  <div className="preview-nav">
                    <div className="nav-item active">Dashboard</div>
                    <div className="nav-item">Expenses</div>
                    <div className="nav-item">Budgets</div>
                    <div className="nav-item">Analytics</div>
                  </div>
                </aside>
                <div className="preview-content">
                  <div className="preview-cards">
                    <div className="preview-card preview-card-accent">
                      <span className="preview-card-label">Total Spent</span>
                      <div className="preview-card-value">$421.97</div>
                      <span className="preview-card-meta">+12% this month</span>
                    </div>
                    <div className="preview-card">
                      <span className="preview-card-label">Budget Left</span>
                      <div className="preview-card-value">$2,078</div>
                      <span className="preview-card-meta">83% remaining</span>
                    </div>
                    <div className="preview-card">
                      <span className="preview-card-label">Transactions</span>
                      <div className="preview-card-value">12</div>
                      <span className="preview-card-meta">+3 this week</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Sparkles className="hero-sparkle hero-sparkle-a" size={18} aria-hidden />
            <Sparkles className="hero-sparkle hero-sparkle-b" size={14} aria-hidden />
          </div>
        </section>

        <section className="landing-stats-banner" id="how-it-works">
          <div className="stats-rail">
            <p className="stats-rail-text">
              Track More
              <span>/</span>
              Save More
              <span>/</span>
              Grow More
            </p>
            <button
              type="button"
              className="stats-star-btn"
              onClick={() => onNavigate('signup')}
              aria-label="Get started"
            >
              <Sparkles size={22} strokeWidth={2} />
            </button>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">98%</div>
              <p className="stat-text">User Satisfaction</p>
            </div>
            <div className="stat-item">
              <div className="stat-number">6</div>
              <p className="stat-text">Expense Categories</p>
            </div>
            <div className="stat-item">
              <div className="stat-number">10k+</div>
              <p className="stat-text">Expenses Tracked</p>
            </div>
          </div>
        </section>

        <section id="features" className="landing-features">
          <div className="features-header">
            <div className="features-badge">
              <Sparkles size={12} strokeWidth={2} aria-hidden />
              Features
            </div>
            <h2 className="features-title">Everything you need to master your finances</h2>
          </div>

          <div className="features-grid">
            {features.map(({ icon: Icon, name, description }) => (
              <div key={name} className="feature-card grain">
                <div className="feature-icon">
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </div>
                <h3 className="feature-name">{name}</h3>
                <p className="feature-description">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="landing-cta grain">
          <h2 className="cta-title">Ready to take control of your finances?</h2>
          <p className="cta-description">
            Join thousands of people who use Spendly to track their spending, hit their
            budgets, and build better money habits.
          </p>
          <button onClick={() => onNavigate('signup')} className="cta-button">
            Create Free Account
            <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
          </button>
          <p className="cta-footer">No credit card required. Free forever.</p>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="logo-mark">
              <span className="logo-mark-circles" aria-hidden>
                <span />
                <span />
              </span>
              <span className="logo-mark-text">Spendly</span>
            </span>
            <div className="footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
          </div>
          <p className="footer-credit">Built with Go & React. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
