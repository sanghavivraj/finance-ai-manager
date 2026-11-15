import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import { Sparkles, ArrowUpRight, CheckCircle, RefreshCw } from 'lucide-react';
import { formatINR } from '../utils/currency.js';

export default function ProactiveInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const response = await api.get('/proactive-insights');
      setInsights(response.data);
    } catch (err) {
      console.error('Error loading insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md">
            <Sparkles size={18} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Proactive Insights</h3>
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

  const budgetAlerts = insights?.insights?.budgetAlerts || [];
  const spendingAlerts = insights?.insights?.spendingAlerts || [];
  const goalAlerts = insights?.insights?.goalAlerts || [];
  const hasAlerts = budgetAlerts.length > 0 || spendingAlerts.length > 0 || goalAlerts.length > 0;

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Proactive Insights</h3>
            <p className="text-xs text-slate-500">Autonomous budget & anomaly monitoring</p>
          </div>
        </div>
        <button
          onClick={loadInsights}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          title="Refresh Insights"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {!hasAlerts ? (
        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <CheckCircle size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-900">Spending is Healthy</div>
            <div className="text-xs text-emerald-700">All active budgets and goals are within healthy thresholds.</div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {budgetAlerts.map((alert, index) => (
            <motion.div
              key={`b-${index}`}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-slate-800 text-sm">{alert.category}</div>
                <div className="text-xs text-rose-600 font-medium">Budget exceeded threshold</div>
              </div>
              <div className="font-bold text-xs text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                {formatINR(Math.abs(alert.remaining))} over
              </div>
            </motion.div>
          ))}

          {spendingAlerts.map((alert, index) => (
            <motion.div
              key={`s-${index}`}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-slate-800 text-sm">{alert.category}</div>
                <div className="text-xs text-amber-700 font-medium">Spending rate accelerated</div>
              </div>
              <div className="flex items-center gap-1 font-bold text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                <ArrowUpRight size={13} />
                +{alert.changePercentage.toFixed(0)}%
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {insights?.explanation && typeof insights.explanation === 'string' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary-700 uppercase tracking-wider mb-1">
            <Sparkles size={13} />
            AI Assessment
          </div>
          <p className="text-xs leading-relaxed text-slate-700">{insights.explanation}</p>
        </div>
      )}
    </div>
  );
}