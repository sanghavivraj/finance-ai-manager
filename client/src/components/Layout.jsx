import Sidebar from './Sidebar.jsx';
import MobileNav from './MobileNav.jsx';
export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-white">
        <Sidebar />
      </aside>
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}