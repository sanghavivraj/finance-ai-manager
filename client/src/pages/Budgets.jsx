import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import BudgetCard from '../components/BudgetCard.jsx';
import { formatINR } from '../utils/currency.js';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [spent, setSpent] = useState({});
  const [auto, setAuto] = useState(false);
  const [income, setIncome] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const load = async () => {
    setLoading(true);
    try {
      const [b, s, u] = await Promise.all([
        api.get('/budgets', { params: { month, year } }),
        api.get('/dashboard/summary'),
        api.get('/auth/me'),
      ]);
      setBudgets(b.data);
      setSpent(s.data.spent);
      setAuto(u.data.auto_rebalance);
      setIncome(parseFloat(u.data.monthly_income) || 0);
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    await api.post('/budgets/generate');
    await load(); // Reload to show fresh data
  };

  const edit = async (id, current) => {
    const v = prompt('New budget amount (₹):', current);
    if (!v) return;
    await api.put(`/budgets/${id}`, { amount: parseFloat(v) });
    await load();
  };

  const toggleAuto = async () => {
    await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ auto_rebalance: !auto }),
    });
    setAuto(!auto);
  };

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + (spent[b.category_name] || 0), 0);

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Budgets
          </h1>
          <p className="text-slate-500 mt-2">
            Monthly income: <span className="font-bold text-accent-600">{formatINR(income)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="btn-ghost flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={toggleAuto}
            className={`btn ${auto ? 'bg-primary-100 text-primary-700' : 'btn-ghost'}`}
          >
            Auto Rebalance {auto ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={generate}
            disabled={income === 0}
            className={`premium-btn flex items-center gap-2 ${income === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Sparkles size={16} />
            Generate with AI
          </button>
        </div>
      </motion.div>

      {/* Summary Bar */}
      {budgets.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Overall Budget Usage</span>
            <span className="text-sm font-bold text-slate-800">
              {formatINR(totalSpent)} / {formatINR(totalBudget)}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                totalSpent > totalBudget
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : totalSpent > totalBudget * 0.8
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                  : 'bg-gradient-to-r from-primary-500 to-accent-500'
              }`}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>
              {totalSpent > totalBudget
                ? `⚠️ Over budget by ${formatINR(totalSpent - totalBudget)}`
                : `${formatINR(totalBudget - totalSpent)} remaining`}
            </span>
            <span className="font-semibold">
              {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% used
            </span>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {income === 0 && (
        <div className="glass-card bg-amber-50 border-amber-200 text-center py-12">
          <p className="text-amber-800 mb-3 font-medium">
            Your monthly income is ₹0. The AI needs a baseline to generate budgets.
          </p>
          <a href="/income" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 transition font-medium">
            Go to Income Page
          </a>
        </div>
      )}

      {/* Budget Cards Grid */}
      {budgets.length === 0 && income > 0 ? (
        <div className="glass-card text-center py-16">
          <p className="text-slate-500 mb-4 text-lg">No budgets yet. Let AI plan your finances.</p>
          <button onClick={generate} className="premium-btn px-8 py-3">
            <Sparkles size={18} className="mr-2" />
            Generate Budgets
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <BudgetCard
                name={b.category_name}
                icon={b.icon}
                budget={parseFloat(b.amount)}
                spent={spent[b.category_name] || 0}
                onEdit={() => edit(b.id, parseFloat(b.amount))}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}