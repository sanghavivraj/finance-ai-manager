import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api.js';
import { TrendingDown, PiggyBank, Sparkles, Heart, MessageSquare, AlertCircle, Scale, Target, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../utils/currency.js';
import { DonutChart } from '../components/Charts.jsx';
import Drawer from '../components/Drawer.jsx';
import SankeyChart from '../components/SankeyChart.jsx';
import ProactiveInsights from '../components/ProactiveInsights.jsx';
import WhatChanged from '../components/WhatChanged.jsx';
import GoalIntelligence from '../components/GoalIntelligence.jsx';
import AskYourMoney from '../components/AskYourMoney.jsx';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [health, setHealth] = useState(null);
  const [sankeyData, setSankeyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState({ title: '', merchants: [], loading: false });
  const [askAIOpen, setAskAIOpen] = useState(false);
  const [activeAITab, setActiveAITab] = useState('insights'); // 'insights' | 'changed' | 'goals'

  const load = async (silent = false) => {
    try {
      const [summaryRes, healthRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/health'),
      ]);
      
      setD(summaryRes.data);
      setHealth(healthRes.data);
      
      const income = parseFloat(summaryRes.data.income || 0);
      const spending = summaryRes.data.spending || [];
      
      const sources = [{ name: 'Income', value: income }];
      const targets = spending.map(s => ({
        name: s.category_name,
        value: parseFloat(s.spent || 0),
      }));
      
      const flows = spending.map(s => ({
        source: 'Income',
        target: s.category_name,
        value: parseFloat(s.spent || 0),
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

    const interval = setInterval(() => {
      load(true);
    }, 4000);

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

  if (loading || !d) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-14 h-14 rounded-full border-4 border-primary-500 border-t-transparent"
        />
        <p className="text-slate-600 font-medium animate-pulse">Loading financial intelligence...</p>
      </div>
    );
  }

  // Calculate actual savings and living expenses
  const totalLivingSpent = parseFloat(d.totalSpent || 0);
  const totalIncome = parseFloat(d.income || 0);
  
  // Calculate total savings from spending data (Savings & Investments)
  const savingsCategory = (d.spending || []).filter(s => 
    ['savings', 'investments'].includes((s.category_name || '').toLowerCase())
  );
  const totalSaved = savingsCategory.reduce((sum, s) => sum + parseFloat(s.spent || 0), 0);
  const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-700 to-accent-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time overview of your income, expenses & savings velocity</p>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setAskAIOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold rounded-2xl shadow-md hover:shadow-primary-500/20 transition cursor-pointer text-sm"
          >
            <MessageSquare size={16} />
            <span>Ask Your Money</span>
          </motion.button>

          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200/50 rounded-2xl">
            <Sparkles className="text-primary-600" size={16} />
            <span className="font-bold text-primary-700 text-xs">AI Active</span>
          </div>
        </div>
      </div>

      {/* Row 1: 3 Balanced Stat Cards (Living Expenses, Savings Wealth in Green, Health Score) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Living Expenses */}
        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="glass-card p-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md">
              <TrendingDown size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Living Expenses</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{formatINR(totalLivingSpent)}</div>
              <div className="text-xs text-slate-600 font-medium mt-0.5">
                <span className="text-slate-900 font-bold">{(d.budgetUsage || 0).toFixed(0)}%</span> of ceiling used
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Total Savings & Assets (CELEBRATED IN EMERALD GREEN!) */}
        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-5 border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <PiggyBank size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Vault & Savings</div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-0.5">{formatINR(totalSaved)}</div>
              <div className="text-xs text-emerald-800 font-semibold mt-0.5 flex items-center gap-1">
                <span>{savingsRate.toFixed(0)}% Savings Rate</span>
                <span>• Active Wealth</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Financial Health */}
        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="glass-card p-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-md">
              <Heart size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financial Health</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{health?.score || 0}/100</div>
              <div className="text-xs font-semibold text-primary-700 mt-0.5">
                {health?.score > 70 ? '🌟 Excellent Standing' : health?.score > 40 ? '⚖️ Balanced Condition' : '📈 Room to Optimize'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 2: Money Flow Sankey (Hero Flow Visualizer) */}
      {sankeyData && (
        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">Monthly Money Flow</h3>
              <p className="text-xs text-slate-500">Live flow from income to assets and itemized expenses</p>
            </div>
          </div>
          <SankeyChart 
            data={sankeyData} 
            onCategoryClick={(category) => {
              const budget = d.budgets?.find(b => (b.category_name || b.name) === category.name);
              if (budget) handleSliceClick({ id: budget.category_id, name: category.name });
            }}
          />
        </div>
      )}

      {/* Row 3: Clean 2-Column Layout (Left: Budget Breakdown, Right: Tabbed AI Intelligence Hub) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 Cols): Budget Breakdown Donut */}
        <div className="lg:col-span-5 glass-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Budget Allocation</h3>
            <span className="text-xs text-slate-400 font-medium">Click slice to inspect</span>
          </div>

          <DonutChart 
            data={(d.budgets || []).map(b => ({ 
              id: b.category_id, 
              name: b.category_name || b.name, 
              value: parseFloat(b.amount || 0) 
            }))}
            onSliceClick={handleSliceClick}
          />
        </div>

        {/* Right Column (7 Cols): Modern Streamlined AI Intelligence Hub with Tabs */}
        <div className="lg:col-span-7 glass-card p-5 sm:p-6 space-y-4">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Sparkles size={18} className="text-primary-600" />
              <h3 className="text-lg font-bold text-slate-800">AI Intelligence Hub</h3>
            </div>

            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl">
              <button
                onClick={() => setActiveAITab('insights')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeAITab === 'insights'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Insights & Alerts
              </button>
              <button
                onClick={() => setActiveAITab('changed')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeAITab === 'changed'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                What Changed
              </button>
              <button
                onClick={() => setActiveAITab('goals')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeAITab === 'goals'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Goal Pacing
              </button>
            </div>
          </div>

          {/* Active Tab Content (Clean & Lightweight) */}
          <AnimatePresence mode="wait">
            {activeAITab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <ProactiveInsights />
              </motion.div>
            )}

            {activeAITab === 'changed' && (
              <motion.div
                key="changed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <WhatChanged />
              </motion.div>
            )}

            {activeAITab === 'goals' && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <GoalIntelligence />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Action Button (FAB) for AI Copilot */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setAskAIOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-600 via-accent-600 to-primary-600 text-white font-bold text-sm rounded-full shadow-xl hover:shadow-primary-500/30 border border-white/20 cursor-pointer"
      >
        <Sparkles size={18} className="animate-pulse" />
        <span>Ask AI Copilot</span>
      </motion.button>

      {/* Ask Your Money Modal */}
      <AskYourMoney isOpen={askAIOpen} onClose={() => setAskAIOpen(false)} />

      {/* Merchant Drilldown Drawer */}
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