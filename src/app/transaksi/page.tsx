'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { formatRupiah } from '@/lib/qris'
import { TrendingUp, TrendingDown, Search, Filter, ChevronLeft, ChevronRight, Edit2, Save, X } from 'lucide-react'

export default function TransaksiPage() {
  const [data, setData] = useState<any[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '', tipe: '', sumber: '', search: '', date_from: '', date_to: ''
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ keterangan: '', jumlah: 0 })

  useEffect(() => { fetchData() }, [page, filters])

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    })
    const res = await fetch(`/api/transaksi?${params}`)
    const d = await res.json()
    setData(d.data || [])
    setCount(d.count || 0)
    setLoading(false)
  }

  const totalPages = Math.ceil(count / 20)

  const statusColor: Record<string, string> = {
    valid: 'badge-valid',
    cek_manual: 'badge-cek-manual',
    koreksi: 'badge-koreksi',
    lainnya: 'badge-lainnya',
  }

  const saveEdit = async () => {
    if (!editingId) return
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch('/api/transaksi', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingId,
          keterangan: editForm.keterangan,
          jumlah: Number(editForm.jumlah) || 0
        })
      })
      if (!res.ok) throw new Error('Gagal update')
      setEditingId(null)
      fetchData()
    } catch (e) {
      alert("Gagal merubah data")
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Transaksi</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{count} total transaksi</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              placeholder="Cari keterangan..."
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
              className="input-dark pl-8 text-xs"
              style={{ width: 200 }}
            />
          </div>
          <select value={filters.tipe} onChange={e => { setFilters(f => ({ ...f, tipe: e.target.value })); setPage(1) }} className="input-dark text-xs" style={{ width: 120 }}>
            <option value="">Semua Tipe</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
          </select>
          <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }} className="input-dark text-xs" style={{ width: 140 }}>
            <option value="">Semua Status</option>
            <option value="valid">Valid</option>
            <option value="cek_manual">Cek Manual</option>
            <option value="koreksi">Koreksi</option>
            <option value="lainnya">Lainnya</option>
          </select>
          <select value={filters.sumber} onChange={e => { setFilters(f => ({ ...f, sumber: e.target.value })); setPage(1) }} className="input-dark text-xs" style={{ width: 120 }}>
            <option value="">Semua Sumber</option>
            <option value="BCA">BCA Syariah</option>
            <option value="BSI">BSI</option>
            <option value="manual">Manual</option>
          </select>
          <input type="date" value={filters.date_from} onChange={e => { setFilters(f => ({ ...f, date_from: e.target.value })); setPage(1) }} className="input-dark text-xs" />
          <input type="date" value={filters.date_to} onChange={e => { setFilters(f => ({ ...f, date_to: e.target.value })); setPage(1) }} className="input-dark text-xs" />
          {Object.values(filters).some(v => v) && (
            <button onClick={() => { setFilters({ status: '', tipe: '', sumber: '', search: '', date_from: '', date_to: '' }); setPage(1) }}
              className="text-xs px-3 py-1.5 rounded" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
              Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Tanggal</th>
                  <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Keterangan</th>
                  <th className="text-right px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Jumlah</th>
                  <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Kementerian</th>
                  <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Program</th>
                  <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Sumber</th>
                  <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="text-right px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><div className="spinner mx-auto" /></td></tr>
                ) : data.map(t => (
                  <tr key={t.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {editingId === t.id ? (
                      <td colSpan={8} className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <input
                            className="input-dark text-xs flex-1"
                            value={editForm.keterangan}
                            placeholder="Keterangan..."
                            onChange={e => setEditForm(f => ({ ...f, keterangan: e.target.value }))}
                          />
                          <input
                            type="number"
                            className="input-dark text-xs w-32"
                            placeholder="Jumlah / Nominal"
                            value={editForm.jumlah}
                            onChange={e => setEditForm(f => ({ ...f, jumlah: Number(e.target.value) }))}
                          />
                          <button onClick={saveEdit} className="p-2 rounded hover:bg-green-500/20 text-green-500 transition-colors" title="Simpan" disabled={!editForm.keterangan || editForm.jumlah <= 0}>
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 rounded hover:bg-red-500/20 text-red-500 transition-colors" title="Batal">
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t.tanggal || t.created_at?.substring(0, 10) || '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                              style={{ background: t.tipe === 'masuk' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                              {t.tipe === 'masuk'
                                ? <TrendingUp size={11} style={{ color: '#22c55e' }} />
                                : <TrendingDown size={11} style={{ color: '#ef4444' }} />
                              }
                            </div>
                            <span className="text-sm truncate" style={{ maxWidth: 260 }}>{t.keterangan}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-sm" style={{ color: t.tipe === 'masuk' ? '#22c55e' : '#ef4444', whiteSpace: 'nowrap' }}>
                          {t.tipe === 'masuk' ? '+' : '-'}{formatRupiah(t.jumlah)}
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {t.kementerian ? (
                            <span className="flex items-center gap-1">
                              <span className="font-mono" style={{ color: 'var(--accent-gold)' }}>{t.kementerian.kode}</span>
                              <span className="truncate" style={{ maxWidth: 120 }}>{t.kementerian.nama}</span>
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {t.program_event?.nama || t.kategori_pengeluaran?.nama || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                            {t.sumber}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${statusColor[t.status] || 'badge-lainnya'}`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => { setEditingId(t.id); setEditForm({ keterangan: t.keterangan || '', jumlah: t.jumlah || 0 }) }}
                            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Edit Transaksi"
                          >
                            <Edit2 size={14} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--bg-border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-xs">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-1.5 text-xs">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
