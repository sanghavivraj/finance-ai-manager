import { useState } from 'react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function IncomeForm({ onAdded }) {
  const [form, setForm] = useState({ source: '', amount: '', is_salary: false, date: new Date().toISOString().slice(0, 10) });
  const submit = async e => {
    e.preventDefault();
    await api.post('/income', { ...form, amount: parseFloat(form.amount) });
    toast.success('Income added');
    setForm({ source: '', amount: '', is_salary: false, date: form.date });
    onAdded?.();
  };
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h3 className="font-semibold">Add Income</h3>
      <input className="input" placeholder="Source (e.g. Salary, Freelance)" value={form.source}
        onChange={e => setForm({ ...form, source: e.target.value })} required />
      <input className="input" type="number" step="0.01" placeholder="Amount" value={form.amount}
        onChange={e => setForm({ ...form, amount: e.target.value })} required />
      <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_salary} onChange={e => setForm({ ...form, is_salary: e.target.checked })} />
        Set as monthly salary (updates income baseline)
      </label>
      <button className="btn-primary w-full">Add Income</button>
    </form>
  );
}