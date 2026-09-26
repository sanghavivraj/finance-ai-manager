import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import {
  Users,
  Utensils,
  Home,
  ShoppingBag,
  Car,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Scale,
  RefreshCw,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';

const iconMap = {
  Utensils,
  Home,
  ShoppingBag,
  Car,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Scale,
};

export default function PeerCheck() {
  const [data, setData] = useState(null);
  const [selectedTierId, setSelectedTierId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBenchmark = async (tierId = null) => {
    setLoading(true);
    setError(null);
    try {
      const url = tierId ? `/peer?tierId=${tierId}` : '/peer';
      const res = await api.get(url);
      setData(res.data);
      if (!selectedTierId && res.data?.activeTier?.id) {
        setSelectedTierId(res.data.activeTier.id);
      }
    } catch (err) {
      console.error('Peer benchmark error:', err);
      setError('Failed to load peer benchmark comparisons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
  }, []);

  const handleTierChange = (tierId) => {
    setSelectedTierId(tierId);
    fetchBenchmark(tierId);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-14 h-14 rounded-full border-4 border-primary-500 border-t-transparent"
        />
        <p className="text-slate-600 font-medium animate-pulse">
          Loading MoSPI/RBI urban peer benchmarks...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center glass-card max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Benchmark Error</h3>
        <p className="text-slate-600 mb-6">{error}</p>
        <button
          onClick={() => fetchBenchmark(selectedTierId)}
          className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const { activeTier, availableTiers, alignmentScore, comparisons, insights, effectiveMonthlyIncome } = data || {};

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 font-bold text-xs tracking-wider uppercase">
            <Users size={16} />
            Lifestyle Benchmark
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Peer Check
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Compare your spending percentages with verified Indian urban household standards (MoSPI / RBI).
          </p>
        </div>

        <button
          onClick={() => fetchBenchmark(selectedTierId)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl transition shadow-sm text-sm self-start sm:self-auto"
        >
          <RefreshCw size={15} className="text-primary-500" />
          Refresh
        </button>
      </div>

      {/* Income Tier Selector */}
      <div className="glass-card p-4 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Income Tier Comparison
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Your Monthly Basis: ~₹{effectiveMonthlyIncome?.toLocaleString()}/mo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {availableTiers?.map((tier) => {
            const isSelected = (selectedTierId || activeTier?.id) === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => handleTierChange(tier.id)}
                className={`p-3.5 rounded-2xl text-left transition border ${
                  isSelected
                    ? 'bg-gradient-to-r from-primary-500 to-accent-600 text-white border-transparent shadow-md font-semibold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <div className="text-xs font-bold tracking-wide opacity-90">{tier.tier_name}</div>
                <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                  ₹{Number(tier.min_income).toLocaleString()} – {Number(tier.max_income) > 1000000 ? 'Above' : `₹${Number(tier.max_income).toLocaleString()}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alignment Score & Macro Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Ring */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-3xl flex items-center gap-5 md:col-span-1"
        >
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-primary-500"
                strokeDasharray={`${alignmentScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-800">{alignmentScore}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Alignment</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 text-sm">Peer Alignment</h4>
            <p className="text-xs text-slate-500 mt-1">
              How closely your lifestyle adheres to standard 50/30/20 urban budget benchmarks.
            </p>
          </div>
        </motion.div>

        {/* Macro Context Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6 rounded-3xl md:col-span-2 flex flex-col justify-center space-y-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-accent-400 uppercase tracking-wider">
            <ShieldCheck size={16} />
            Verified Macroeconomic Benchmark
          </div>
          <h3 className="text-lg font-bold text-white">
            Comparing against {activeTier?.tier_name}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Data calibrated against Indian Urban Consumer Expenditure (MoSPI) and Reserve Bank of India household savings indices. All comparisons are 100% private and computed locally.
          </p>
        </motion.div>
      </div>

      {/* Category Comparisons */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 sm:p-8 rounded-3xl space-y-6"
      >
        <div>
          <h3 className="font-bold text-lg text-slate-800">Category Allocations: You vs Peers</h3>
          <p className="text-xs text-slate-500">
            Compare your actual 90-day expense breakdown with the urban peer baseline.
          </p>
        </div>

        <div className="space-y-6">
          {comparisons?.map((comp, idx) => {
            const CatIcon = iconMap[comp.icon] || Scale;
            const isSavings = comp.category.includes('Savings');
            const isPositiveGood = isSavings ? comp.delta >= 0 : comp.delta <= 0;

            let deltaPillColor = isPositiveGood
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : Math.abs(comp.delta) <= 3
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';

            return (
              <div key={idx} className="space-y-2 p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white shadow-sm text-primary-600 border border-slate-100">
                      <CatIcon size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{comp.category}</span>
                      <div className="text-xs text-slate-500">
                        You: ₹{comp.userAmount?.toLocaleString()}/mo • Peer Target: ₹{comp.benchmarkAmount?.toLocaleString()}/mo
                      </div>
                    </div>
                  </div>

                  <div className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${deltaPillColor}`}>
                    {comp.delta > 0 ? `+${comp.delta}%` : `${comp.delta}%`} vs Peer Avg
                  </div>
                </div>

                {/* Progress Comparison */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>You: <strong className="text-slate-900">{comp.userPct}%</strong></span>
                    <span>Peer Benchmark: <strong className="text-slate-700">{comp.benchmarkPct}%</strong></span>
                  </div>

                  <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                    {/* User bar */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, comp.userPct * 1.5)}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className={`h-full rounded-full ${
                        isSavings
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : comp.delta > 5
                          ? 'bg-gradient-to-r from-rose-500 to-orange-400'
                          : 'bg-gradient-to-r from-primary-500 to-accent-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Actionable Comparative Insights */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles size={18} className="text-primary-500" />
          Comparative Takeaways
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights?.map((item, idx) => {
            const ItemIcon = iconMap[item.icon] || Info;
            return (
              <div
                key={idx}
                className="glass-card p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3"
              >
                <div className="p-2.5 rounded-xl bg-slate-100 text-primary-600 shrink-0 mt-0.5">
                  <ItemIcon size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
