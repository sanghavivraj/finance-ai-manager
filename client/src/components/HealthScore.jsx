import { motion } from 'framer-motion';

export default function HealthScore({ score, breakdown }) {
  const getColor = (score) => {
    if (score >= 80) return { color: '#10b981', label: 'Excellent' };
    if (score >= 60) return { color: '#8b5cf6', label: 'Good' };
    if (score >= 40) return { color: '#f59e0b', label: 'Fair' };
    return { color: '#ef4444', label: 'Needs Work' };
  };

  const { color, label } = getColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="glass-card p-6 flex flex-col items-center"
    >
      <h3 className="text-lg font-bold text-slate-800 mb-4">Financial Health</h3>
      
      {/* Circular Score */}
      <div className="relative w-32 h-32 mb-4">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="#e2e8f0"
            strokeWidth="8"
            fill="none"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="45"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-800">{score}</span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>

      <div className="text-sm font-semibold mb-3" style={{ color }}>
        {label}
      </div>

      {/* Breakdown */}
      <div className="w-full space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-600">Savings Rate</span>
          <span className="font-semibold text-slate-800">{breakdown.savings}/40</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Budget Adherence</span>
          <span className="font-semibold text-slate-800">{breakdown.adherence}/40</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Spending Discipline</span>
          <span className="font-semibold text-slate-800">{breakdown.discipline}/20</span>
        </div>
      </div>
    </motion.div>
  );
}