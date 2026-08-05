import React from 'react';

interface LandingPageProps {
  onNavigate: (page: 'login' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-bg-dark text-white font-sans flex flex-col justify-between">
      {/* --- Navigation Bar --- */}
      <header className="border-b border-card-border sticky top-0 bg-bg-dark/85 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="#" className="text-2xl font-bold text-brand-green tracking-tight">
            Spendly
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm text-text-muted">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('login')}
              className="px-4 py-2 border border-card-border text-sm rounded-lg hover:bg-white/5 transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="px-4 py-2 bg-brand-green text-black text-sm font-semibold rounded-lg hover:bg-brand-hover transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main>
        {/* --- Hero Section --- */}
        <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-card-border rounded-full text-xs text-brand-green tracking-widest mb-8 uppercase font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span>
            Personal Finance, Reimagined
          </div>

          <h1 className="text-5xl md:text-7xl font-serif leading-tight mb-6">
            Stop guessing where your <em className="text-brand-green italic font-serif">money</em> goes.
          </h1>

          <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Expense tracking, smart budgets, and real-time analytics — all in one clean dashboard built for modern life.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <button
              onClick={() => onNavigate('signup')}
              className="px-8 py-3.5 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-hover transition-all text-base"
            >
              Start for Free &rarr;
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="px-8 py-3.5 border border-card-border text-white font-medium rounded-lg hover:bg-white/5 transition-all text-base"
            >
              Sign in
            </button>
          </div>

          {/* --- Interactive App Preview Window --- */}
          <div className="bg-card-bg border border-card-border rounded-xl shadow-2xl overflow-hidden text-left">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-card-border bg-black/20">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 min-h-[220px]">
              <aside className="p-4 border-r border-card-border hidden md:block">
                <div className="font-bold text-brand-green mb-6">Spendly</div>
                <div className="text-xs space-y-2">
                  <div className="p-2 bg-brand-green/10 text-brand-green rounded font-medium">Dashboard</div>
                  <div className="p-2 text-text-muted hover:text-white cursor-pointer">Expenses</div>
                  <div className="p-2 text-text-muted hover:text-white cursor-pointer">Budgets</div>
                  <div className="p-2 text-text-muted hover:text-white cursor-pointer">Analytics</div>
                </div>
              </aside>
              <main className="p-6 md:col-span-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-card-border">
                    <span className="text-xs text-text-muted">Total Spent</span>
                    <div className="text-xl font-bold mt-1">$421.97</div>
                    <span className="text-xs text-brand-green">+12% this month</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-card-border">
                    <span className="text-xs text-text-muted">Budget Left</span>
                    <div className="text-xl font-bold mt-1">$2,078</div>
                    <span className="text-xs text-text-muted">83% remaining</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-card-border">
                    <span className="text-xs text-text-muted">Transactions</span>
                    <div className="text-xl font-bold mt-1">12</div>
                    <span className="text-xs text-brand-green">+3 this week</span>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </section>

        {/* --- Green Stats Banner --- */}
        <section className="bg-brand-green text-black py-12">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
            <div>
              <div className="text-6xl md:text-7xl font-serif font-bold tracking-tight">98%</div>
              <p className="text-sm font-semibold uppercase tracking-wider mt-2 opacity-80">User Satisfaction</p>
            </div>
            <div>
              <div className="text-6xl md:text-7xl font-serif font-bold tracking-tight">6</div>
              <p className="text-sm font-semibold uppercase tracking-wider mt-2 opacity-80">Expense Categories</p>
            </div>
          </div>
        </section>

        {/* --- 6-Card Features Grid Section --- */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="text-xs text-brand-green tracking-widest uppercase mb-3 font-semibold">Features</div>
            <h2 className="text-3xl md:text-5xl font-serif">Everything you need to master your finances</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Card 1 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 text-brand-green flex items-center justify-center text-xl mb-6">📈</div>
              <h3 className="text-xl font-semibold mb-3">Real-Time Tracking</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Log expenses instantly and watch your spending update live. Every purchase categorized automatically across 6 smart categories.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl mb-6">🎯</div>
              <h3 className="text-xl font-semibold mb-3">Smart Budgets</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Set monthly limits per category. Get alerted before you overspend — not after. Budget management that actually changes behavior.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl mb-6">📊</div>
              <h3 className="text-xl font-semibold mb-3">Deep Analytics</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Understand your patterns with detailed charts, category breakdowns, and monthly trend analysis that reveals where money really goes.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl mb-6">🛡️</div>
              <h3 className="text-xl font-semibold mb-3">Secure & Private</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Bank-level encryption, JWT authentication, and bcrypt password hashing. Your financial data is yours — period.
              </p>
            </div>

            {/* Card 5 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center text-xl mb-6">🔔</div>
              <h3 className="text-xl font-semibold mb-3">Budget Alerts</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Configurable notifications when you approach or exceed limits. Stay in control without constantly checking your dashboard.
              </p>
            </div>

            {/* Card 6 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center text-xl mb-6">⚡</div>
              <h3 className="text-xl font-semibold mb-3">Instant Insights</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Monthly summaries and financial insights delivered automatically. Spot trends early and make smarter decisions before month-end.
              </p>
            </div>
          </div>
        </section>

        {/* --- Call To Action (CTA) Section --- */}
        <section className="border-t border-card-border py-24 text-center px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">
              Ready to take control of your finances?
            </h2>
            <p className="text-text-muted text-lg mb-8">
              Join thousands of people who use Spendly to track their spending, hit their budgets, and build better money habits.
            </p>
            <button
              onClick={() => onNavigate('signup')}
              className="px-8 py-4 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-hover transition-all text-base inline-flex items-center gap-2"
            >
              Create Free Account &rarr;
            </button>
            <p className="text-xs text-text-muted font-mono mt-4">
              No credit card required. Free forever.
            </p>
          </div>
        </section>
      </main>

      {/* --- Footer --- */}
      <footer className="border-t border-card-border py-12 text-sm text-text-muted bg-bg-dark">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <span className="font-bold text-brand-green text-xl">Spendly</span>
            <div className="flex gap-4 text-xs">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <p className="font-mono text-xs text-text-muted/80">
            Built with Go & React. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};