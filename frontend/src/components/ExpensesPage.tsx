import React, { useState, useEffect } from 'react';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
}

const CATEGORIES = ['Food & Drink', 'Transport', 'Entertainment', 'Utilities', 'Health', 'Shopping'];

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Form / Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Drink');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch Expenses
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

  // Handle Form Submit
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
          date,
        }),
      });

      if (res.ok) {
        setTitle('');
        setAmount('');
        setIsModalOpen(false);
        fetchExpenses(); // Refresh list immediately
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

  return (
    <div className="p-8 max-w-5xl mx-auto text-slate-900 bg-[#F3F6F4] min-h-screen">
      {/* Header with Add Expense Button */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-gray-400">
            TRANSACTIONS
          </span>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mt-1">Expenses</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#10B981] text-white font-semibold rounded-lg hover:bg-[#059669] transition-colors cursor-pointer"
        >
          + Add Expense
        </button>
      </div>

      {/* Expense List Table / Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">All Expenses</h2>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No expenses recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map((expense) => (
              <div key={expense.id} className="py-3.5 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-900">{expense.title}</p>
                  <p className="text-xs text-gray-400">
                    {expense.category} • {expense.date}
                  </p>
                </div>
                <div className="font-bold text-rose-500">
                  -${expense.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Adding Expense */}
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
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Title
                </label>
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
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  {CATEGORIES.map((cat) => (
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