import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatRupiah } from '../lib/format';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

export default function Laporan() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ masuk: 0, keluar: 0, txn: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '', kementerian_id: '' });
  const [kemList, setKemList] = useState([]);
  const [expandedKem, setExpandedKem] = useState({});
  const [expandedSub, setExpandedSub] = useState({});
  const [viewMode, setViewMode] = useState('kementerian');

  useEffect(() => {
    api.get('/master/kementerian').then(r => setKemList(r.data)).catch(() => {});
    loadData();
  }, []);

  const loadData = async (f = filters) => {
    setLoading(true);
    try {
      const params = {};
      if (f.from) params.from = f.from;
      if (f.to) params.to = f.to;
      if (f.kementerian_id) params.kementerian_id = f.kementerian_id;

      // Try laporan/summary first, fallback to transaksi/breakdown
      try {
        const res = await api.get('/laporan/summary', { params });
        setData(res.data.breakdown || []);
        setSummary({ masuk: res.data.total_masuk || 0, keluar: res.data.total_keluar || 0, txn: res.data.total_txn || 0 });
      } catch {
        const res = await api.get('/transaksi/breakdown', { params });
        setData(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Build 3-level tree: kementerian -> jenis/kategori -> program
  const buildTree = () => {
    const tree = {};
    for (const row of data) {
      const kemKey = row.kem_id || 'none';
      if (!tree[kemKey]) tree[kemKey] = {
        id: row.kem_id, kode: row.kem_kode, nama: row.kem_nama || 'Tanpa Kementerian',
        subs: {}, qris: 0, transfer: 0, pengeluaran: 0, txn: 0
      };
      const kem = tree[kemKey];
      kem.qris += Number(row.qris || 0);
      kem.transfer += Number(row.transfer || 0);
      kem.pengeluaran += Number(row.pengeluaran || 0);
      kem.txn += Number(row.txn_count || 0);

      const isMasuk = row.tipe === 'masuk';
      const subKey = isMasuk ? `j_${row.jenis_id || 'none'}` : `k_${row.kp_id || 'none'}`;
      if (!kem.subs[subKey]) kem.subs[subKey] = {
        type: isMasuk ? 'jenis' : 'kategori',
        kode: isMasuk ? row.jenis_kode : null,
        nama: isMasuk ? (row.jenis_nama || 'Tanpa Jenis') : (row.kp_nama || 'Tanpa Kategori'),
        programs: {}, qris: 0, transfer: 0, pengeluaran: 0, txn: 0
      };
      const sub = kem.subs[subKey];
      sub.qris += Number(row.qris || 0);
      sub.transfer += Number(row.transfer || 0);
      sub.pengeluaran += Number(row.pengeluaran || 0);
      sub.txn += Number(row.txn_count || 0);

      if (isMasuk) {
        const peKey = `pe_${row.pe_id || 'none'}`;
        if (!sub.programs[peKey]) sub.programs[peKey] = {
          nama: row.pe_nama || '(Belum diassign)', qris: 0, transfer: 0, txn: 0
        };
        sub.programs[peKey].qris += Number(row.qris || 0);
        sub.programs[peKey].transfer += Number(row.transfer || 0);
        sub.programs[peKey].txn += Number(row.txn_count || 0);
      }
    }
    return tree;
  };

  // Build program tree
  const buildProgramTree = () => {
    const tree = {};
    for (const row of data) {
      const key = `${row.pe_id || 'none'}_${row.kem_id || 'none'}`;
      if (!tree[key]) tree[key] = {
        nama: row.pe_nama || '(Belum diassign)',
        kem_nama: row.kem_nama,
        qris: 0, transfer: 0, pengeluaran: 0, txn: 0
      };
      tree[key].qris += Number(row.qris || 0);
      tree[key].transfer += Number(row.transfer || 0);
      tree[key].pengeluaran += Number(row.pengeluaran || 0);
      tree[key].txn += Number(row.txn_count || 0);
    }
    return tree;
  };

  const tree = buildTree();
  const programTree = buildProgramTree();

  const gQris = Object.values(tree).reduce((s, k) => s + k.qris, 0);
  const gTransfer = Object.values(tree).reduce((s, k) => s + k.transfer, 0);
  const gPengeluaran = Object.values(tree).reduce((s, k) => s + k.pengeluaran, 0);
  const gSisa = gQris + gTransfer - gPengeluaran;
  const gTxn = Object.values(tree).reduce((s, k) => s + k.txn, 0);
  const totalMasuk = summary.masuk || (gQris + gTransfer);
  const totalKeluar = summary.keluar || gPengeluaran;

  const toggleKem = k => setExpandedKem(p => ({ ...p, [k]: !p[k] }));
  const toggleSub = k => setExpandedSub(p => ({ ...p, [k]: !p[k] }));

  if (loading) return (
    <div className="text-center py-20">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <div className="text-white/30 text-sm">Memuat laporan...</div>
    </div>
  );

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Laporan Keuangan</h1>
          <p className="text-sm text-white/40 mt-1">Ringkasan keuangan per kementerian, jenis, dan program</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-xs py-2">
          <Download size={13} /> Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <div className="text-[10px] text-white/30 mb-1 font-medium">DARI</div>
          <input type="date" className="input text-sm" value={filters.from}
            onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
        </div>
        <div>
          <div className="text-[10px] text-white/30 mb-1 font-medium">SAMPAI</div>
          <input type="date" className="input text-sm" value={filters.to}
            onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
        </div>
        <div>
          <div className="text-[10px] text-white/30 mb-1 font-medium">KEMENTERIAN</div>
          <select className="select text-sm" value={filters.kementerian_id}
            onChange={e => setFilters(p => ({ ...p, kementerian_id: e.target.value }))}>
            <option value="">— Semua —</option>
            {kemList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
        <button onClick={() => loadData()} className="btn-primary text-sm py-2">Terapkan</button>
        <button onClick={() => {
          const f = { from: '', to: '', kementerian_id: '' };
          setFilters(f); loadData(f);
        }} className="btn-secondary text-sm py-2">Reset</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'TOTAL MASUK', val: formatRupiah(totalMasuk), color: 'text-emerald-400' },
          { label: 'TOTAL PENGELUARAN', val: formatRupiah(totalKeluar), color: 'text-red-400' },
          { label: 'SALDO BERSIH', val: formatRupiah(gSisa), color: gSisa >= 0 ? 'text-gold-400' : 'text-red-400' },
          { label: '% QRIS', val: totalMasuk > 0 ? ((gQris / totalMasuk) * 100).toFixed(1) + '%' : '—', color: 'text-emerald-400' },
          { label: '% TRANSFER', val: totalMasuk > 0 ? ((gTransfer / totalMasuk) * 100).toFixed(1) + '%' : '—', color: 'text-blue-400' },
          { label: 'JUMLAH TXN', val: gTxn, color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="card p-3">
            <div className="text-[10px] text-white/30 mb-1">{s.label}</div>
            <div className={`font-mono font-bold text-sm ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* View mode */}
      <div className="flex gap-2">
        {[{ id: 'kementerian', label: 'Per Kementerian' }, { id: 'program', label: 'Per Program/Event' }].map(m => (
          <button key={m.id} onClick={() => setViewMode(m.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              viewMode === m.id
                ? 'border-gold-500/50 bg-gold-500/10 text-gold-400'
                : 'border-white/10 text-white/40 hover:text-white/70'
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* PER KEMENTERIAN */}
      {viewMode === 'kementerian' && (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-dark-700">
                <th className="text-left px-4 py-3 text-xs text-white/30">KEMENTERIAN / JENIS / PROGRAM</th>
                <th className="text-right px-3 py-3 text-xs text-white/30">TXN</th>
                <th className="text-right px-3 py-3 text-xs text-emerald-500/60">QRIS</th>
                <th className="text-right px-3 py-3 text-xs text-blue-500/60">TRANSFER</th>
                <th className="text-right px-3 py-3 text-xs text-red-500/60">PENGELUARAN</th>
                <th className="text-right px-4 py-3 text-xs text-gold-500/60">SISA</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tree)
                .sort((a, b) => (a[1].kode || 'z').localeCompare(b[1].kode || 'z'))
                .map(([kemKey, kem]) => {
                  const kemSisa = kem.qris + kem.transfer - kem.pengeluaran;
                  const isKemOpen = expandedKem[kemKey];
                  return [
                    /* L1: Kementerian */
                    <tr key={`kem_${kemKey}`}
                      className="border-b border-white/5 cursor-pointer hover:bg-white/2 transition-colors"
                      onClick={() => toggleKem(kemKey)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white/30 flex-shrink-0">
                            {isKemOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                          </span>
                          <span className="font-semibold text-white text-sm">{kem.nama}</span>
                          {kem.kode && (
                            <span className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded font-mono">({kem.kode})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-white/40 font-mono">{kem.txn}</td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-emerald-400">
                        {kem.qris > 0 ? formatRupiah(kem.qris) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-blue-400">
                        {kem.transfer > 0 ? formatRupiah(kem.transfer) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-red-400">
                        {kem.pengeluaran > 0 ? formatRupiah(kem.pengeluaran) : <span className="text-white/20">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm font-mono font-semibold ${kemSisa >= 0 ? 'text-gold-400' : 'text-red-400'}`}>
                        {formatRupiah(kemSisa)}
                      </td>
                    </tr>,

                    /* L2: Jenis/Kategori */
                    isKemOpen && Object.entries(kem.subs)
                      .sort((a, b) => (a[1].kode || 'z').localeCompare(b[1].kode || 'z'))
                      .map(([subKey, sub]) => {
                        const subSisa = sub.qris + sub.transfer - sub.pengeluaran;
                        const fullSubKey = `${kemKey}_${subKey}`;
                        const isSubOpen = expandedSub[fullSubKey];
                        const hasPe = Object.keys(sub.programs || {}).length > 0;
                        return [
                          <tr key={`sub_${fullSubKey}`}
                            className={`border-b border-white/5 bg-dark-800/40 ${hasPe ? 'cursor-pointer hover:bg-white/2' : ''}`}
                            onClick={() => hasPe && toggleSub(fullSubKey)}>
                            <td className="px-4 py-2.5 pl-10">
                              <div className="flex items-center gap-2">
                                {hasPe
                                  ? <span className="text-white/20">{isSubOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</span>
                                  : <span className="w-3 inline-block"/>}
                                {sub.kode && <span className="text-[10px] text-white/20 font-mono">({sub.kode})</span>}
                                <span className={`text-xs ${sub.type === 'kategori' ? 'text-red-300/60' : 'text-white/55'}`}>
                                  {sub.nama}
                                </span>
                                <span className="text-[10px] text-white/20 ml-1">
                                  {sub.txn > 0 ? `${sub.txn} transaksi` : ''}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-white/25 font-mono">{sub.txn || '—'}</td>
                            <td className="px-3 py-2.5 text-right text-xs font-mono text-emerald-400/50">
                              {sub.qris > 0 ? formatRupiah(sub.qris) : <span className="text-white/10">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs font-mono text-blue-400/50">
                              {sub.transfer > 0 ? formatRupiah(sub.transfer) : <span className="text-white/10">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs font-mono text-red-400/50">
                              {sub.pengeluaran > 0 ? formatRupiah(sub.pengeluaran) : <span className="text-white/10">—</span>}
                            </td>
                            <td className={`px-4 py-2.5 text-right text-xs font-mono ${subSisa >= 0 ? 'text-gold-400/50' : 'text-red-400/50'}`}>
                              {subSisa !== 0 ? formatRupiah(subSisa) : '—'}
                            </td>
                          </tr>,

                          /* L3: Program */
                          isSubOpen && Object.entries(sub.programs || {}).map(([peKey, pe]) => (
                            <tr key={`pe_${fullSubKey}_${peKey}`} className="border-b border-white/5 bg-dark-900/40">
                              <td className="px-4 py-2 pl-16">
                                <span className={`text-[11px] ${pe.nama.includes('Belum') ? 'text-white/20 italic' : 'text-white/35'}`}>
                                  {pe.nama}
                                </span>
                                {pe.txn > 0 && <span className="text-[10px] text-white/15 ml-2">{pe.txn} transaksi</span>}
                              </td>
                              <td className="px-3 py-2 text-right text-[11px] text-white/20 font-mono">{pe.txn}</td>
                              <td className="px-3 py-2 text-right text-[11px] font-mono text-emerald-400/30">
                                {pe.qris > 0 ? formatRupiah(pe.qris) : '—'}
                              </td>
                              <td className="px-3 py-2 text-right text-[11px] font-mono text-blue-400/30">
                                {pe.transfer > 0 ? formatRupiah(pe.transfer) : '—'}
                              </td>
                              <td className="px-3 py-2 text-right text-[11px] text-white/15">—</td>
                              <td className="px-4 py-2 text-right text-[11px] font-mono text-gold-400/30">
                                {formatRupiah(pe.qris + pe.transfer)}
                              </td>
                            </tr>
                          ))
                        ];
                      })
                  ];
                })}

              {/* Total */}
              <tr className="border-t-2 border-white/10 bg-dark-700">
                <td className="px-4 py-3 font-bold text-white text-sm">TOTAL</td>
                <td className="px-3 py-3 text-right text-xs font-mono text-white/60 font-bold">{gTxn}</td>
                <td className="px-3 py-3 text-right text-sm font-mono text-emerald-400 font-bold">{formatRupiah(gQris)}</td>
                <td className="px-3 py-3 text-right text-sm font-mono text-blue-400 font-bold">{formatRupiah(gTransfer)}</td>
                <td className="px-3 py-3 text-right text-sm font-mono text-red-400 font-bold">{formatRupiah(gPengeluaran)}</td>
                <td className={`px-4 py-3 text-right text-base font-mono font-bold ${gSisa >= 0 ? 'text-gold-400' : 'text-red-400'}`}>
                  {formatRupiah(gSisa)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* PER PROGRAM */}
      {viewMode === 'program' && (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-dark-700">
                <th className="text-left px-4 py-3 text-xs text-white/30">PROGRAM / EVENT</th>
                <th className="text-left px-3 py-3 text-xs text-white/30">KEMENTERIAN</th>
                <th className="text-right px-3 py-3 text-xs text-white/30">TXN</th>
                <th className="text-right px-3 py-3 text-xs text-emerald-500/60">QRIS</th>
                <th className="text-right px-3 py-3 text-xs text-blue-500/60">TRANSFER</th>
                <th className="text-right px-3 py-3 text-xs text-red-500/60">PENGELUARAN</th>
                <th className="text-right px-4 py-3 text-xs text-gold-500/60">SISA</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(programTree)
                .sort((a, b) => (b[1].qris + b[1].transfer) - (a[1].qris + a[1].transfer))
                .map(([key, pe]) => {
                  const sisa = pe.qris + pe.transfer - pe.pengeluaran;
                  return (
                    <tr key={key} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${pe.nama.includes('Belum') ? 'text-white/25 italic text-xs' : 'text-white'}`}>
                          {pe.nama}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {pe.kem_nama && (
                          <span className="text-[11px] bg-white/5 text-white/35 px-2 py-0.5 rounded">{pe.kem_nama}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-white/35 font-mono">{pe.txn}</td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-emerald-400">
                        {pe.qris > 0 ? formatRupiah(pe.qris) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-blue-400">
                        {pe.transfer > 0 ? formatRupiah(pe.transfer) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-red-400">
                        {pe.pengeluaran > 0 ? formatRupiah(pe.pengeluaran) : <span className="text-white/20">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right text-xs font-mono font-semibold ${sisa >= 0 ? 'text-gold-400' : 'text-red-400'}`}>
                        {formatRupiah(sisa)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-[11px] text-white/15 text-center pb-4">
        Sisa = QRIS + Transfer − Pengeluaran · Hanya transaksi status valid / koreksi / lainnya
      </div>
    </div>
  );
}
