import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatRupiah, formatDate, statusBadge } from '../lib/format';
import { CheckSquare, Square, Save, Trash2, ChevronDown } from 'lucide-react';

function KoreksiCard({ transaksi, masterData, onSave, onDelete }) {
  const [data, setData] = useState({
    kementerian_id: transaksi.kementerian_id || '',
    jenis_transaksi_id: transaksi.jenis_transaksi_id || '',
    kategori_pengeluaran_id: transaksi.kategori_pengeluaran_id || '',
    program_event_id: transaksi.program_event_id || '',
    status: transaksi.tipe === 'masuk' ? 'koreksi' : 'valid'
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isKeluar = transaksi.tipe === 'keluar';
  const filteredPrograms = masterData?.programs?.filter(p =>
    !data.kementerian_id || !p.kementerian_id || p.kementerian_id === parseInt(data.kementerian_id) || p.is_rutin
  ) || [];

  const handleSave = async () => {
    setSaving(true);
    await onSave(transaksi.id, {
      ...data,
      kementerian_id: data.kementerian_id || null,
      jenis_transaksi_id: !isKeluar ? (data.jenis_transaksi_id || null) : null,
      kategori_pengeluaran_id: isKeluar ? (data.kategori_pengeluaran_id || null) : null,
      program_event_id: data.program_event_id || null,
      status: data.kementerian_id ? 'koreksi' : 'lainnya'
    });
    setSaving(false);
  };

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-semibold ${isKeluar ? 'text-red-400' : 'text-emerald-400'}`}>
              {isKeluar ? '↑ KELUAR' : '↓ MASUK'}
            </span>
            <span className="text-xs text-white/30">{transaksi.sumber}</span>
            <span className="text-xs text-white/30">{formatDate(transaksi.tanggal)}</span>
          </div>
          <div className="text-sm text-white/80 truncate">{transaksi.keterangan}</div>
        </div>
        <div className={`text-lg font-display font-bold ml-4 ${isKeluar ? 'text-red-400' : 'text-emerald-400'}`}>
          {isKeluar ? '-' : '+'}{formatRupiah(transaksi.jumlah)}
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-white/40 mb-1 block">Kementerian</label>
          <select value={data.kementerian_id} onChange={e => setData(d => ({ ...d, kementerian_id: e.target.value, program_event_id: '' }))} className="select text-xs py-1.5">
            <option value="">— Pilih —</option>
            {masterData?.kementerian?.map(k => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
          </select>
        </div>

        {!isKeluar ? (
          <div>
            <label className="text-xs text-white/40 mb-1 block">Jenis Transaksi</label>
            <select value={data.jenis_transaksi_id} onChange={e => setData(d => ({ ...d, jenis_transaksi_id: e.target.value }))} className="select text-xs py-1.5">
              <option value="">— Pilih —</option>
              {masterData?.jenis?.map(j => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs text-white/40 mb-1 block">Kategori Pengeluaran</label>
            <select value={data.kategori_pengeluaran_id} onChange={e => setData(d => ({ ...d, kategori_pengeluaran_id: e.target.value }))} className="select text-xs py-1.5">
              <option value="">— Pilih —</option>
              {masterData?.kategoriPengeluaran?.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-white/40 mb-1 block">Program / Event</label>
          <select value={data.program_event_id} onChange={e => setData(d => ({ ...d, program_event_id: e.target.value }))} className="select text-xs py-1.5">
            <option value="">— Pilih —</option>
            {filteredPrograms.map(p => <option key={p.id} value={p.id}>{p.nama}{p.is_rutin ? ' ★' : ''}</option>)}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary py-1.5 flex-1 text-xs">
            {saving ? '...' : <><Save size={12} className="inline mr-1" />Simpan</>}
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="btn-danger py-1.5 px-2">
              <Trash2 size={13} />
            </button>
          ) : (
            <button onClick={() => onDelete(transaksi.id)} className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1.5 rounded-lg transition-all">
              Ya?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KoreksiPage() {
  const [transaksi, setTransaksi] = useState([]);
  const [masterData, setMasterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [bulkData, setBulkData] = useState({ kementerian_id: '', jenis_transaksi_id: '', kategori_pengeluaran_id: '', program_event_id: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cekManual, kem, jt, kp, pe] = await Promise.all([
      api.get('/transaksi/cek-manual'),
      api.get('/master/kementerian'),
      api.get('/master/jenis-transaksi'),
      api.get('/master/kategori-pengeluaran'),
      api.get('/master/program-event')
    ]);
    setTransaksi(cekManual.data);
    setMasterData({ kementerian: kem.data, jenis: jt.data, kategoriPengeluaran: kp.data, programs: pe.data });
    setLoading(false);
  };

  const handleSave = async (id, data) => {
    await api.put(`/transaksi/${id}`, data);
    setTransaksi(t => t.filter(x => x.id !== id));
  };

  const handleDelete = async (id) => {
    await api.delete(`/transaksi/${id}`);
    setTransaksi(t => t.filter(x => x.id !== id));
  };

  const handleBulkSave = async () => {
    if (!selected.length) return;
    await api.put('/transaksi/bulk/update', {
      ids: selected,
      ...bulkData,
      kementerian_id: bulkData.kementerian_id || null,
      jenis_transaksi_id: bulkData.jenis_transaksi_id || null,
      kategori_pengeluaran_id: bulkData.kategori_pengeluaran_id || null,
      program_event_id: bulkData.program_event_id || null,
      status: 'koreksi'
    });
    setTransaksi(t => t.filter(x => !selected.includes(x.id)));
    setSelected([]);
  };

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  if (loading) return <div className="text-center py-20 text-white/30">Memuat...</div>;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Koreksi Transaksi</h1>
          <p className="text-sm text-white/40 mt-1">{transaksi.length} transaksi perlu dikoreksi</p>
        </div>
      </div>

      {/* Bulk apply */}
      {selected.length > 0 && (
        <div className="card bg-blue-500/10 border-blue-500/20">
          <div className="text-sm text-blue-400 font-medium mb-3">{selected.length} transaksi dipilih — Bulk Apply</div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <select value={bulkData.kementerian_id} onChange={e => setBulkData(d => ({ ...d, kementerian_id: e.target.value }))} className="select text-xs py-1.5">
              <option value="">Kementerian</option>
              {masterData?.kementerian?.map(k => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
            </select>
            <select value={bulkData.jenis_transaksi_id} onChange={e => setBulkData(d => ({ ...d, jenis_transaksi_id: e.target.value }))} className="select text-xs py-1.5">
              <option value="">Jenis Transaksi</option>
              {masterData?.jenis?.map(j => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
            </select>
            <select value={bulkData.kategori_pengeluaran_id} onChange={e => setBulkData(d => ({ ...d, kategori_pengeluaran_id: e.target.value }))} className="select text-xs py-1.5">
              <option value="">Kategori Pengeluaran</option>
              {masterData?.kategoriPengeluaran?.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
            <select value={bulkData.program_event_id} onChange={e => setBulkData(d => ({ ...d, program_event_id: e.target.value }))} className="select text-xs py-1.5">
              <option value="">Program/Event</option>
              {masterData?.programs?.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
            <button onClick={handleBulkSave} className="btn-primary text-xs py-1.5">
              <Save size={12} className="inline mr-1" />Terapkan ke {selected.length} transaksi
            </button>
          </div>
        </div>
      )}

      {/* Select all */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelected(transaksi.length === selected.length ? [] : transaksi.map(t => t.id))}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          {transaksi.length === selected.length && selected.length > 0 ? <CheckSquare size={16} className="text-gold-400" /> : <Square size={16} />}
          Pilih Semua
        </button>
      </div>

      {transaksi.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-white/60 font-medium">Semua transaksi sudah dikoreksi!</div>
        </div>
      )}

      <div className="space-y-3">
        {transaksi.map(t => (
          <div key={t.id} className="flex items-start gap-3">
            <button onClick={() => toggleSelect(t.id)} className="mt-4 flex-shrink-0">
              {selected.includes(t.id) ? <CheckSquare size={16} className="text-gold-400" /> : <Square size={16} className="text-white/30" />}
            </button>
            <div className="flex-1">
              <KoreksiCard transaksi={t} masterData={masterData} onSave={handleSave} onDelete={handleDelete} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
