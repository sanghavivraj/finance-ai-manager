import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const categoryIcons = {
  'Food': '',
  'Shopping': '🛍️',
  'Transport': '🚗',
  'Bills': '📄',
  'Entertainment': '🎮',
  'Savings': '💰',
  'Investments': '📈'
};

export default function CategorySettings() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

   const toggleCategory = async (id) => {
    try {
      // 1. Toggle the category
      await api.put(`/categories/${id}/toggle`);
      toast.success('Category updated');
      loadCategories();
      
      // 2. 🚀 AUTOMATICALLY REGENERATE BUDGET IN BACKGROUND
      try {
        await api.post('/budgets/generate-ai');
        // Optional: Show a subtle message
        toast.success('✨ Budgets automatically updated!');
      } catch (err) {
        // If no income is added yet, it will fail silently. That's okay!
        console.log('Auto-budget skipped (no income yet)');
      }
      
    } catch (err) {
      toast.error('Failed to update category');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 p-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Category Settings</h1>
        <p className="text-slate-500 mt-1">Choose which categories you want to track</p>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <motion.div
              key={cat.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`glass-card p-6 flex items-center justify-between cursor-pointer transition-all ${
                cat.is_active ? 'border-2 border-primary-500' : 'opacity-60'
              }`}
              onClick={() => toggleCategory(cat.id)}
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">{categoryIcons[cat.name] || '📦'}</div>
                <div>
                  <div className="font-semibold text-slate-800">{cat.name}</div>
                  <div className="text-sm text-slate-500">
                    {cat.is_active ? 'Active' : 'Disabled'}
                  </div>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                cat.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {cat.is_active ? <Check size={24} /> : <X size={24} />}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}