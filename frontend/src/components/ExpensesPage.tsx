import React, { useState, useEffect } from 'react';

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

const formatKenyaDateTime = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
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

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  currency?: string;
  date: string;
}

interface ExpensesPageProps {
  onAddExpenseClick?: () => void;
  selectedCurrency?: 'KES' | 'USD' | 'EUR' | 'GBP';
  onCurrencyChange?: (currency: 'KES' | 'USD' | 'EUR' | 'GBP') => void;
}

const CATEGORIES = ['All', 'Food & Drink', 'Transport', 'Entertainment', 'Utilities', 'Health', 'Shopping'];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Drink': ['food', 'drink', 'drinks', 'coffee', 'tea', 'juice', 'milk', 'dinner', 'lunch', 'breakfast', 'restaurant', 'meal', 'snack', 'burger', 'pizza', 'grocery', 'groceries', 'eat', 'eating', 'cafe', 'café', 'market', 'fruits', 'vegetables', 'salad', 'ramen', 'boba', 'soup', 'cake', 'cookies', 'beer', 'wine', 'bar', 'chai', 'chapati', 'nyama choma', 'kebab', 'shawarma'],
  Transport: ['transport', 'uber', 'bus', 'train', 'taxi', 'fuel', 'gas', 'metro', 'car', 'ride', 'parking', 'flight', 'ticket', 'tickets', 'airline', 'trip', 'travel', 'road', 'driver', 'motorbike', 'boda', 'matatu', 'fare', 'tuktuk'],
  Entertainment: ['movie', 'movies', 'concert', 'music', 'streaming', 'netflix', 'spotify', 'game', 'games', 'theater', 'cinema', 'fun', 'festival', 'party', 'show', 'booking', 'tickets', 'live', 'karaoke', 'stadium', 'play', 'drama'],
  Utilities: ['utility', 'utilities', 'electricity', 'water', 'internet', 'wifi', 'phone', 'bill', 'power', 'rent', 'electric', 'light', 'service', 'provider', 'solar', 'dstv', 'tv', 'subscription', 'lantern', 'laundry', 'maid', 'cleaning'],
  Health: ['health', 'pharmacy', 'doctor', 'medicine', 'gym', 'fitness', 'hospital', 'medical', 'wellness', 'vitamin', 'therapy', 'checkup', 'clinic', 'dentist', 'supplement', 'massage', 'insurance', 'optician'],
  Shopping: ['shopping', 'shop', 'clothes', 'gift', 'gifts', 'amazon', 'store', 'purchase', 'wear', 'online', 'bag', 'sneakers', 'apparel', 'retail', 'order', 'fashion', 'shoes', 'electronics', 'phone', 'headphones', 'toys', 'stationery', 'gadget'],
};

