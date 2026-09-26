import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Plus, Calendar, IndianRupee, Tag, Store, CreditCard, X, Sparkles, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import ReceiptUploader from './ReceiptUploader.jsx';

export default function ExpenseForm({ onAdded, editingExpense, onEditComplete }) {
  const [form, setForm] = useState({
    amount: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    merchant: '',
    payment_method: 'upi',
  });
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showScanner, setShowScanner] = useState(false);

  // Load categories
  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data));
  }, []);

  // Fill form when editing
  useEffect(() => {
    if (editingExpense) {
      const cleanDesc = (editingExpense.description || '')
        .replace(/^telegram:\s*/i, '')
        .trim();

      setForm({
        amount: editingExpense.amount.toString(),
        category_id: editingExpense.category_id.toString(),
        date: new Date(editingExpense.date).toISOString().split('T')[0],
        description: cleanDesc,
        merchant: editingExpense.merchant || '',
        payment_method: editingExpense.payment_method || 'upi',
      });
      setMood(editingExpense.mood || '');
      setShowScanner(false);
    } else {
      // Reset form
      setForm({
        amount: '',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        merchant: '',
        payment_method: 'upi',
      });
      setMood('');
    }
  }, [editingExpense]);

  const handleReceiptParsed = (parsed) => {
    setForm((prev) => ({
      ...prev,
      amount: parsed.amount ? parsed.amount.toString() : prev.amount,
      category_id: parsed.category_id ? parsed.category_id.toString() : prev.category_id,
      merchant: parsed.merchant || prev.merchant,
      description: parsed.description || prev.description,
      date: parsed.date || prev.date,
    }));
    setShowScanner(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingExpense) {
        // Update existing
        await api.put(`/expenses/${editingExpense.id}`, {
          ...form,
          amount: parseFloat(form.amount),
          mood: mood || null,
        });
        toast.success('Expense updated successfully!');
        onEditComplete();
      } else {
        // Create new
        await api.post('/expenses', {
          ...form,
          amount: parseFloat(form.amount),
          mood: mood || null,
        });
        toast.success('Expense added successfully! ');
        
        setForm({
          amount: '',
          category_id: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          merchant: '',
          payment_method: 'upi',
        });
        setMood('');
        onAdded();
      }
    } catch (err) {
      toast.error(editingExpense ? 'Failed to update expense' : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Optional AI Receipt Scanner Header Card */}
      {!editingExpense && (
        <div>
          {!showScanner ? (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-primary-50 via-teal-50 to-emerald-50 border border-primary-200/80 hover:border-primary-400 text-primary-800 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition duration-200"
            >
              <Sparkles size={16} className="text-primary-600" />
              <span>⚡ Auto-fill with AI Receipt Photo Scan</span>
            </button>
          ) : (
            <ReceiptUploader
              onParsed={handleReceiptParsed}
              onCancel={() => setShowScanner(false)}
            />
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Plus size={20} className="text-primary-600" />
            {editingExpense ? 'Edit Expense' : 'Expense Details'}
          </h3>
          {editingExpense && (
            <button
              type="button"
              onClick={onEditComplete}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Amount</label>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="input-premium pl-10"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Category</label>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select
            className="input-premium pl-10 appearance-none"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            required
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Merchant & Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Merchant</label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="e.g. Zomato"
              className="input-premium pl-10"
              value={form.merchant}
              onChange={(e) => setForm({ ...form, merchant: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="date"
              className="input-premium pl-10"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Payment Method</label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select
            className="input-premium pl-10 appearance-none"
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
          >
            <option value="upi">UPI</option>
            <option value="card">Credit/Debit Card</option>
            <option value="cash">Cash</option>
            <option value="netbanking">Net Banking</option>
          </select>
        </div>
      </div>

      {/* MOOD SELECTOR */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">How are you feeling?</label>
        <div className="flex gap-2">
          {[
            { emoji: '😊', label: 'Happy', value: 'happy' },
            { emoji: '😐', label: 'Normal', value: 'normal' },
            { emoji: '😔', label: 'Stressed', value: 'stressed' },
            { emoji: '😴', label: 'Tired', value: 'tired' },
            { emoji: '🤩', label: 'Excited', value: 'excited' },
          ].map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(mood === m.value ? '' : m.value)}
              className={`flex-1 py-2 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${
                mood === m.value 
                  ? 'border-primary-500 bg-primary-50 scale-105 shadow-sm' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <span className="text-xl mb-0.5">{m.emoji}</span>
              <span className="text-[10px] font-medium text-slate-600">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button 
        type="submit" 
        className="premium-btn w-full py-3 mt-2 flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading ? 'Saving...' : editingExpense ? '💾 Update Expense' : 'Add Expense'}
      </button>
      </form>
    </div>
  );
}