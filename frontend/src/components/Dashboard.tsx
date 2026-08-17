import React, { useState, useEffect } from 'react';
import { API_BASE } from '../api';

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
  onLogout: () => void;
}

const CATEGORIES = ['Food & Drink', 'Transport', 'Entertainment', 'Utilities', 'Health', 'Shopping'];

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Drink');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch Expenses with Cookie Credentials
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

  // Handle Form Submission
  const handleCreateExpense = async (e: React.FormEvent) => {
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
        credentials: 'include', // Sends spendly_token cookie
        body: JSON.stringify({
          title,
          amount: parsedAmount,
          category,
          date,
        }),
      });

      if (res.ok) {
        setTitle('');
        setAmount('');
        setIsModalOpen(false);
        fetchExpenses(); // Refresh expense list and total spent
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add expense');
      }
    } catch (err) {
      setError('Server error. Make sure your Go backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <main className="p-8 max-w-5xl mx-auto relative">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-xs uppercase tracking-wider text-gray-400 font-mono">
            OVERVIEW
          </span>
          <h1 className="text-4xl font-serif font-bold text-white mt-1">
            Good day, {user.full_name.split(' ')[0]}
          </h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#10B981] text-black font-semibold rounded-lg hover:bg-[#059669] transition-colors cursor-pointer"
        >
          + Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Card 1: Total Spent */}
        <div className="bg-[#141B17] border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-mono uppercase">Total Spent</span>
          <div className="text-2xl sm:text-3xl font-bold text-[#10B981] mt-2 truncate">
            ${totalSpent.toFixed(2)}
          </div>
        </div>

        {/* Card 2: Transactions Count */}
        <div className="bg-[#141B17] border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-mono uppercase">Transactions</span>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-2">
            {expenses.length}
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-[#141B17] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Recent Transactions</h2>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading transactions...</p>
        ) : expenses.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No transactions recorded yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {expenses.map((expense) => (
              <div key={expense.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">{expense.title}</p>
                  <p className="text-xs text-gray-400">
                    {expense.category} • {expense.date}
                  </p>
                </div>
                <div className="font-bold text-red-400">
                  -${expense.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= ADD EXPENSE MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141B17] border border-white/10 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add New Expense</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 text-red-400 rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grocery Shopping"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#141B17] text-white">
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
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#10B981] text-black font-semibold rounded-lg hover:bg-[#059669] text-sm transition-colors cursor-pointer disabled:opacity-50"
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