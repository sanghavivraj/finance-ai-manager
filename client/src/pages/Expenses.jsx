import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';
import ExpenseForm from '../components/ExpenseForm.jsx';
import { Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Expenses() {
  const [list, setList] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/expenses').then(r => {
      setList(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      load();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditComplete = () => {
    setEditingExpense(null);
    load();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 p-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Expenses</h1>
        <p className="text-slate-500 mt-1">Track where your money goes</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-1">
          <ExpenseForm 
            onAdded={load} 
            editingExpense={editingExpense}
            onEditComplete={handleEditComplete}
          />
        </div>

        {/* Right: List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="glass-card p-8 text-center text-slate-500">Loading expenses...</div>
          ) : list.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="text-4xl mb-3">📭</div>
              <div className="font-semibold text-slate-700">No expenses yet</div>
              <div className="text-sm text-slate-500">Add your first expense to start tracking!</div>
            </div>
          ) : (
            list.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center justify-between hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                    {e.icon || ''}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">
                      {e.merchant || e.description || e.category_name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{e.category_name}</span>
                      <span>•</span>
                      <span>{new Date(e.date).toLocaleDateString()}</span>
                      {e.mood && <span>• {e.mood}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold text-red-600">
                    -₹{parseFloat(e.amount).toLocaleString()}
                  </div>
                  <button 
                    onClick={() => handleEdit(e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(e.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}