const parseQuickExpense = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const amountMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/i);
  const amountValue = amountMatch ? Number(amountMatch[1]) : null;
  const text = (amountMatch ? amountMatch[2] : trimmed).trim();

  if (!text && amountValue === null) return null;

  const loweredText = text.toLowerCase();
  let category = 'Food & Drink';
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (loweredText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      category = cat;
    }
  }

  if (amountValue !== null && amountValue > 0) {
    return { amount: amountValue, category, title: text };
  }

  return { amount: amountValue, category, title: text };
};

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ selectedCurrency = 'KES', onCurrencyChange }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [quickEntry, setQuickEntry] = useState('');
  const [currency, setCurrency] = useState<'KES' | 'USD' | 'EUR' | 'GBP'>(selectedCurrency);

  useEffect(() => {
    setCurrency(selectedCurrency);
  }, [selectedCurrency]);

  const handleCurrencyChange = (nextCurrency: 'KES' | 'USD' | 'EUR' | 'GBP') => {
    setCurrency(nextCurrency);
    onCurrencyChange?.(nextCurrency);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Drink');
  const [date, setDate] = useState(() => formatKenyaDateInput());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:8080/api/expenses', { credentials: 'include' });
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

  const handleDeleteExpense = async (id: number) => {
    try {
      const res = await fetch('http://localhost:8080/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setExpenses((prev) => prev.filter((expense) => expense.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const parsedAmount = parseFloat(amount);
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
          title,
          amount: parsedAmount,
          category,
          currency,
          date,
        }),
      });

      if (res.ok) {
        setTitle('');
        setAmount('');
        setCategory('Food & Drink');
        setDate(formatKenyaDateInput());
        setIsModalOpen(false);
        const fetchExpenses = async () => {
          setLoading(true);
          try {
            const res = await fetch('http://localhost:8080/api/expenses', { credentials: 'include' });
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

  const handleQuickEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickEntry.trim();

    if (!trimmed) {
      setError('Please type an expense description or an amount, for example "50 drinks".');
      setTitle('');
      setAmount('');
      setCategory('Food & Drink');
      setIsModalOpen(true);
      return;
    }

    const parsed = parseQuickExpense(trimmed);
    if (parsed) {
      setCategory(parsed.category);
      setTitle(parsed.title || '');
      setAmount(parsed.amount !== null ? parsed.amount.toString() : '');
      setDate(formatKenyaDateInput());
      setQuickEntry('');
      setError('');
      setIsModalOpen(true);
      return;
    }

    setError('Please type an expense description or an amount, for example "50 drinks".');
    setTitle('');
    setAmount('');
    setCategory('Food & Drink');
    setIsModalOpen(true);
  };

  const filteredExpenses = expenses.filter((expense) => {
    const expenseCurrency = expense.currency || 'KES';
    const matchesSearch =
      expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatKenyaDate(expense.date).toLowerCase().includes(searchTerm.toLowerCase()) ||
      expenseCurrency.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalSpent = filteredExpenses.reduce((sum, expense) => {
    const sourceCurrency = expense.currency || 'KES';
    return sum + convertCurrencyAmount(expense.amount, sourceCurrency, currency);
  }, 0);

  const chartData = CATEGORIES.filter((cat) => cat !== 'All').map((cat) => ({
    name: cat,
    value: expenses
      .filter((expense) => expense.category === cat)
      .reduce((sum, expense) => sum + convertCurrencyAmount(expense.amount, expense.currency || 'KES', currency), 0),
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-900 bg-[#F3F6F4] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-gray-400">TRANSACTIONS</span>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mt-1">Expenses</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#10B981] text-white font-semibold rounded-lg hover:bg-[#059669] transition-colors cursor-pointer"
        >
          + Add Expense
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
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

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center">
          <label className="text-xs uppercase tracking-wider text-gray-400 mr-2">Currency</label>
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as 'KES' | 'USD' | 'EUR' | 'GBP')}
            className="p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>{option.code}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs uppercase tracking-wider text-gray-400">Total</div>
          <div className="text-3xl font-serif font-bold text-slate-900 mt-2">{formatCurrency(totalSpent, currency)}</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900">Transactions</h2>
            <div className="text-sm text-gray-500">{filteredExpenses.length} items</div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#10B981] text-black'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm"
            />
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">Loading expenses...</p>
          ) : filteredExpenses.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">No matching transactions found.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 font-semibold">Title</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold text-right">Amount</th>
                    <th className="p-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => {
                    const valueInDisplayCurrency = convertCurrencyAmount(expense.amount, expense.currency || 'KES', currency);
                    return (
                      <tr key={expense.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-medium text-slate-900">{expense.title}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                            {expense.category}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{formatKenyaDateTime(expense.date)}</td>
                        <td className="p-3 text-right font-semibold text-rose-500">-{formatCurrency(valueInDisplayCurrency, currency)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-4">Category chart</h3>
          <div className="space-y-4">
            {chartData.map((item) => {
              const maxValue = Math.max(...chartData.map((entry) => entry.value), 1);
              const width = (item.value / maxValue) * 100;
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(item.value, currency)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-[#10B981]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl text-slate-900">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add New Expense</h3>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Coffee"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Amount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  <select
                    value={currency}
                    onChange={(e) => handleCurrencyChange(e.target.value as 'KES' | 'USD' | 'EUR' | 'GBP')}
                    className="w-28 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  >
                    {CURRENCY_OPTIONS.map((option) => (
                      <option key={option.code} value={option.code}>{option.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  {CATEGORIES.filter((cat) => cat !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
};