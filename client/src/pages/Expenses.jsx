import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api.js';
import ExpenseForm from '../components/ExpenseForm.jsx';
import {
  Trash2,
  Edit2,
  Plus,
  Search,
  Receipt,
  X,
  Calendar,
  CreditCard,
  Tag,
  ArrowDownRight,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function Expenses() {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search and Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([api.get('/expenses'), api.get('/categories')])
      .then(([expRes, catRes]) => {
        setList(expRes.data);
        setCategories(catRes.data);
        if (!silent) setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading expenses:', err);
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    // Initial load
    load(false);

    // 1. Background Polling Interval (every 4 seconds)
    const interval = setInterval(() => {
      load(true);
    }, 4000);

    // 2. Window Focus Re-fetch (instant refresh when returning from Telegram/other apps)
    const handleFocus = () => {
      load(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleDeleteClick = (expense, e) => {
    e?.stopPropagation();
    setExpenseToDelete(expense);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/expenses/${expenseToDelete.id}`);
      toast.success('Expense deleted successfully');
      setExpenseToDelete(null);
      load();
    } catch (err) {
      toast.error('Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (expense, e) => {
    e?.stopPropagation();
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingExpense(null);
    setIsModalOpen(false);
  };

  const handleFormComplete = () => {
    handleCloseModal();
    load();
  };

  // Helper to format clean transaction title (no "Telegram:" prefix, proper capitalization)
  const getCleanTitle = (expense) => {
    if (!expense) return 'Expense';

    // 1. If merchant is valid and not a system placeholder
    if (
      expense.merchant &&
      expense.merchant.trim() &&
      !['N/A', 'Unknown', 'Receipt OCR', 'Voice Entry'].includes(expense.merchant.trim())
    ) {
      return expense.merchant.trim();
    }

    // 2. If description exists, strip any raw telegram or numerical prefix
    if (expense.description && expense.description.trim()) {
      let clean = expense.description
        .replace(/^telegram:\s*/i, '')
        .replace(/^voice\s*(entry|expense|memo)?:\s*/i, '')
        .replace(/^receipt\s*(ocr|photo)?:\s*/i, '')
        .trim();

      // Remove leading transaction numbers like "2500 zara" or "500 food"
      clean = clean.replace(/^\d+(\.\d+)?\s+/i, '').trim();

      if (clean.length > 0) {
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }
    }

    // 3. Fallback to category name
    return expense.category_name || 'Expense';
  };

  const isTransferCategory = (catName) => {
    const name = (catName || '').toLowerCase();
    return name === 'savings' || name === 'investments';
  };

  // Filtered List based on Search and Category
  const filteredExpenses = useMemo(() => {
    return list.filter((item) => {
      const cleanTitle = getCleanTitle(item);
      const matchesSearch =
        searchQuery.trim() === '' ||
        cleanTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.merchant && item.merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' ||
        (item.category_name && item.category_name.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [list, searchQuery, selectedCategory]);

  const { totalLivingOutflow, totalAssetTransfers } = useMemo(() => {
    let living = 0;
    let transfers = 0;
    for (const e of filteredExpenses) {
      const amt = parseFloat(e.amount || 0);
      if (isTransferCategory(e.category_name)) {
        transfers += amt;
      } else {
        living += amt;
      }
    }
    return { totalLivingOutflow: living, totalAssetTransfers: transfers };
  }, [filteredExpenses]);

  // Unique category names for quick filter pills
  const filterCategories = useMemo(() => {
    const unique = Array.from(new Set(categories.map((c) => c.name))).filter(Boolean);
    return ['All', ...unique];
  }, [categories]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6 sm:p-8 max-w-7xl mx-auto"
    >
      {/* 1. Header & Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 font-bold text-xs tracking-wider uppercase">
            <Receipt size={16} />
            Ledger & Records
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Expenses
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track, filter, and inspect your itemized transactions.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
          className="premium-btn px-5 py-2.5 flex items-center justify-center gap-2 text-sm shadow-md self-start sm:self-auto"
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* 2. Search & Category Filter Header Bar */}
      <div className="glass-card p-4 rounded-3xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by merchant, note, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Metrics Tag */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 shrink-0 px-1">
            <span>
              Showing <strong className="text-slate-800 font-bold">{filteredExpenses.length}</strong> entries
            </span>
            <span>•</span>
            {isTransferCategory(selectedCategory) ? (
              <span>
                Asset Allocation: <strong className="text-emerald-600 font-bold">+₹{totalAssetTransfers.toLocaleString()}</strong>
              </span>
            ) : (
              <>
                <span>
                  Living Outflow: <strong className="text-red-600 font-bold">-₹{totalLivingOutflow.toLocaleString()}</strong>
                </span>
                {totalAssetTransfers > 0 && (
                  <>
                    <span>•</span>
                    <span>
                      Vault Transfer: <strong className="text-emerald-600 font-bold">+₹{totalAssetTransfers.toLocaleString()}</strong>
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modern Minimalist Fintech Category Filter Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar text-xs border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider pl-1 pr-2 select-none shrink-0">
            <SlidersHorizontal size={13} className="text-slate-400" />
            <span>Filter</span>
          </div>

          <div className="h-3.5 w-px bg-slate-200 shrink-0 mr-1" />

          {filterCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all duration-150 text-xs ${
                  isSelected
                    ? 'bg-slate-900 text-white font-semibold shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 bg-transparent'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Full-Width Financial Ledger Table / List */}
      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            Loading expense ledger...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-2xl text-slate-400">
              📭
            </div>
            <div className="font-bold text-slate-700 text-base">No transactions found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search terms or category filter.'
                : 'Add your first expense to begin tracking your financial ledger!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((e) => {
              const formattedDate = new Date(e.date).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const isAsset = isTransferCategory(e.category_name);

              return (
                <div
                  key={e.id}
                  className="group p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                >
                  {/* Left: Icon & Merchant / Category Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 border ${
                      isAsset ? 'bg-emerald-50 border-emerald-200/60' : 'bg-slate-100 border-slate-200/60'
                    }`}>
                      {e.icon || (isAsset ? '💰' : '🛍️')}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-2">
                        <span>{getCleanTitle(e)}</span>
                        {e.mood && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-normal">
                            {e.mood}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className={`font-medium ${isAsset ? 'text-emerald-700' : 'text-slate-600'}`}>{e.category_name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {formattedDate}
                        </span>
                        {e.payment_method && (
                          <>
                            <span>•</span>
                            <span className="uppercase text-[10px] font-bold text-slate-500">
                              {e.payment_method}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Hover Actions */}
                  <div className="flex items-center gap-4 shrink-0 pl-4">
                    <div className="text-right">
                      {isAsset ? (
                        <div>
                          <div className="text-base font-extrabold text-emerald-600 tracking-tight">
                            +₹{parseFloat(e.amount).toLocaleString()}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                            Vault Saved
                          </div>
                        </div>
                      ) : (
                        <div className="text-base font-extrabold text-red-600 tracking-tight">
                          -₹{parseFloat(e.amount).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Action buttons (Appear on row hover) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={(evt) => handleEdit(e, evt)}
                        title="Edit Expense"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(evt) => handleDeleteClick(e, evt)}
                        title="Delete Expense"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Smooth Add / Edit Expense Popup Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-6">
                <ExpenseForm
                  onAdded={handleFormComplete}
                  editingExpense={editingExpense}
                  onEditComplete={handleFormComplete}
                />
              </div>

              <button
                onClick={handleCloseModal}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Custom UI Confirmation Modal for Expense Deletion */}
      <ConfirmModal
        isOpen={!!expenseToDelete}
        title="Delete Expense"
        message={
          expenseToDelete
            ? `Are you sure you want to delete "${expenseToDelete.description || 'this expense'}" for ₹${parseFloat(expenseToDelete.amount || 0).toLocaleString()}? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Expense"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setExpenseToDelete(null)}
      />
    </motion.div>
  );
}