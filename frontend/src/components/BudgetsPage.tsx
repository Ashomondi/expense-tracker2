import React, { useState, useEffect } from 'react';
import { API_BASE } from '../api';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  currency?: 'KES' | 'USD' | 'EUR' | 'GBP';
}

interface Budget {
  id: number;
  category: string;
  amount: number;
}

interface BudgetsPageProps {
  selectedCurrency?: 'KES' | 'USD' | 'EUR' | 'GBP';
}

const CATEGORIES = [
  { name: 'Food & Drink', color: 'bg-[#10B981]', badgeBg: 'bg-amber-100 text-amber-800' },
  { name: 'Transport', color: 'bg-blue-500', badgeBg: 'bg-blue-100 text-blue-800' },
  { name: 'Entertainment', color: 'bg-purple-500', badgeBg: 'bg-purple-100 text-purple-800' },
  { name: 'Utilities', color: 'bg-cyan-500', badgeBg: 'bg-cyan-100 text-cyan-800' },
  { name: 'Health', color: 'bg-rose-500', badgeBg: 'bg-rose-100 text-rose-800' },
  { name: 'Shopping', color: 'bg-orange-500', badgeBg: 'bg-orange-100 text-orange-800' },
];

const CURRENCY_RATES: Record<string, number> = {
  KES: 1,
  USD: 129.5,
  EUR: 140.2,
  GBP: 162.4,
};

const formatCurrency = (value: number, currency: string = 'KES') =>
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

