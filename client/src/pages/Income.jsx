import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import api from '../services/api.js';
import { TrendingUp, Plus, Calendar, IndianRupee, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { formatINR } from '../utils/currency.js';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function Income() {
  const [incomes, setIncomes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({ 
    source: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0],
    is_salary: false 
  });
  const [loading, setLoading] = useState(false);

  const loadIncomes = async () => {
    try {
      const response = await api.get('/incomes');
      setIncomes(response.data);
    } catch (err) {
      console.error('Failed to load incomes:', err);
    }
  };

  useEffect(() => { 
    loadIncomes(); 

    // 1. Background Polling Interval (every 4 seconds)
    const interval = setInterval(() => {
      loadIncomes();
    }, 4000);

    // 2. Window Focus Re-fetch
    const handleFocus = () => {
      loadIncomes();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const triggerCelebration = (amount) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#14b8a6', '#f59e0b', '#10b981'],
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ec4899', '#3b82f6', '#8b5cf6']
      });
    }, 300);
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f59e0b', '#10b981', '#ef4444']
      });
    }, 600);
  };

  const handleEdit = (income) => {
    setEditingId(income.id);
    setForm({
      source: income.source,
      amount: income.amount.toString(),
      date: new Date(income.date).toISOString().split('T')[0],
      is_salary: income.is_salary || false
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (income) => {
    setIncomeToDelete(income);
  };

  const handleConfirmDelete = async () => {
    if (!incomeToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/incomes/${incomeToDelete.id}`);
      toast.success('Income deleted successfully');
      setIncomeToDelete(null);
      loadIncomes();
    } catch (err) {
      toast.error('Failed to delete income');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const amount = parseFloat(form.amount);
      
      if (editingId) {
        // Update existing
        await api.put(`/incomes/${editingId}`, form);
        toast.success('Income updated successfully!');
        setEditingId(null);
      } else {
        // Create new
        await api.post('/incomes', form);
      
        // 🎉 TRIGGER CELEBRATION
        triggerCelebration(amount);

        // 🚀 AUTOMATICALLY REGENERATE BUDGET IN BACKGROUND
        try {
          await api.post('/budgets/generate-ai');
        } catch (err) {
          console.log('Auto-budget skipped');
        }
        toast.success(`🎉 ${formatINR(amount)} added successfully!`, {
          duration: 3000,
          icon: '💰',
        });
      }
      
      setForm({ 
        source: '', 
        amount: '', 
        date: new Date().toISOString().split('T')[0],
        is_salary: false 
      });
      setShowForm(false);
      loadIncomes();
    } catch (err) {
      console.error(err);
      toast.error(editingId ? 'Failed to update income' : 'Failed to add income');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowForm(false);
    setForm({ 
      source: '', 
      amount: '', 
      date: new Date().toISOString().split('T')[0],
      is_salary: false 
    });
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 p-8"
    >
      {/* Hero Section */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="glass-card p-8 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <motion.div className="text-emerald-100 text-sm font-medium mb-1">
              Total Income
            </motion.div>
            <motion.div 
              key={totalIncome}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl md:text-6xl font-bold"
            >
              {formatINR(totalIncome)}
            </motion.div>
            <motion.p className="text-emerald-100 mt-2 flex items-center gap-2">
              <Sparkles size={16} />
              {incomes.length} income source{incomes.length !== 1 ? 's' : ''} this month
            </motion.p>
          </div>
          <motion.div 
            whileHover={{ rotate: 360 }}
            className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            <TrendingUp size={40} />
          </motion.div>
        </div>
      </motion.div>

      {/* Add/Edit Income Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          handleCancel();
          setShowForm(true);
        }}
        className="premium-btn flex items-center gap-2 px-6 py-3 shadow-lg"
      >
        <Plus size={20} />
        {editingId ? 'Edit Income' : 'Add Income'}
      </motion.button>

      {/* Income Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            onSubmit={handleSubmit}
            className="glass-card p-6 space-y-4 overflow-hidden border-2 border-primary-200"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              {editingId ? <Edit2 className="text-primary-600" size={20} /> : <Sparkles className="text-primary-600" size={20} />}
              {editingId ? 'Edit Income' : 'Add New Income'}
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
              <input
                type="text"
                placeholder="e.g., Monthly Salary, Freelance"
                className="input-premium"
                value={form.source}
                onChange={(e) => setForm({...form, source: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="number"
                  placeholder="0"
                  className="input-premium pl-12"
                  value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="date"
                  className="input-premium pl-12"
                  value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_salary"
                checked={form.is_salary}
                onChange={(e) => setForm({...form, is_salary: e.target.checked})}
                className="w-4 h-4 text-primary-600 border-slate-300 rounded"
              />
              <label htmlFor="is_salary" className="text-sm text-slate-700">
                This is my monthly salary
              </label>
            </div>

            <div className="flex gap-3">
              <button 
                type="submit" 
                className="premium-btn flex-1 py-3"
                disabled={loading}
              >
                {loading ? 'Saving...' : editingId ? '💾 Update Income' : '🎉 Add Income'}
              </button>
              <button 
                type="button"
                onClick={handleCancel}
                className="btn-secondary flex-1 py-3"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Income List */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-800">Income History</h3>
        {incomes.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-500">
            <div className="text-4xl mb-3">💸</div>
            <div className="font-medium">No income added yet</div>
          </div>
        ) : (
          incomes.map((inc, i) => (
            <motion.div
              key={inc.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 flex items-center justify-between hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{inc.source}</div>
                  <div className="text-sm text-slate-500">
                    {new Date(inc.date).toLocaleDateString('en-IN')}
                    {inc.is_salary && (
                      <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                        Salary
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-emerald-600">
                  {formatINR(parseFloat(inc.amount))}
                </div>
                <button 
                  onClick={() => handleEdit(inc)}
                  className="p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteClick(inc)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Custom UI Confirmation Modal for Income Deletion */}
      <ConfirmModal
        isOpen={!!incomeToDelete}
        title="Delete Income Entry"
        message={
          incomeToDelete
            ? `Are you sure you want to delete "${incomeToDelete.source || 'this income'}" of ${formatINR(parseFloat(incomeToDelete.amount || 0))}? This will update your calculated budget balances.`
            : ''
        }
        confirmText="Delete Income"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setIncomeToDelete(null)}
      />
    </motion.div>
  );
}