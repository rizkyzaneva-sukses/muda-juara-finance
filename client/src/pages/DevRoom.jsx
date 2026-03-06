import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Trash2, RefreshCw, Database, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DevRoom() {
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);

  useEffect(() => {
    api.get('/dev/migration-status').then(r => setMigrationStatus(r.data));
  }, []);

  const action = async (fn, label) => {
    setLoading(label);
    setMessage(null);
    try {
      const res = await fn();
      setMessage({ type: 'success', text: res.data?.message || `${label} berhasil` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Terjadi error' });
    } finally {
      setLoading('');
    }
  };

  const entities = [
    { key: 'transaksi', label: 'Transaksi' },
    { key: 'transaksi_qris', label: 'Transaksi QRIS' },
    { key: 'program_event', label: 'Program & Event' },
    { key: 'kategori_pengeluaran', label: 'Kategori Pengeluaran' },
    { key: 'log_rekonsiliasi', label: 'Log Rekonsiliasi' },
    { key: 'kementerian', label: 'Kementerian' },
    { key: 'jenis_transaksi', label: 'Jenis Transaksi' },
    { key: 'rekening', label: 'Rekening / Saldo Awal' },
    { key: 'kategori_lainnya', label: 'Kategori Lainnya (Legacy)' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Dev Room</h1>
        <p className="text-sm text-white/40 mt-1">Tools untuk development dan manajemen data</p>
      </div>

      {message && (
        <div className={`card flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          {message.type === 'success' ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-red-400" />}
          <span className={`text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</span>
        </div>
      )}

      {/* Migration status */}
      {migrationStatus?.unassigned > 0 && (
        <div className="card bg-amber-500/10 border-amber-500/20 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-400" />
          <span className="text-amber-400 text-sm">
            <strong>{migrationStatus.unassigned} transaksi</strong> belum di-assign ke Program/Event
          </span>
        </div>
      )}

      {/* Seed */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-gold-400" />
          <h2 className="font-display font-semibold text-white">🌱 Buat Data Dummy</h2>
        </div>
        <p className="text-sm text-white/50">
          Isi database dengan data contoh lengkap: kementerian, jenis transaksi, rekening, transaksi BSI/BCA, program kerja, dan transaksi QRIS.
        </p>
        <ul className="text-xs text-white/40 space-y-0.5 ml-4">
          <li>• Saldo awal BCA Rp 48.663.941 + BSI Rp 258.168.530</li>
          <li>• 8 program/event (Bukber 2026, Sertijab, Umroh MJ, dll)</li>
          <li>• 22 kategori pengeluaran</li>
          <li>• Sample transaksi masuk & keluar</li>
          <li>• 4 transaksi QRIS pending</li>
        </ul>
        <button
          onClick={() => action(() => api.post('/dev/seed'), 'Buat Data Dummy')}
          disabled={!!loading}
          className="btn-primary"
        >
          {loading === 'Buat Data Dummy' ? <><RefreshCw size={14} className="inline animate-spin mr-2" />Memproses...</> : '🌱 Buat Semua Data Dummy'}
        </button>
      </div>

      {/* Reset Transaksi */}
      <div className="card space-y-3 border-red-500/10">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-400" />
          <h2 className="font-display font-semibold text-white">⚠️ Reset Data Transaksi</h2>
        </div>
        <p className="text-sm text-white/50">Hapus semua transaksi dan QRIS tanpa menghapus master data (kementerian, jenis transaksi tetap ada).</p>
        <button
          onClick={() => { if (confirm('Reset semua transaksi? Master data tetap ada.')) action(() => api.post('/dev/reset-transaksi'), 'Reset Transaksi'); }}
          disabled={!!loading}
          className="btn-danger"
        >
          <Trash2 size={14} className="inline mr-1" />
          Reset Semua Transaksi & Program
        </button>
      </div>

      {/* Reset All */}
      <div className="card space-y-3 border-red-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-400" />
          <h2 className="font-display font-semibold text-red-400">🔴 Reset Total</h2>
        </div>
        <p className="text-sm text-white/50">Hapus SEMUA data termasuk master data. Database kembali kosong.</p>
        <button
          onClick={() => { if (confirm('HAPUS SEMUA DATA? Termasuk master data!')) if (confirm('Yakin? Tidak bisa dibatalkan.')) action(() => api.post('/dev/reset-all'), 'Reset Total'); }}
          disabled={!!loading}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
        >
          <Trash2 size={14} />
          ⚠️ Reset Total (Semua Data)
        </button>
      </div>

      {/* Delete per entity */}
      <div className="card space-y-3">
        <h2 className="font-display font-semibold text-white">🗑 Hapus Per Entitas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {entities.map(e => (
            <button
              key={e.key}
              onClick={() => { if (confirm(`Hapus semua ${e.label}?`)) action(() => api.post('/dev/reset-entity', { entity: e.key }), e.label); }}
              disabled={!!loading}
              className="btn-secondary text-xs flex items-center justify-between gap-2 py-2"
            >
              <span>{e.label}</span>
              <Trash2 size={12} className="text-red-400/60 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
