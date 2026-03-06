'use client'
import { useState, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { formatRupiah, parseQrisCode } from '@/lib/qris'
import { Upload, FileText, Table, Trash2, Check, AlertCircle, Loader, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'

type UploadMode = 'qris' | 'mutasi'

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>('qris')
  const [bank, setBank] = useState<'BCA' | 'BSI'>('BCA')
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [kementerian, setKementerian] = useState<any[]>([])
  const [jenisTransaksi, setJenisTransaksi] = useState<any[]>([])
  const [kategoriPengeluaran, setKategoriPengeluaran] = useState<any[]>([])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadMasterData = async () => {
    const [k, j, kp] = await Promise.all([
      fetch('/api/master?entity=kementerian').then(r => r.json()),
      fetch('/api/master?entity=jenis-transaksi').then(r => r.json()),
      fetch('/api/master?entity=kategori-pengeluaran').then(r => r.json()),
    ])
    setKementerian(k.data || [])
    setJenisTransaksi(j.data || [])
    setKategoriPengeluaran(kp.data || [])
  }

  const handleQrisFile = async (file: File) => {
    await loadMasterData()
    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)

      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/qris/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      setPreview(data.preview || [])
    } catch (e: any) {
      showToast('Gagal parsing file: ' + e.message, 'error')
    }
    setLoading(false)
  }

  const handleMutasiFile = async (file: File) => {
    await loadMasterData()
    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      const mimeType = file.type || 'application/pdf'

      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/mutasi/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileBase64: base64, mimeType, bank }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPreview(data.preview || [])
    } catch (e: any) {
      showToast('Gagal parsing: ' + e.message, 'error')
    }
    setLoading(false)
  }

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview([])
    if (mode === 'qris') handleQrisFile(file)
    else handleMutasiFile(file)
  }

  const removeRow = (idx: number) => {
    setPreview(prev => prev.filter(r => r._idx !== idx))
  }

  const updateRow = (idx: number, updates: any) => {
    setPreview(prev => prev.map(r => r._idx === idx ? { ...r, ...updates } : r))
  }

  const saveQris = async () => {
    setSaving(true)
    const toSave = preview.filter(r => !r.isDuplicate)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows: toSave }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast(`${data.saved} transaksi QRIS berhasil disimpan`)
      setPreview([])
    } catch (e: any) {
      showToast('Gagal menyimpan: ' + e.message, 'error')
    }
    setSaving(false)
  }

  const saveMutasi = async () => {
    setSaving(true)
    const toSave = preview.filter(r => !r.isDuplicate)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/mutasi/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transactions: toSave }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast(`${data.saved} transaksi berhasil disimpan`)
      setPreview([])
    } catch (e: any) {
      showToast('Gagal menyimpan: ' + e.message, 'error')
    }
    setSaving(false)
  }

  const totalNonDuplicate = preview.filter(r => !r.isDuplicate).length
  const totalDuplicate = preview.filter(r => r.isDuplicate).length

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Upload Mutasi</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Upload data QRIS atau mutasi bank</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2">
          {(['qris', 'mutasi'] as UploadMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setPreview([]) }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: mode === m ? 'rgba(240,165,0,0.1)' : 'var(--bg-card)',
                border: mode === m ? '1px solid rgba(240,165,0,0.3)' : '1px solid var(--bg-border)',
                color: mode === m ? 'var(--accent-gold)' : 'var(--text-secondary)',
              }}
            >
              {m === 'qris' ? '📊 Upload QRIS (.xlsx)' : '📄 Upload Mutasi Bank (PDF)'}
            </button>
          ))}
        </div>

        {/* Bank selector for mutasi */}
        {mode === 'mutasi' && (
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Bank:</span>
            {(['BCA', 'BSI'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBank(b)}
                className="px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{
                  background: bank === b ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)',
                  border: bank === b ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--bg-border)',
                  color: bank === b ? '#3b82f6' : 'var(--text-secondary)',
                }}
              >
                {b === 'BCA' ? 'BCA Syariah' : 'BSI'}
              </button>
            ))}
          </div>
        )}

        {/* Upload area */}
        {preview.length === 0 && (
          <div
            className="card p-10 text-center cursor-pointer transition-all"
            style={{ border: '2px dashed var(--bg-border)' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-gold)' }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)' }}
            onDrop={e => {
              e.preventDefault()
              e.currentTarget.style.borderColor = 'var(--bg-border)'
              const file = e.dataTransfer.files[0]
              if (file) {
                setPreview([])
                if (mode === 'qris') handleQrisFile(file)
                else handleMutasiFile(file)
              }
            }}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="spinner" />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {mode === 'mutasi' ? 'Memproses dengan AI...' : 'Memproses file...'}
                </p>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
                <p className="font-medium">Klik atau drag & drop file di sini</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {mode === 'qris' ? 'Format: .xlsx (DSP Export)' : 'Format: PDF mutasi BCA Syariah atau BSI'}
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept={mode === 'qris' ? '.xlsx,.xls' : '.pdf,.jpg,.jpeg,.png'}
              className="hidden"
              onChange={handleFileDrop}
            />
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{preview.length} baris terdeteksi</span>
                {totalDuplicate > 0 && (
                  <span className="text-xs px-2 py-1 rounded badge-cek-manual">
                    {totalDuplicate} duplikat (akan dilewati)
                  </span>
                )}
                <span className="text-xs px-2 py-1 rounded badge-valid">
                  {totalNonDuplicate} akan disimpan
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPreview([]); if (fileRef.current) fileRef.current.value = '' }} className="btn-secondary">
                  Batal
                </button>
                <button
                  onClick={mode === 'qris' ? saveQris : saveMutasi}
                  disabled={saving || totalNonDuplicate === 0}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Check size={14} />}
                  Simpan {totalNonDuplicate} Data
                </button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0" style={{ background: 'var(--bg-card)' }}>
                    <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                      {mode === 'qris' ? (
                        <>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Tanggal</th>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Merchant</th>
                          <th className="text-right px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Jumlah</th>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Kementerian</th>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Jenis</th>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Status</th>
                          <th className="px-4 py-2"></th>
                        </>
                      ) : (
                        <>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Tanggal</th>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Keterangan</th>
                          <th className="text-right px-4 py-2 text-xs uppercase" style={{ color: '#ef4444' }}>Debit</th>
                          <th className="text-right px-4 py-2 text-xs uppercase" style={{ color: '#22c55e' }}>Kredit</th>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Tipe</th>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Kementerian</th>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Jenis/Kategori</th>
                          <th className="text-left px-4 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Status</th>
                          <th className="px-4 py-2"></th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(row => (
                      <tr
                        key={row._idx}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: row.isDuplicate ? 'rgba(234,179,8,0.05)' : 'transparent',
                          opacity: row.isDuplicate ? 0.6 : 1,
                        }}
                      >
                        {mode === 'qris' ? (
                          <>
                            <td className="px-4 py-2">{row.created_date?.substring(0, 10)}</td>
                            <td className="px-4 py-2" style={{ maxWidth: 160 }}><div className="truncate">{row.merchant_name}</div></td>
                            <td className="px-4 py-2 text-right font-medium">{formatRupiah(row.amount)}</td>
                            <td className="px-4 py-2">
                              <select
                                value={row.kementerian_id || ''}
                                onChange={e => updateRow(row._idx, { kementerian_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="input-dark text-xs py-1"
                                style={{ minWidth: 140 }}
                              >
                                <option value="">— Pilih —</option>
                                {kementerian.map((k: any) => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={row.jenis_transaksi_id || ''}
                                onChange={e => updateRow(row._idx, { jenis_transaksi_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="input-dark text-xs py-1"
                                style={{ minWidth: 140 }}
                              >
                                <option value="">— Pilih —</option>
                                {jenisTransaksi.map((j: any) => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`badge-${row.isDuplicate ? 'cek-manual' : row.status === 'pending' ? 'valid' : 'cek-manual'} text-xs px-2 py-0.5 rounded`}>
                                {row.isDuplicate ? 'duplikat' : row.status}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2">{row.tanggal}</td>
                            <td className="px-4 py-2" style={{ maxWidth: 200 }}><div className="truncate">{row.keterangan}</div></td>
                            <td className="px-4 py-2 text-right" style={{ color: '#ef4444' }}>{row.debit > 0 ? formatRupiah(row.debit) : '—'}</td>
                            <td className="px-4 py-2 text-right" style={{ color: '#22c55e' }}>{row.kredit > 0 ? formatRupiah(row.kredit) : '—'}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${row.tipe === 'masuk' ? 'badge-valid' : 'badge-lainnya'}`}>
                                {row.tipe}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={row.kementerian_id || ''}
                                onChange={e => updateRow(row._idx, { kementerian_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="input-dark text-xs py-1"
                                style={{ minWidth: 120 }}
                              >
                                <option value="">— Pilih —</option>
                                {kementerian.map((k: any) => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              {row.tipe === 'masuk' ? (
                                <select
                                  value={row.jenis_transaksi_id || ''}
                                  onChange={e => updateRow(row._idx, { jenis_transaksi_id: e.target.value ? parseInt(e.target.value) : null })}
                                  className="input-dark text-xs py-1"
                                  style={{ minWidth: 140 }}
                                >
                                  <option value="">— Jenis —</option>
                                  {jenisTransaksi.map((j: any) => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
                                </select>
                              ) : (
                                <select
                                  value={row.kategori_pengeluaran_id || ''}
                                  onChange={e => updateRow(row._idx, { kategori_pengeluaran_id: e.target.value ? parseInt(e.target.value) : null })}
                                  className="input-dark text-xs py-1"
                                  style={{ minWidth: 140 }}
                                >
                                  <option value="">— Kategori —</option>
                                  {kategoriPengeluaran.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`badge-${row.isDuplicate ? 'cek-manual' : row.status === 'valid' ? 'valid' : 'cek-manual'} text-xs px-2 py-0.5 rounded`}>
                                {row.isDuplicate ? 'duplikat' : row.status}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-2">
                          <button onClick={() => removeRow(row._idx)} className="text-red-400 hover:text-red-300">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.msg}
        </div>
      )}
    </AppLayout>
  )
}
