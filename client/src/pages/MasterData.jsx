import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { Plus, Edit2, Trash2, Save, X, Database, Upload, Download, FileSpreadsheet } from 'lucide-react';

function CRUDTable({ title, items, columns, onAdd, onEdit, onDelete, renderForm }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing) await onEdit(editing, form);
      else await onAdd(form);
      setEditing(null);
      setAdding(false);
      setForm({});
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditing(item.id);
    setForm({ ...item });
    setAdding(false);
  };

  const startAdd = () => {
    setAdding(true);
    setEditing(null);
    setForm({});
  };

  const cancel = () => { setEditing(null); setAdding(false); setForm({}); };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="font-display font-semibold text-white text-sm">{title}</h3>
        <button onClick={startAdd} className="btn-primary py-1.5 text-xs flex items-center gap-1">
          <Plus size={13} /> Tambah
        </button>
      </div>

      {adding && (
        <div className="px-4 py-3 border-b border-white/5 bg-dark-600/50">
          <div className="space-y-2">
            {renderForm(form, setForm)}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={loading} className="btn-primary py-1.5 text-xs flex items-center gap-1">
                <Save size={12} /> {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={cancel} className="btn-secondary py-1.5 text-xs"><X size={12} /></button>
            </div>
          </div>
        </div>
      )}

      <div>
        {items.map(item => (
          <div key={item.id} className="border-b border-white/5 last:border-0">
            {editing === item.id ? (
              <div className="px-4 py-3 bg-dark-600/30">
                <div className="space-y-2">
                  {renderForm(form, setForm)}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSave} disabled={loading} className="btn-primary py-1.5 text-xs flex items-center gap-1">
                      <Save size={12} /> {loading ? '...' : 'Simpan'}
                    </button>
                    <button onClick={cancel} className="btn-secondary py-1.5 text-xs"><X size={12} /></button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center px-4 py-2.5 hover:bg-white/2 group">
                <div className="flex-1 flex items-center gap-4">
                  {columns.map(col => (
                    <div key={col.key} className={col.cls || 'text-sm text-white/70'} style={col.style}>
                      {col.render ? col.render(item) : item[col.key]}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(item)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-6 text-white/30 text-sm">Belum ada data</div>
        )}
      </div>
    </div>
  );
}

export default function MasterDataPage() {
  const [tab, setTab] = useState('kementerian');
  const [data, setData] = useState({ kementerian: [], jenis: [], kategoriPengeluaran: [], programs: [], rekening: [] });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [kem, jt, kp, pe, rek] = await Promise.all([
      api.get('/master/kementerian'),
      api.get('/master/jenis-transaksi'),
      api.get('/master/kategori-pengeluaran'),
      api.get('/master/program-event'),
      api.get('/master/rekening')
    ]);
    setData({ kementerian: kem.data, jenis: jt.data, kategoriPengeluaran: kp.data, programs: pe.data, rekening: rek.data });
  };

  const crud = (endpoint, key) => ({
    onAdd: async (form) => { await api.post(`/master/${endpoint}`, form); loadAll(); },
    onEdit: async (id, form) => { await api.put(`/master/${endpoint}/${id}`, form); loadAll(); },
    onDelete: async (id) => { if (confirm('Yakin hapus?')) { await api.delete(`/master/${endpoint}/${id}`); loadAll(); } }
  });

  const fileRef = useRef();
  const [importTab, setImportTab] = useState('kementerian');
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importSaved, setImportSaved] = useState(null);

  const downloadTemplate = () => {
    const templates = {
      kementerian: 'kode,nama\n01,Kementerian SDM\n02,Kementerian Ekonomi',
      jenis_transaksi: 'kode,nama\n10,Sponsor\n11,Pendaftaran\n15,Infaq Shubuh',
      program_event: 'nama,deskripsi,tanggal_mulai,tanggal_selesai,target_dana,is_rutin\nBukber 2026,Buka bersama tahunan,2026-03-15,2026-03-15,5000000,false',
      kategori_pengeluaran: 'nama,kelompok,deskripsi\nKonsumsi / Catering,Operasional Acara,Biaya makan',
      rekening: 'nama,bank,nomor_rekening,saldo_awal\nBCA Syariah Utama,BCA,1234567890,0',
    };
    const csv = templates[importTab] || '';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `template_${importTab}.csv`; a.click();
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setImportLoading(true);
    setImportPreview(null);
    const text = await file.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    }).filter(r => Object.values(r).some(v => v));
    setImportPreview({ headers, rows });
    setImportLoading(false);
  };

  const handleImportSave = async () => {
    if (!importPreview) return;
    setImportLoading(true);
    try {
      const endpointMap = {
        kementerian: '/master/kementerian',
        jenis_transaksi: '/master/jenis-transaksi',
        program_event: '/master/program-event',
        kategori_pengeluaran: '/master/kategori-pengeluaran',
        rekening: '/master/rekening',
      };
      let saved = 0;
      for (const row of importPreview.rows) {
        try {
          const payload = { ...row };
          if (payload.target_dana) payload.target_dana = parseInt(payload.target_dana) || 0;
          if (payload.saldo_awal) payload.saldo_awal = parseInt(payload.saldo_awal) || 0;
          if (payload.is_rutin) payload.is_rutin = payload.is_rutin === 'true';
          await api.post(endpointMap[importTab], payload);
          saved++;
        } catch {}
      }
      setImportSaved(saved);
      setImportPreview(null);
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const tabs = [
    { id: 'kementerian', label: 'Kementerian' },
    { id: 'jenis', label: 'Jenis Transaksi' },
    { id: 'programs', label: 'Program & Event' },
    { id: 'kategoriPengeluaran', label: 'Kategori Pengeluaran' },
    { id: 'rekening', label: 'Rekening' },
    { id: 'import', label: '📥 Import CSV' },
  ];

  const kelompokOptions = ['Operasional Acara', 'SDM & Apresiasi', 'Keuangan & Admin', 'Program Sosial & Syariah', 'Investasi & Pengembangan'];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Master Data</h1>
        <p className="text-sm text-white/40 mt-1">Kelola data referensi kementerian, jenis transaksi, program, dan rekening</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-gold-500 text-dark-900' : 'bg-dark-700 text-white/50 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Kementerian */}
      {tab === 'kementerian' && (
        <CRUDTable
          title="🏛 Kementerian"
          items={data.kementerian}
          columns={[
            { key: 'kode', cls: 'text-gold-400 font-mono text-sm w-16' },
            { key: 'nama', cls: 'text-sm text-white/80' }
          ]}
          renderForm={(form, setForm) => (
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-white/40 mb-1 block">Kode (2 digit)</label>
                <input value={form.kode || ''} onChange={e => setForm(d => ({ ...d, kode: e.target.value }))} placeholder="01" className="input text-xs py-1.5" maxLength={2} /></div>
              <div><label className="text-xs text-white/40 mb-1 block">Nama</label>
                <input value={form.nama || ''} onChange={e => setForm(d => ({ ...d, nama: e.target.value }))} placeholder="Nama kementerian" className="input text-xs py-1.5" /></div>
            </div>
          )}
          {...crud('kementerian', 'kementerian')}
        />
      )}

      {/* Jenis Transaksi */}
      {tab === 'jenis' && (
        <CRUDTable
          title="💳 Jenis Transaksi (Masuk)"
          items={data.jenis}
          columns={[
            { key: 'kode', cls: 'text-gold-400 font-mono text-sm w-16' },
            { key: 'nama', cls: 'text-sm text-white/80' }
          ]}
          renderForm={(form, setForm) => (
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-white/40 mb-1 block">Kode (2 digit)</label>
                <input value={form.kode || ''} onChange={e => setForm(d => ({ ...d, kode: e.target.value }))} placeholder="11" className="input text-xs py-1.5" maxLength={2} /></div>
              <div><label className="text-xs text-white/40 mb-1 block">Nama</label>
                <input value={form.nama || ''} onChange={e => setForm(d => ({ ...d, nama: e.target.value }))} placeholder="Nama jenis transaksi" className="input text-xs py-1.5" /></div>
            </div>
          )}
          {...crud('jenis-transaksi', 'jenis')}
        />
      )}

      {/* Program & Event */}
      {tab === 'programs' && (
        <CRUDTable
          title="🎯 Program & Event"
          items={data.programs}
          columns={[
            { key: 'nama', cls: 'text-sm text-white/80 flex-1' },
            { key: 'kementerian_nama', cls: 'text-xs text-white/40 w-36', render: item => item.kementerian_nama || '—' },
            { key: 'is_rutin', cls: 'text-xs w-16', render: item => item.is_rutin ? <span className="text-gold-400">★ Rutin</span> : '' }
          ]}
          renderForm={(form, setForm) => (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              <div className="col-span-2 lg:col-span-1">
                <label className="text-xs text-white/40 mb-1 block">Nama Program/Event</label>
                <input value={form.nama || ''} onChange={e => setForm(d => ({ ...d, nama: e.target.value }))} placeholder="Bukber 2026" className="input text-xs py-1.5" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Kementerian</label>
                <select value={form.kementerian_id || ''} onChange={e => setForm(d => ({ ...d, kementerian_id: e.target.value || null }))} className="select text-xs py-1.5">
                  <option value="">Tidak Terikat</option>
                  {data.kementerian.map(k => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Jenis Transaksi</label>
                <select value={form.jenis_transaksi_id || ''} onChange={e => setForm(d => ({ ...d, jenis_transaksi_id: e.target.value || null }))} className="select text-xs py-1.5">
                  <option value="">Semua Jenis</option>
                  {data.jenis.map(j => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Target Dana</label>
                <input type="number" value={form.target_dana || ''} onChange={e => setForm(d => ({ ...d, target_dana: e.target.value }))} placeholder="0" className="input text-xs py-1.5" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Deskripsi</label>
                <input value={form.deskripsi || ''} onChange={e => setForm(d => ({ ...d, deskripsi: e.target.value }))} className="input text-xs py-1.5" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_rutin || false} onChange={e => setForm(d => ({ ...d, is_rutin: e.target.checked }))} className="rounded" />
                  <span className="text-xs text-white/60">Program Rutin</span>
                </label>
              </div>
            </div>
          )}
          {...crud('program-event', 'programs')}
        />
      )}

      {/* Kategori Pengeluaran */}
      {tab === 'kategoriPengeluaran' && (
        <CRUDTable
          title="💸 Kategori Pengeluaran"
          items={data.kategoriPengeluaran}
          columns={[
            { key: 'kelompok', cls: 'text-xs text-white/40 w-40', render: item => item.kelompok || '—' },
            { key: 'nama', cls: 'text-sm text-white/80 flex-1' },
            { key: 'deskripsi', cls: 'text-xs text-white/30', render: item => item.deskripsi || '—' }
          ]}
          renderForm={(form, setForm) => (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Kelompok</label>
                <select value={form.kelompok || ''} onChange={e => setForm(d => ({ ...d, kelompok: e.target.value }))} className="select text-xs py-1.5">
                  <option value="">— Pilih —</option>
                  {kelompokOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Nama Kategori</label>
                <input value={form.nama || ''} onChange={e => setForm(d => ({ ...d, nama: e.target.value }))} className="input text-xs py-1.5" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Deskripsi</label>
                <input value={form.deskripsi || ''} onChange={e => setForm(d => ({ ...d, deskripsi: e.target.value }))} className="input text-xs py-1.5" />
              </div>
            </div>
          )}
          {...crud('kategori-pengeluaran', 'kategoriPengeluaran')}
        />
      )}

      {/* Rekening */}
      {tab === 'rekening' && (
        <CRUDTable
          title="🏦 Rekening Bank"
          items={data.rekening}
          columns={[
            { key: 'bank', cls: 'text-gold-400 font-semibold text-sm w-16' },
            { key: 'nama', cls: 'text-sm text-white/80 flex-1' },
            { key: 'nomor_rekening', cls: 'text-xs font-mono text-white/40' },
            { key: 'saldo_awal', cls: 'text-xs text-white/40', render: item => `Rp ${Number(item.saldo_awal).toLocaleString('id-ID')}` }
          ]}
          renderForm={(form, setForm) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <div><label className="text-xs text-white/40 mb-1 block">Nama</label>
                <input value={form.nama || ''} onChange={e => setForm(d => ({ ...d, nama: e.target.value }))} className="input text-xs py-1.5" /></div>
              <div><label className="text-xs text-white/40 mb-1 block">Bank</label>
                <select value={form.bank || ''} onChange={e => setForm(d => ({ ...d, bank: e.target.value }))} className="select text-xs py-1.5">
                  <option value="">— Pilih —</option>
                  <option value="BCA">BCA Syariah</option>
                  <option value="BSI">BSI</option>
                </select></div>
              <div><label className="text-xs text-white/40 mb-1 block">Nomor Rekening</label>
                <input value={form.nomor_rekening || ''} onChange={e => setForm(d => ({ ...d, nomor_rekening: e.target.value }))} className="input text-xs py-1.5" /></div>
              <div><label className="text-xs text-white/40 mb-1 block">Saldo Awal</label>
                <input type="number" value={form.saldo_awal || ''} onChange={e => setForm(d => ({ ...d, saldo_awal: e.target.value }))} className="input text-xs py-1.5" /></div>
            </div>
          )}
          {...crud('rekening', 'rekening')}
        />
      )}

      {/* Import CSV */}
      {tab === 'import' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div className="text-sm font-semibold text-white">📥 Import Master Data via CSV</div>
            <p className="text-xs text-white/40">Upload CSV untuk tambah data kementerian, jenis transaksi, program, kategori, atau rekening sekaligus.</p>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'kementerian', label: '🏛 Kementerian' },
                { id: 'jenis_transaksi', label: '🏷 Jenis Transaksi' },
                { id: 'program_event', label: '📋 Program & Event' },
                { id: 'kategori_pengeluaran', label: '📦 Kategori Pengeluaran' },
                { id: 'rekening', label: '🏦 Rekening' },
              ].map(e => (
                <button key={e.id} onClick={() => { setImportTab(e.id); setImportPreview(null); setImportSaved(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${importTab === e.id ? 'border-gold-500/50 bg-gold-500/10 text-gold-400' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
                  {e.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg">
              <FileSpreadsheet size={16} className="text-white/40 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/60 font-medium">Template CSV</div>
                <div className="text-[11px] text-white/25">Download → isi data → upload kembali</div>
              </div>
              <button onClick={downloadTemplate} className="btn-secondary text-xs py-1.5 flex items-center gap-1 flex-shrink-0">
                <Download size={12} /> Template
              </button>
            </div>

            <div className="bg-dark-800 rounded-lg p-3 overflow-x-auto">
              <div className="text-[10px] text-white/20 mb-1">Contoh format:</div>
              {{{
                kementerian: 'kode,nama\n01,Kementerian SDM',
                jenis_transaksi: 'kode,nama\n10,Sponsor\n11,Pendaftaran',
                program_event: 'nama,deskripsi,tanggal_mulai,tanggal_selesai,target_dana,is_rutin\nBukber 2026,,2026-03-15,2026-03-15,5000000,false',
                kategori_pengeluaran: 'nama,kelompok,deskripsi\nKonsumsi / Catering,Operasional Acara,Biaya makan',
                rekening: 'nama,bank,nomor_rekening,saldo_awal\nBCA Syariah,BCA,123456,0',
              }[importTab].split('\n').map((line, i) => (
                <div key={i} className={`text-[11px] font-mono ${i === 0 ? 'text-gold-400/60' : 'text-white/30'}`}>{line}</div>
              ))}}
            </div>

            {!importPreview && !importLoading && (
              <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-white/20 transition-all"
                onClick={() => fileRef.current?.click()}>
                <Upload size={24} className="mx-auto mb-2 text-white/20" />
                <div className="text-xs text-white/40">Klik untuk upload file CSV</div>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                  onChange={e => handleImportFile(e.target.files[0])} />
              </div>
            )}

            {importLoading && (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              </div>
            )}

            {importSaved !== null && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-400 flex items-center justify-between">
                <span>✅ {importSaved} data berhasil diimport!</span>
                <button onClick={() => setImportSaved(null)} className="text-white/30 hover:text-white ml-3">×</button>
              </div>
            )}

            {importPreview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">{importPreview.rows.length} baris siap diimport</span>
                  <div className="flex gap-2">
                    <button onClick={() => setImportPreview(null)} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
                    <button onClick={handleImportSave} disabled={importLoading} className="btn-primary text-xs py-1.5 px-4">
                      💾 Import {importPreview.rows.length} Data
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-white/5 max-h-60">
                  <table className="w-full text-xs">
                    <thead className="bg-dark-700 sticky top-0">
                      <tr>{importPreview.headers.map(h => (
                        <th key={h} className="text-left px-3 py-2 text-white/30">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row, i) => (
                        <tr key={i} className="border-t border-white/5">
                          {importPreview.headers.map(h => (
                            <td key={h} className="px-3 py-2 text-white/55">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
