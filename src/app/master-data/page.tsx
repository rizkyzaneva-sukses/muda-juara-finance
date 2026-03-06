'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

const TABS = [
  { key: 'kementerian', label: 'Kementerian' },
  { key: 'jenis-transaksi', label: 'Jenis Transaksi' },
  { key: 'program-event', label: 'Program & Event' },
  { key: 'kategori-pengeluaran', label: 'Kategori Pengeluaran' },
  { key: 'rekening', label: 'Rekening' },
]

export default function MasterDataPage() {
  const [tab, setTab] = useState('kementerian')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [form, setForm] = useState<any>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [kemList, setKemList] = useState<any[]>([])
  const [jenisList, setJenisList] = useState<any[]>([])

  useEffect(() => { loadData() }, [tab])
  useEffect(() => {
    fetch('/api/master?entity=kementerian').then(r => r.json()).then(d => setKemList(d.data || []))
    fetch('/api/master?entity=jenis-transaksi').then(r => r.json()).then(d => setJenisList(d.data || []))
  }, [])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = async () => {
    setLoading(true)
    const res = await fetch(`/api/master?entity=${tab}`)
    const d = await res.json()
    setData(d.data || [])
    setLoading(false)
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({})
    setShowForm(true)
  }

  const openEdit = (item: any) => {
    setEditItem(item)
    setForm({ ...item })
    setShowForm(true)
  }

  const handleSave = async () => {
    const token = localStorage.getItem('admin_token')
    const method = editItem ? 'PATCH' : 'POST'
    const body = editItem ? { entity: tab, id: editItem.id, ...form } : { entity: tab, ...form }

    const res = await fetch('/api/master', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (d.error) { showToast(d.error, 'error'); return }
    showToast(editItem ? 'Data diperbarui' : 'Data ditambahkan')
    setShowForm(false)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return
    const token = localStorage.getItem('admin_token')
    const res = await fetch('/api/master', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ entity: tab, id }),
    })
    const d = await res.json()
    if (d.error) { showToast(d.error, 'error'); return }
    showToast('Data dihapus')
    loadData()
  }

  const renderFormFields = () => {
    switch (tab) {
      case 'kementerian':
        return (
          <>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Kode (2 digit)</label>
              <input className="input-dark" value={form.kode || ''} onChange={e => setForm({ ...form, kode: e.target.value })} placeholder="01" maxLength={2} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Nama Kementerian</label>
              <input className="input-dark" value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="Kementerian SDM" />
            </div>
          </>
        )
      case 'jenis-transaksi':
        return (
          <>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Kode (2 digit)</label>
              <input className="input-dark" value={form.kode || ''} onChange={e => setForm({ ...form, kode: e.target.value })} placeholder="11" maxLength={2} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Nama Jenis</label>
              <input className="input-dark" value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="Pendaftaran" />
            </div>
          </>
        )
      case 'program-event':
        return (
          <>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Nama Program / Event</label>
              <input className="input-dark" value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="Bukber 2026" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Kementerian</label>
              <select className="input-dark" value={form.kementerian_id || ''} onChange={e => setForm({ ...form, kementerian_id: e.target.value ? parseInt(e.target.value) : null })}>
                <option value="">Tidak Terikat / Lintas Kementerian</option>
                {kemList.map(k => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Jenis Transaksi</label>
              <select className="input-dark" value={form.jenis_transaksi_id || ''} onChange={e => setForm({ ...form, jenis_transaksi_id: e.target.value ? parseInt(e.target.value) : null })}>
                <option value="">Semua Jenis</option>
                {jenisList.map(j => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Target Dana (Rp)</label>
              <input type="number" className="input-dark" value={form.target_dana || ''} onChange={e => setForm({ ...form, target_dana: parseInt(e.target.value) || 0 })} placeholder="20000000" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Deskripsi</label>
              <textarea className="input-dark" rows={2} value={form.deskripsi || ''} onChange={e => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_rutin" checked={form.is_rutin || false} onChange={e => setForm({ ...form, is_rutin: e.target.checked })} />
              <label htmlFor="is_rutin" className="text-sm">Program Rutin</label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Tanggal Mulai</label>
                <input type="date" className="input-dark" value={form.tanggal_mulai || ''} onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Tanggal Selesai</label>
                <input type="date" className="input-dark" value={form.tanggal_selesai || ''} onChange={e => setForm({ ...form, tanggal_selesai: e.target.value })} />
              </div>
            </div>
          </>
        )
      case 'kategori-pengeluaran':
        return (
          <>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Nama Kategori</label>
              <input className="input-dark" value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="Konsumsi / Catering" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Kelompok</label>
              <select className="input-dark" value={form.kelompok || ''} onChange={e => setForm({ ...form, kelompok: e.target.value })}>
                <option value="">— Pilih Kelompok —</option>
                <option>Operasional Acara</option>
                <option>SDM & Apresiasi</option>
                <option>Keuangan & Admin</option>
                <option>Program Sosial & Syariah</option>
                <option>Investasi & Pengembangan</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Deskripsi</label>
              <input className="input-dark" value={form.deskripsi || ''} onChange={e => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
          </>
        )
      case 'rekening':
        return (
          <>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Nama Rekening</label>
              <input className="input-dark" value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="BCA Syariah - Muda Juara" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Bank</label>
              <select className="input-dark" value={form.bank || ''} onChange={e => setForm({ ...form, bank: e.target.value })}>
                <option value="">— Pilih Bank —</option>
                <option>BCA Syariah</option>
                <option>BSI</option>
                <option>BRI</option>
                <option>Mandiri</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Nomor Rekening</label>
              <input className="input-dark" value={form.nomor_rekening || ''} onChange={e => setForm({ ...form, nomor_rekening: e.target.value })} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Saldo Awal (Rp)</label>
              <input type="number" className="input-dark" value={form.saldo_awal || ''} onChange={e => setForm({ ...form, saldo_awal: parseInt(e.target.value) || 0 })} />
            </div>
          </>
        )
      default: return null
    }
  }

  const renderTableRows = () => {
    switch (tab) {
      case 'kementerian':
      case 'jenis-transaksi':
        return data.map(item => (
          <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <td className="px-5 py-3 font-mono text-sm" style={{ color: 'var(--accent-gold)' }}>{item.kode}</td>
            <td className="px-5 py-3 text-sm">{item.nama}</td>
            <td className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => openEdit(item)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Pencil size={12} /></button>
                <button onClick={() => handleDelete(item.id)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Trash2 size={12} /></button>
              </div>
            </td>
          </tr>
        ))

      case 'program-event':
        return data.map(item => (
          <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <td className="px-5 py-3 text-sm font-medium">{item.nama}</td>
            <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.kementerian?.nama || '—'}</td>
            <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.jenis_transaksi?.nama || 'Semua Jenis'}</td>
            <td className="px-5 py-3 text-xs">
              {item.is_rutin && <span className="px-2 py-0.5 rounded badge-valid">Rutin</span>}
            </td>
            <td className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => openEdit(item)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Pencil size={12} /></button>
                <button onClick={() => handleDelete(item.id)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Trash2 size={12} /></button>
              </div>
            </td>
          </tr>
        ))

      case 'kategori-pengeluaran':
        return data.map(item => (
          <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <td className="px-5 py-3 text-sm">{item.nama}</td>
            <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.kelompok}</td>
            <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.deskripsi}</td>
            <td className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => openEdit(item)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Pencil size={12} /></button>
                <button onClick={() => handleDelete(item.id)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Trash2 size={12} /></button>
              </div>
            </td>
          </tr>
        ))

      case 'rekening':
        return data.map(item => (
          <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <td className="px-5 py-3 text-sm font-medium">{item.nama}</td>
            <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.bank}</td>
            <td className="px-5 py-3 text-xs font-mono">{item.nomor_rekening}</td>
            <td className="px-5 py-3 text-sm" style={{ color: 'var(--accent-green)' }}>
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.saldo_awal)}
            </td>
            <td className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => openEdit(item)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Pencil size={12} /></button>
                <button onClick={() => handleDelete(item.id)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Trash2 size={12} /></button>
              </div>
            </td>
          </tr>
        ))

      default: return null
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Master Data</h1>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{
                background: tab === t.key ? 'rgba(240,165,0,0.1)' : 'var(--bg-card)',
                border: tab === t.key ? '1px solid rgba(240,165,0,0.3)' : '1px solid var(--bg-border)',
                color: tab === t.key ? 'var(--accent-gold)' : 'var(--text-secondary)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-border)' }}>
            <h2 className="font-semibold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
              {TABS.find(t => t.key === tab)?.label}
            </h2>
            <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-xs">
              <Plus size={14} />
              Tambah
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'rgba(255,255,255,0.02)' }}>
                  {tab === 'kementerian' && <>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Kode</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Nama Kementerian</th>
                    <th className="px-5 py-3 text-xs uppercase font-medium text-right" style={{ color: 'var(--text-secondary)' }}>Aksi</th>
                  </>}
                  {tab === 'jenis-transaksi' && <>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Kode</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Nama Jenis</th>
                    <th className="px-5 py-3 text-xs uppercase font-medium text-right" style={{ color: 'var(--text-secondary)' }}>Aksi</th>
                  </>}
                  {tab === 'program-event' && <>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Nama Program</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Kementerian</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Jenis Transaksi</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Rutin</th>
                    <th className="px-5 py-3 text-xs uppercase font-medium text-right" style={{ color: 'var(--text-secondary)' }}>Aksi</th>
                  </>}
                  {tab === 'kategori-pengeluaran' && <>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Nama Kategori</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Kelompok</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Deskripsi</th>
                    <th className="px-5 py-3 text-xs uppercase font-medium text-right" style={{ color: 'var(--text-secondary)' }}>Aksi</th>
                  </>}
                  {tab === 'rekening' && <>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Nama</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Bank</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Nomor</th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>Saldo Awal</th>
                    <th className="px-5 py-3 text-xs uppercase font-medium text-right" style={{ color: 'var(--text-secondary)' }}>Aksi</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10"><div className="spinner mx-auto" /></td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-sm" style={{ color: 'var(--text-secondary)' }}>Belum ada data</td></tr>
                ) : renderTableRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="card p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
                {editItem ? 'Edit' : 'Tambah'} {TABS.find(t => t.key === tab)?.label}
              </h2>
              <button onClick={() => setShowForm(false)}><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
            </div>
            <div className="space-y-3">
              {renderFormFields()}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Check size={14} />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.msg}
        </div>
      )}
    </AppLayout>
  )
}
