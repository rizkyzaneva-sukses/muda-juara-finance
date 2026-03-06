'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { formatRupiah } from '@/lib/qris'
import { RefreshCw, CheckCircle, AlertCircle, TrendingDown } from 'lucide-react'

export default function RekonsiliasiPage() {
  const [qrisData, setQrisData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadQris()
    loadLogs()
  }, [])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadQris = async () => {
    setLoading(true)
    const res = await fetch('/api/qris?limit=100')
    const d = await res.json()
    setQrisData(d.data || [])
    setLoading(false)
  }

  const loadLogs = async () => {
    const res = await fetch('/api/rekonsiliasi')
    const d = await res.json()
    setLogs(d.data || [])
  }

  const jalankanRekonsiliasi = async () => {
    setRunning(true)
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch('/api/rekonsiliasi', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data)
      showToast(`Rekonsiliasi selesai: ${data.summary.jumlah_matched} matched`)
      loadQris()
      loadLogs()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setRunning(false)
  }

  const statusCount = {
    pending: qrisData.filter(q => q.status === 'pending').length,
    matched: qrisData.filter(q => q.status === 'matched').length,
    cek_manual: qrisData.filter(q => q.status === 'cek_manual').length,
  }

  const totalQris = qrisData.reduce((s, q) => s + q.amount, 0)
  const totalMatched = qrisData.filter(q => q.status === 'matched').reduce((s, q) => s + q.amount, 0)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Rekonsiliasi QRIS</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Cocokkan data QRIS dengan pencairan BCA Syariah
            </p>
          </div>
          <button onClick={jalankanRekonsiliasi} disabled={running} className="btn-primary flex items-center gap-2">
            {running ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <RefreshCw size={14} />}
            Jalankan Rekonsiliasi
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total QRIS</div>
            <div className="text-lg font-bold" style={{ color: 'var(--accent-green)' }}>{formatRupiah(totalQris)}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{qrisData.length} transaksi</div>
          </div>
          <div className="card p-4">
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Pending</div>
            <div className="text-lg font-bold" style={{ color: '#eab308' }}>{statusCount.pending}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Matched</div>
            <div className="text-lg font-bold" style={{ color: '#22c55e' }}>{statusCount.matched}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Cek Manual</div>
            <div className="text-lg font-bold" style={{ color: '#ef4444' }}>{statusCount.cek_manual}</div>
          </div>
        </div>

        {/* Hasil rekonsiliasi */}
        {results && (
          <div className="card p-5">
            <h2 className="font-semibold text-sm mb-4">Hasil Rekonsiliasi Terakhir</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total QRIS</div>
                <div className="font-semibold" style={{ color: '#22c55e' }}>{formatRupiah(results.summary.total_qris)}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Cair BCA</div>
                <div className="font-semibold" style={{ color: '#3b82f6' }}>{formatRupiah(results.summary.total_cair_bank)}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Biaya MDR</div>
                <div className="font-semibold" style={{ color: '#ef4444' }}>
                  {formatRupiah(results.summary.total_selisih)} ({results.summary.persen_mdr}%)
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Matched</div>
                <div className="font-semibold" style={{ color: '#22c55e' }}>{results.summary.jumlah_matched} transaksi</div>
              </div>
            </div>

            <div className="space-y-2">
              {results.results?.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: r.status === 'matched' ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${r.status === 'matched' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}` }}>
                  <div className="flex items-center gap-3">
                    {r.status === 'matched'
                      ? <CheckCircle size={14} style={{ color: '#22c55e' }} />
                      : <AlertCircle size={14} style={{ color: '#ef4444' }} />
                    }
                    <span className="text-xs">{r.tanggal_qris}</span>
                    <span className="text-xs font-medium">{formatRupiah(r.total_qris)} QRIS</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    {r.status === 'matched' && (
                      <>
                        <span style={{ color: '#3b82f6' }}>Cair: {formatRupiah(r.total_bca)}</span>
                        <span style={{ color: '#ef4444' }}>MDR: {formatRupiah(r.selisih)} ({r.persen_mdr}%)</span>
                      </>
                    )}
                    {r.status !== 'matched' && (
                      <span style={{ color: '#ef4444' }}>Belum ada pencairan</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QRIS table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--bg-border)' }}>
            <h2 className="font-semibold text-sm">Data QRIS</h2>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0" style={{ background: 'var(--bg-card)' }}>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <th className="text-left px-4 py-2 uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Tanggal</th>
                  <th className="text-left px-4 py-2 uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Merchant</th>
                  <th className="text-right px-4 py-2 uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Jumlah</th>
                  <th className="text-left px-4 py-2 uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Kementerian</th>
                  <th className="text-left px-4 py-2 uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Jenis</th>
                  <th className="text-left px-4 py-2 uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10"><div className="spinner mx-auto" /></td></tr>
                ) : qrisData.map(q => (
                  <tr key={q.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-2.5">{q.created_date?.substring(0, 10)}</td>
                    <td className="px-4 py-2.5" style={{ maxWidth: 160 }}>
                      <div className="truncate">{q.merchant_name}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium" style={{ color: '#22c55e' }}>{formatRupiah(q.amount)}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {q.kementerian ? `${q.kementerian.kode} - ${q.kementerian.nama}` : '—'}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {q.jenis_transaksi?.nama || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        q.status === 'matched' ? 'badge-valid' :
                        q.status === 'cek_manual' ? 'badge-cek-manual' : 'badge-lainnya'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log rekonsiliasi */}
        {logs.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--bg-border)' }}>
              <h2 className="font-semibold text-sm">Riwayat Rekonsiliasi</h2>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--bg-border)' }}>
              {logs.map(log => (
                <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{log.tanggal_rekonsiliasi}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {log.jumlah_matched} matched · MDR {log.persentase_biaya?.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium" style={{ color: '#22c55e' }}>{formatRupiah(log.total_qris)}</div>
                    <div className="text-xs" style={{ color: '#ef4444' }}>-{formatRupiah(log.selisih)} MDR</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.msg}
        </div>
      )}
    </AppLayout>
  )
}
