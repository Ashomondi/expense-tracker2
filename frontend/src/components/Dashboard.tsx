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
  currency?: string;
  date: string;
}

interface DashboardProps {
  user: User;
  onLogout?: () => void;
  selectedCurrency?: 'KES' | 'USD' | 'EUR' | 'GBP';
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

const CURRENCY_OPTIONS = [
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'Pound Sterling', symbol: '£' },
];

const CURRENCY_RATES: Record<string, number> = {
  KES: 1,
  USD: 129.5,
  EUR: 140.2,
  GBP: 162.4,
};

const formatCurrency = (value: number, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const convertCurrencyAmount = (value: number, fromCurrency: string, toCurrency: string) => {
  const from = CURRENCY_RATES[fromCurrency] || CURRENCY_RATES.KES;
  const to = CURRENCY_RATES[toCurrency] || CURRENCY_RATES.KES;
  if (from === to) return value;
  return (value * from) / to;
};

const formatKenyaDateInput = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') values[part.type] = part.value;
  });

  return `${values.year}-${values.month}-${values.day}`;
};

const formatKenyaDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Drink': ['food', 'drink', 'drinks', 'coffee', 'tea', 'juice', 'milk', 'dinner', 'lunch', 'breakfast', 'restaurant', 'meal', 'snack', 'burger', 'pizza', 'grocery', 'groceries', 'eat', 'eating', 'cafe', 'café', 'market', 'fruits', 'vegetables', 'salad', 'ramen', 'boba', 'soup', 'cake', 'cookies', 'beer', 'wine', 'bar', 'chai', 'chapati', 'nyama choma', 'kebab', 'shawarma'],
  Transport: ['transport', 'uber', 'bus', 'train', 'taxi', 'fuel', 'gas', 'metro', 'car', 'ride', 'parking', 'flight', 'ticket', 'tickets', 'airline', 'trip', 'travel', 'road', 'driver', 'motorbike', 'boda', 'matatu', 'fare', 'tuktuk'],
  Entertainment: ['movie', 'movies', 'concert', 'music', 'streaming', 'netflix', 'spotify', 'game', 'games', 'theater', 'cinema', 'fun', 'festival', 'party', 'show', 'booking', 'tickets', 'live', 'karaoke', 'barbecue', 'stadium', 'play', 'drama'],
  Utilities: ['utility', 'utilities', 'electricity', 'water', 'internet', 'wifi', 'phone', 'bill', 'power', 'rent', 'electric', 'light', 'service', 'provider', 'solar', 'dstv', 'tv', 'subscription', 'lantern', 'laundry', 'maid', 'cleaning'],
  Health: ['health', 'pharmacy', 'doctor', 'medicine', 'gym', 'fitness', 'hospital', 'medical', 'wellness', 'vitamin', 'therapy', 'checkup', 'clinic', 'dentist', 'supplement', 'massage', 'insurance', 'optician'],
  Shopping: ['shopping', 'shop', 'clothes', 'gift', 'gifts', 'amazon', 'store', 'purchase', 'wear', 'online', 'bag', 'sneakers', 'apparel', 'retail', 'order', 'fashion', 'shoes', 'electronics', 'phone', 'headphones', 'toys', 'stationery', 'gadget'],
};

const parseQuickExpense = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/i);
  const amount = match ? Number(match[1]) : null;
  const remainder = (match ? match[2] : trimmed).trim();

  if (!remainder && amount === null) return null;

  const normalized = remainder.toLowerCase();
  let category = 'Food & Drink';
  let bestScore = 0;
  let title = remainder;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      category = cat;
      title = remainder;
    }
  }

  if (amount === null || amount <= 0) {
    return { amount: null, category, title };
  }

  return { amount, category, title };
};

