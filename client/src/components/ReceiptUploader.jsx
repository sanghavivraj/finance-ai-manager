import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../utils/imageCompressor.js';
import api from '../services/api.js';
import {
  UploadCloud,
  FileCheck,
  Sparkles,
  Loader2,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReceiptUploader({ onParsed, onCancel }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [compressionStats, setCompressionStats] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please upload a valid image (JPEG, PNG, WebP).');
      return;
    }

    try {
      // Step 1: Compressing
      setStatus('compressing');
      setStatusMessage('⚡ Compressing image to max 1000px & under 500KB...');
      setProgressPercent(25);

      const compressed = await compressImage(file, {
        maxWidth: 1000,
        maxHeight: 1500,
        maxSizeKB: 500,
      });

      setPreviewUrl(compressed.dataUrl);
      setCompressionStats({
        original: compressed.originalSizeKB,
        compressed: compressed.compressedSizeKB,
        savings: compressed.savingsPercent,
      });

      // Step 2: Uploading
      setStatus('uploading');
      setStatusMessage(`📤 Uploading compressed photo (${compressed.compressedSizeKB} KB)...`);
      setProgressPercent(55);

      // Step 3: AI Analyzing
      setStatus('analyzing');
      setStatusMessage('✨ AI analyzing line items, merchant, and total amount...');
      setProgressPercent(80);

      const response = await api.post('/expenses/scan-receipt', {
        imageBase64: compressed.base64,
        mimeType: compressed.mimeType,
      });

      const parsedData = response.data;

      // Step 4: Success
      setStatus('success');
      setStatusMessage('🎉 Receipt parsed successfully!');
      setProgressPercent(100);

      toast.success(
        `Parsed ₹${parseFloat(parsedData.amount).toLocaleString()} from ${
          parsedData.merchant || parsedData.category || 'Receipt'
        }!`
      );

      if (onParsed) {
        onParsed(parsedData);
      }
    } catch (err) {
      console.error('Receipt processing error:', err);
      setStatus('error');
      const msg = err.response?.data?.error || err.message || 'Failed to analyze receipt.';
      setStatusMessage(msg);
      toast.error(msg);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const reset = () => {
    setStatus('idle');
    setStatusMessage('');
    setProgressPercent(0);
    setPreviewUrl(null);
    setCompressionStats(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isProcessing = ['compressing', 'uploading', 'analyzing'].includes(status);

  return (
    <div className="w-full bg-slate-900/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Smart AI Receipt Scanner</h4>
            <p className="text-[11px] text-slate-500">Auto-extracts amounts, vendor & categories</p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-primary-500 bg-primary-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-primary-400 hover:bg-white/60 bg-white/40'
            }`}
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200/50 flex items-center justify-center text-primary-600 mb-3 shadow-sm">
              <Camera size={24} />
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Snap photo or drag receipt image here
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Supports JPEG, PNG, WebP • Auto-compressed under 500KB
            </div>
            <button
              type="button"
              className="mt-3.5 px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs inline-flex items-center gap-1.5 transition"
            >
              <UploadCloud size={14} className="text-primary-600" />
              Choose Receipt File
            </button>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass-card p-5 bg-white/95 border border-primary-100 shadow-lg text-center space-y-4"
          >
            {previewUrl && (
              <div className="relative w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-primary-200 shadow-md">
                <img
                  src={previewUrl}
                  alt="Receipt Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-primary-900/20 backdrop-blur-[1px] flex items-center justify-center">
                  <Loader2 size={24} className="text-white animate-spin" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-2">
                {status === 'compressing' && <Zap size={16} className="text-amber-500 animate-pulse" />}
                {status === 'uploading' && <UploadCloud size={16} className="text-blue-500 animate-bounce" />}
                {status === 'analyzing' && <Sparkles size={16} className="text-primary-500 animate-spin" />}
                <span>{statusMessage}</span>
              </div>
              {compressionStats && (
                <div className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1.5">
                  <span>⚡ Compressed:</span>
                  <span className="line-through text-slate-400">{compressionStats.original} KB</span>
                  <span>➔</span>
                  <span className="font-bold">{compressionStats.compressed} KB</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-[10px] font-bold">
                    -{compressionStats.savings}%
                  </span>
                </div>
              )}
            </div>

            {/* Step-by-Step Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4 }}
                className="h-full bg-gradient-to-r from-primary-500 via-teal-400 to-emerald-500 rounded-full"
              />
            </div>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center space-y-2"
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <CheckCircle2 size={22} />
            </div>
            <div className="text-sm font-bold text-emerald-900">{statusMessage}</div>
            <p className="text-xs text-emerald-700">Form fields have been filled automatically.</p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
            >
              Scan another receipt
            </button>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2"
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertCircle size={22} />
            </div>
            <div className="text-sm font-bold text-red-800">Scan Failed</div>
            <p className="text-xs text-red-600">{statusMessage}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 px-3 py-1 rounded-xl bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 shadow-xs"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
