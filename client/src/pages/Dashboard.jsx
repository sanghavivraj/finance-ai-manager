import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Sparkles, Heart } from 'lucide-react';
import { formatINR } from '../utils/currency.js';
import { DonutChart, TrendBar } from '../components/Charts.jsx';
import Drawer from '../components/Drawer.jsx';
import SankeyChart from '../components/SankeyChart.jsx';
import MoneyDNA from '../components/MoneyDNA.jsx';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [health, setHealth] = useState(null);
  const [sankeyData, setSankeyData] = useState(null); // ✅ Added back
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState({ title: '', merchants: [], loading: false });

  const load = async (silent = false) => {
    try {
      const [summaryRes, healthRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/health'),
      ]);
      
      setD(summaryRes.data);
      setHealth(healthRes.data);
      
      // ✅ Prepare Sankey data from ACTUAL SPENDING (LIVE!)
      const income = parseFloat(summaryRes.data.income);
      const spending = summaryRes.data.spending || []; // Use actual spending
      
      const sources = [{ name: 'Income', value: income }];
      const targets = spending.map(s => ({
        name: s.category_name,
        value: parseFloat(s.spent), // Actual amount spent
      }));
      
      const flows = spending.map(s => ({
        source: 'Income',
        target: s.category_name,
        value: parseFloat(s.spent), // Actual flow
      }));
      
      setSankeyData({
        total: income,
        sources,
        targets,
        flows,
      });
      
      if (!silent) setLoading(false);
    } catch (err) {
      console.error(err);
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { 
    load(false); 

    // 1. Background Polling Interval (every 4 seconds)
    const interval = setInterval(() => {
      load(true);
    }, 4000);

    // 2. Window Focus Re-fetch (instant refresh when returning from Telegram/other apps)
    const handleFocus = () => {
      load(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleSliceClick = async (category) => {
    if (!category || !category.id) return;
    
    setDrawerData({ title: category.name, merchants: [], loading: true });
    setDrawerOpen(true);

    try {
      const res = await api.get(`/expenses/by-category/${category.id}`);
      setDrawerData({ title: category.name, merchants: res.data, loading: false });
    } catch (err) {
      setDrawerData({ title: category.name, merchants: [], loading: false });
    }
  };

  if (loading || !d) return <div className="p-8 text-center text-xl font-semibold text-slate-500">Loading your financial data...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-slate-500 mt-2">Your financial overview for this month</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-100 to-accent-100 rounded-2xl">
          <Sparkles className="text-primary-600" size={20} />
          <span className="font-semibold text-primary-700">AI Active</span>
        </div>
      </div>

      {/* Row 1: Balanced Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg">
              <TrendingDown size={24} />
            </div>
            <div>
              <div className="text-sm text-slate-500">Total Expenses</div>
              <div className="text-2xl font-bold text-slate-800">{formatINR(d.totalSpent)}</div>
              <div className="text-xs text-red-500 font-medium">{(d.budgetUsage || 0).toFixed(0)}% of budget used</div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg">
              <PiggyBank size={24} />
            </div>
            <div>
              <div className="text-sm text-slate-500">Budget Used</div>
              <div className="text-2xl font-bold text-slate-800">{(d.budgetUsage || 0).toFixed(0)}%</div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, d.budgetUsage || 0)}%` }} className="h-2 rounded-full bg-amber-500" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-600 text-white shadow-lg">
              <Heart size={24} />
            </div>
            <div>
              <div className="text-sm text-slate-500">Financial Health</div>
              <div className="text-2xl font-bold text-slate-800">{health?.score || 0}/100</div>
              <div className="text-xs text-primary-600 font-medium">{health?.status || 'Calculating...'}</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ✅ Row 2: Simple Sankey Chart (The working one you want!) */}
      {sankeyData && (
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Money Flow</h3>
          <SankeyChart 
            data={sankeyData} 
            onCategoryClick={(category) => {
              const budget = d.budgets.find(b => (b.category_name || b.name) === category.name);
              if (budget) handleSliceClick({ id: budget.category_id, name: category.name });
            }}
          />
        </div>
      )}

      {/* Row 3: AI Insights & Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Budget Breakdown</h3>
          <DonutChart 
            data={d.budgets.map(b => ({ id: b.category_id, name: b.category_name || b.name, value: parseFloat(b.amount) }))}
            onSliceClick={handleSliceClick}
          />
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl">
              <Sparkles className="text-white" size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">AI Insights</h3>
          </div>
          {d.suggestions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Looking good — no suggestions right now.</p>
          ) : (
            <div className="space-y-3">
              {d.suggestions.map((s, i) => (
                <div key={i} className={`p-4 rounded-2xl border-l-4 ${s.type === 'critical' ? 'bg-red-50 border-red-500' : s.type === 'warning' ? 'bg-amber-50 border-amber-500' : 'bg-primary-50 border-primary-500'}`}>
                  <div className="font-bold text-slate-800 mb-1">{s.title}</div>
                  <div className="text-sm text-slate-600">{s.body}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerData.title} subtitle="Spending breakdown by merchant" loading={drawerData.loading}>
        {drawerData.merchants.length === 0 && !drawerData.loading ? (
          <div className="text-center text-slate-500 py-12">No merchant details found.</div>
        ) : (
          <div className="space-y-4">
            {drawerData.merchants.map((m, i) => (
              <motion.div key={i} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="font-bold text-slate-800">{m.merchant}</div>
                  <div className="text-xs text-slate-500">{m.transaction_count} transactions</div>
                </div>
                <div className="text-lg font-bold text-primary-600">{formatINR(m.total)}</div>
              </motion.div>
            ))}
          </div>
        )}
      </Drawer>
    </motion.div>
  );
}