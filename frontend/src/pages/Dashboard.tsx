import React, { useState, useEffect } from 'react';
import {
  Activity,
  HeartPulse,
  Plus,
  Receipt,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { API_BASE } from '../api';
import '../styles/pages/Dashboard.css';

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
  'Food & Drink': { bg: 'bg-amber-500/15', dot: 'bg-amber-400', text: 'text-amber-300', bar: 'bg-amber-400' },
  'Transport': { bg: 'bg-blue-500/15', dot: 'bg-blue-400', text: 'text-blue-300', bar: 'bg-blue-400' },
  'Entertainment': { bg: 'bg-violet-500/15', dot: 'bg-violet-400', text: 'text-violet-300', bar: 'bg-violet-400' },
  'Utilities': { bg: 'bg-cyan-500/15', dot: 'bg-cyan-400', text: 'text-cyan-300', bar: 'bg-cyan-400' },
  'Health': { bg: 'bg-rose-500/15', dot: 'bg-rose-400', text: 'text-rose-300', bar: 'bg-rose-400' },
  'Shopping': { bg: 'bg-orange-500/15', dot: 'bg-orange-400', text: 'text-orange-300', bar: 'bg-orange-400' },
};

const DEFAULT_COLOR = { bg: 'bg-white/10', dot: 'bg-gray-400', text: 'text-gray-300', bar: 'bg-gray-400' };

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
  'Food & Drink': ['food', 'drink', 'drinks', 'coffee', 'tea', 'juice', 'milk', 'dinner', 'lunch', 'breakfast', 'restaurant', 'meal', 'snack', 'burger', 'pizza', 'grocery', 'groceries', 'eat', 'eating', 'cafe', 'café', 'market', 'fruits', 'vegetables', 'salad', 'ramen', 'boba', 'soup', 'cake', 'cookies', 'beer', 'wine', 'bar', 'chai', 'chapati', 'nyama choma', 'kebab', 'shawarma', 'water', 'soda', 'alcohol', 'takeout', 'delivery', 'lunchbox'],
  Transport: ['transport', 'uber', 'bus', 'train', 'taxi', 'fuel', 'gas', 'metro', 'car', 'ride', 'parking', 'flight', 'ticket', 'tickets', 'airline', 'trip', 'travel', 'road', 'driver', 'motorbike', 'boda', 'matatu', 'fare', 'tuktuk', 'lyft', 'bolt', 'gasoline', 'diesel', 'mileage', 'toll'],
  Entertainment: ['movie', 'movies', 'concert', 'music', 'streaming', 'netflix', 'spotify', 'game', 'games', 'theater', 'cinema', 'fun', 'festival', 'party', 'show', 'booking', 'tickets', 'live', 'karaoke', 'barbecue', 'stadium', 'play', 'drama', 'youtube', 'disney', 'hulu', 'xbox', 'playstation', 'steam', 'twitch', 'comedy', 'club'],
  Utilities: ['utility', 'utilities', 'electricity', 'water', 'internet', 'wifi', 'phone', 'bill', 'power', 'rent', 'electric', 'light', 'service', 'provider', 'solar', 'dstv', 'tv', 'subscription', 'lantern', 'laundry', 'maid', 'cleaning', 'garbage', 'trash', 'sewage', 'heating', 'cooling', 'ac', 'air conditioning'],
  Health: ['health', 'pharmacy', 'doctor', 'medicine', 'gym', 'fitness', 'hospital', 'medical', 'wellness', 'vitamin', 'therapy', 'checkup', 'clinic', 'dentist', 'supplement', 'massage', 'insurance', 'optician', 'dental', 'vision', 'prescription', 'pharmacy', 'physio', 'chiropractor'],
  Shopping: ['shopping', 'shop', 'clothes', 'gift', 'gifts', 'amazon', 'store', 'purchase', 'wear', 'online', 'bag', 'sneakers', 'apparel', 'retail', 'order', 'fashion', 'shoes', 'electronics', 'phone', 'headphones', 'toys', 'stationery', 'gadget', 'book', 'books', 'novel', 'novels', 'bookstore', 'kindle', 'target', 'walmart', 'costco', 'ebay', 'etsy', 'mall', 'boutique', 'makeup', 'cosmetics', 'skincare', 'furniture', 'appliance', 'home decor', 'kitchenware'],
};

