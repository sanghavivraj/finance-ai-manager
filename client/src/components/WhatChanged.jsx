import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import { RefreshCw, TrendingUp, TrendingDown, Sparkles, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';
import { formatINR } from '../utils/currency.js';

export default function WhatChanged() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadChanges = async () => {
    setLoading(true);
    try {
      const res = await api.get('/what-changed');
      setData(res.data);
    } catch (err) {
      console.error('Error loading changes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChanges();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md">
            <Scale size={18} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">What Changed This Month</h3>
        </div>
        <div className="text-center text-slate-500 py-8">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const spendingChanges = data?.changes?.significantSpendingChanges || [];
  const budgetChanges = data?.changes?.budgetChanges || [];
  const goalChanges = data?.changes?.goalChanges || [];
  const hasAnyChanges = spendingChanges.length > 0 || budgetChanges.length > 0 || goalChanges.length > 0;

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md">
            <Scale size={18} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">What Changed This Month</h3>
            <p className="text-xs text-slate-500">AI velocity & variance tracking</p>
          </div>
        </div>
        <button
          onClick={loadChanges}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          title="Refresh Changes"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {!hasAnyChanges ? (
        <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
          <p className="text-sm font-medium text-emerald-800">
            ✨ Spending is consistent with historical patterns. No anomalous shifts detected.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {spendingChanges.map((sc, i) => {
            const isAsset = sc.isAsset || ['savings', 'investments'].includes((sc.category || '').toLowerCase());
            const isPositive = isAsset ? sc.changePercentage >= 0 : sc.changePercentage <= 0;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isAsset && sc.changePercentage > 0
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-sm">{sc.category}</span>
                    {isAsset && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Asset
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isAsset ? 'Target' : 'Allocated'}: {formatINR(sc.oldAmount)} → {isAsset ? 'Saved' : 'Spent'}: {formatINR(sc.newAmount)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isAsset ? (
                    <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      <ArrowUpRight size={14} /> +{Math.abs(sc.changePercentage).toFixed(0)}% Saved
                    </span>
                  ) : sc.changePercentage > 0 ? (
                    <span className="flex items-center gap-0.5 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                      <ArrowUpRight size={14} /> +{sc.changePercentage.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <ArrowDownRight size={14} /> {sc.changePercentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {budgetChanges.map((bc, i) => (
            <motion.div
              key={`bc-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between"
            >
              <div className="text-sm font-semibold text-amber-900">{bc.category}</div>
              <div className="text-xs font-bold text-amber-700">
                {formatINR(Math.abs(bc.remaining))} over budget
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {data?.explanation && typeof data.explanation === 'string' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary-700 uppercase tracking-wider mb-1">
            <Sparkles size={13} />
            AI Explanation
          </div>
          <p className="text-xs leading-relaxed text-slate-700">{data.explanation}</p>
        </div>
      )}
    </div>
  );
}
