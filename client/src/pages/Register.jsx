import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(f.name, f.email, f.password);
      nav('/');
    } catch {
      setError('Registration failed. Please try a different email.');
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
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4"
          >
            ₹
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Create your account
          </h1>
          <p className="text-slate-500 mt-2 flex items-center justify-center gap-2">
            <Sparkles size={14} className="text-primary-500" />
            Join FinanceAI today
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name</label>
            <input
              className="input-premium"
              placeholder="Vraj Sanghavi"
              value={f.name}
              onChange={e => setF({ ...f, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
            <input
              className="input-premium"
              type="email"
              placeholder="your@email.com"
              value={f.email}
              onChange={e => setF({ ...f, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Password</label>
            <input
              className="input-premium"
              type="password"
              placeholder="••••••••"
              value={f.password}
              onChange={e => setF({ ...f, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="premium-btn w-full py-3.5 text-base disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-slate-600 mt-6">
          Have an account?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}