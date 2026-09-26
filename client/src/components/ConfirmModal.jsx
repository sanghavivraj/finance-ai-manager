import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Delete Item',
  message = 'Are you sure you want to permanently delete this item? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  icon: Icon = Trash2,
  loading = false,
  onConfirm,
  onClose,
}) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          {/* Backdrop Click Dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!loading ? onClose : undefined}
            className="absolute inset-0"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/90 text-center overflow-hidden z-10"
          >
            {/* Close Button */}
            {!loading && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                title="Close"
              >
                <X size={16} />
              </button>
            )}

            {/* Icon Badge */}
            <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-xs ${
              confirmVariant === 'danger'
                ? 'bg-red-50 border border-red-200/80 text-red-600'
                : confirmVariant === 'warning'
                ? 'bg-amber-50 border border-amber-200/80 text-amber-600'
                : 'bg-primary-50 border border-primary-200/80 text-primary-600'
            }`}>
              <Icon size={24} />
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mb-2">
              {title}
            </h3>
            <div className="text-xs text-slate-500 leading-relaxed mb-6 px-1">
              {message}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-semibold text-xs transition"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-3 px-4 rounded-2xl active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 ${
                  confirmVariant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    : confirmVariant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/20'
                }`}
              >
                {loading ? 'Deleting...' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
