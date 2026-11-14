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

interface Budget {
  id: number;
  category: string;
  amount: number;
}

interface DashboardProps {
  user: User;
  onLogout?: () => void;
  selectedCurrency?: 'KES' | 'USD' | 'EUR' | 'GBP';
}

interface MonthlySummary {
  total_amount: number;
  average_daily_spend: number;
  category_totals: Record<string, number>;
  previous_month_total: number;
  comparison_pct: number;
  transaction_count: number;
  month: number;
  year: number;
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
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthExpenses = expenses.filter((item) => {
    const date = new Date(item.date);
    return date >= monthStart && date <= now;
  });
  const totalSpent = currentMonthExpenses.reduce((sum, item) => {
    const sourceCurrency = item.currency || 'KES';
    return sum + convertCurrencyAmount(item.amount, sourceCurrency, displayCurrency);
  }, 0);

  const totalBudget = budgets.reduce(
    (sum, budget) => sum + convertCurrencyAmount(budget.amount, 'KES', displayCurrency),
    0,
  );
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

  const fetchBudgets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/budgets`, { credentials: 'include' });
      if (res.ok) setBudgets((await res.json()) || []);
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/expenses/summary`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data: MonthlySummary = await res.json();
        setMonthlySummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch monthly summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchBudgets();
    fetchMonthlySummary();
  }, []);

  const summaryTotalSpent = monthlySummary?.total_amount ?? totalSpent;
  const summaryAverageSpend = monthlySummary?.average_daily_spend ?? 0;
  const summaryTransactions = monthlySummary?.transaction_count ?? currentMonthExpenses.length;
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthTotal = expenses
    .filter((expense) => {
      const date = new Date(expense.date);
      return date.getFullYear() === previousMonth.getFullYear() && date.getMonth() === previousMonth.getMonth();
    })
    .reduce((sum, expense) => sum + convertCurrencyAmount(expense.amount, expense.currency || 'KES', displayCurrency), 0);
  const spendingChange = previousMonthTotal > 0
    ? Math.round(((totalSpent - previousMonthTotal) / previousMonthTotal) * 100)
    : null;
  const summaryComparison = monthlySummary?.comparison_pct ?? (spendingChange ?? 0);
  const currentMonthTransactions = summaryTransactions;

  const summaryBudgetUsedPct = totalBudget > 0 ? Math.round((summaryTotalSpent / totalBudget) * 100) : 0;
  const summaryBudgetRemaining = totalBudget - summaryTotalSpent;
  const summaryBudgetHealthPct = totalBudget > 0 ? Math.max(0, 100 - summaryBudgetUsedPct) : 0;

  const monthlySpending = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const monthExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === date.getFullYear() && expenseDate.getMonth() === date.getMonth();
    });
    return {
      label: new Intl.DateTimeFormat('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' }).format(date),
      total: monthExpenses.reduce(
        (sum, expense) => sum + convertCurrencyAmount(expense.amount, expense.currency || 'KES', displayCurrency),
        0,
      ),
    };
  });
  const maxMonthlySpending = Math.max(...monthlySpending.map((month) => month.total), 0);
  const chartPoints = monthlySpending.map((month, index) => ({
    x: 20 + (460 * index) / (monthlySpending.length - 1),
    y: maxMonthlySpending > 0 ? 170 - (month.total / maxMonthlySpending) * 140 : 170,
  }));
  const chartLine = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const chartArea = `${chartLine} L ${chartPoints[chartPoints.length - 1].x} 190 L ${chartPoints[0].x} 190 Z`;
  const currentDateLabel = formattedMonth.toUpperCase();

  const budgetCategories = budgets.map((budget) => {
    const spent = currentMonthExpenses
      .filter((expense) => expense.category === budget.category)
      .reduce(
        (sum, expense) => sum + convertCurrencyAmount(expense.amount, expense.currency || 'KES', displayCurrency),
        0,
      );
    const total = convertCurrencyAmount(budget.amount, 'KES', displayCurrency);
    return { name: budget.category, spent, total, pct: total > 0 ? Math.round((spent / total) * 100) : 0 };
  });

  const categoryBreakdown = Object.entries(monthlySummary?.category_totals ?? {})
    .map(([name, total]) => {
      const existingBudget = budgets.find((budget) => budget.category === name);
      const totalBudgetValue = existingBudget ? convertCurrencyAmount(existingBudget.amount, 'KES', displayCurrency) : 0;
      return {
        name,
        spent: total,
        total: totalBudgetValue,
        pct: summaryTotalSpent > 0 ? Math.round((total / summaryTotalSpent) * 100) : 0,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const visibleCategoryBreakdown = categoryBreakdown.length > 0 ? categoryBreakdown : budgetCategories;

  const topCategory = visibleCategoryBreakdown[0];
  const overBudgetCategory = visibleCategoryBreakdown.find((cat) => cat.total > 0 && cat.spent > cat.total);
  const monthTrendLabel = summaryComparison === 0
    ? 'Spending is stable compared with last month.'
    : summaryComparison > 0
      ? `You spent ${Math.abs(summaryComparison).toFixed(0)}% more than last month.`
      : `You spent ${Math.abs(summaryComparison).toFixed(0)}% less than last month.`;

  const insights = [
    topCategory
      ? {
          title: `${topCategory.name} is your biggest spend`,
          detail: `${formatCurrency(topCategory.spent, newCurrency)} this month (${topCategory.pct}% of total spend).`,
          tone: 'info',
        }
      : {
          title: 'No major spending patterns yet',
          detail: 'Add a few expenses to see your monthly trends.',
          tone: 'info',
        },
    overBudgetCategory
      ? {
          title: `${overBudgetCategory.name} is over budget`,
          detail: `${formatCurrency(overBudgetCategory.spent, newCurrency)} spent against ${formatCurrency(overBudgetCategory.total, newCurrency)} budget.`,
          tone: 'warning',
        }
      : {
          title: 'Budget is holding up',
          detail: 'Your current monthly spend is within your set category limits.',
          tone: 'success',
        },
    {
      title: 'Monthly trend',
      detail: monthTrendLabel,
      tone: summaryComparison > 0 ? 'warning' : 'success',
    },
  ];

  const adviceItems = [
    overBudgetCategory
      ? {
          title: `Trim ${overBudgetCategory.name}`,
          detail: `You are ${formatCurrency(overBudgetCategory.spent - overBudgetCategory.total, newCurrency)} above budget in ${overBudgetCategory.name}. Reduce discretionary spend by that amount to stay on track.`,
        }
      : {
          title: 'Keep your momentum',
          detail: 'Your monthly spend is within plan. Keep non-essential spending flat for the rest of the month to protect your savings.',
        },
    summaryComparison > 0
      ? {
          title: 'Watch the monthly trend',
          detail: `Spending is ${Math.abs(summaryComparison).toFixed(0)}% higher than last month. Focus on reducing the biggest category first.`,
        }
      : {
          title: 'Spending trend is healthy',
          detail: 'Your spending is stable or lower than last month. Keep your current pace and maintain your budget discipline.',
        },
    topCategory
      ? {
          title: `Prioritize ${topCategory.name}`,
          detail: `${formatCurrency(topCategory.spent, newCurrency)} is your largest category this month. Consider setting a smaller cap for this category next cycle.`,
        }
      : {
          title: 'Build stronger habits',
          detail: 'Start with a simple weekly cap for food, transport, and entertainment to keep spending predictable.',
        },
  ];

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
              {formatCurrency(summaryTotalSpent, newCurrency)}
            </div>
            <div className="metric-change">
              <TrendingUp size={12} strokeWidth={2.5} aria-hidden />
              {summaryComparison === 0 ? 'No previous month data' : `${summaryComparison > 0 ? '+' : ''}${summaryComparison}% vs last month`}
            </div>
          </div>
        </div>

        {/* Average Daily Spend */}
        <div className="dashboard-metric-card">
          <div className="metric-header">
            <span className="metric-label">Avg. Daily Spend</span>
            <div className="metric-icon">
              <Target size={16} strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {formatCurrency(summaryAverageSpend, newCurrency)}
            </div>
            <div className="metric-change">
              <Activity size={12} strokeWidth={2.5} aria-hidden />
              {totalBudget > 0 ? `${formatCurrency(summaryBudgetRemaining, newCurrency)} ${summaryBudgetRemaining >= 0 ? 'remaining' : 'over budget'}` : 'Set budgets to track spending'}
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
            <div className="metric-value">{summaryTransactions}</div>
            <div className="metric-change">
              <TrendingUp size={12} strokeWidth={2.5} aria-hidden />
              {currentMonthTransactions} this month
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
            <div className="metric-value">{summaryBudgetHealthPct}%</div>
            <div className="metric-change">
              <Activity size={12} strokeWidth={2.5} aria-hidden />
              {totalBudget === 0 ? 'No budgets set' : summaryBudgetUsedPct >= 100 ? 'Over budget' : 'On track'}
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
            <span className="chart-badge">{monthlySpending[0].label} – {monthlySpending[5].label}</span>
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
                d={chartArea}
                fill="url(#gradient)"
              />
              {/* Smooth Curve */}
              <path
                d={chartLine}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
              />

              {/* Data Points */}
              {chartPoints.map((point, index) => <circle key={monthlySpending[index].label} cx={point.x} cy={point.y} r="4" fill="#3B82F6" />)}
            </svg>

            {/* X-Axis Labels */}
            <div className="chart-labels">
              {monthlySpending.map((month, index) => <span key={`${month.label}-${index}`}>{month.label}</span>)}
            </div>
          </div>
        </div>

        {/* Budget Overview Right Sidebar */}
        <div className="dashboard-budget-overview">
          <h3 className="budget-title">Spending by Category</h3>
          <div className="budget-items">
            {visibleCategoryBreakdown.map((cat) => {
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
                      style={{ width: `${Math.min(cat.pct, 100)}%` }}
                    />
                  </div>
                  <div className="budget-range">
                    <span>{formatCurrency(cat.spent, newCurrency)}</span>
                    <span>{cat.total > 0 ? formatCurrency(cat.total, newCurrency) : 'Budget'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="dashboard-insights-panel">
        <div className="insights-header">
          <h3 className="insights-title">Money Insights</h3>
        </div>
        <div className="insights-list">
          {insights.map((insight) => (
            <div key={insight.title} className={`insight-item insight-${insight.tone}`}>
              <div className="insight-bullet" />
              <div>
                <p className="insight-title">{insight.title}</p>
                <p className="insight-detail">{insight.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-advice-panel">
        <div className="insights-header">
          <h3 className="insights-title">Budget Advice</h3>
        </div>
        <div className="advice-list">
          {adviceItems.map((item) => (
            <div key={item.title} className="advice-item">
              <div className="advice-bullet" />
              <div>
                <p className="advice-title">{item.title}</p>
                <p className="advice-detail">{item.detail}</p>
              </div>
            </div>
          ))}
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
                    -{formatCurrency(convertCurrencyAmount(item.amount, item.currency || 'KES', newCurrency), newCurrency)}
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
