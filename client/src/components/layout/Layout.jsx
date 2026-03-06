import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../LoginModal';
import {
  LayoutDashboard, Upload, RefreshCw, AlertTriangle,
  FileText, List, Database, Settings, LogOut, LogIn,
  ChevronRight, Wallet, Menu, X
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transaksi', label: 'Transaksi', icon: List },
  { path: '/laporan', label: 'Laporan', icon: FileText },
];

const adminItems = [
  { path: '/upload', label: 'Upload Mutasi', icon: Upload },
  { path: '/rekonsiliasi', label: 'Rekonsiliasi QRIS', icon: RefreshCw },
  { path: '/koreksi', label: 'Koreksi', icon: AlertTriangle },
  { path: '/master-data', label: 'Master Data', icon: Database },
  { path: '/dev', label: 'Dev Room', icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavLink = ({ item }) => {
    const Icon = item.icon;
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          active
            ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20'
            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
        }`}
      >
        <Icon size={16} />
        <span>{item.label}</span>
        {active && <ChevronRight size={14} className="ml-auto text-gold-500/50" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-60 bg-dark-800 border-r border-white/5
        flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <Wallet size={18} className="text-gold-400" />
            </div>
            <div>
              <div className="font-display font-bold text-white text-sm leading-tight">Muda Juara</div>
              <div className="text-xs text-white/40 font-body">Finance Dashboard</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-xs text-white/30 px-3 py-1 font-semibold tracking-wider uppercase mb-1">Publik</div>
          {navItems.map(item => <NavLink key={item.path} item={item} />)}

          {isAdmin && (
            <>
              <div className="text-xs text-white/30 px-3 py-1 font-semibold tracking-wider uppercase mt-4 mb-1">Admin</div>
              {adminItems.map(item => <NavLink key={item.path} item={item} />)}
            </>
          )}
        </nav>

        {/* Auth */}
        <div className="p-3 border-t border-white/5">
          {isAdmin ? (
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut size={15} />
              <span>Logout Admin</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gold-400/70 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-all"
            >
              <LogIn size={15} />
              <span>🔒 Admin Login</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-white/5 bg-dark-800">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white">
            <Menu size={20} />
          </button>
          <span className="font-display font-semibold text-white">Muda Juara Finance</span>
          {!isAdmin && (
            <button onClick={() => setShowLogin(true)} className="ml-auto text-gold-400 text-sm">
              🔒 Login
            </button>
          )}
        </div>

        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
