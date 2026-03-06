'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { formatRupiah } from '@/lib/qris'
import {
  TrendingUp, TrendingDown, Wallet, Building2,
  ChevronDown, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react'

interface Stats {
  saldo_bca: number
  saldo_bsi: number
  total_saldo: number
  total_masuk: number
  total_keluar: number
  saldo_berjalan: number
  jumlah_transaksi_masuk: number
  jumlah_transaksi_keluar: number
  cek_manual_count: number
}

interface Rincian {
  kementerian_id: number | null
  kementerian_kode: string | null
  kementerian_nama: string
  jenis_id: number | null
  jenis_kode: string | null
  jenis_nama: string | null
  program_id: number | null
  program_nama: string | null
  txn: number
  qris: number
  transfer: number
  pengeluaran: number
  sisa: number
  persen: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [rincian, setRincian] = useState<Rincian[]>([])
  const [recentTrx, setRecentTrx] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedKem, setExpandedKem] = useState<Set<string>>(new Set())
  const [expandedJenis, setExpandedJenis] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      setStats(data.stats)
      setRincian(data.rincian || [])
      setRecentTrx(data.recent_transaksi || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  // Group rincian by kementerian → jenis → program
  const grouped = rincian.reduce((acc, r) => {
    const kemKey = r.kementerian_id?.toString() || 'tanpa'
    if (!acc[kemKey]) {
      acc[kemKey] = {
        kementerian_id: r.kementerian_id,
        kementerian_kode: r.kementerian_kode,
        kementerian_nama: r.kementerian_nama,
        jenis: {} as Record<string, any>,
        txn: 0, qris: 0, transfer: 0, pengeluaran: 0, sisa: 0, persen: 0
      }
    }
    const jenisKey = r.jenis_id?.toString() || 'tanpa'
    if (!acc[kemKey].jenis[jenisKey]) {
      acc[kemKey].jenis[jenisKey] = {
        jenis_id: r.jenis_id,
        jenis_kode: r.jenis_kode,
        jenis_nama: r.jenis_nama,
        programs: [],
        txn: 0, qris: 0, transfer: 0, pengeluaran: 0, sisa: 0
      }
    }
    acc[kemKey].jenis[jenisKey].programs.push(r)
    acc[kemKey].jenis[jenisKey].txn += r.txn
    acc[kemKey].jenis[jenisKey].qris += r.qris
    acc[kemKey].jenis[jenisKey].transfer += r.transfer
    acc[kemKey].jenis[jenisKey].pengeluaran += r.pengeluaran
    acc[kemKey].jenis[jenisKey].sisa += r.sisa
    acc[kemKey].txn += r.txn
    acc[kemKey].qris += r.qris
    acc[kemKey].transfer += r.transfer
    acc[kemKey].pengeluaran += r.pengeluaran
    acc[kemKey].sisa += r.sisa
    return acc
  }, {} as Record<string, any>)

  const totalSisa = Object.values(grouped).reduce((sum: number, g: any) => sum + g.sisa, 0)
  Object.values(grouped).forEach((g: any) => {
    g.persen = totalSisa > 0 ? Math.round((g.sisa / totalSisa) * 1000) / 10 : 0
  })

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Ringkasan keuangan Kabinet Muda Juara
            </p>
          </div>
          <button onClick={fetchDashboard} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Alert cek manual */}
        {stats && stats.cek_manual_count > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
            <AlertCircle size={16} style={{ color: '#eab308' }} />
            <span className="text-sm" style={{ color: '#eab308' }}>
              {stats.cek_manual_count} transaksi perlu dikoreksi
            </span>
            <a href="/koreksi" className="text-xs underline ml-auto" style={{ color: '#eab308' }}>Lihat →</a>
          </div>
        )}

        {/* Saldo cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Saldo BSI</span>
              <Building2 size={16} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--accent-green)' }}>
              {formatRupiah(stats?.saldo_bsi || 0)}
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Saldo BCA Syariah</span>
              <Building2 size={16} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--accent-blue)' }}>
              {formatRupiah(stats?.saldo_bca || 0)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Termasuk QRIS netto (potong MDR 0.7%)
            </div>
          </div>
          <div className="card p-5" style={{ border: '1px solid rgba(240,165,0,0.2)', background: 'rgba(240,165,0,0.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Total Saldo</span>
              <Wallet size={16} style={{ color: 'var(--accent-gold)' }} />
            </div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--accent-gold)' }}>
              {formatRupiah(stats?.total_saldo || 0)}
            </div>
          </div>
        </div>

        {/* Masuk/Keluar/Berjalan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} style={{ color: 'var(--accent-green)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Masuk</span>
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--accent-green)' }}>
              {formatRupiah(stats?.total_masuk || 0)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {stats?.jumlah_transaksi_masuk || 0} transaksi
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} style={{ color: 'var(--accent-red)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Keluar</span>
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--accent-red)' }}>
              {formatRupiah(stats?.total_keluar || 0)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {stats?.jumlah_transaksi_keluar || 0} transaksi
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={14} style={{ color: 'var(--accent-yellow)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Saldo Berjalan</span>
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--accent-yellow)' }}>
              {formatRupiah(stats?.saldo_berjalan || 0)}
            </div>
          </div>
        </div>

        {/* Rincian Table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-border)' }}>
            <h2 className="font-semibold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
              Rincian per Kementerian & Program
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Kementerian / Jenis / Program
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>TXN</th>
                  <th className="text-right px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: '#22c55e' }}>QRIS</th>
                  <th className="text-right px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: '#3b82f6' }}>TRANSFER</th>
                  <th className="text-right px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: '#ef4444' }}>PENGELUARAN</th>
                  <th className="text-right px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: '#eab308' }}>SISA</th>
                  <th className="text-right px-5 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([kemKey, kem]: [string, any]) => (
                  <>
                    {/* Kementerian row */}
                    <tr
                      key={`kem-${kemKey}`}
                      className="table-row-hover cursor-pointer"
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      onClick={() => {
                        const next = new Set(expandedKem)
                        next.has(kemKey) ? next.delete(kemKey) : next.add(kemKey)
                        setExpandedKem(next)
                      }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {expandedKem.has(kemKey)
                            ? <ChevronDown size={14} style={{ color: 'var(--accent-gold)' }} />
                            : <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
                          }
                          <span className="font-semibold text-sm">
                            {kem.kementerian_nama}
                          </span>
                          {kem.kementerian_kode && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(240,165,0,0.1)', color: 'var(--accent-gold)' }}>
                              {kem.kementerian_kode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{kem.txn}</td>
                      <td className="text-right px-3 py-3 text-xs font-medium" style={{ color: '#22c55e' }}>{kem.qris > 0 ? formatRupiah(kem.qris) : '—'}</td>
                      <td className="text-right px-3 py-3 text-xs font-medium" style={{ color: '#3b82f6' }}>{kem.transfer > 0 ? formatRupiah(kem.transfer) : '—'}</td>
                      <td className="text-right px-3 py-3 text-xs font-medium" style={{ color: '#ef4444' }}>{kem.pengeluaran > 0 ? formatRupiah(kem.pengeluaran) : '—'}</td>
                      <td className="text-right px-3 py-3 text-sm font-bold" style={{ color: '#eab308' }}>{formatRupiah(kem.sisa)}</td>
                      <td className="text-right px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{kem.persen}%</td>
                    </tr>

                    {/* Jenis rows */}
                    {expandedKem.has(kemKey) && Object.entries(kem.jenis).map(([jenisKey, jenis]: [string, any]) => (
                      <>
                        <tr
                          key={`jenis-${kemKey}-${jenisKey}`}
                          className="table-row-hover cursor-pointer"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.01)' }}
                          onClick={() => {
                            const k = `${kemKey}-${jenisKey}`
                            const next = new Set(expandedJenis)
                            next.has(k) ? next.delete(k) : next.add(k)
                            setExpandedJenis(next)
                          }}
                        >
                          <td className="px-5 py-2.5" style={{ paddingLeft: '40px' }}>
                            <div className="flex items-center gap-2">
                              {expandedJenis.has(`${kemKey}-${jenisKey}`)
                                ? <ChevronDown size={12} style={{ color: 'var(--text-secondary)' }} />
                                : <ChevronRight size={12} style={{ color: 'var(--text-secondary)' }} />
                              }
                              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {jenis.jenis_nama || 'Pengeluaran'}
                              </span>
                              {jenis.jenis_kode && (
                                <span className="text-xs px-1.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                  {jenis.jenis_kode}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-right px-3 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{jenis.txn || '—'}</td>
                          <td className="text-right px-3 py-2.5 text-xs" style={{ color: '#22c55e' }}>{jenis.qris > 0 ? formatRupiah(jenis.qris) : '—'}</td>
                          <td className="text-right px-3 py-2.5 text-xs" style={{ color: '#3b82f6' }}>{jenis.transfer > 0 ? formatRupiah(jenis.transfer) : '—'}</td>
                          <td className="text-right px-3 py-2.5 text-xs" style={{ color: '#ef4444' }}>{jenis.pengeluaran > 0 ? formatRupiah(jenis.pengeluaran) : '—'}</td>
                          <td className="text-right px-3 py-2.5 text-xs font-semibold" style={{ color: '#eab308' }}>{formatRupiah(jenis.sisa)}</td>
                          <td className="text-right px-5 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>—</td>
                        </tr>

                        {/* Program rows */}
                        {expandedJenis.has(`${kemKey}-${jenisKey}`) && jenis.programs.map((prog: any, pi: number) => (
                          <tr
                            key={`prog-${pi}`}
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: 'rgba(255,255,255,0.005)' }}
                          >
                            <td className="py-2" style={{ paddingLeft: '64px' }}>
                              <span className="text-xs" style={{ color: prog.program_nama === 'Belum diassign' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                {prog.program_nama === 'Belum diassign' ? '(Belum diassign)' : prog.program_nama}
                              </span>
                            </td>
                            <td className="text-right px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{prog.txn}</td>
                            <td className="text-right px-3 py-2 text-xs" style={{ color: '#22c55e' }}>{prog.qris > 0 ? formatRupiah(prog.qris) : '—'}</td>
                            <td className="text-right px-3 py-2 text-xs" style={{ color: '#3b82f6' }}>{prog.transfer > 0 ? formatRupiah(prog.transfer) : '—'}</td>
                            <td className="text-right px-3 py-2 text-xs" style={{ color: '#ef4444' }}>{prog.pengeluaran > 0 ? formatRupiah(prog.pengeluaran) : '—'}</td>
                            <td className="text-right px-3 py-2 text-xs" style={{ color: '#eab308' }}>{formatRupiah(prog.sisa)}</td>
                            <td className="text-right px-5 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{prog.persen}%</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </>
                ))}

                {/* Total row */}
                <tr style={{ borderTop: '2px solid var(--bg-border)', background: 'rgba(255,255,255,0.03)' }}>
                  <td className="px-5 py-3 font-bold text-sm">TOTAL KESELURUHAN</td>
                  <td className="text-right px-3 py-3 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    {rincian.reduce((s, r) => s + r.txn, 0)}
                  </td>
                  <td className="text-right px-3 py-3 text-sm font-bold" style={{ color: '#22c55e' }}>
                    {formatRupiah(rincian.reduce((s, r) => s + r.qris, 0))}
                  </td>
                  <td className="text-right px-3 py-3 text-sm font-bold" style={{ color: '#3b82f6' }}>
                    {formatRupiah(rincian.reduce((s, r) => s + r.transfer, 0))}
                  </td>
                  <td className="text-right px-3 py-3 text-sm font-bold" style={{ color: '#ef4444' }}>
                    {formatRupiah(rincian.reduce((s, r) => s + r.pengeluaran, 0))}
                  </td>
                  <td className="text-right px-3 py-3 text-sm font-bold" style={{ color: '#eab308' }}>
                    {formatRupiah(totalSisa)}
                  </td>
                  <td className="text-right px-5 py-3 text-sm font-bold">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 text-xs border-t" style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}>
            Sisa = <span style={{ color: '#eab308' }}>{formatRupiah(totalSisa)}</span>
            {' '}(Total Masuk {formatRupiah(rincian.reduce((s, r) => s + r.qris + r.transfer, 0))} — Pengeluaran {formatRupiah(rincian.reduce((s, r) => s + r.pengeluaran, 0))})
            <br />
            <span style={{ color: 'var(--text-muted)' }}>* Nominal QRIS sudah dipotong MDR 0.7%</span>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--bg-border)' }}>
            <h2 className="font-semibold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Transaksi Terbaru</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--bg-border)' }}>
            {recentTrx.length === 0 && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                Belum ada transaksi
              </div>
            )}
            {recentTrx.map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: t.tipe === 'masuk' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                    {t.tipe === 'masuk'
                      ? <TrendingUp size={14} style={{ color: '#22c55e' }} />
                      : <TrendingDown size={14} style={{ color: '#ef4444' }} />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate" style={{ maxWidth: '300px' }}>{t.keterangan}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span>{t.tanggal}</span>
                      {t.kementerian && <span>• {t.kementerian.nama}</span>}
                      {t.program_event && <span>• {t.program_event.nama}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-sm font-semibold ${t.tipe === 'masuk' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.tipe === 'masuk' ? '+' : '-'}{formatRupiah(t.jumlah)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded badge-${t.status.replace('_', '-')}`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {recentTrx.length > 0 && (
            <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--bg-border)' }}>
              <a href="/transaksi" className="text-xs" style={{ color: 'var(--accent-gold)' }}>
                Lihat semua transaksi →
              </a>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
