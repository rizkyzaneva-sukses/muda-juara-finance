'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { formatRupiah } from '@/lib/qris'
import { FileText, TrendingUp, TrendingDown, Calendar, Briefcase, ChevronLeft, ChevronRight, Download } from 'lucide-react'

export default function LaporanPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    kementerian_id: '',
    program_event_id: '',
    sumber: ''
  })
  const [kementerianOptions, setKementerianOptions] = useState<any[]>([])
  const [programOptions, setProgramOptions] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [filters])

  useEffect(() => {
    fetchMasterData()
  }, [])

  const fetchMasterData = async () => {
    try {
      const [kemRes, progRes] = await Promise.all([
        fetch('/api/master?entity=kementerian').then(r => r.json()),
        fetch('/api/master?entity=program-event').then(r => r.json())
      ])
      setKementerianOptions(kemRes.data || [])
      setProgramOptions(progRes.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
    try {
      const res = await fetch(`/api/laporan?${params}`)
      const d = await res.json()
      setData(d)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              <FileText style={{ color: 'var(--accent-gold)' }} /> Laporan Keuangan
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Ringkasan transaksi dan mutasi kas
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              * Seluruh angka pemasukan dari QRIS sudah dipotong biaya MDR 0.7% (Nilai Netto)
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <input
            type="date"
            value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
            className="input-dark text-xs"
            placeholder="Dari Tanggal"
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>s/d</span>
          <input
            type="date"
            value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
            className="input-dark text-xs"
            placeholder="Sampai Tanggal"
          />
          <select
            value={filters.kementerian_id}
            onChange={e => setFilters(f => ({ ...f, kementerian_id: e.target.value }))}
            className="input-dark text-xs"
            style={{ width: 180 }}
          >
            <option value="">Semua Kementerian</option>
            {kementerianOptions.map(k => (
              <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>
            ))}
          </select>
          <select
            value={filters.program_event_id}
            onChange={e => setFilters(f => ({ ...f, program_event_id: e.target.value }))}
            className="input-dark text-xs"
            style={{ width: 180 }}
          >
            <option value="">Semua Kegiatan / Event</option>
            {programOptions.map(p => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
          <select
            value={filters.sumber}
            onChange={e => setFilters(f => ({ ...f, sumber: e.target.value }))}
            className="input-dark text-xs"
            style={{ width: 140 }}
          >
            <option value="">Semua Sumber</option>
            <option value="BCA">BCA Syariah</option>
            <option value="BSI">BSI</option>
            <option value="manual">Manual</option>
          </select>

          {Object.values(filters).some(v => v) && (
            <button
              onClick={() => setFilters({ date_from: '', date_to: '', kementerian_id: '', program_event_id: '', sumber: '' })}
              className="text-xs px-3 py-1.5 rounded ml-auto flex items-center gap-1"
              style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}
            >
              Reset Filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><div className="spinner mx-auto" /></div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5 hidden-scrollbar overflow-x-auto relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-500/10 border border-green-500/20">
                    <TrendingUp style={{ color: '#22c55e' }} size={20} />
                  </div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Pemasukan</h3>
                </div>
                <p className="text-2xl font-bold font-mono text-green-500 mt-2">
                  +{formatRupiah(data?.summary?.total_masuk || 0)}
                </p>
                <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Total {data?.transaksi?.filter((t: any) => t.tipe === 'masuk').length || 0} transaksi
                </div>
              </div>

              <div className="card p-5 hidden-scrollbar overflow-x-auto relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20">
                    <TrendingDown style={{ color: '#ef4444' }} size={20} />
                  </div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Pengeluaran</h3>
                </div>
                <p className="text-2xl font-bold font-mono text-red-500 mt-2">
                  -{formatRupiah(data?.summary?.total_keluar || 0)}
                </p>
                <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Total {data?.transaksi?.filter((t: any) => t.tipe === 'keluar').length || 0} transaksi
                </div>
              </div>

              <div className="card p-5 hidden-scrollbar overflow-x-auto relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: 'var(--accent-gold)' }}></div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center border" style={{ background: 'rgba(240,165,0,0.1)', borderColor: 'rgba(240,165,0,0.2)' }}>
                    <Briefcase style={{ color: 'var(--accent-gold)' }} size={20} />
                  </div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Saldo Bersih</h3>
                </div>
                <p className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--text-primary)' }}>
                  {formatRupiah(data?.summary?.saldo || 0)}
                </p>
                <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Dari total {data?.summary?.total_transaksi || 0} transaksi terpilih
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Laporan Per Kementerian */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--bg-border)' }}>
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <Briefcase size={16} style={{ color: 'var(--accent-gold)' }} /> By Kementerian
                  </h2>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm relative">
                    <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-secondary)' }}>
                      <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                        <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Kementerian</th>
                        <th className="text-right px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Pemasukan</th>
                        <th className="text-right px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Pengeluaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.by_kementerian?.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-8 text-xs" style={{ color: 'var(--text-secondary)' }}>Tidak ada data</td></tr>
                      ) : data?.by_kementerian?.map((k: any, i: number) => (
                        <tr key={i} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="px-5 py-3 text-xs max-w-[200px] truncate">
                            {k.kementerian_kode && <span className="font-mono mr-2" style={{ color: 'var(--accent-gold)' }}>{k.kementerian_kode}</span>}
                            <span>{k.kementerian_nama}</span>
                            <div className="text-[10px] mt-1 opacity-70">
                              {k.count_masuk + k.count_keluar} transaksi
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-mono text-green-500">
                            +{formatRupiah(k.total_masuk)}
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-mono text-red-500">
                            -{formatRupiah(k.total_keluar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Laporan Per Kegiatan / Event */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--bg-border)' }}>
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <Briefcase size={16} style={{ color: 'var(--accent-gold)' }} /> By Kegiatan / Event
                  </h2>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm relative">
                    <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-secondary)' }}>
                      <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                        <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Kegiatan</th>
                        <th className="text-right px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Pemasukan</th>
                        <th className="text-right px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Pengeluaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.by_program?.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-8 text-xs" style={{ color: 'var(--text-secondary)' }}>Tidak ada data</td></tr>
                      ) : data?.by_program?.map((p: any, i: number) => (
                        <tr key={i} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="px-5 py-3 text-xs max-w-[200px] truncate">
                            <span>{p.program_nama}</span>
                            <div className="text-[10px] mt-1 opacity-70">
                              {p.count_masuk + p.count_keluar} transaksi
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-mono text-green-500">
                            +{formatRupiah(p.total_masuk)}
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-mono text-red-500">
                            -{formatRupiah(p.total_keluar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Laporan Per Bulan */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--bg-border)' }}>
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar size={16} style={{ color: 'var(--accent-gold)' }} /> By Bulan
                  </h2>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm relative">
                    <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-secondary)' }}>
                      <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                        <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Bulan</th>
                        <th className="text-right px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Pemasukan</th>
                        <th className="text-right px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Pengeluaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.by_month?.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-8 text-xs" style={{ color: 'var(--text-secondary)' }}>Tidak ada data</td></tr>
                      ) : data?.by_month?.map((m: any, i: number) => {
                        const date = new Date(m.month + '-01')
                        const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                        return (
                          <tr key={i} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td className="px-5 py-3 text-xs">
                              <div className="font-medium">{monthName}</div>
                              <div className="text-[10px] mt-1 opacity-70">
                                {m.count} transaksi
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-mono text-green-500">
                              +{formatRupiah(m.total_masuk)}
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-mono text-red-500">
                              -{formatRupiah(m.total_keluar)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
