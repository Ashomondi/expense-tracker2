import React from 'react';
import '../styles/pages/LandingPage.css';

interface LandingPageProps {
  onNavigate: (page: 'login' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="landing-container">
      {/* --- Navigation Bar --- */}
      <header className="landing-header">
        <div className="landing-header-content">
          <a href="#" className="landing-logo">
            Spendly
          </a>

          <nav className="landing-nav">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="landing-header-buttons">
            <button
              onClick={() => onNavigate('login')}
              className="landing-login-btn"
            >
              Log in
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="landing-signup-btn"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main>
        {/* --- Hero Section --- */}
        <section className="landing-hero">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Personal Finance, Reimagined
          </div>

          <h1 className="hero-title">
            Stop guessing where your <em>money</em> goes.
          </h1>

          <p className="hero-description">
            Expense tracking, smart budgets, and real-time analytics — all in one clean dashboard built for modern life.
          </p>

          <div className="hero-buttons">
            <button
              onClick={() => onNavigate('signup')}
              className="hero-cta-btn"
            >
              Start for Free &rarr;
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="hero-secondary-btn"
            >
              Sign in
            </button>
          </div>

          {/* --- Interactive App Preview Window --- */}
          <div className="hero-preview">
            <div className="preview-header">
              <span className="preview-dot"></span>
              <span className="preview-dot"></span>
              <span className="preview-dot"></span>
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
              <main className="preview-content">
                <div className="preview-cards">
                  <div className="preview-card">
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
              </main>
            </div>
          </div>
        </section>

        {/* --- Green Stats Banner --- */}
        <section className="landing-stats-banner">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">98%</div>
              <p className="stat-text">User Satisfaction</p>
            </div>
            <div className="stat-item">
              <div className="stat-number">6</div>
              <p className="stat-text">Expense Categories</p>
            </div>
          </div>
        </section>

        {/* --- 6-Card Features Grid Section --- */}
        <section id="features" className="landing-features">
          <div className="features-header">
            <div className="features-badge">Features</div>
            <h2 className="features-title">Everything you need to master your finances</h2>
          </div>

          <div className="features-grid">
            {/* Card 1 */}
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3 className="feature-name">Real-Time Tracking</h3>
              <p className="feature-description">
                Log expenses instantly and watch your spending update live. Every purchase categorized automatically across 6 smart categories.
              </p>
            </div>

            {/* Card 2 */}
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3 className="feature-name">Smart Budgets</h3>
              <p className="feature-description">
                Set monthly limits per category. Get alerted before you overspend — not after. Budget management that actually changes behavior.
              </p>
            </div>

            {/* Card 3 */}
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-name">Deep Analytics</h3>
              <p className="feature-description">
                Understand your patterns with detailed charts, category breakdowns, and monthly trend analysis that reveals where money really goes.
              </p>
            </div>

            {/* Card 4 */}
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3 className="feature-name">Secure & Private</h3>
              <p className="feature-description">
                Bank-level encryption, JWT authentication, and bcrypt password hashing. Your financial data is yours — period.
              </p>
            </div>

            {/* Card 5 */}
            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3 className="feature-name">Budget Alerts</h3>
              <p className="feature-description">
                Configurable notifications when you approach or exceed limits. Stay in control without constantly checking your dashboard.
              </p>
            </div>

            {/* Card 6 */}
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-name">Instant Insights</h3>
              <p className="feature-description">
                Monthly summaries and financial insights delivered automatically. Spot trends early and make smarter decisions before month-end.
              </p>
            </div>
          </div>
        </section>

        {/* --- Call To Action (CTA) Section --- */}
        <section className="landing-cta">
          <h2 className="cta-title">
            Ready to take control of your finances?
          </h2>
          <p className="cta-description">
            Join thousands of people who use Spendly to track their spending, hit their budgets, and build better money habits.
          </p>
          <button
            onClick={() => onNavigate('signup')}
            className="cta-button"
          >
            Create Free Account &rarr;
          </button>
          <p className="cta-footer">
            No credit card required. Free forever.
          </p>
        </section>
      </main>

      {/* --- Footer --- */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-logo">Spendly</span>
            <div className="footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
          </div>
          <p className="footer-credit">
            Built with Go & React. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
