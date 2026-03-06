import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginModal from './shared/LoginModal';
import {
  LayoutDashboard, Upload, RefreshCw, AlertTriangle,
  FileText, List, Database, Settings, LogOut, Menu, X, Lock, Unlock
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, public: true },
  { path: '/laporan', label: 'Laporan', icon: FileText, public: true },
  { path: '/transaksi', label: 'Transaksi', icon: List, public: true },
  { path: '/upload', label: 'Upload Mutasi', icon: Upload, admin: true },
  { path: '/rekonsiliasi', label: 'Rekonsiliasi', icon: RefreshCw, admin: true },
  { path: '/koreksi', label: 'Koreksi', icon: AlertTriangle, admin: true },
  { path: '/master-data', label: 'Master Data', icon: Database, admin: true },
  { path: '/dev', label: 'Dev Room', icon: Settings, admin: true },
];

export default function Layout({ children }) {
  const { isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const visibleNav = navItems.filter(n => n.public || (n.admin && isAdmin));

  return (
    <div className="flex h-screen bg-[#080C10] overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#0D1117] border-r border-[#1E2530] transform transition-transform duration-200 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>

        {/* Logo */}
        <div className="p-5 border-b border-[#1E2530]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center text-black font-bold text-sm">MJ</div>
            <div>
              <div className="font-bold text-white text-sm">Muda Juara</div>
              <div className="text-xs text-gray-500">Finance Dashboard</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                  ${active ? 'bg-gold-500/10 text-gold-400 font-medium' : 'text-gray-400 hover:text-white hover:bg-[#1E2530]'}`}>
                <item.icon size={16} />
                {item.label}
                {item.admin && <span className="ml-auto text-[10px] text-gray-600 bg-[#1E2530] px-1.5 py-0.5 rounded">ADMIN</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-[#1E2530] space-y-1">
          {isAdmin ? (
            <button onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-900/20 w-full transition-all">
              <LogOut size={16} />
              Logout Admin
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1E2530] w-full transition-all">
              <Lock size={16} />
              Admin Login
            </button>
          )}
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Unlock size={12} className="text-gold-400" />
              <span className="text-xs text-gold-400">Mode Admin Aktif</span>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-[#1E2530] bg-[#0D1117]">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={20} className="text-gray-400" />
          </button>
          <div className="font-bold text-white text-sm">Muda Juara Finance</div>
          {!isAdmin && (
            <button onClick={() => setShowLogin(true)}>
              <Lock size={16} className="text-gray-400" />
            </button>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
