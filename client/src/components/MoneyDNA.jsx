import { motion } from 'framer-motion';
import { Dna, TrendingUp } from 'lucide-react';

export default function MoneyDNA({ dna }) {
  if (!dna) {
    return (
      <div className="glass-card p-8 text-center">
        <Dna size={48} className="mx-auto text-slate-400 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Generate Your Money DNA</h3>
        <p className="text-slate-500">Add at least 5 transactions to discover your spending personality!</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white">
          <Dna size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Your Money DNA</h3>
          <p className="text-sm text-slate-500">Based on {dna.totalTransactions} transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {dna.traits.map((trait, i) => (
          <motion.div
            key={trait.name}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-2xl bg-white/50 border-2 hover:scale-105 transition-transform"
            style={{ borderColor: trait.color }}
          >
            <div className="text-3xl mb-2">{trait.icon}</div>
            <div className="font-bold text-slate-800 text-sm">{trait.name}</div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary-50 to-accent-50">
        <div>
          <div className="text-sm text-slate-600 mb-1">Financial Discipline</div>
          <div className="text-2xl font-bold text-slate-800">{dna.disciplineScore}/100</div>
        </div>
        <TrendingUp size={32} className="text-primary-600" />
      </div>
    </motion.div>
  );
}