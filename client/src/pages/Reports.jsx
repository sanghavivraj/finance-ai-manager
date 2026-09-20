import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import { DonutChart } from '../components/Charts.jsx';
import { formatINR } from '../utils/currency.js';

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/report', { params: { month, year } });
      // ✅ SAFELY ENSURE IT'S AN ARRAY
      const data = Array.isArray(res.data) ? res.data : (res.data.rows || []);
      setRows(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { load(); }, [month, year]);

  // ✅ SAFE REDUCE WITH DEFAULT ARRAY
  const total = (rows || []).reduce((s, r) => s + parseFloat(r.total || 0), 0);
  const totalBudget = (rows || []).reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0);

  if (loading) return <div className="p-8 text-center text-xl font-semibold text-slate-500">Loading report...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6 p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Monthly Report</h1>
          <p className="text-slate-500 mt-2">Detailed breakdown of your spending</p>
        </div>
        <div className="flex gap-2">
          <select className="input-premium w-40" value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString('en', { month: 'long' })}
              </option>
            ))}
          </select>
          <input className="input-premium w-28" type="number" value={year} onChange={e => setYear(+e.target.value)} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Spent</div>
          <div className="text-3xl font-bold text-slate-800 mt-1">{formatINR(total)}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Budgeted</div>
          <div className="text-3xl font-bold text-slate-800 mt-1">{formatINR(totalBudget)}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Variance</div>
          <div className={`text-3xl font-bold mt-1 ${totalBudget - total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatINR(totalBudget - total)}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Spending by Category</h3>
          <DonutChart 
            data={(rows || []).filter(r => parseFloat(r.total) > 0).map(r => ({ 
              name: r.name, 
              value: parseFloat(r.total) 
            }))} 
          />
        </div>

        <div className="glass-card overflow-x-auto p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Category Details</h3>
          {(rows || []).length === 0 ? (
            <div className="text-center py-12 text-slate-500">No data available for this month.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 font-medium">Category</th>
                  <th className="py-3 font-medium">Budgeted</th>
                  <th className="py-3 font-medium">Spent</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(rows || []).map(r => {
                  const b = parseFloat(r.budgeted) || 0;
                  const s = parseFloat(r.total || 0);
                  return (
                    <tr key={r.name} className="border-b border-slate-100 last:border-0">
                      <td className="py-4 font-medium text-slate-800">{r.icon} {r.name}</td>
                      <td className="py-4 text-slate-600">{formatINR(b)}</td>
                      <td className="py-4 text-slate-800 font-semibold">{formatINR(s)}</td>
                      <td className="py-4">
                        {s > b ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Over</span>
                        ) : s > b * 0.8 ? (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Near</span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}