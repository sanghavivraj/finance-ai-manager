import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import {
  Dna,
  ShieldCheck,
  Zap,
  Sparkles,
  Scale,
  AlertTriangle,
  Clock,
  PiggyBank,
  BrainCircuit,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const iconMap = {
  ShieldCheck,
  Zap,
  Sparkles,
  Scale,
  AlertTriangle,
  Clock,
  PiggyBank,
};

export default function FinancialDNA() {
  const [dnaData, setDnaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDNA = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/dna');
      setDnaData(data);
    } catch (err) {
      console.error('Error fetching DNA:', err);
      setError('Failed to calculate your spending habits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDNA();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-14 h-14 rounded-full border-4 border-primary-500 border-t-transparent"
        />
        <p className="text-slate-600 font-medium animate-pulse">
          Analyzing your money habits...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center glass-card max-w-lg mx-auto my-12">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Analysis Error</h3>
        <p className="text-slate-600 mb-6">{error}</p>
        <button
          onClick={fetchDNA}
          className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!dnaData?.hasData) {
    return (
      <div className="p-10 glass-card max-w-xl mx-auto my-12 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-accent-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl">
          <BrainCircuit size={40} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-3">
          Discover Your Money Habits
        </h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          {dnaData?.message ||
            'We need a few expense entries to understand your spending style.'}
        </p>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-sm text-slate-600 mb-6 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500" />
            <span>Log expenses via Web or Telegram Bot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-500" />
            <span>Voice notes, receipt photos, and quick text messages work instantly</span>
          </div>
        </div>
      </div>
    );
  }

  const { archetype, metrics, radarScores, recommendations, coolingOffAlert } = dnaData;
  const ArchetypeIcon = iconMap[archetype.icon] || BrainCircuit;

  // Calculate Overall Financial Health Score (out of 100)
  const scoresArray = radarScores?.map((s) => s.score) || [70];
  const overallScore = Math.round(
    scoresArray.reduce((acc, curr) => acc + curr, 0) / scoresArray.length
  );

  // Extract 3 Plain-English Dimension Scores
  const savingsDisciplineScore =
    radarScores?.find((s) => s.subject === 'Savings Rate')?.score ??
    radarScores?.find((s) => s.subject === 'Budget Discipline')?.score ??
    75;

  const weekendControlScore = Math.min(
    100,
    Math.max(0, Math.round(100 - (metrics?.weekendRatio || 0) * 1.5))
  );

  const impulseResistanceScore =
    radarScores?.find((s) => s.subject === 'Impulse Resistance')?.score ?? 80;

  const dimensionBars = [
    { label: 'Savings Discipline', score: savingsDisciplineScore },
    { label: 'Weekend Control', score: weekendControlScore },
    { label: 'Impulse Resistance', score: impulseResistanceScore },
  ];

  // Helper for color coding (Green for good, Amber for fair, Red for alert)
  const getScoreColor = (val) => {
    if (val >= 70) return { bg: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (val >= 45) return { bg: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { bg: 'bg-rose-500', text: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  // Limit to Top 2 or 3 recommendations
  const topRecommendations = (recommendations || []).slice(0, 3);

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 font-bold text-xs tracking-wider uppercase">
            <Dna size={16} />
            Your Spending Style
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Financial DNA
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            A simple overview of your money habits and smart tips to save more.
          </p>
        </div>
        <button
          onClick={fetchDNA}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl transition shadow-sm text-sm self-start sm:self-auto"
        >
          <RefreshCw size={15} className="text-primary-500" />
          Refresh Analysis
        </button>
      </div>

      {/* 1. Simplified Hero Persona Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800"
      >
        <div className="absolute -right-12 -top-12 w-56 h-56 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-56 h-56 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Persona Title & Description */}
          <div className="space-y-3 max-w-xl">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide text-white bg-gradient-to-r ${archetype.badgeColor} shadow-sm uppercase`}>
              <Sparkles size={14} />
              {archetype.badgeText || 'Spending Persona'}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-primary-400 shrink-0">
                <ArchetypeIcon size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {archetype.title}
                </h2>
                <p className="text-slate-400 text-xs">{archetype.keyTrait}</p>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed">
              {archetype.description}
            </p>
          </div>

          {/* 2 Essential Stats Only */}
          <div className="grid grid-cols-2 gap-3 md:w-72 shrink-0">
            <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/60 backdrop-blur text-center">
              <div className="text-xs text-slate-400 font-medium">Weekend Spend %</div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {metrics?.weekendRatio ?? 0}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/60 backdrop-blur text-center">
              <div className="text-xs text-slate-400 font-medium">Savings Rate</div>
              <div className={`text-2xl font-black mt-1 ${(metrics?.savingsRate ?? 0) >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {metrics?.savingsRate ?? 0}%
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Cooling-Off Alert Warning (If active) */}
      {coolingOffAlert && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={22} className="text-rose-600 shrink-0" />
            <div>
              <span className="font-bold text-rose-900 text-sm">Cooling-Off Advice</span>
              <p className="text-rose-700 text-xs mt-0.5">
                Wait 24 hours before making impulse purchases over ₹{coolingOffAlert.threshold?.toLocaleString()}.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. Consolidated Single Financial Health Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 sm:p-8 rounded-3xl"
      >
        <div className="mb-6">
          <h3 className="font-bold text-lg text-slate-800">Financial Health Score</h3>
          <p className="text-xs text-slate-500">Overall score based on your savings, control, and spending habits</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Circular SVG Ring Score */}
          <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={getScoreColor(overallScore).text}
                strokeDasharray={`${overallScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-slate-800">{overallScore}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Out of 100</span>
            </div>
          </div>

          {/* 3 Plain-English Color-Coded Progress Bars */}
          <div className="w-full space-y-4">
            {dimensionBars.map((item, idx) => {
              const colorInfo = getScoreColor(item.score);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-700 font-bold">{item.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colorInfo.badge}`}>
                      {item.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className={`h-full rounded-full ${colorInfo.bg}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* 4. Simplified Concise Recommendations (Top 2-3) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles size={18} className="text-primary-500" />
          Smart Actionable Tips
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topRecommendations.map((rec, idx) => {
            const RecIcon = iconMap[rec.icon] || CheckCircle2;
            return (
              <div
                key={idx}
                className="glass-card p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3"
              >
                <div className={`p-2.5 rounded-xl bg-slate-100 ${rec.color || 'text-primary-600'} shrink-0`}>
                  <RecIcon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-sm">{rec.title}</div>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{rec.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
