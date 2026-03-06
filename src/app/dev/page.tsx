'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Terminal, RefreshCw, Trash2, AlertTriangle, Sprout } from 'lucide-react'

const ENTITIES = [
  { key: 'transaksi', label: 'Transaksi' },
  { key: 'qris', label: 'Transaksi QRIS' },
  { key: 'program', label: 'Program & Event' },
  { key: 'kategori', label: 'Kategori Pengeluaran' },
  { key: 'rekonsiliasi', label: 'Log Rekonsiliasi' },
  { key: 'kementerian', label: 'Kementerian' },
  { key: 'jenis', label: 'Jenis Transaksi' },
  { key: 'rekening', label: 'Rekening / Saldo Awal' },
]

export default function DevPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [confirmReset, setConfirmReset] = useState<string | null>(null)

  useEffect(() => { loadStats() }, [])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadStats = async () => {
    const token = localStorage.getItem('admin_token')
    const res = await fetch('/api/dev', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setStats(data)
  }

  const doAction = async (action: string, entity?: string) => {
    setLoading(true)
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch('/api/dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, entity }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast(data.message || 'Berhasil')
      loadStats()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setLoading(false)
    setConfirmReset(null)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Terminal size={24} style={{ color: 'var(--accent-gold)' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Dev Room</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tools pengembangan dan manajemen data</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Cek Manual</div>
              <div className="text-2xl font-bold" style={{ color: stats.cek_manual > 0 ? '#eab308' : '#22c55e' }}>
                {stats.cek_manual || 0}
              </div>
              {stats.cek_manual > 0 && (
                <a href="/koreksi" className="text-xs mt-1 block" style={{ color: '#eab308' }}>→ Koreksi sekarang</a>
              )}
            </div>
            <div className="card p-4">
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>QRIS Pending</div>
              <div className="text-2xl font-bold" style={{ color: stats.qris_pending > 0 ? '#3b82f6' : '#22c55e' }}>
                {stats.qris_pending || 0}
              </div>
              {stats.qris_pending > 0 && (
                <a href="/rekonsiliasi" className="text-xs mt-1 block" style={{ color: '#3b82f6' }}>→ Rekonsiliasi</a>
              )}
            </div>
          </div>
        )}

        {/* Seed dummy data */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sprout size={18} style={{ color: '#22c55e' }} />
            <h2 className="font-semibold text-sm">Buat Data Dummy</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Isi database dengan data contoh: program/event, transaksi sample, dan data rekonsiliasi.
          </p>
          <ul className="text-xs space-y-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
            <li>• Program event: Bukber 2026, Sertijab, Umroh MJ, Donasi Cisarua, dll</li>
            <li>• 6 transaksi sample (masuk + keluar)</li>
            <li>• Data QRIS pending untuk rekonsiliasi</li>
          </ul>
          <button
            onClick={() => doAction('seed')}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Sprout size={14} />}
            Buat Semua Data Dummy
          </button>
        </div>

        {/* Reset transaksi */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} style={{ color: '#eab308' }} />
            <h2 className="font-semibold text-sm">Reset Data Transaksi</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Hapus semua transaksi dan program tanpa menghapus master data (kementerian, jenis transaksi, kategori pengeluaran tetap ada).
          </p>
          {confirmReset === 'transaksi' ? (
            <div className="flex gap-2">
              <button onClick={() => doAction('reset-transaksi')} disabled={loading} className="btn-danger text-xs">
                Ya, Reset Transaksi
              </button>
              <button onClick={() => setConfirmReset(null)} className="btn-secondary text-xs">Batal</button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset('transaksi')} className="btn-danger flex items-center gap-2">
              <Trash2 size={14} />
              Reset Semua Transaksi & Program
            </button>
          )}
        </div>

        {/* Reset total */}
        <div className="card p-5" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            <h2 className="font-semibold text-sm" style={{ color: '#ef4444' }}>Reset Total</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Hapus SEMUA data termasuk master data. Tindakan ini tidak bisa dibatalkan.
          </p>
          {confirmReset === 'all' ? (
            <div className="flex gap-2">
              <button onClick={() => doAction('reset-all')} disabled={loading} className="btn-danger text-xs">
                ⚠️ Ya, Hapus Semua Data
              </button>
              <button onClick={() => setConfirmReset(null)} className="btn-secondary text-xs">Batal</button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset('all')} className="btn-danger flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertTriangle size={14} />
              ⚠️ Reset Total (Semua Data)
            </button>
          )}
        </div>

        {/* Delete per entity */}
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-4">Hapus Per Entitas</h2>
          <div className="grid grid-cols-2 gap-2">
            {ENTITIES.map(e => (
              <button
                key={e.key}
                onClick={() => {
                  if (confirm(`Hapus semua data ${e.label}?`)) {
                    doAction('delete-entity', e.key)
                  }
                }}
                disabled={loading}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}
              >
                <span>{e.label}</span>
                <Trash2 size={12} style={{ color: '#ef4444' }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.msg}
        </div>
      )}
    </AppLayout>
  )
}