export const BudgetsPage: React.FC<BudgetsPageProps> = ({ selectedCurrency = 'KES' }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [multiBudgetValues, setMultiBudgetValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expRes, budRes] = await Promise.all([
          fetch(`${API_BASE}/api/expenses`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/budgets`, { credentials: 'include' }),
        ]);

        if (expRes.ok) {
          const expData = await expRes.json();
          setExpenses(expData || []);
        }

        if (budRes.ok) {
          const budData: Budget[] = await budRes.json();
          const map: Record<string, number> = {};
          budData.forEach((b) => (map[b.category] = b.amount));
          setBudgets(map);
          setMultiBudgetValues(
            Object.fromEntries(
              CATEGORIES.map((cat) => [cat.name, String(map[cat.name] ?? '')])
            )
          );
        }
      } catch (err) {
        console.error('Failed to load budget data:', err);
      }
    };

    fetchData();
  }, []);

  const categorySpentMap: Record<string, number> = {};
  expenses.forEach((exp) => {
    const amountInSelectedCurrency = convertCurrencyAmount(exp.amount, exp.currency || 'KES', selectedCurrency);
    categorySpentMap[exp.category] = (categorySpentMap[exp.category] || 0) + amountInSelectedCurrency;
  });

  const totalSpent = Object.values(categorySpentMap).reduce((a, b) => a + b, 0);
  const totalBudget = Object.values(budgets).reduce((a, b) => convertCurrencyAmount(b, 'KES', selectedCurrency) + a, 0);
  const totalPercent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

  let onTrackCount = 0;
  let nearLimitCount = 0;
  let overBudgetCount = 0;

  CATEGORIES.forEach((cat) => {
    const spent = categorySpentMap[cat.name] || 0;
    const limit = budgets[cat.name] || 0;
    if (limit <= 0) return;

    const pct = (spent / limit) * 100;

    if (pct >= 100) overBudgetCount++;
    else if (pct >= 85) nearLimitCount++;
    else onTrackCount++;
  });

  const handleBulkBudgetSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const entries = CATEGORIES.map((cat) => {
        const value = Number(multiBudgetValues[cat.name]);
        return { category: cat.name, amount: value };
      }).filter((entry) => !Number.isNaN(entry.amount) && entry.amount > 0);

      if (entries.length === 0) return;

      await Promise.all(
        entries.map((entry) =>
          fetch(`${API_BASE}/api/budgets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: entry.category, amount: entry.amount }),
            credentials: 'include',
          })
        )
      );

      const nextBudgets: Record<string, number> = { ...budgets };
      for (const entry of entries) {
        nextBudgets[entry.category] = entry.amount;
      }
      setBudgets(nextBudgets);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save budgets', err);
    }
  };

  return (
    <div className="flex-1 p-8 bg-[#F3F6F4] text-slate-900 overflow-y-auto min-h-screen">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">BUDGETS</span>
          <h2 className="text-3xl font-serif font-bold text-slate-900">Monthly Budgets</h2>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#10B981] text-black font-semibold rounded-lg hover:bg-[#059669] transition-colors"
        >
          + Set Budget
        </button>
      </div>

      {/* Dark Overview Card */}
      <div className="bg-[#0E1310] text-white p-6 rounded-2xl shadow-xl mb-8 border border-white/5">
        <span className="text-xs text-[#10B981] font-mono tracking-widest uppercase font-semibold">
          {new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' })} OVERVIEW
        </span>

        <div className="flex flex-col md:flex-row justify-between md:items-end mt-2 mb-6 gap-4">
          <div>
            <div className="text-4xl font-serif font-bold text-white">{formatCurrency(totalSpent, selectedCurrency)}</div>
            <p className="text-xs text-gray-400 mt-1">
              spent of <span className="text-[#10B981] font-semibold">{formatCurrency(totalBudget, selectedCurrency)}</span> total budget
            </p>
          </div>

          <div className="flex gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
              <span className="text-gray-300">On Track</span>
              <span className="font-bold ml-1 text-white">{onTrackCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-gray-300">Near Limit</span>
              <span className="font-bold ml-1 text-white">{nearLimitCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-gray-300">Over Budget</span>
              <span className="font-bold ml-1 text-white">{overBudgetCount}</span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#10B981] h-full transition-all duration-500"
            style={{ width: `${totalPercent}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-2">
          {totalPercent}% used • {formatCurrency(Math.max(0, totalBudget - totalSpent), selectedCurrency)} remaining
        </div>
      </div>

      {/* Grid of Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((cat) => {
          const spent = categorySpentMap[cat.name] || 0;
          const limit = budgets[cat.name] || 0;
          const convertedLimit = limit > 0 ? convertCurrencyAmount(limit, 'KES', selectedCurrency) : 0;
          const hasLimit = convertedLimit > 0;
          const percentage = hasLimit ? Math.min(Math.round((spent / convertedLimit) * 100), 100) : 0;
          const isOver = spent > convertedLimit && hasLimit;

          return (
            <div key={cat.name} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${cat.color}`} />
                    <span className="font-bold text-slate-900">{cat.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">Monthly limit</span>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-serif font-bold text-slate-900">{formatCurrency(spent, selectedCurrency)}</span>
                  <span className="text-xs text-gray-400">/ {hasLimit ? formatCurrency(convertedLimit, selectedCurrency) : '—'}</span>
                </div>

                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${isOver ? 'bg-rose-500' : cat.color}`}
                    style={{ width: `${hasLimit ? percentage : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={`font-semibold ${isOver ? 'text-rose-500' : 'text-gray-500'}`}>
                  {hasLimit ? (isOver ? 'Over budget' : 'On track') : 'No limit set'}
                </span>
                <span className={`font-bold ${isOver ? 'text-rose-500' : 'text-[#10B981]'}`}>
                  {hasLimit ? `${percentage}%` : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Set Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#18201B] border border-white/10 p-6 rounded-2xl w-full max-w-2xl text-white">
            <h3 className="text-xl font-bold mb-4">Set Monthly Budgets</h3>
            <form onSubmit={handleBulkBudgetSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <label className="block text-xs text-gray-400 mb-1">{cat.name} ({selectedCurrency})</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={multiBudgetValues[cat.name] ?? ''}
                      onChange={(e) =>
                        setMultiBudgetValues((prev) => ({
                          ...prev,
                          [cat.name]: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/5 text-xs text-gray-300 rounded-lg hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#10B981] text-xs font-semibold text-black rounded-lg hover:bg-[#059669]"
                >
                  Save All Budgets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};