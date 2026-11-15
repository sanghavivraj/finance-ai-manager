import { NavLink } from 'react-router-dom';
import { Home, PieChart, CreditCard, Wallet, PiggyBank, Target, Calendar, Sparkles, MessageSquare, BarChart2, FileText, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const Navbar = () => {
  const { logout } = useAuth();

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/budgets', icon: PieChart, label: 'Budgets' },
    { to: '/expenses', icon: CreditCard, label: 'Expenses' },
    { to: '/income', icon: Wallet, label: 'Income' },
    { to: '/goals', icon: PiggyBank, label: 'Savings Vault' },
    { to: '/financial-dna', icon: BarChart2, label: 'Financial DNA' },
    { to: '/peer-check', icon: Sparkles, label: 'Peer Check' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/categories', icon: Settings, label: 'Categories' },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-20 bg-white shadow-lg flex flex-col items-center py-6 z-50">
      <div className="flex-1 flex flex-col items-center space-y-6">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              p-2 rounded-xl transition-all duration-200
              ${isActive ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md' : 'text-slate-500 hover:text-primary-600'}
            `}
          >
            <item.icon size={22} />
          </NavLink>
        ))}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <button
          onClick={logout}
          className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut size={22} />
        </button>
      </div>
    </div>
  );
};

export default Navbar;