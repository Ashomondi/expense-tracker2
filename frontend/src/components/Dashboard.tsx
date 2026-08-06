import React, { useState, useEffect } from 'react';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Drink');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch Expenses on Load
  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
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

  // Handle Adding Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          category,
          date,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTitle('');
        setAmount('');
        fetchExpenses(); // Refresh list
      }
    } catch (err) {
      console.error('Failed to add expense', err);
    }
  };

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex min-h-screen bg-[#0E1310] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#10B981] mb-8">Spendly</h1>
          <nav className="space-y-2">
            <button className="w-full text-left px-4 py-3 bg-[#10B981] text-black font-semibold rounded-lg">
              Dashboard
            </button>
          </nav>
        </div>
        <div>
          <div className="mb-4">
            <p className="font-semibold text-sm">{user.full_name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <button onClick={onLogout} className="text-xs text-red-400 hover:underline">
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <span className="text-xs text-gray-400 uppercase font-mono">Overview</span>
            <h2 className="text-3xl font-serif font-bold">Good day, {user.full_name.split(' ')[0]}</h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#10B981] text-black font-semibold rounded-lg hover:bg-[#059669] transition-colors"
          >
            + Add Expense
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Total Spent</p>
            <p className="text-3xl font-bold text-[#10B981]">${totalSpent.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Transactions</p>
            <p className="text-3xl font-bold">{expenses.length}</p>
          </div>
        </div>

        {/* Transactions Table / Empty State */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading transactions...</p>
          ) : expenses.length === 0 ? (
            /* Empty State for New Users */
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm mb-4">You haven't added any expenses yet.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs"
              >
                Create your first expense
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {expenses.map((exp) => (
                <li key={exp.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold">{exp.title}</p>
                    <p className="text-xs text-gray-400">{exp.category} • {exp.date.split('T')[0]}</p>
                  </div>
                  <span className="font-bold text-red-400">-${exp.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#18201B] border border-white/10 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add New Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Morning Coffee"
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="4.50"
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#18201B] border border-white/10 rounded p-2 text-sm text-white"
                >
                  <option>Food & Drink</option>
                  <option>Transport</option>
                  <option>Entertainment</option>
                  <option>Utilities</option>
                  <option>Health</option>
                  <option>Shopping</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/5 text-xs text-gray-300 rounded hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#10B981] text-xs font-semibold text-black rounded hover:bg-[#059669]"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};