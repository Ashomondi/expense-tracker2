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
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await fetch('/api/expenses');
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

  return (
    <main className="p-8 max-w-5xl mx-auto">
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
        <button className="px-5 py-2.5 bg-[#10B981] text-black font-semibold rounded-lg hover:bg-[#059669] transition-colors">
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
    </main>
  );
};