import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Receipt, PiggyBank, BarChart3 } from 'lucide-react';
const items = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/budgets', icon: Wallet, label: 'Budgets' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/income', icon: PiggyBank, label: 'Income' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];
export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex justify-around py-2 z-40">
      {items.map(i => (
        <NavLink key={i.to} to={i.to} end={i.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
              isActive ? 'text-brand-600' : 'text-slate-500'
            }`}>
          <i.icon size={20} />
          <span>{i.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}