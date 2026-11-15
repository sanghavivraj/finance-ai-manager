import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import { Target, PiggyBank, Calendar, TrendingUp, TrendingDown, ArrowUpRight, Sparkles, RefreshCw } from 'lucide-react';
import { formatINR } from '../utils/currency.js';

export default function GoalIntelligence() {
  const [goalAnalysis, setGoalAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadGoalAnalysis = async () => {
    setLoading(true);
    try {
      const response = await api.get('/goal-intelligence');
      setGoalAnalysis(response.data);
    } catch (err) {
      console.error('Error loading goal analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoalAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md">
            <Target size={18} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Goal Intelligence</h3>
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

  const goals = goalAnalysis?.goalAnalysis || [];

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md">
            <Target size={18} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Goal Intelligence</h3>
            <p className="text-xs text-slate-500">Pacing & monthly saving targets</p>
          </div>
        </div>
        <button
          onClick={loadGoalAnalysis}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          title="Refresh Analysis"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center">
          <p className="text-sm text-slate-500">No active goals created yet. Set a goal in Savings Vault!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, index) => (
            <motion.div
              key={goal.id || index}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-2xl border-l-4 ${
                goal.status === 'onTrack' || goal.status === 'ahead'
                  ? 'bg-emerald-50/60 border-emerald-500'
                  : goal.status === 'behind'
                  ? 'bg-rose-50/60 border-rose-500'
                  : 'bg-amber-50/60 border-amber-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-slate-800 text-sm">
                  {goal.name}
                </div>
                <div
                  className={`flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${
                    goal.status === 'onTrack' || goal.status === 'ahead'
                      ? 'text-emerald-700 bg-emerald-100'
                      : 'text-rose-700 bg-rose-100'
                  }`}
                >
                  {goal.status === 'onTrack' || goal.status === 'ahead' ? (
                    <TrendingUp size={13} />
                  ) : (
                    <TrendingDown size={13} />
                  )}
                  <span>{goal.progress.toFixed(0)}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 mb-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, goal.progress)}%` }}
                  className={`h-1.5 rounded-full ${
                    goal.status === 'onTrack' || goal.status === 'ahead'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {formatINR(goal.currentAmount)} / {formatINR(goal.targetAmount)}
                </span>
                <span className="font-semibold text-slate-700">
                  Save {formatINR(goal.monthlyContribution)}/mo ({goal.monthsRemaining}m left)
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {goalAnalysis?.explanation && typeof goalAnalysis.explanation === 'string' && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            <Sparkles size={13} className="text-primary-600" />
            AI Trajectory Insight
          </div>
          <p className="text-xs leading-relaxed text-slate-600">{goalAnalysis.explanation}</p>
        </div>
      )}
    </div>
  );
}