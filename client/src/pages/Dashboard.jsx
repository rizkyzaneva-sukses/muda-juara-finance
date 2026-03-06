import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatRupiah, formatDate, statusBadge } from '../lib/format';
import { TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

function SaldoCard({ label, amount, sub, color = 'text-white' }) {
  return (
    <div className="card">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-2xl font-display font-bold ${color}`}>{formatRupiah(amount)}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

function RincianRow({ item, level = 0, totalSisa }) {
  const [open, setOpen] = useState(level === 0);
  const sisa = (item.qris || 0) + (item.transfer || 0) - (item.pengeluaran || 0);
  const pct = totalSisa > 0 ? ((sisa / totalSisa) * 100).toFixed(1) : 0;
  const hasChildren = item.jenis && Object.keys(item.jenis).length > 0;

  const indent = level * 20;

  return (
    <>
      <tr
        className={`border-b border-white/5 hover:bg-white/2 transition-colors ${level === 0 ? 'bg-dark-700/50' : ''}`}
        onClick={() => hasChildren && setOpen(!open)}
      >
        <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + indent}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren && (
              <span className="text-white/30">
                {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
            )}
            <span className={`text-sm font-medium ${level === 0 ? 'text-white/90' : 'text-white/70'}`}>
              {item.kementerian ? (
                <>{item.kementerian.nama} <span className="text-white/30 text-xs ml-1">{item.kementerian.kode}</span></>
              ) : 'Tanpa Kementerian'}
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-sm text-white/40">{item.txn || 0}</td>
        <td className="px-4 py-2.5 text-right font-mono text-sm text-emerald-400">{item.qris > 0 ? formatRupiah(item.qris) : '—'}</td>
        <td className="px-4 py-2.5 text-right font-mono text-sm text-blue-400">{item.transfer > 0 ? formatRupiah(item.transfer) : '—'}</td>
        <td className="px-4 py-2.5 text-right font-mono text-sm text-red-400">{item.pengeluaran > 0 ? formatRupiah(item.pengeluaran) : '—'}</td>
        <td className="px-4 py-2.5 text-right font-mono text-sm text-gold-400 font-semibold">{formatRupiah(sisa)}</td>
        <td className="px-4 py-2.5 text-right text-xs text-white/30">{pct}%</td>
      </tr>

      {open && hasChildren && Object.values(item.jenis).map((jt, i) => (
        <JenisRow key={i} item={jt} level={level + 1} totalSisa={totalSisa} />
      ))}
    </>
  );
}

function JenisRow({ item, level, totalSisa }) {
  const [open, setOpen] = useState(false);
  const sisa = (item.qris || 0) + (item.transfer || 0) - (item.pengeluaran || 0);
  const pct = totalSisa > 0 ? ((sisa / totalSisa) * 100).toFixed(1) : 0;
  const hasChildren = item.programs && Object.keys(item.programs).length > 0;
  const indent = level * 20;

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/2 cursor-pointer"
        onClick={() => hasChildren && setOpen(!open)}
      >
        <td className="px-4 py-2" style={{ paddingLeft: `${16 + indent}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren && (
              <span className="text-white/20">{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
            )}
            <span className="text-xs text-white/60">
              {item.isKeluar ? (
                <span className="text-red-400/70">↑ {item.kategori?.nama || 'Pengeluaran'}</span>
              ) : (
                <>{item.jenis?.nama || 'Tanpa Jenis'} {item.jenis && <span className="text-white/20 ml-1">{item.jenis.kode}</span>}</>
              )}
            </span>
          </div>
        </td>
        <td className="px-4 py-2 text-right font-mono text-xs text-white/30">{item.txn || 0}</td>
        <td className="px-4 py-2 text-right font-mono text-xs text-emerald-400/70">{item.qris > 0 ? formatRupiah(item.qris) : '—'}</td>
        <td className="px-4 py-2 text-right font-mono text-xs text-blue-400/70">{item.transfer > 0 ? formatRupiah(item.transfer) : '—'}</td>
        <td className="px-4 py-2 text-right font-mono text-xs text-red-400/70">{item.pengeluaran > 0 ? formatRupiah(item.pengeluaran) : '—'}</td>
        <td className="px-4 py-2 text-right font-mono text-xs text-gold-400/70">{formatRupiah(sisa)}</td>
        <td className="px-4 py-2 text-right text-xs text-white/20">{pct}%</td>
      </tr>

      {open && hasChildren && Object.values(item.programs).map((prog, i) => (
        <ProgramRow key={i} item={prog} level={level + 1} totalSisa={totalSisa} />
      ))}
    </>
  );
}

function ProgramRow({ item, level, totalSisa }) {
  const sisa = (item.qris || 0) + (item.transfer || 0) - (item.pengeluaran || 0);
  const pct = totalSisa > 0 ? ((sisa / totalSisa) * 100).toFixed(1) : 0;
  const indent = level * 20;

  return (
    <tr className="border-b border-white/3 hover:bg-white/1">
      <td className="px-4 py-1.5" style={{ paddingLeft: `${16 + indent}px` }}>
        <span className="text-xs text-white/40">
          {item.program ? `◦ ${item.program.nama}` : '◦ (Belum diassign)'}
        </span>
      </td>
      <td className="px-4 py-1.5 text-right font-mono text-xs text-white/20">{item.txn || 0}</td>
      <td className="px-4 py-1.5 text-right font-mono text-xs text-emerald-400/50">{item.qris > 0 ? formatRupiah(item.qris) : '—'}</td>
      <td className="px-4 py-1.5 text-right font-mono text-xs text-blue-400/50">{item.transfer > 0 ? formatRupiah(item.transfer) : '—'}</td>
      <td className="px-4 py-1.5 text-right font-mono text-xs text-red-400/50">{item.pengeluaran > 0 ? formatRupiah(item.pengeluaran) : '—'}</td>
      <td className="px-4 py-1.5 text-right font-mono text-xs text-gold-400/50">{formatRupiah(sisa)}</td>
      <td className="px-4 py-1.5 text-right text-xs text-white/20">{pct}%</td>
    </tr>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [rincian, setRincian] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/transaksi/dashboard-summary'),
      api.get('/laporan/rincian')
    ]).then(([s, r]) => {
      setSummary(s.data);
      setRincian(r.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
    </div>
  );

  const saldoBerjalan = (summary?.totalMasuk || 0) - (summary?.totalKeluar || 0);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Dashboard Keuangan</h1>
        <p className="text-sm text-white/40 mt-1">Kabinet Muda Juara — Rekap Keuangan</p>
      </div>

      {/* Saldo Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <SaldoCard label="SALDO BSI" amount={summary?.saldo?.bsi || 0} color="text-emerald-400" />
        <SaldoCard label="SALDO BCA SYARIAH" amount={summary?.saldo?.bca || 0} color="text-blue-400" />
        <SaldoCard label="TOTAL SALDO" amount={summary?.saldo?.total || 0} color="text-gold-400" />
        <div className="card">
          <div className="text-xs text-white/40 mb-1">TOTAL MASUK</div>
          <div className="text-2xl font-display font-bold text-emerald-400">{formatRupiah(summary?.totalMasuk || 0)}</div>
          <div className="text-xs text-white/30 mt-1">{summary?.countMasuk || 0} transaksi</div>
        </div>
        <div className="card">
          <div className="text-xs text-white/40 mb-1">TOTAL KELUAR</div>
          <div className="text-2xl font-display font-bold text-red-400">{formatRupiah(summary?.totalKeluar || 0)}</div>
          <div className="text-xs text-white/30 mt-1">{summary?.countKeluar || 0} transaksi</div>
        </div>
        <div className="card">
          <div className="text-xs text-white/40 mb-1">SALDO BERJALAN</div>
          <div className="text-2xl font-display font-bold text-gold-400">{formatRupiah(saldoBerjalan)}</div>
        </div>
      </div>

      {/* Rincian Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="font-display font-semibold text-white text-sm">Rincian per Kementerian & Program</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-2.5 text-xs text-white/30 font-semibold uppercase tracking-wide">KEMENTERIAN / JENIS / PROGRAM</th>
                <th className="text-right px-4 py-2.5 text-xs text-white/30 font-semibold uppercase tracking-wide">TXN</th>
                <th className="text-right px-4 py-2.5 text-xs text-emerald-400/60 font-semibold uppercase tracking-wide">QRIS</th>
                <th className="text-right px-4 py-2.5 text-xs text-blue-400/60 font-semibold uppercase tracking-wide">TRANSFER</th>
                <th className="text-right px-4 py-2.5 text-xs text-red-400/60 font-semibold uppercase tracking-wide">PENGELUARAN</th>
                <th className="text-right px-4 py-2.5 text-xs text-gold-400/60 font-semibold uppercase tracking-wide">SISA</th>
                <th className="text-right px-4 py-2.5 text-xs text-white/30 font-semibold uppercase tracking-wide">%</th>
              </tr>
            </thead>
            <tbody>
              {rincian?.hierarchy?.map((item, i) => (
                <RincianRow key={i} item={item} level={0} totalSisa={rincian?.totals?.sisa || 0} />
              ))}
              {(!rincian?.hierarchy || rincian.hierarchy.length === 0) && (
                <tr><td colSpan={7} className="text-center py-8 text-white/30 text-sm">Belum ada data</td></tr>
              )}
            </tbody>
            {rincian?.totals && (
              <tfoot>
                <tr className="border-t border-white/10 bg-dark-600/50">
                  <td className="px-4 py-3 text-sm font-display font-bold text-white">TOTAL KESELURUHAN</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white/50"></td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-emerald-400 font-bold">{formatRupiah(rincian.totals.qris)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-blue-400 font-bold">{formatRupiah(rincian.totals.transfer)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-red-400 font-bold">{formatRupiah(rincian.totals.pengeluaran)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-gold-400 font-bold">{formatRupiah(rincian.totals.sisa)}</td>
                  <td className="px-4 py-3 text-right text-xs text-white/30">100%</td>
                </tr>
                <tr className="bg-dark-600/30">
                  <td colSpan={7} className="px-4 py-2 text-xs text-white/30 text-center">
                    Sisa = {formatRupiah(rincian.totals.sisa)} (Total Masuk {formatRupiah(rincian.totals.totalMasuk)} − Pengeluaran {formatRupiah(rincian.totals.pengeluaran)})
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="font-display font-semibold text-white text-sm">10 Transaksi Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-2 text-xs text-white/30">TANGGAL</th>
                <th className="text-left px-4 py-2 text-xs text-white/30">KETERANGAN</th>
                <th className="text-left px-4 py-2 text-xs text-white/30">PROGRAM</th>
                <th className="text-right px-4 py-2 text-xs text-white/30">JUMLAH</th>
                <th className="text-center px-4 py-2 text-xs text-white/30">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {summary?.recentTransactions?.map((t) => {
                const { label, cls } = statusBadge(t.status);
                return (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-2.5 text-xs text-white/50 whitespace-nowrap">{formatDate(t.tanggal)}</td>
                    <td className="px-4 py-2.5 text-xs text-white/70 max-w-xs truncate">{t.keterangan}</td>
                    <td className="px-4 py-2.5 text-xs text-white/40">{t.program_nama || t.jenis_nama || t.kategori_nama || '—'}</td>
                    <td className={`px-4 py-2.5 text-right text-sm font-mono font-semibold ${t.tipe === 'masuk' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.tipe === 'masuk' ? '+' : '-'}{formatRupiah(t.jumlah)}
                    </td>
                    <td className="px-4 py-2.5 text-center"><span className={cls}>{label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
