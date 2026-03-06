import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatRupiah, formatDate, formatDatetime } from '../lib/format';
import { RefreshCw, CheckCircle, AlertTriangle, Download } from 'lucide-react';

export default function RekonsiliasiPage() {
  const [qris, setQris] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filters, setFilters] = useState({ status: '', dari: '', sampai: '', search: '' });
  const [masterData, setMasterData] = useState({ kementerian: [], jenis: [], programs: [] });
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    loadData();
    api.get('/master/kementerian').then(r => setMasterData(m => ({ ...m, kementerian: r.data })));
    api.get('/master/jenis-transaksi').then(r => setMasterData(m => ({ ...m, jenis: r.data })));
    api.get('/master/program-event').then(r => setMasterData(m => ({ ...m, programs: r.data })));
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [qrisRes, logsRes] = await Promise.all([
      api.get('/qris'),
      api.get('/qris/rekonsiliasi/logs')
    ]);
    setQris(qrisRes.data.data);
    setStats(qrisRes.data.stats);
    setLogs(logsRes.data);
    setLoading(false);
  };

  const runRekon = async () => {
    setRunning(true);
    await api.post('/qris/rekonsiliasi/run');
    await loadData();
    setRunning(false);
  };

  const updateQRIS = async (id, data) => {
    await api.put(`/qris/${id}`, data);
    loadData();
  };

  const filtered = qris.filter(q => {
    if (filters.status && q.status !== filters.status) return false;
    if (filters.search && !q.merchant_name?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Rekonsiliasi QRIS</h1>
          <p className="text-sm text-white/40 mt-1">Cocokkan transaksi QRIS dengan pencairan BCA Syariah</p>
        </div>
        <button onClick={runRekon} disabled={running} className="btn-primary flex items-center gap-2">
          <RefreshCw size={14} className={running ? 'animate-spin' : ''} />
          {running ? 'Memproses...' : 'Jalankan Rekonsiliasi'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card text-center">
            <div className="text-2xl font-display font-bold text-white">{stats.total}</div>
            <div className="text-xs text-white/40 mt-1">Total QRIS</div>
            <div className="text-xs text-emerald-400 mt-0.5">{formatRupiah(stats.total_amount)}</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-display font-bold text-emerald-400">{stats.matched}</div>
            <div className="text-xs text-white/40 mt-1">Matched</div>
            <div className="text-xs text-emerald-400/60 mt-0.5">{formatRupiah(stats.matched_amount)}</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-display font-bold text-amber-400">{stats.pending}</div>
            <div className="text-xs text-white/40 mt-1">Pending</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-display font-bold text-red-400">{stats.cek_manual}</div>
            <div className="text-xs text-white/40 mt-1">Cek Manual</div>
          </div>
        </div>
      )}

      {/* Rekonsiliasi Logs */}
      {logs.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="font-display font-semibold text-white text-sm">Log Rekonsiliasi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-2 text-xs text-white/30">TANGGAL</th>
                  <th className="text-right px-4 py-2 text-xs text-emerald-400/60">TOTAL QRIS</th>
                  <th className="text-right px-4 py-2 text-xs text-blue-400/60">CAIR BCA</th>
                  <th className="text-right px-4 py-2 text-xs text-red-400/60">SELISIH (BIAYA)</th>
                  <th className="text-right px-4 py-2 text-xs text-white/30">%</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-2 text-xs text-white/60">{formatDate(log.tanggal_rekonsiliasi)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-emerald-400">{formatRupiah(log.total_qris)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-blue-400">{formatRupiah(log.total_cair_bank)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-red-400">{formatRupiah(log.selisih)}</td>
                    <td className="px-4 py-2 text-right text-xs text-white/40">
                      {log.persentase_biaya ? `${(parseFloat(log.persentase_biaya) * 100).toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QRIS List */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h2 className="font-display font-semibold text-white text-sm">Data QRIS</h2>
          <div className="flex gap-2">
            <input
              placeholder="Cari merchant..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="input text-xs py-1.5 w-40"
            />
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="select text-xs py-1.5 w-32">
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="matched">Matched</option>
              <option value="cek_manual">Cek Manual</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full">
            <thead className="sticky top-0 bg-dark-700">
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-2 text-xs text-white/30">WAKTU</th>
                <th className="text-left px-4 py-2 text-xs text-white/30">MERCHANT</th>
                <th className="text-right px-4 py-2 text-xs text-white/30">NOMINAL</th>
                <th className="text-left px-4 py-2 text-xs text-white/30">KEMENTERIAN</th>
                <th className="text-left px-4 py-2 text-xs text-white/30">JENIS</th>
                <th className="text-center px-4 py-2 text-xs text-white/30">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="border-b border-white/5 hover:bg-white/2">
                  <td className="px-4 py-2 text-xs text-white/50 whitespace-nowrap">{formatDatetime(q.created_date)}</td>
                  <td className="px-4 py-2 text-xs text-white/70">{q.merchant_name}</td>
                  <td className="px-4 py-2 text-right font-mono text-sm text-emerald-400 font-semibold">{formatRupiah(q.amount)}</td>
                  <td className="px-4 py-2 text-xs text-white/40">{q.kementerian_nama || '—'}</td>
                  <td className="px-4 py-2 text-xs text-white/40">{q.jenis_nama || '—'}</td>
                  <td className="px-4 py-2 text-center">
                    {q.status === 'matched' ? (
                      <span className="badge-valid">✓ Matched</span>
                    ) : q.status === 'cek_manual' ? (
                      <span className="badge-manual">⚠ Cek Manual</span>
                    ) : (
                      <span className="badge-koreksi">⏳ Pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-white/30 text-sm">Belum ada data QRIS</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
