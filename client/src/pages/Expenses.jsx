import { useEffect, useState } from 'react';
import api from '../services/api.js';
import ExpenseForm from '../components/ExpenseForm.jsx';
import toast from 'react-hot-toast';

export default function Expenses() {
  const [list, setList] = useState([]);
  const load = () => api.get('/expenses').then(r => setList(r.data));
  useEffect(() => { load(); }, []);
  const del = async id => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    toast.success('Deleted');
    load();
  };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Expenses</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ExpenseForm onAdded={load} />
        </div>
        <div className="lg:col-span-2 space-y-2">
          {list.length === 0 && <div className="card text-slate-500">No expenses yet.</div>}
          {list.map(e => (
            <div key={e.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{e.icon}</div>
                <div>
                  <div className="font-medium">{e.description || e.category_name}</div>
                  <div className="text-xs text-slate-500">{e.category_name} • {new Date(e.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-bold text-red-600">-${parseFloat(e.amount).toFixed(2)}</div>
                <button onClick={() => del(e.id)} className="btn-ghost text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}