const parseQuickExpense = (input: string) => {
  const trimmed = input.trim();
  console.log('[parseQuickExpense] Input:', JSON.stringify(input), 'Trimmed:', JSON.stringify(trimmed));
  if (!trimmed) {
    console.log('[parseQuickExpense] Empty input, returning null');
    return null;
  }

  // Try to match patterns: "50 coffee", "coffee 50", "50", "coffee"
  const amountFirst = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/i);
  const amountLast = trimmed.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/i);
  
  console.log('[parseQuickExpense] amountFirst:', amountFirst, 'amountLast:', amountLast);
  
  let amount: number | null = null;
  let remainder = '';
  
  if (amountFirst) {
    // Format: "50 coffee" - amount first
    amount = Number(amountFirst[1]);
    remainder = amountFirst[2].trim();
    console.log('[parseQuickExpense] Matched amountFirst, amount:', amount, 'remainder:', remainder);
  } else if (amountLast) {
    // Format: "coffee 50" - amount last
    amount = Number(amountLast[2]);
    remainder = amountLast[1].trim();
    console.log('[parseQuickExpense] Matched amountLast, amount:', amount, 'remainder:', remainder);
  } else {
    // No amount found
    remainder = trimmed;
    console.log('[parseQuickExpense] No amount pattern matched, remainder:', remainder);
  }

  if (!remainder && amount === null) {
    console.log('[parseQuickExpense] No remainder and no amount, returning null');
    return null;
  }

  const normalized = remainder.toLowerCase();
  let category = 'Food & Drink';
  let bestScore = -1;
  let title = remainder;

  // Score against all categories
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

  // If no category matched and we have a remainder, use it as title
  if (bestScore === 0 && remainder) {
    title = remainder;
  }

  // If only amount provided (e.g., "50"), use default category and generate title
  if (amount !== null && amount > 0 && !remainder) {
    return { amount, category: 'Food & Drink', title: 'Quick Expense' };
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
    console.log('[handleQuickEntrySubmit] quickEntry:', JSON.stringify(quickEntry), 'trimmed:', JSON.stringify(trimmed));

    if (!trimmed) {
      console.log('[handleQuickEntrySubmit] Empty trimmed, showing error');
      setError('Please type an expense, e.g. "50 coffee", "uber 200", or just "100".');
      setNewTitle('');
      setNewAmount('');
      setNewCategory('Food & Drink');
      setIsAddModalOpen(true);
      return;
    }

    const parsed = parseQuickExpense(trimmed);
    console.log('[handleQuickEntrySubmit] parsed result:', parsed);
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

    console.log('[handleQuickEntrySubmit] parsed is falsy, showing error');
    setError('Please type an expense, e.g. "50 coffee", "uber 200", or just "100".');
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
      const res = await fetch(`${API_BASE}/api/expenses`, {
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
        setNewCurrency(selectedCurrency);
        setIsAddModalOpen(false);
        await fetchExpenses();
      } else {
        try {
          const errData = await res.json();
          setError(errData.error || `Failed to add expense (${res.status})`);
        } catch {
          setError(`Failed to add expense (${res.status}: ${res.statusText})`);
        }
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('Server error. Make sure the backend is running on http://localhost:8080');
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
      const res = await fetch(`${API_BASE}/api/expenses`, {
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
    <main className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <span className="dashboard-header-subtitle">{currentDateLabel}</span>
          <h1 className="dashboard-title">
            Good morning, {user.full_name.split(' ')[0]}
          </h1>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="dashboard-add-btn"
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden />
          Add Expense
        </button>
      </div>

      <div className="dashboard-quick-entry">
        <form onSubmit={handleQuickEntrySubmit} className="dashboard-quick-form">
          <input
            type="text"
            value={quickEntry}
            onChange={(e) => setQuickEntry(e.target.value)}
            placeholder="Quick entry: 50 drinks"
            className="dashboard-quick-input"
          />
          <button
            type="submit"
            className="dashboard-quick-btn"
          >
            Add Quick Expense
          </button>
        </form>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="dashboard-metrics-grid">
        {/* Total Spent */}
        <div className="dashboard-metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Spent</span>
            <div className="metric-icon">
              <Wallet size={16} strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {formatCurrency(totalSpent, newCurrency)}
            </div>
            <div className="metric-change">
              <TrendingUp size={12} strokeWidth={2.5} aria-hidden />
              +12% vs last month
            </div>
          </div>
        </div>

        {/* Budget Used */}
        <div className="dashboard-metric-card">
          <div className="metric-header">
            <span className="metric-label">Budget Used</span>
            <div className="metric-icon">
              <Target size={16} strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">{budgetUsedPct}%</div>
            <div className="metric-change">
              <Activity size={12} strokeWidth={2.5} aria-hidden />
              {formatCurrency(budgetRemaining, newCurrency)} remaining
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="dashboard-metric-card">
          <div className="metric-header">
            <span className="metric-label">Transactions</span>
            <div className="metric-icon">
              <Receipt size={16} strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">{expenses.length}</div>
            <div className="metric-change">
              <TrendingUp size={12} strokeWidth={2.5} aria-hidden />
              +3 this week
            </div>
          </div>
        </div>

        {/* Budget Health */}
        <div className="dashboard-metric-card">
          <div className="metric-header">
            <span className="metric-label">Budget Health</span>
            <div className="metric-icon">
              <HeartPulse size={16} strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">{budgetHealthPct}%</div>
            <div className="metric-change">
              <Activity size={12} strokeWidth={2.5} aria-hidden />
              On track
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Chart + Budget Overview */}
      <div className="dashboard-main-grid">
        {/* Monthly Spending Chart Section */}
        <div className="dashboard-chart-container">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Monthly Spending</h3>
              <p className="chart-subtitle">Last 6 months</p>
            </div>
            <span className="chart-badge">May – Oct</span>
          </div>

          {/* SVG Line Chart Representation */}
          <div className="chart-wrapper">
            <svg className="chart-svg" viewBox="0 0 500 200">
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
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
                stroke="#3B82F6"
                strokeWidth="3"
              />

              {/* Data Points */}
              <circle cx="20" cy="80" r="4" fill="#3B82F6" />
              <circle cx="110" cy="50" r="4" fill="#3B82F6" />
              <circle cx="200" cy="85" r="4" fill="#3B82F6" />
              <circle cx="290" cy="30" r="4" fill="#3B82F6" />
              <circle cx="380" cy="60" r="4" fill="#3B82F6" />
              <circle cx="480" cy="150" r="4" fill="#3B82F6" />
            </svg>

            {/* X-Axis Labels */}
            <div className="chart-labels">
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
        <div className="dashboard-budget-overview">
          <h3 className="budget-title">Budget Overview</h3>
          <div className="budget-items">
            {budgetCategories.map((cat) => {
              const color = CATEGORY_COLORS[cat.name] || DEFAULT_COLOR;
              return (
                <div key={cat.name} className="budget-item">
                  <div className="budget-item-header">
                    <span className="budget-name">{cat.name}</span>
                    <span className="budget-percent">{cat.pct}%</span>
                  </div>
                  <div className="budget-bar-wrapper">
                    <div
                      className={`budget-bar ${color.bar}`}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                  <div className="budget-range">
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
      <div className="dashboard-transactions">
        <div className="transactions-header">
          <h3 className="transactions-title">Recent Transactions</h3>
          <button className="view-all-btn">
            View all
          </button>
        </div>

        {loading ? (
          <p className="transactions-loading">Loading transactions...</p>
        ) : expenses.length === 0 ? (
          <p className="transactions-empty">No transactions recorded yet.</p>
        ) : (
          <div className="transactions-list">
            {expenses.slice(0, 6).map((item) => {
              const color = CATEGORY_COLORS[item.category] || DEFAULT_COLOR;
              return (
                <div key={item.id} className="transaction-item">
                  <div className="transaction-left">
                    <div className={`transaction-icon ${color.bg}`}>
                      <div className={`icon-dot ${color.dot}`} />
                    </div>
                    <div>
                      <p className="transaction-title">{item.title}</p>
                      <div className="transaction-meta">
                        <span className={`transaction-badge ${color.bg} ${color.text}`}>
                          {item.category}
                        </span>
                        <span className="transaction-date">
                          {formatKenyaDate(item.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="transaction-amount">
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
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal">
            <div className="modal-header">
              <h3 className="modal-title">Add New Expense</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}

            <form onSubmit={handleQuickAddExpense} className="modal-form">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Morning Coffee"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Amount ({CURRENCY_OPTIONS.find((c) => c.code === newCurrency)?.symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="form-input"
                >
                  {Object.keys(CATEGORY_COLORS).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value as 'KES' | 'USD' | 'EUR' | 'GBP')}
                  className="form-input"
                >
                  {CURRENCY_OPTIONS.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.label} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="modal-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="modal-submit-btn"
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
