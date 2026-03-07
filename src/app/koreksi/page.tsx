'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { formatRupiah } from '@/lib/qris'
import { CheckCircle, Trash2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

export default function KoreksiPage() {
  const [transaksi, setTransaksi] = useState<any[]>([])
  const [kementerian, setKementerian] = useState<any[]>([])
  const [jenisTransaksi, setJenisTransaksi] = useState<any[]>([])
  const [kategoriPengeluaran, setKategoriPengeluaran] = useState<any[]>([])
  const [programEvent, setProgramEvent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkKem, setBulkKem] = useState('')
  const [bulkJenis, setBulkJenis] = useState('')
  const [bulkKat, setBulkKat] = useState('')
  const [tipeFilter, setTipeFilter] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { loadAll() }, [tipeFilter])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadAll = async () => {
    setLoading(true)
    const token = localStorage.getItem('admin_token')
    const [trxRes, kemRes, jenisRes, katRes, progRes] = await Promise.all([
      fetch(`/api/transaksi?status=cek_manual&limit=100${tipeFilter ? `&tipe=${tipeFilter}` : ''}`),
      fetch('/api/master?entity=kementerian'),
      fetch('/api/master?entity=jenis-transaksi'),
      fetch('/api/master?entity=kategori-pengeluaran'),
      fetch('/api/master?entity=program-event'),
    ])
    const [trxData, kemData, jenisData, katData, progData] = await Promise.all([
      trxRes.json(), kemRes.json(), jenisRes.json(), katRes.json(), progRes.json()
    ])
    setTransaksi(trxData.data || [])
    setKementerian(kemData.data || [])
    setJenisTransaksi(jenisData.data || [])
    setKategoriPengeluaran(katData.data || [])
    setProgramEvent(progData.data || [])
    setLoading(false)
  }

  const updateLocal = (id: number, updates: any) => {
    setTransaksi(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const saveKoreksi = async (t: any) => {
    const token = localStorage.getItem('admin_token')
    const updates: any = {
      id: t.id,
      kementerian_id: t.kementerian_id || null,
      program_event_id: t.program_event_id || null,
    }
    if (t.tipe === 'masuk') {
      updates.jenis_transaksi_id = t.jenis_transaksi_id || null
    } else {
      updates.kategori_pengeluaran_id = t.kategori_pengeluaran_id || null
    }
    const res = await fetch('/api/transaksi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (data.error) { showToast(data.error, 'error'); return }
    setTransaksi(prev => prev.filter(x => x.id !== t.id))
    showToast('Koreksi berhasil disimpan')
  }

  const deleteTransaksi = async (id: number) => {
    const token = localStorage.getItem('admin_token')
    await fetch('/api/transaksi', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    setTransaksi(prev => prev.filter(t => t.id !== id))
    showToast('Transaksi dihapus')
  }

  const applyBulk = async () => {
    if (selected.size === 0) return
    const token = localStorage.getItem('admin_token')
    for (const id of selected) {
      const t = transaksi.find(x => x.id === id)
      if (!t) continue
      const updates: any = { id, kementerian_id: bulkKem ? parseInt(bulkKem) : null }
      if (t.tipe === 'masuk' && bulkJenis) updates.jenis_transaksi_id = parseInt(bulkJenis)
      if (t.tipe === 'keluar' && bulkKat) updates.kategori_pengeluaran_id = parseInt(bulkKat)
      await fetch('/api/transaksi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      })
    }
    showToast(`${selected.size} transaksi berhasil dikoreksi`)
    setSelected(new Set())
    loadAll()
  }

  const filteredPrograms = (kemId: number | null) =>
    programEvent.filter(p => !p.kementerian_id || p.kementerian_id === kemId || p.is_rutin)

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="spinner" /></div></AppLayout>

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Koreksi Transaksi</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {transaksi.length} transaksi perlu diklasifikasikan
            </p>
          </div>
          <select
            value={tipeFilter}
            onChange={(e) => setTipeFilter(e.target.value)}
            className="input-dark text-xs py-1.5"
            style={{ width: 150 }}
          >
            <option value="">Semua Tipe</option>
            <option value="masuk">Pemasukan (+)</option>
            <option value="keluar">Pengeluaran (-)</option>
          </select>
        </div>

        {/* Bulk apply */}
        {selected.size > 0 && (
          <div className="card p-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--accent-gold)' }}>
              {selected.size} dipilih
            </span>
            <select value={bulkKem} onChange={e => setBulkKem(e.target.value)} className="input-dark text-xs" style={{ width: 160 }}>
              <option value="">Kementerian</option>
              {kementerian.map(k => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
            </select>
            {Array.from(selected).some(id => transaksi.find(t => t.id === id)?.tipe === 'masuk') && (
              <select value={bulkJenis} onChange={e => setBulkJenis(e.target.value)} className="input-dark text-xs" style={{ width: 160 }}>
                <option value="">Jenis Transaksi (Masuk)</option>
                {jenisTransaksi.map(j => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
              </select>
            )}
            {Array.from(selected).some(id => transaksi.find(t => t.id === id)?.tipe === 'keluar') && (
              <select value={bulkKat} onChange={e => setBulkKat(e.target.value)} className="input-dark text-xs" style={{ width: 180 }}>
                <option value="">Jenis Transaksi (Keluar)</option>
                {kategoriPengeluaran.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            )}
            <button onClick={applyBulk} className="btn-primary text-xs">Terapkan ke Semua</button>
            <button onClick={() => setSelected(new Set())} className="btn-secondary text-xs">Batal</button>
          </div>
        )}

        {/* Select all */}
        {transaksi.length > 0 && (
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={selected.size === transaksi.length}
              onChange={e => setSelected(e.target.checked ? new Set(transaksi.map(t => t.id)) : new Set())}
            />
            <span>Pilih semua</span>
          </div>
        )}

        {transaksi.length === 0 && (
          <div className="card p-12 text-center">
            <CheckCircle size={40} className="mx-auto mb-3" style={{ color: '#22c55e' }} />
            <p className="font-medium">Semua transaksi sudah diklasifikasikan!</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Tidak ada yang perlu dikoreksi</p>
          </div>
        )}

        <div className="space-y-3">
          {transaksi.map(t => (
            <div key={t.id} className="card p-4" style={{ border: selected.has(t.id) ? '1px solid rgba(240,165,0,0.3)' : undefined }}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={e => {
                    const next = new Set(selected)
                    e.target.checked ? next.add(t.id) : next.delete(t.id)
                    setSelected(next)
                  }}
                  className="mt-1"
                />
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: t.tipe === 'masuk' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                  {t.tipe === 'masuk'
                    ? <TrendingUp size={14} style={{ color: '#22c55e' }} />
                    : <TrendingDown size={14} style={{ color: '#ef4444' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="font-medium text-sm">{t.keterangan}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>{t.tanggal}</span>
                        <span>•</span>
                        <span className="uppercase">{t.sumber}</span>
                        <span>•</span>
                        <span className={t.tipe === 'masuk' ? 'text-green-400' : 'text-red-400'}>
                          {t.tipe === 'masuk' ? '+' : '-'}{formatRupiah(t.jumlah)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => saveKoreksi(t)} className="btn-primary text-xs px-3 py-1.5">
                        Simpan
                      </button>
                      <button onClick={() => deleteTransaksi(t.id)} className="btn-danger text-xs px-2 py-1.5">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Classification fields */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <select
                      value={t.kementerian_id || ''}
                      onChange={e => updateLocal(t.id, { kementerian_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="input-dark text-xs"
                      style={{ width: 180 }}
                    >
                      <option value="">Kementerian</option>
                      {kementerian.map(k => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
                    </select>

                    {t.tipe === 'masuk' ? (
                      <select
                        value={t.jenis_transaksi_id || ''}
                        onChange={e => updateLocal(t.id, { jenis_transaksi_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="input-dark text-xs"
                        style={{ width: 200 }}
                      >
                        <option value="">Jenis Transaksi</option>
                        {jenisTransaksi.map(j => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
                      </select>
                    ) : (
                      <select
                        value={t.kategori_pengeluaran_id || ''}
                        onChange={e => updateLocal(t.id, { kategori_pengeluaran_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="input-dark text-xs"
                        style={{ width: 200 }}
                      >
                        <option value="">Jenis Transaksi</option>
                        {kategoriPengeluaran.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                      </select>
                    )}

                    <select
                      value={t.program_event_id || ''}
                      onChange={e => updateLocal(t.id, { program_event_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="input-dark text-xs"
                      style={{ width: 200 }}
                    >
                      <option value="">Program / Event</option>
                      {filteredPrograms(t.kementerian_id).map(p => (
                        <option key={p.id} value={p.id}>{p.nama}{p.is_rutin ? ' (Rutin)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.msg}
        </div>
      )}
    </AppLayout>
  )
}
