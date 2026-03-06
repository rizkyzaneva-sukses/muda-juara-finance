'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Upload, RefreshCw, AlertCircle,
  FileText, CreditCard, Settings, Terminal,
  Lock, Unlock, Menu, X, ChevronRight, Coins
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, public: true },
  { href: '/transaksi', label: 'Transaksi', icon: CreditCard, public: true },
  { href: '/laporan', label: 'Laporan', icon: FileText, public: true },
  { href: '/upload', label: 'Upload Mutasi', icon: Upload, public: false },
  { href: '/rekonsiliasi', label: 'Rekonsiliasi QRIS', icon: RefreshCw, public: false },
  { href: '/koreksi', label: 'Koreksi', icon: AlertCircle, public: false },
  { href: '/master-data', label: 'Master Data', icon: Settings, public: false },
  { href: '/dev', label: 'Dev Room', icon: Terminal, public: false },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) setIsAdmin(true)
  }, [])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('admin_token', data.token)
        setIsAdmin(true)
        setShowLoginModal(false)
        setPassword('')
        setLoginError('')
        showToast('Login berhasil! Selamat datang Admin.')
      } else {
        setLoginError('Password salah')
      }
    } catch {
      setLoginError('Gagal login, coba lagi')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setIsAdmin(false)
    showToast('Logout berhasil', 'success')
  }

  const visibleNav = navItems.filter(item => item.public || isAdmin)

  return (
    <div className="min-h-screen bg-grid" style={{ background: 'var(--bg-primary)' }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--bg-border)' }}>

        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--bg-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(240,165,0,0.15)', border: '1px solid rgba(240,165,0,0.3)' }}>
              <Coins size={18} style={{ color: 'var(--accent-gold)' }} />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                MUDA JUARA
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Finance Dashboard</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {visibleNav.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group"
                  style={{
                    background: active ? 'rgba(240,165,0,0.1)' : 'transparent',
                    color: active ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    border: active ? '1px solid rgba(240,165,0,0.2)' : '1px solid transparent',
                  }}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                  {active && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Auth button */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--bg-border)' }}>
          {isAdmin ? (
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
              <Unlock size={16} />
              <span>Logout Admin</span>
            </button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all btn-primary">
              <Lock size={16} />
              <span>Admin Login</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3"
          style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--bg-border)' }}>
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={20} style={{ color: 'var(--text-primary)' }} />
          </button>
          <span className="font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--accent-gold)' }}>
            MUDA JUARA
          </span>
          {!isAdmin && (
            <button onClick={() => setShowLoginModal(true)}>
              <Lock size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
          {isAdmin && (
            <button onClick={handleLogout}>
              <Unlock size={18} style={{ color: 'var(--accent-gold)' }} />
            </button>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-6 animate-in">
          {children}
        </main>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="card p-6 w-full max-w-sm mx-4 animate-in">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Admin Login</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Masukkan password admin</p>
              </div>
              <button onClick={() => setShowLoginModal(false)}>
                <X size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="input-dark mb-3"
            />
            {loginError && (
              <p className="text-xs mb-3" style={{ color: 'var(--accent-red)' }}>{loginError}</p>
            )}
            <button onClick={handleLogin} className="btn-primary w-full">
              Masuk
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
