'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { formatRupiah } from '@/lib/qris'
import { RefreshCw, CheckCircle, AlertCircle, TrendingDown } from 'lucide-react'

export default function RekonsiliasiPage() {
  const [qrisData, setQrisData] = useState<any[]>([])
  const [overallStats, setOverallStats] = useState<any[]>([])
  const [totalData, setTotalData] = useState(0)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Master Data States
  const [kementerian, setKementerian] = useState<any[]>([])
  const [jenisTransaksi, setJenisTransaksi] = useState<any[]>([])
  const [programEvent, setProgramEvent] = useState<any[]>([])

  // Bulk Assign States
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkKem, setBulkKem] = useState<string>('')
  const [bulkJenis, setBulkJenis] = useState<string>('')
  const [bulkProgram, setBulkProgram] = useState<string>('')
  const [bulkSaving, setBulkSaving] = useState(false)

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const limit = 50

  useEffect(() => {
    loadQris()
    setSelectedIds([]) // Reset selection on page or filter change
  }, [page, statusFilter, sortBy, sortOrder, dateFrom, dateTo])

  useEffect(() => {
    loadLogs()
    loadMasterData()
  }, [])

  const loadMasterData = async () => {
    try {
      const [k, j, pe] = await Promise.all([
        fetch('/api/master?entity=kementerian').then(r => r.json()),
        fetch('/api/master?entity=jenis-transaksi').then(r => r.json()),
        fetch('/api/master?entity=program-event').then(r => r.json()),
      ])
      setKementerian(k.data || [])
      setJenisTransaksi(j.data || [])
      setProgramEvent(pe.data || [])
    } catch (e) {
      console.error("Gagal memuat master data")
    }
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadQris = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    params.append('page', page.toString())
    if (statusFilter) params.append('status', statusFilter)
    if (sortBy) {
      params.append('sort_by', sortBy)
      params.append('sort_order', sortOrder)
    }
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    const res = await fetch(`/api/qris?${params.toString()}`)
    const d = await res.json()
    setQrisData(d.data || [])
    setTotalData(d.count || 0)
    if (d.stats) setOverallStats(d.stats)
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

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(qrisData.map(q => q.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const applyBulkEdit = async () => {
    if (selectedIds.length === 0) return
    if (!bulkKem && !bulkJenis && !bulkProgram) {
      showToast("Pilih setidaknya satu data yang ingin diubah", "error")
      return
    }

    setBulkSaving(true)
    const token = localStorage.getItem('admin_token')

    const updates: any = {}
    if (bulkKem) updates.kementerian_id = bulkKem
    if (bulkJenis) updates.jenis_transaksi_id = bulkJenis
    if (bulkProgram) updates.program_event_id = bulkProgram

    try {
      const res = await fetch('/api/qris', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds, updates })
      })

      if (!res.ok) throw new Error("Gagal menyimpan data")

      showToast(`Berhasil mengubah ${selectedIds.length} data`)
      setSelectedIds([])
      setBulkKem('')
      setBulkJenis('')
      setBulkProgram('')
      loadQris() // reload data
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setBulkSaving(false)
  }

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} data terpilih?`)) return

    setBulkSaving(true)
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch('/api/qris', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds })
      })
      if (!res.ok) throw new Error("Gagal menghapus data")

      showToast(`Berhasil menghapus ${selectedIds.length} data`)
      setSelectedIds([])
      loadQris()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setBulkSaving(false)
  }

  const statusCount = {
    pending: overallStats.filter(q => q.status === 'pending').length,
    matched: overallStats.filter(q => q.status === 'matched').length,
    cek_manual: overallStats.filter(q => q.status === 'cek_manual').length,
  }

  const totalQris = overallStats.reduce((s, q) => s + q.amount, 0)
  const totalMatched = overallStats.filter(q => q.status === 'matched').reduce((s, q) => s + q.amount, 0)

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
          <div className="px-5 py-4 border-b flex flex-wrap gap-4 items-center justify-between" style={{ borderColor: 'var(--bg-border)' }}>
            <h2 className="font-semibold text-sm">Data QRIS</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="input-dark text-xs py-1.5" />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>s/d</span>
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="input-dark text-xs py-1.5" />
              </div>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="input-dark text-xs py-1.5"
                style={{ width: 140 }}
              >
                <option value="">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="matched">Matched</option>
                <option value="cek_manual">Cek Manual</option>
                <option value="valid">Valid</option>
              </select>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="px-5 py-3 border-b flex flex-wrap gap-4 items-center justify-between" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'var(--bg-border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  {selectedIds.length} dipilih
                </span>
                <span className="text-xs text-secondary ml-2">Terapkan aksi massal:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select className="input-dark text-xs py-1" style={{ width: 140 }} value={bulkKem} onChange={e => setBulkKem(e.target.value)}>
                  <option value="">— Kementerian —</option>
                  {kementerian.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
                <select className="input-dark text-xs py-1" style={{ width: 140 }} value={bulkJenis} onChange={e => setBulkJenis(e.target.value)}>
                  <option value="">— Jenis —</option>
                  {jenisTransaksi.map((j: any) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                </select>
                <select className="input-dark text-xs py-1" style={{ width: 140 }} value={bulkProgram} onChange={e => setBulkProgram(e.target.value)}>
                  <option value="">— Program Event —</option>
                  {programEvent.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
                <button onClick={applyBulkEdit} disabled={bulkSaving} className="btn-primary py-1 px-4 text-xs font-medium h-[28px]">
                  {bulkSaving ? 'Menyimpan...' : 'Terapkan'}
                </button>
                <button onClick={deleteSelected} disabled={bulkSaving} className="py-1 px-4 text-xs font-medium h-[28px] bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded border border-red-500/20 transition-colors">
                  Hapus
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0" style={{ background: 'var(--bg-card)' }}>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <th className="px-4 py-2 w-[40px] text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/50"
                      checked={qrisData.length > 0 && selectedIds.length === qrisData.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-4 py-2 uppercase font-medium cursor-pointer hover:text-white transition-colors" style={{ color: sortBy === 'created_date' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} onClick={() => { setSortBy('created_date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}>
                    Tanggal {sortBy === 'created_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-2 uppercase font-medium cursor-pointer hover:text-white transition-colors" style={{ color: sortBy === 'merchant_name' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} onClick={() => { setSortBy('merchant_name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}>
                    Merchant {sortBy === 'merchant_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-right px-4 py-2 uppercase font-medium cursor-pointer hover:text-white transition-colors" style={{ color: sortBy === 'amount' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} onClick={() => { setSortBy('amount'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}>
                    Jumlah {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-2 uppercase font-medium cursor-pointer hover:text-white transition-colors" style={{ color: sortBy === 'kementerian_id' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} onClick={() => { setSortBy('kementerian_id'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}>
                    Kementerian {sortBy === 'kementerian_id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-2 uppercase font-medium cursor-pointer hover:text-white transition-colors" style={{ color: sortBy === 'jenis_transaksi_id' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} onClick={() => { setSortBy('jenis_transaksi_id'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}>
                    Jenis {sortBy === 'jenis_transaksi_id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-2 uppercase font-medium cursor-pointer hover:text-white transition-colors" style={{ color: sortBy === 'program_event_id' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} onClick={() => { setSortBy('program_event_id'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}>
                    Kegiatan {sortBy === 'program_event_id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-2 uppercase font-medium cursor-pointer hover:text-white transition-colors" style={{ color: sortBy === 'status' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} onClick={() => { setSortBy('status'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}>
                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10"><div className="spinner mx-auto" /></td></tr>
                ) : qrisData.map(q => (
                  <tr key={q.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/50"
                        checked={selectedIds.includes(q.id)}
                        onChange={() => toggleSelect(q.id)}
                      />
                    </td>
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
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {q.program_event?.nama || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs ${q.status === 'matched' ? 'badge-valid' :
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
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--bg-border)' }}>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Menampilkan {qrisData.length} dari {totalData} data
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded text-xs disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= totalData}
                className="px-3 py-1.5 rounded text-xs disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Selanjutnya
              </button>
            </div>
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
