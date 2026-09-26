import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api.js';
import { formatINR } from '../utils/currency.js';
import { Target, PiggyBank, Plus, Sparkles, Calendar, Trash2, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import ConfirmModal from '../components/ConfirmModal.jsx';

const goalIcons = ['💰', '🚗', '🏠', '✈️', '💻', '🎓', '💍', '🛡️'];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    target: '',
    current: '',
    deadline: '',
    icon: '💰',
  });

  const loadGoals = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await api.get('/goals');
      setGoals(data || []);
    } catch (err) {
      console.error(err);
      if (!silent) setGoals([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { 
    loadGoals(false); 

    // 1. Background Polling Interval (every 4 seconds)
    const interval = setInterval(() => {
      loadGoals(true);
    }, 4000);

    // 2. Window Focus Re-fetch (instant refresh when returning from Telegram/other apps)
    const handleFocus = () => {
      loadGoals(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/goals', {
        ...form,
        target: parseFloat(form.target),
        current: parseFloat(form.current || 0),
      });
      toast.success('🎉 Savings goal created!');
      setForm({ name: '', target: '', current: '', deadline: '', icon: '💰' });
      setShowAddModal(false);
      loadGoals();
    } catch (err) {
      toast.error('Failed to create goal');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositGoalId || !depositAmount) return;
    try {
      await api.post(`/goals/${depositGoalId}/deposit`, { amount: parseFloat(depositAmount) });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      toast.success(`Deposited ${formatINR(parseFloat(depositAmount))} into goal!`);
      setDepositGoalId(null);
      setDepositAmount('');
      loadGoals();
    } catch (err) {
      toast.error('Deposit failed');
    }
  };

  const handleDeleteGoalClick = (goal) => {
    setGoalToDelete(goal);
  };

  const handleConfirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/goals/${goalToDelete.id}`);
      toast.success('Goal deleted');
      setGoalToDelete(null);
      loadGoals();
    } catch (err) {
      toast.error('Failed to delete goal');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.target || 0), 0);
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.current || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Savings & Wealth Vault
          </h1>
          <p className="text-slate-500 mt-2">Track dedicated savings goals, emergency funds & asset targets</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="premium-btn flex items-center gap-2 px-6 py-3 shadow-lg"
        >
          <Plus size={20} /> New Savings Goal
        </button>
      </div>

      {/* Summary Banner */}
      <div className="glass-card p-8 bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-emerald-100 text-sm font-medium mb-1 flex items-center gap-2">
              <PiggyBank size={18} /> Total Wealth Saved Across Goals
            </div>
            <div className="text-5xl font-extrabold tracking-tight">
              {formatINR(totalSaved)}
              <span className="text-xl font-medium text-emerald-200 ml-3">/ {formatINR(totalTarget)} target</span>
            </div>
          </div>
          <div className="w-full md:w-64">
            <div className="flex justify-between text-xs text-emerald-100 font-bold mb-1.5">
              <span>Overall Savings Progress</span>
              <span>{overallProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, overallProgress)}%` }}
                transition={{ duration: 1.2 }}
                className="h-full bg-white rounded-full shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="glass-card p-12 text-center text-slate-500">Loading your savings vault...</div>
      ) : goals.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-lg font-bold text-slate-700">No Savings Goals Yet</p>
          <p className="text-sm text-slate-500 mt-1">Start by creating a goal like "Emergency Fund" or "New Vehicle"!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal, i) => {
            const isCompleted = goal.progress >= 100;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card p-6 flex flex-col justify-between border-2 ${
                  isCompleted ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl p-2 rounded-2xl bg-slate-100">{goal.icon || '🎯'}</div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{goal.name}</h3>
                        {goal.deadline && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar size={12} /> Target: {new Date(goal.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteGoalClick(goal)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="Delete Goal"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-1 mb-4">
                    <div className="text-2xl font-bold text-slate-800">
                      {formatINR(goal.current)}
                      <span className="text-sm font-normal text-slate-400 ml-2">/ {formatINR(goal.target)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>{goal.progress.toFixed(0)}% Saved</span>
                      <span className="text-emerald-600">{goal.ai_prediction}% AI Likelihood</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, goal.progress)}%` }}
                      transition={{ duration: 1 }}
                      className={`h-full rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  {goal.ai_suggestion && (
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium mb-4 flex items-start gap-2">
                      <Sparkles size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{goal.ai_suggestion}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setDepositGoalId(goal.id)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ArrowUpRight size={16} /> Deposit Funds
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleCreateGoal}
              className="glass-card p-6 w-full max-w-md space-y-4 bg-white shadow-2xl border-2 border-emerald-100"
            >
              <h3 className="text-xl font-bold text-slate-800">Create New Savings Goal</h3>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Goal Icon</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {goalIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`text-2xl p-2 rounded-xl border ${
                        form.icon === icon ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund"
                  className="input-premium"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  placeholder="50000"
                  className="input-premium"
                  value={form.target}
                  onChange={e => setForm({ ...form, target: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Initial Saved (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  className="input-premium"
                  value={form.current}
                  onChange={e => setForm({ ...form, current: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Deadline</label>
                <input
                  type="date"
                  className="input-premium"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="premium-btn flex-1 py-3">Create Goal</button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1 py-3"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {depositGoalId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleDeposit}
              className="glass-card p-6 w-full max-w-sm space-y-4 bg-white shadow-2xl border-2 border-emerald-100"
            >
              <h3 className="text-xl font-bold text-slate-800">Deposit Savings</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount to Deposit (₹)</label>
                <input
                  type="number"
                  placeholder="5000"
                  className="input-premium"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="premium-btn flex-1 py-3">Confirm Deposit</button>
                <button
                  type="button"
                  onClick={() => setDepositGoalId(null)}
                  className="btn-secondary flex-1 py-3"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Custom UI Confirmation Modal for Goal Deletion */}
      <ConfirmModal
        isOpen={!!goalToDelete}
        title="Delete Savings Goal"
        message={
          goalToDelete
            ? `Are you sure you want to delete the "${goalToDelete.name}" savings goal (${formatINR(goalToDelete.current)} saved of ${formatINR(goalToDelete.target)})? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Goal"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteGoal}
        onClose={() => !isDeleting && setGoalToDelete(null)}
      />
    </motion.div>
  );
}