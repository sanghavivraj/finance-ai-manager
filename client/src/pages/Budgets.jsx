import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import { formatINR } from '../utils/currency.js';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const categoryIcons = {
  'Food': '🍔', 'Shopping': '🛍️', 'Transport': '🚗',
  'Bills': '📄', 'Entertainment': '🎮', 'Savings': '💰', 'Investments': '📈'
};

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadBudgets = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      
      const res = await api.get(`/budgets?month=${month}&year=${year}`);
      setBudgets(Array.isArray(res.data.budgets) ? res.data.budgets : []);
      setMonthlyIncome(res.data.monthlyIncome || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBudgets(); }, []);

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/budgets/generate-ai');
      toast.success(res.data.message || 'AI Budget generated!');
      loadBudgets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate AI budget.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdate = async (id, newAmount) => {
    try {
      await api.put(`/budgets/${id}`, { amount: newAmount });
      toast.success('Budget updated');
      loadBudgets();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
  // Calculate total spent across all categories
  const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spent || 0), 0);
  const remainingIncome = monthlyIncome - totalBudget;

  if (loading) return <div className="p-8 text-center text-xl font-semibold text-slate-500">Loading budgets...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Budgets</h1>
          <p className="text-slate-500 mt-2">Monthly income: <span className="font-bold text-emerald-600">{formatINR(monthlyIncome)}</span></p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadBudgets} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={18} /> Refresh
          </button>
          <button onClick={handleGenerateAI} disabled={generating} className="premium-btn flex items-center gap-2 px-6 py-3">
            <Sparkles size={18} />
            {generating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
      </div>

      {/* Overall Budget Usage Card */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Overall Budget Usage</h3>
          <div className="text-xl font-bold text-slate-800">{formatINR(totalSpent)} / {formatINR(totalBudget)}</div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-2">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0}%` }}
            className="h-3 rounded-full bg-gradient-to-r from-primary-500 to-accent-500" 
          />
        </div>
        <div className="flex justify-between text-sm text-slate-500">
          <span>{formatINR(totalBudget - totalSpent)} remaining</span>
          <span>{totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% used</span>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.length === 0 ? (
          <div className="col-span-full glass-card p-12 text-center text-slate-500">
            <div className="text-4xl mb-3">📊</div>
            <p className="font-medium">No budgets set for this month.</p>
            <p className="text-sm mt-1">Click "Generate with AI" to create a smart budget.</p>
          </div>
        ) : (
          budgets.map((b, i) => {
            // ✅ THE FIX: Read the actual spent amount from the backend!
            const spent = parseFloat(b.spent || 0); 
            const budgetAmount = parseFloat(b.amount || 0);
            const remaining = budgetAmount - spent;
            const usagePercent = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
            const icon = categoryIcons[b.category_name] || b.icon || '📦';

            return (
              <motion.div
                key={b.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 flex flex-col justify-between h-64"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{icon}</div>
                      <div>
                        <div className="font-bold text-slate-800 text-lg">{b.category_name}</div>
                        {b.is_ai_generated && (
                          <div className="text-xs text-primary-600 flex items-center gap-1">
                            <Sparkles size={12} /> AI Suggested
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-3xl font-bold text-slate-800 mb-1">
                    {formatINR(spent)} <span className="text-base font-normal text-slate-400">/ {formatINR(budgetAmount)}</span>
                  </div>
                  <div className={`text-sm font-medium ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'} flex items-center gap-1`}>
                    <AlertCircle size={14} /> {formatINR(remaining)} remaining
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, usagePercent)}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-2 rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                    />
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Spent: {formatINR(spent)}</span>
                    <span>Budget: {formatINR(budgetAmount)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}