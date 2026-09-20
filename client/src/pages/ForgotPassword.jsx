import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff, KeyRound, Mail, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../services/api.js';

export default function ForgotPassword() {
  const nav = useNavigate();
  const [step, setStep] = useState(1); // 1: request code, 2: submit code + new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message || '6-digit verification code generated!');
      const devCode = data.code || data.resetCode || data.token || data.resetToken;
      if (devCode) {
        setCode(devCode);
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/reset-password', { code, newPassword });
      setSuccess(true);
      setMessage(data.message || 'Password reset successful!');
      setTimeout(() => {
        nav('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please check your 6-digit code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card w-full max-w-md p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4"
          >
            <KeyRound size={28} />
          </motion.div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            {step === 1 ? 'Forgot Password?' : 'Enter Verification Code'}
          </h1>
          <p className="text-slate-500 mt-2 text-sm flex items-center justify-center gap-1.5">
            <Sparkles size={14} className="text-primary-500" />
            {step === 1
              ? 'Enter your account email to receive a 6-digit OTP code'
              : 'Enter the 6-digit Telegram OTP code & new password'}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}

        {message && !error && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`mb-4 p-3 rounded-xl text-sm flex items-start gap-2 ${
              success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}
          >
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <span>{message}</span>
          </motion.div>
        )}

        {/* Step 1: Request Code Form */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Account Email</label>
              <div className="relative">
                <input
                  className="input-premium pl-10"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-btn w-full py-3.5 text-base disabled:opacity-50"
            >
              {loading ? 'Sending OTP Code...' : 'Send Telegram OTP Code'}
            </button>
          </form>
        )}

        {/* Step 2: Reset Password Form */}
        {step === 2 && !success && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">6-Digit Verification Code</label>
              <div className="relative">
                <input
                  className="input-premium pl-10 font-mono text-center tracking-[0.3em] font-bold text-lg"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
                <ShieldCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">New Password</label>
              <div className="relative">
                <input
                  className="input-premium pr-10"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-btn w-full py-3.5 text-base disabled:opacity-50"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600 border-t border-slate-100 pt-4">
          <Link
            to="/login"
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition font-medium"
          >
            <ArrowLeft size={16} />
            Back to Sign In
          </Link>
          {step === 2 && !success && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-primary-600 hover:text-primary-700 font-medium transition"
            >
              Resend Code
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
