import { motion } from 'framer-motion';
import { formatINR } from '../utils/currency.js';
import { Edit3, TrendingUp, TrendingDown } from 'lucide-react';
import BulletChart from './BulletChart.jsx';

export default function BudgetCard({ name, icon, budget, spent, onEdit }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over = spent > budget;
  const remaining = budget - spent;
  
  const bgColor = over ? 'bg-red-50 border-red-200' : pct > 80 ? 'bg-amber-50 border-amber-200' : 'bg-white/70 border-white/20';

  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ duration: 0.2 }} className={`glass-card ${bgColor} p-6 border-2 relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{icon}</div>
          <div>
            <div className="font-bold text-lg text-slate-800">{name}</div>
            <div className="text-xs text-slate-500">{spent > 0 && budget > 0 ? `${pct.toFixed(0)}% used` : 'No spending yet'}</div>
          </div>
        </div>
        <button onClick={onEdit} className="p-2 rounded-xl hover:bg-white/50 transition" title="Edit budget">
          <Edit3 size={16} className="text-slate-500" />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-800">{formatINR(spent)}</span>
          <span className="text-sm text-slate-500">/ {formatINR(budget)}</span>
        </div>
        {!over && remaining > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium">
            <TrendingDown size={12} /> {formatINR(remaining)} remaining
          </div>
        )}
        {over && (
          <div className="flex items-center gap-1 mt-1 text-xs text-red-600 font-bold">
            <TrendingUp size={12} /> Over by {formatINR(spent - budget)}
          </div>
        )}
      </div>

      {/* The New Bullet Chart */}
      <BulletChart spent={spent} budget={budget} />

      {over && (
        <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
           Over budget
        </div>
      )}
    </motion.div>
  );
}