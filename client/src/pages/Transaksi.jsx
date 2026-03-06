import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatRupiah, formatDate, statusBadge } from '../lib/format';
import { Search, Filter, Download } from 'lucide-react';

export default function TransaksiPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ tipe: '', status: '', sumber: '', search: '' });
  const [masterData, setMasterData] = useState({ kementerian: [] });

  useEffect(() => {
    loadData();
  }, [page, filters]);

  useEffect(() => {
    api.get('/master/kementerian').then(r => setMasterData({ kementerian: r.data }));
  }, []);

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 50, ...filters });
    Object.keys(filters).forEach(k => !filters[k] && params.delete(k));
    const res = await api.get(`/transaksi?${params}`);
    setData(res.data.data);
    setTotal(res.data.total);
    setLoading(false);
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Transaksi</h1>
          <p className="text-sm text-white/40 mt-1">{total} transaksi total</p>
        </div>
        <a href="/api/laporan/export" className="btn-secondary flex items-center gap-2">
          <Download size={14} /> Export Excel
        </a>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="relative col-span-2 lg:col-span-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              placeholder="Cari keterangan..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="input pl-8 text-xs py-2"
            />
          </div>
          <select value={filters.tipe} onChange={e => setFilters(f => ({ ...f, tipe: e.target.value }))} className="select text-xs py-2">
            <option value="">Semua Tipe</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
          </select>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="select text-xs py-2">
            <option value="">Semua Status</option>
            <option value="valid">Valid</option>
            <option value="cek_manual">Cek Manual</option>
            <option value="koreksi">Koreksi</option>
            <option value="lainnya">Lainnya</option>
          </select>
          <select value={filters.sumber} onChange={e => setFilters(f => ({ ...f, sumber: e.target.value }))} className="select text-xs py-2">
            <option value="">Semua Sumber</option>
            <option value="BCA">BCA Syariah</option>
            <option value="BSI">BSI</option>
            <option value="manual">Manual</option>
          </select>
          <button onClick={() => setFilters({ tipe: '', status: '', sumber: '', search: '' })} className="btn-secondary text-xs py-2">
            Reset Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-2.5 text-xs text-white/30">TANGGAL</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/30">KETERANGAN</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/30">KEMENTERIAN</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/30">PROGRAM</th>
                <th className="text-right px-4 py-2.5 text-xs text-white/30">JUMLAH</th>
                <th className="text-center px-4 py-2.5 text-xs text-white/30">SUMBER</th>
                <th className="text-center px-4 py-2.5 text-xs text-white/30">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-white/30">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-white/30">Tidak ada transaksi</td></tr>
              ) : data.map(t => {
                const { label, cls } = statusBadge(t.status);
                return (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-2.5 text-xs text-white/50 whitespace-nowrap">{formatDate(t.tanggal)}</td>
                    <td className="px-4 py-2.5 text-xs text-white/70 max-w-xs">
                      <div className="truncate">{t.keterangan}</div>
                      {t.tipe === 'keluar' && t.kategori_nama && (
                        <div className="text-red-400/60 text-xs mt-0.5">{t.kategori_nama}</div>
                      )}
                      {t.tipe === 'masuk' && t.jenis_nama && (
                        <div className="text-emerald-400/60 text-xs mt-0.5">{t.jenis_nama}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {t.kementerian_nama ? (
                        <span className="bg-dark-600 text-white/60 px-2 py-0.5 rounded text-xs">
                          {t.kementerian_kode} {t.kementerian_nama}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-white/40">{t.program_nama || '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-mono text-sm font-semibold ${t.tipe === 'masuk' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.tipe === 'masuk' ? '+' : '-'}{formatRupiah(t.jumlah)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs bg-dark-600 text-white/50 px-2 py-0.5 rounded">{t.sumber}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center"><span className={cls}>{label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-white/30">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1 text-xs disabled:opacity-30">‹ Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 text-xs disabled:opacity-30">Next ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
