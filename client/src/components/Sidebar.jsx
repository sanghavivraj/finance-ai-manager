import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { LayoutDashboard, Wallet, Receipt, PiggyBank, BarChart3, LogOut, Sparkles, Settings, Target, Dna } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/income', label: 'Income', icon: PiggyBank },
  { to: '/goals', label: 'Savings Vault', icon: Target },
  { to: '/financial-dna', label: 'Financial DNA', icon: Dna },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/categories', label: 'Categories', icon: Settings }
];


export default function Sidebar() {
  const { user, logout } = useAuth();
  
  return (
    <motion.div 
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      className="flex flex-col h-screen sticky top-0 p-6 glass-card m-4"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <motion.div 
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6 }}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white font-bold text-xl shadow-lg"
        >
          ₹
        </motion.div>
        <div>
          <div className="font-bold text-xl text-slate-800">FinanceAI</div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Sparkles size={12} className="text-primary-500" />
            Smart money manager
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {links.map((l, i) => (
          <motion.div
            key={l.to}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <NavLink 
              to={l.to} 
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <l.icon size={20} />
              {l.label}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-slate-200 pt-4 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-300"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </motion.div>
  );
}