import { motion } from 'framer-motion';
import { formatINR } from '../utils/currency.js';

export default function BulletChart({ spent, budget }) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOver = spent > budget;
  
  return (
    <div className="w-full">
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        {/* Spent Bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`absolute left-0 top-0 h-full rounded-full ${
            isOver ? 'bg-red-500' : 'bg-gradient-to-r from-primary-500 to-accent-500'
          }`}
        />
        {/* Budget Limit Marker */}
        <div 
          className="absolute top-0 h-full w-0.5 bg-slate-800 z-10" 
          style={{ left: '100%' }} // Represents the 100% budget limit
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs font-medium">
        <span className="text-slate-500">
          Spent: <span className="text-slate-800">{formatINR(spent)}</span>
        </span>
        <span className="text-slate-500">
          Budget: <span className="text-slate-800">{formatINR(budget)}</span>
        </span>
      </div>
    </div>
  );
}