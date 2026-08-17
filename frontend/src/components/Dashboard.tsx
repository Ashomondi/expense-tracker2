import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
}

interface DashboardProps {
  user: User;
  onLogout?: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; dot: string; text: string; bar: string }> = {
  'Food & Drink': { bg: 'bg-amber-100', dot: 'bg-amber-500', text: 'text-amber-800', bar: 'bg-amber-500' },
  'Transport': { bg: 'bg-blue-100', dot: 'bg-blue-500', text: 'text-blue-800', bar: 'bg-blue-500' },
  'Entertainment': { bg: 'bg-purple-100', dot: 'bg-purple-500', text: 'text-purple-800', bar: 'bg-purple-500' },
  'Utilities': { bg: 'bg-cyan-100', dot: 'bg-cyan-500', text: 'text-cyan-800', bar: 'bg-cyan-500' },
  'Health': { bg: 'bg-rose-100', dot: 'bg-rose-500', text: 'text-rose-800', bar: 'bg-rose-500' },
  'Shopping': { bg: 'bg-amber-100', dot: 'bg-amber-500', text: 'text-amber-800', bar: 'bg-amber-500' },
};

const DEFAULT_COLOR = { bg: 'bg-gray-100', dot: 'bg-gray-500', text: 'text-gray-800', bar: 'bg-gray-500' };

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/expenses', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setExpenses(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch expenses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalBudget = 1900;
  const budgetUsedPct = Math.min(Math.round((totalSpent / totalBudget) * 100), 100);
  const budgetRemaining = Math.max(totalBudget - totalSpent, 0);
  const budgetHealthPct = 100 - budgetUsedPct;

  // Mock category budgets matching design
  const budgetCategories = [
    { name: 'Food & Drink', spent: 110, total: 800, pct: 14 },
    { name: 'Transport', spent: 57, total: 200, pct: 29 },
    { name: 'Entertainment', spent: 26, total: 150, pct: 17 },
    { name: 'Utilities', spent: 121, total: 300, pct: 40 },
    { name: 'Health', spent: 73, total: 200, pct: 36 },
    { name: 'Shopping', spent: 35, total: 250, pct: 14 },
  ];

  return (
    <main className="p-8 max-w-7xl mx-auto text-slate-900 bg-[#F3F6F4] min-h-screen">
      {/* Date & Greeting */}
      <div className="mb-6">
        <span className="text-xs uppercase font-semibold tracking-wider text-gray-400">
          OCTOBER 2024
        </span>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mt-1">
          Good morning, {user.full_name.split(' ')[0]}
        </h1>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Spent */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400">Total Spent</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center font-bold text-sm">
              💵
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-slate-900">
              ${totalSpent.toFixed(2)}
            </div>
            <div className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              ↗ +12% vs last month
            </div>
          </div>
        </div>

        {/* Budget Used */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400">Budget Used</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-sm">
              👛
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-slate-900">
              {budgetUsedPct}%
            </div>
            <div className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              ↗ ${budgetRemaining.toFixed(2)} remaining
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400">Transactions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center font-bold text-sm">
              📈
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-slate-900">
              {expenses.length}
            </div>
            <div className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              ↗ +3 this week
            </div>
          </div>
        </div>

        {/* Budget Health */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400">Budget Health</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center font-bold text-sm">
              🎯
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-slate-900">
              {budgetHealthPct}%
            </div>
            <div className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              ↗ On track
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Chart + Budget Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Spending Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Monthly Spending</h3>
              <p className="text-xs text-gray-400">Last 6 months</p>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              May – Oct
            </span>
          </div>

          {/* SVG Line Chart Representation */}
          <div className="h-64 relative mt-6">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeDasharray="4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeDasharray="4" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeDasharray="4" />

              {/* Area Under Curve */}
              <path
                d="M 20 80 Q 100 30 180 85 T 340 30 T 480 150 L 480 190 L 20 190 Z"
                fill="url(#gradient)"
              />
              {/* Smooth Curve */}
              <path
                d="M 20 80 Q 100 30 180 85 T 340 30 T 480 150"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
              />

              {/* Data Points */}
              <circle cx="20" cy="80" r="4" fill="#10B981" />
              <circle cx="110" cy="50" r="4" fill="#10B981" />
              <circle cx="200" cy="85" r="4" fill="#10B981" />
              <circle cx="290" cy="30" r="4" fill="#10B981" />
              <circle cx="380" cy="60" r="4" fill="#10B981" />
              <circle cx="480" cy="150" r="4" fill="#10B981" />
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
            </div>
          </div>
        </div>

        {/* Budget Overview Right Sidebar */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Budget Overview</h3>
          <div className="space-y-5">
            {budgetCategories.map((cat) => {
              const color = CATEGORY_COLORS[cat.name] || DEFAULT_COLOR;
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-800 font-semibold">{cat.name}</span>
                    <span className="text-gray-400 font-semibold">{cat.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color.bar} rounded-full`}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>${cat.spent}</span>
                    <span>${cat.total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-900">Recent Transactions</h3>
          <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer">
            View all
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-4">Loading transactions...</p>
        ) : expenses.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No transactions recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.slice(0, 6).map((item) => {
              const color = CATEGORY_COLORS[item.category] || DEFAULT_COLOR;
              return (
                <div key={item.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${color.bg} flex items-center justify-center`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${color.bg} ${color.text}`}>
                          {item.category}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    -${item.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};