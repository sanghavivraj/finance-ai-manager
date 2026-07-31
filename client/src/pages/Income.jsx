import { useEffect, useState } from 'react';
import api from '../services/api.js';
import IncomeForm from '../components/IncomeForm.jsx';
import toast from 'react-hot-toast';

export default function Income() {
  const [list, setList] = useState([]);
  const load = () => api.get('/income').then(r => setList(r.data));
  useEffect(() => { load(); }, []);
  const del = async id => {
    if (!confirm('Delete?')) return;
    await api.delete(`/income/${id}`);
    toast.success('Deleted'); load();
  };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Income</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1"><IncomeForm onAdded={load} /></div>
        <div className="lg:col-span-2 space-y-2">
          {list.length === 0 && <div className="card text-slate-500">No income entries yet.</div>}
          {list.map(i => (
            <div key={i.id} className="card flex items-center justify-between">
              <div>
                <div className="font-medium">{i.source} {i.is_salary && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full ml-2">Salary</span>}</div>
                <div className="text-xs text-slate-500">{new Date(i.date).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-bold text-emerald-600">+${parseFloat(i.amount).toFixed(2)}</div>
                <button onClick={() => del(i.id)} className="btn-ghost text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}