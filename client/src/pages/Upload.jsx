import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { formatRupiah, formatDatetime } from '../lib/format';
import { FileSpreadsheet, FileText, CheckCircle, XCircle, Trash2 } from 'lucide-react';

function DropZone({ accept, label, icon: Icon, onFile, loading }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${drag ? 'border-gold-500 bg-gold-500/5' : 'border-white/10 hover:border-white/20'}`}
      onClick={() => !loading && inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
    >
      <Icon size={32} className="mx-auto mb-3 text-white/30" />
      <div className="text-sm text-white/60">{loading ? 'Memproses...' : label}</div>
      <div className="text-xs text-white/30 mt-1">Drag & drop atau klik untuk pilih</div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => onFile(e.target.files[0])} />
    </div>
  );
}

function MiniSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      className="bg-dark-800 border border-white/10 rounded text-xs text-white/70 px-1.5 py-1 w-full focus:outline-none focus:border-gold-500/50"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

export default function UploadPage() {
  const [tab, setTab] = useState('qris');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [sumber, setSumber] = useState('BCA');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [master, setMaster] = useState({ kementerian: [], jenis: [], kategori: [], program: [] });
  const [bulk, setBulk] = useState({ kem: '', jenis: '', kat: '', pe: '' });

  useEffect(() => {
    Promise.all([
      api.get('/master/kementerian'),
      api.get('/master/jenis-transaksi'),
      api.get('/master/kategori-pengeluaran'),
      api.get('/master/program-event'),
    ]).then(([k, j, kp, pe]) => {
      setMaster({
        kementerian: k.data.map(x => ({ id: x.id, label: `${x.kode} — ${x.nama}` })),
        jenis: j.data.map(x => ({ id: x.id, label: `${x.kode} — ${x.nama}` })),
        kategori: kp.data.map(x => ({ id: x.id, label: x.nama })),
        program: pe.data.map(x => ({ id: x.id, label: x.nama })),
      });
    }).catch(() => {});
  }, []);

  const handleFile = async (file, type) => {
    if (!file) return;
    setLoading(true);
    setPreview(null);
    const form = new FormData();
    form.append('file', file);
    if (type === 'mutasi') form.append('sumber', sumber);
    try {
      const endpoint = type === 'qris' ? '/upload/qris' : '/upload/mutasi';
      const res = await api.post(endpoint, form);
      setPreview({
        type,
        rows: res.data.preview.map(r => ({
          ...r,
          _kem: r.kementerian_id || '',
          _jenis: r.jenis_transaksi_id || '',
          _kat: '',
          _pe: r.program_event_id || '',
        }))
      });
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (idx, field, val) => {
    setPreview(p => ({ ...p, rows: p.rows.map((r, i) => i === idx ? { ...r, [field]: val } : r) }));
  };

  const deleteRow = (idx) => {
    setPreview(p => ({ ...p, rows: p.rows.filter((_, i) => i !== idx) }));
  };

  const applyBulk = () => {
    setPreview(p => ({
      ...p,
      rows: p.rows.map(r => {
        if (r.isDuplicate) return r;
        return {
          ...r,
          _kem: bulk.kem || r._kem,
          _jenis: bulk.jenis || r._jenis,
          _kat: bulk.kat || r._kat,
          _pe: bulk.pe || r._pe,
        };
      })
    }));
    setBulk({ kem: '', jenis: '', kat: '', pe: '' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = preview.rows
        .filter(r => !r.isDuplicate)
        .map(r => ({
          ...r,
          kementerian_id: r._kem || null,
          jenis_transaksi_id: r._jenis || null,
          kategori_pengeluaran_id: r._kat || null,
          program_event_id: r._pe || null,
        }));
      const endpoint = preview.type === 'qris' ? '/upload/qris/save' : '/upload/mutasi/save';
      const res = await api.post(endpoint, { rows });
      setSaved(res.data.saved);
      setPreview(null);
    } catch (err) {
      alert('Error saving: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const toSave = preview?.rows.filter(r => !r.isDuplicate).length || 0;
  const dupCount = preview?.rows.filter(r => r.isDuplicate).length || 0;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Upload Mutasi</h1>
        <p className="text-sm text-white/40 mt-1">Upload QRIS Excel atau mutasi bank PDF — assign kementerian & program langsung di preview</p>
      </div>

      {saved !== null && (
        <div className="card bg-emerald-500/10 border-emerald-500/20 flex items-center gap-3 p-4">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-emerald-400 text-sm font-medium">{saved} transaksi berhasil disimpan!</span>
          <button onClick={() => setSaved(null)} className="ml-auto text-white/30 hover:text-white"><XCircle size={16} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ id: 'qris', label: '📊 QRIS (.xlsx)' }, { id: 'mutasi', label: '🏦 Mutasi Bank (PDF)' }].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setPreview(null); setSaved(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-gold-500 text-dark-900' : 'bg-dark-700 text-white/50 hover:text-white/80'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload area */}
      {!preview && (
        <div className="card p-5 space-y-4">
          {tab === 'mutasi' && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-white/60">Sumber Bank:</label>
              {['BCA', 'BSI'].map(b => (
                <button key={b} onClick={() => setSumber(b)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${sumber === b ? 'border-gold-500 text-gold-400 bg-gold-500/10' : 'border-white/10 text-white/40'}`}>
                  {b} Syariah
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-white/40 bg-dark-800 rounded-lg p-3">
            {tab === 'qris'
              ? '💡 3 digit terakhir nominal = kode otomatis. Contoh: 20415 → Kementerian 04 (Sosial) + Jenis 15 (Infaq Shubuh). Semua bisa di-assign ulang sebelum simpan.'
              : '💡 AI akan parsing PDF otomatis. TRF BATCH MYBB otomatis valid. Assign Kementerian, Jenis/Kategori, dan Program langsung di tabel preview sebelum disimpan.'}
          </div>
          <DropZone
            accept={tab === 'qris' ? '.xlsx,.xls' : '.pdf'}
            label={tab === 'qris' ? 'Pilih file Excel QRIS (DSP_Export_*.xlsx)' : 'Pilih file PDF mutasi bank'}
            icon={tab === 'qris' ? FileSpreadsheet : FileText}
            onFile={f => handleFile(f, tab)}
            loading={loading}
          />
          {loading && (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <div className="text-white/50 text-xs">{tab === 'mutasi' ? '🤖 AI sedang membaca PDF...' : 'Memproses file...'}</div>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          {/* Summary + Save */}
          <div className="card p-4 flex flex-wrap items-center gap-4">
            <div className="flex gap-4 text-xs flex-1 flex-wrap">
              <span className="text-white font-medium">{preview.rows.length} baris</span>
              <span className="text-emerald-400">✓ {toSave} akan disimpan</span>
              {dupCount > 0 && <span className="text-amber-400">⚠ {dupCount} duplikat dilewati</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
              <button onClick={handleSave} disabled={saving || toSave === 0} className="btn-primary text-xs py-1.5 px-4">
                {saving ? 'Menyimpan...' : `💾 Simpan ${toSave} Transaksi`}
              </button>
            </div>
          </div>

          {/* Bulk assign */}
          <div className="card p-4 border-gold-500/20">
            <div className="text-xs text-gold-400/70 mb-2 font-medium">⚡ Bulk Assign — isi lalu klik Terapkan untuk semua baris:</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
              <MiniSelect value={bulk.kem} onChange={v => setBulk(p => ({ ...p, kem: v }))} options={master.kementerian} placeholder="Pilih Kementerian" />
              <MiniSelect value={bulk.jenis} onChange={v => setBulk(p => ({ ...p, jenis: v }))} options={master.jenis} placeholder="Jenis Transaksi (masuk)" />
              <MiniSelect value={bulk.kat} onChange={v => setBulk(p => ({ ...p, kat: v }))} options={master.kategori} placeholder="Kategori (keluar)" />
              <MiniSelect value={bulk.pe} onChange={v => setBulk(p => ({ ...p, pe: v }))} options={master.program} placeholder="Program / Event" />
            </div>
            <button onClick={applyBulk} className="text-xs bg-gold-500/10 border border-gold-500/30 text-gold-400 px-3 py-1.5 rounded-lg hover:bg-gold-500/20 transition-all">
              Terapkan ke Semua Baris
            </button>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-dark-700 z-10">
                  <tr className="border-b border-white/5">
                    <th className="text-left px-3 py-2.5 text-white/30 whitespace-nowrap">TANGGAL</th>
                    <th className="text-left px-3 py-2.5 text-white/30">KETERANGAN</th>
                    <th className="text-right px-3 py-2.5 text-white/30 whitespace-nowrap">NOMINAL</th>
                    <th className="text-center px-2 py-2.5 text-white/30">TIPE</th>
                    <th className="text-center px-2 py-2.5 text-white/30">STATUS</th>
                    <th className="px-2 py-2.5 text-white/30" style={{minWidth:'140px'}}>KEMENTERIAN</th>
                    <th className="px-2 py-2.5 text-white/30" style={{minWidth:'140px'}}>JENIS / KATEGORI</th>
                    <th className="px-2 py-2.5 text-white/30" style={{minWidth:'140px'}}>PROGRAM / EVENT</th>
                    <th className="px-2 py-2.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => {
                    const isMasuk = row.tipe === 'masuk' || (!row.tipe && (row.amount || 0) > 0);
                    const isTrfBatch = (row.keterangan || '').toUpperCase().includes('TRF BATCH MYBB');
                    const isSkip = row.isDuplicate || isTrfBatch;
                    return (
                      <tr key={i} className={`border-b border-white/5 ${row.isDuplicate ? 'opacity-40' : 'hover:bg-white/2'}`}>
                        <td className="px-3 py-2 text-white/50 whitespace-nowrap">
                          {preview.type === 'qris' ? (row.created_date || '').toString().substring(0,10) : row.tanggal}
                        </td>
                        <td className="px-3 py-2 max-w-[180px]">
                          <div className="truncate text-white/70">{row.keterangan || row.merchant_name}</div>
                          {row.isDuplicate && <div className="text-amber-400 text-[10px]">⚠ Duplikat — dilewati</div>}
                          {isTrfBatch && <div className="text-blue-400 text-[10px]">• QRIS Settlement Auto-Valid</div>}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono font-semibold whitespace-nowrap ${isMasuk ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isMasuk ? '+' : '-'}{formatRupiah(row.amount || row.jumlah)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isMasuk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {isMasuk ? 'masuk' : 'keluar'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            row.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400' :
                            row.status === 'cek_manual' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {row.status || 'cek_manual'}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          {!isSkip && <MiniSelect value={row._kem} onChange={v => updateRow(i, '_kem', v)} options={master.kementerian} placeholder="— Kementerian" />}
                        </td>
                        <td className="px-2 py-2">
                          {!isSkip && (
                            isMasuk
                              ? <MiniSelect value={row._jenis} onChange={v => updateRow(i, '_jenis', v)} options={master.jenis} placeholder="— Jenis" />
                              : <MiniSelect value={row._kat} onChange={v => updateRow(i, '_kat', v)} options={master.kategori} placeholder="— Kategori" />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {!isSkip && <MiniSelect value={row._pe} onChange={v => updateRow(i, '_pe', v)} options={master.program} placeholder="— Program" />}
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => deleteRow(i)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
