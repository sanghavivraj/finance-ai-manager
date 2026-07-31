import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Sparkles } from 'lucide-react';
import { formatINR } from '../utils/currency.js';
import { DonutChart, TrendBar } from '../components/Charts.jsx';
import Drawer from '../components/Drawer.jsx';
import HealthScore from '../components/HealthScore.jsx';
import SankeyChart from '../components/SankeyChart.jsx';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [health, setHealth] = useState(null);
  const [sankeyData, setSankeyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState({ title: '', merchants: [], loading: false });

  const load = async () => {
    try {
      const [summaryRes, healthRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/health'),
      ]);
      
      setD(summaryRes.data);
      setHealth(healthRes.data);
      
      // Prepare Sankey data
      const income = parseFloat(summaryRes.data.income);
      const budgets = summaryRes.data.budgets || [];
      
      const sources = [{ name: 'Income', value: income }];
      const targets = budgets.map(b => ({
        name: b.category_name || b.name,
        value: parseFloat(b.amount),
      }));
      
      const flows = budgets.map(b => ({
        source: 'Income',
        target: b.category_name || b.name,
        value: parseFloat(b.amount),
      }));
      
      setSankeyData({
        total: income,
        sources,
        targets,
        flows,
      });
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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

  if (loading) return <div className="p-8 text-center">Loading...</div>;

    const stats = [
        { 
        label: 'Income', 
        value: d.income, 
        icon: TrendingUp, 
        color: 'from-emerald-400 to-emerald-600',
        footer: 'Monthly Salary',
        footerColor: 'text-slate-500'
        },
        { 
        label: 'Expenses', 
        value: d.totalSpent, 
        icon: TrendingDown, 
        color: 'from-red-400 to-red-600',
        footer: `${d.budgetUsage.toFixed(0)}% of budget used`,
        footerColor: 'text-red-500'
        },
        { 
        label: 'Remaining', 
        value: d.remaining, 
        icon: Wallet, 
        color: 'from-primary-400 to-primary-600',
        footer: 'Safe to spend',
        footerColor: 'text-emerald-600'
        },
        { 
        label: 'Budget Used', 
        value: `${d.budgetUsage.toFixed(0)}%`, 
        icon: PiggyBank, 
        color: 'from-amber-400 to-amber-600',
        isProgress: true, // Flag to show progress bar
        progressValue: d.budgetUsage
        },
    ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-8">
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

           {/* Stats Grid + Health Score - FIXED EMPTY SPACE */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Income', value: d.income, icon: TrendingUp, color: 'from-emerald-400 to-emerald-600', footer: 'Monthly Salary', footerColor: 'text-slate-500' },
          { label: 'Expenses', value: d.totalSpent, icon: TrendingDown, color: 'from-red-400 to-red-600', footer: `${(d.budgetUsage || 0).toFixed(0)}% of budget used`, footerColor: 'text-red-500' },
          { label: 'Remaining', value: d.remaining, icon: Wallet, color: 'from-primary-400 to-primary-600', footer: 'Safe to spend', footerColor: 'text-emerald-600' },
          { label: 'Budget Used', value: `${(d.budgetUsage || 0).toFixed(0)}%`, icon: PiggyBank, color: 'from-amber-400 to-amber-600', isProgress: true, progressValue: d.budgetUsage || 0 },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5 flex flex-col justify-between h-48"
          >
            {/* TOP PART: Icon and Big Number */}
            <div>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} text-white shadow-lg inline-block mb-3`}>
                <s.icon size={20} />
              </div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                {s.label === 'Budget Used' ? s.value : formatINR(s.value)}
              </div>
            </div>
            
            {/* BOTTOM PART: Fills the empty space */}
            <div className="mt-auto pt-4 border-t border-slate-100">
              {s.isProgress ? (
                // Progress Bar for "Budget Used"
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${s.progressValue}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-2 rounded-full bg-gradient-to-r ${s.color}`} 
                  />
                </div>
              ) : (
                // Text Footer for other cards
                <div className={`text-xs font-semibold ${s.footerColor} flex items-center gap-1`}>
                  {s.footer}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {/* Health Score Card */}
        {health && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.4 }}
            className="glass-card p-4 flex flex-col justify-between h-48"
          >
            <h3 className="text-sm font-bold text-slate-800">Financial Health</h3>
            <div className="relative w-20 h-20 mx-auto my-2">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="35" stroke="#e2e8f0" strokeWidth="6" fill="none" />
                <motion.circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke={health.score >= 60 ? '#10b981' : health.score >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 35}
                  initial={{ strokeDashoffset: 2 * Math.PI * 35 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 35 - (health.score / 100) * 2 * Math.PI * 35 }}
                  transition={{ duration: 1 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-800">{health.score}</span>
              </div>
            </div>
            <div className="text-center text-xs font-semibold text-slate-600">
              {health.score >= 80 ? 'Excellent' : health.score >= 60 ? 'Good' : health.score >= 40 ? 'Fair' : 'Needs Work'}
            </div>
          </motion.div>
        )}
      </div>

      {/* Sankey Diagram */}
     {sankeyData && (
        <SankeyChart 
            data={sankeyData} 
            onCategoryClick={(category) => {
            // Find the category ID from budgets
            const budget = d.budgets.find(b => 
                (b.category_name || b.name) === category.name
            );
            if (budget) {
                handleSliceClick({
                id: budget.category_id,
                name: category.name,
                });
            }
            }}
        />
        )}

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Budget Breakdown</h3>
          <p className="text-sm text-slate-500 mb-4">Click a slice to see merchant details</p>
          <DonutChart 
            data={d.budgets.map(b => ({
              id: b.category_id,
              name: b.category_name || b.name || 'Category',
              value: parseFloat(b.amount),
            }))}
            onSliceClick={handleSliceClick}
          />
        </motion.div>

        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">6-Month Spending Trend</h3>
          <TrendBar data={d.trend.map(t => ({ ...t, total: parseFloat(t.total) }))} />
        </motion.div>
      </div>

      {/* AI Insights */}
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
              <div key={i} className={`p-4 rounded-2xl border-l-4 ${
                s.type === 'critical' ? 'bg-red-50 border-red-500' :
                s.type === 'warning' ? 'bg-amber-50 border-amber-500' : 'bg-primary-50 border-primary-500'
              }`}>
                <div className="font-bold text-slate-800 mb-1">{s.title}</div>
                <div className="text-sm text-slate-600 mb-2">{s.body}</div>
                {s.solution && (
                  <div className="bg-white/80 p-3 rounded-xl border border-slate-200 flex items-start gap-3">
                    <Sparkles className="text-emerald-600 mt-0.5" size={16} />
                    <div className="text-sm font-medium text-slate-800">{s.solution}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <Drawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        title={drawerData.title}
        subtitle="Spending breakdown by merchant"
        loading={drawerData.loading}
      >
        {drawerData.merchants.length === 0 && !drawerData.loading ? (
          <div className="text-center text-slate-500 py-12">No merchant details found for this category.</div>
        ) : (
          <div className="space-y-4">
            {drawerData.merchants.map((m, i) => (
              <motion.div 
                key={i}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition border border-slate-100"
              >
                <div>
                  <div className="font-bold text-slate-800">{m.merchant}</div>
                  <div className="text-xs text-slate-500">{m.transaction_count} transactions • Last: {new Date(m.last_date).toLocaleDateString()}</div>
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