export const Dashboard: React.FC<DashboardProps> = ({ user, selectedCurrency = 'KES' }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Food & Drink');
  const [newDate, setNewDate] = useState(() => formatKenyaDateInput());
  const [newCurrency, setNewCurrency] = useState<'KES' | 'USD' | 'EUR' | 'GBP'>(selectedCurrency);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [quickEntry, setQuickEntry] = useState('');

  useEffect(() => {
    setNewCurrency(selectedCurrency);
  }, [selectedCurrency]);

  const displayCurrency = selectedCurrency;

  const handleQuickEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickEntry.trim();

    if (!trimmed) {
      setError('Please type an expense description or an amount, for example "50 drinks".');
      setNewTitle('');
      setNewAmount('');
      setNewCategory('Food & Drink');
      setIsAddModalOpen(true);
      return;
    }

    const parsed = parseQuickExpense(trimmed);
    if (parsed) {
      setNewTitle(parsed.title || '');
      setNewAmount(parsed.amount !== null ? parsed.amount.toString() : '');
      setNewCategory(parsed.category);
      setNewDate(formatKenyaDateInput());
      setQuickEntry('');
      setError('');
      setIsAddModalOpen(true);
      return;
    }

    setError('Please type an expense description or an amount, for example "50 drinks".');
    setNewTitle('');
    setNewAmount('');
    setNewCategory('Food & Drink');
    setIsAddModalOpen(true);
  };

  const handleQuickAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:8080/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newTitle,
          amount: parsedAmount,
          category: newCategory,
          date: newDate,
          currency: newCurrency,
        }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewAmount('');
        setNewCategory('Food & Drink');
        setNewDate(formatKenyaDateInput());
        setNewCurrency('KES');
        setIsAddModalOpen(false);
        fetchExpenses();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add expense');
      }
    } catch (err) {
      setError('Server error. Check backend connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSpent = expenses.reduce((sum, item) => {
    const sourceCurrency = item.currency || 'KES';
    return sum + convertCurrencyAmount(item.amount, sourceCurrency, displayCurrency);
  }, 0);

  const totalBudget = 1900;
  const budgetUsedPct = Math.min(Math.round((totalSpent / totalBudget) * 100), 100);
  const budgetRemaining = Math.max(totalBudget - totalSpent, 0);
  const budgetHealthPct = 100 - budgetUsedPct;

  const formattedMonth = new Intl.DateTimeFormat('en-KE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  }).format(new Date());

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

  useEffect(() => {
    fetchExpenses();
  }, []);

  const budgetCategories = [
    { name: 'Food & Drink', spent: 110, total: 800, pct: 14 },
    { name: 'Transport', spent: 57, total: 200, pct: 29 },
    { name: 'Entertainment', spent: 26, total: 150, pct: 17 },
    { name: 'Utilities', spent: 121, total: 300, pct: 40 },
    { name: 'Health', spent: 73, total: 200, pct: 36 },
    { name: 'Shopping', spent: 35, total: 250, pct: 14 },
  ].map((category) => ({
    ...category,
    spent: convertCurrencyAmount(category.spent, 'KES', displayCurrency),
    total: convertCurrencyAmount(category.total, 'KES', displayCurrency),
  }));

  const currentDateLabel = formattedMonth.toUpperCase();

  return (
    <main className="p-8 max-w-7xl mx-auto text-slate-900 bg-[#F3F6F4] min-h-screen">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-gray-400">
            {currentDateLabel}
          </span>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mt-1">
            Good morning, {user.full_name.split(' ')[0]}
          </h1>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-[#10B981] text-white font-semibold rounded-lg hover:bg-[#059669] transition-colors cursor-pointer"
        >
          + Add Expense
        </button>
      </div>

      <div className="mb-6 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <form onSubmit={handleQuickEntrySubmit} className="flex gap-3">
          <input
            type="text"
            value={quickEntry}
            onChange={(e) => setQuickEntry(e.target.value)}
            placeholder="Quick entry: 50 drinks"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#10B981] text-white font-semibold rounded-lg hover:bg-[#059669] transition-colors text-sm"
          >
            Add Quick Expense
          </button>
        </form>
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
              {formatCurrency(totalSpent, newCurrency)}
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
              ↗ {formatCurrency(budgetRemaining, newCurrency)} remaining
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
                    <span>{formatCurrency(cat.spent, newCurrency)}</span>
                    <span>{formatCurrency(cat.total, newCurrency)}</span>
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
                          {formatKenyaDate(item.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    -{formatCurrency(item.amount, newCurrency)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl text-slate-900">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add New Expense</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-slate-900 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleQuickAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Morning Coffee"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Amount ({CURRENCY_OPTIONS.find((c) => c.code === newCurrency)?.symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  {Object.keys(CATEGORY_COLORS).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Currency
                </label>
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value as 'KES' | 'USD' | 'EUR' | 'GBP')}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  {CURRENCY_OPTIONS.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.label} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#10B981] text-white font-semibold rounded-lg hover:bg-[#059669] text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};