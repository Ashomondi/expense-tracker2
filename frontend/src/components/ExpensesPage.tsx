import React, { useState, useEffect } from 'react';
import { API_BASE } from '../api';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
}

interface ExpensesPageProps {
  onAddExpenseClick: () => void;
}

const CATEGORIES = ['All', 'Food & Drink', 'Transport', 'Entertainment', 'Utilities', 'Health', 'Shopping'];

const getCategoryBadgeStyle = (category: string) => {
  switch (category) {
    case 'Food & Drink':
      return 'bg-amber-100 text-amber-800';
    case 'Transport':
      return 'bg-blue-100 text-blue-800';
    case 'Entertainment':
      return 'bg-purple-100 text-purple-800';
    case 'Utilities':
      return 'bg-cyan-100 text-cyan-800';
    case 'Health':
      return 'bg-rose-100 text-rose-800';
    case 'Shopping':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ onAddExpenseClick }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/expenses`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data || []);
      }
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExpenses((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = exp.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex-1 p-8 bg-[#F3F6F4] text-slate-900 overflow-y-auto min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">EXPENSES</span>
          <h2 className="text-3xl font-serif font-bold text-slate-900">All Transactions</h2>
        </div>
        <button
          onClick={onAddExpenseClick}
          className="px-5 py-2.5 bg-[#10B981] text-black font-semibold rounded-lg hover:bg-[#059669] transition-colors flex items-center gap-2"
        >
          <span>+</span> Add Expense
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#10B981] text-black font-bold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-500">
            {filteredExpenses.length} transaction{filteredExpenses.length === 1 ? '' : 's'}
          </span>
          <span className="text-lg font-bold text-slate-900">${totalAmount.toFixed(2)}</span>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading expenses...</p>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">No transactions found.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="text-xs uppercase text-gray-400 font-mono border-b border-gray-100">
                <th className="py-3 font-normal">Description</th>
                <th className="py-3 font-normal">Category</th>
                <th className="py-3 font-normal">Date</th>
                <th className="py-3 font-normal text-right">Amount</th>
                <th className="py-3 font-normal text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 font-semibold text-slate-800">{item.title}</td>
                  <td className="py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryBadgeStyle(item.category)}`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="py-4 text-gray-500 text-xs">
                    {new Date(item.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 font-bold text-right text-slate-900">${item.amount.toFixed(2)}</td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-gray-300 hover:text-red-500 text-sm transition-colors px-2"
                      title="Delete expense"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};