import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Hardcoded default categories
const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Food', icon: '🍔' },
  { id: 2, name: 'Shopping', icon: '️' },
  { id: 3, name: 'Transport', icon: '' },
  { id: 4, name: 'Bills', icon: '📄' },
  { id: 5, name: 'Entertainment', icon: '' },
  { id: 6, name: 'Savings', icon: '💰' },
  { id: 7, name: 'Investments', icon: '' },
];

export default function ExpenseForm({ onAdded }) {
  const [form, setForm] = useState({ 
    category_id: '1', amount: '', description: '', date: new Date().toISOString().slice(0, 10),
    merchant: '', item_name: '', payment_method: 'UPI'
  });
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    try {
      await api.post('/expenses', {
        category_id: parseInt(form.category_id),
        amount: parseFloat(form.amount),
        description: form.description,
        date: form.date,
        merchant: form.merchant || null,
        item_name: form.item_name || null,
        payment_method: form.payment_method || null,
      });
      
      setSuccess('✅ Expense added successfully!');
      setForm({ ...form, amount: '', description: '', merchant: '', item_name: '' });
      onAdded?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add expense. Please check your input.');
    }
  };

  return (
    <form onSubmit={submit} className="glass-card p-6 space-y-4">
      <h3 className="font-bold text-xl text-slate-800">Add Expense</h3>
      
      {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">{error}</div>}
      {success && <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-200">{success}</div>}
      
      <select className="input-premium" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
        {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </select>
      
      <input className="input-premium" type="number" step="0.01" placeholder="Amount (₹)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
      <input className="input-premium" placeholder="Description (e.g. Lunch)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      <input className="input-premium" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />

      {/* Progressive Disclosure Toggle */}
      <button 
        type="button" 
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition"
      >
        {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {showDetails ? 'Hide details' : 'Add more details (Merchant, Item, Payment)'}
      </button>

      {/* Hidden Details Section */}
      {showDetails && (
        <div className="space-y-3 pt-2 border-t border-slate-200 animate-fade-in">
          <input className="input-premium" placeholder="Merchant / Restaurant (e.g. Burger King)" value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} />
          <input className="input-premium" placeholder="Item purchased (e.g. Whopper)" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} />
          <select className="input-premium" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
            <option value="UPI">UPI</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Cash">Cash</option>
            <option value="Net Banking">Net Banking</option>
          </select>
        </div>
      )}
      
      <button type="submit" className="premium-btn w-full py-3">Add Expense</button>
    </form>
  );
}