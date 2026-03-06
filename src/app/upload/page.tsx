'use client'
import { useState, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { formatRupiah, parseQrisCode } from '@/lib/qris'
import { Upload, FileText, Image, Table, Trash2, Check, AlertCircle, Loader, Camera } from 'lucide-react'
import * as XLSX from 'xlsx'

type UploadMode = 'qris' | 'mutasi-pdf' | 'mutasi-image'

const BANK_OPTIONS = ['BCA', 'BSI'] as const
type BankType = typeof BANK_OPTIONS[number]

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>('qris')
  const [bank, setBank] = useState<BankType>('BCA')
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

  // ─── QRIS (.xlsx) ──────────────────────────────────────────────────────────
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
      const text = await res.text()
      try {
        const data = JSON.parse(text)
        if (data.error) throw new Error(data.error)
        setPreview(data.preview || [])
      } catch (err: any) {
        if (err.message.includes('Unexpected token')) {
          console.error('Server HTML Response:', text)
          throw new Error(`Server Error: ${text.substring(0, 50)}...`)
        }
        throw err
      }
    } catch (e: any) {
      showToast('Gagal parsing QRIS: ' + e.message, 'error')
    }
    setLoading(false)
  }

  // ─── Mutasi PDF atau Image ─────────────────────────────────────────────────
  const handleMutasiFile = async (file: File) => {
    await loadMasterData()
    setLoading(true)
    try {
      // Convert to base64 — handle large files safely
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // strip data URL prefix
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const mimeType = file.type || (mode === 'mutasi-pdf' ? 'application/pdf' : 'image/jpeg')

      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/mutasi/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileBase64: base64, mimeType, bank }),
      })
      const text = await res.text()
      try {
        const data = JSON.parse(text)
        if (data.error) throw new Error(data.error)
        setPreview(data.preview || [])
      } catch (err: any) {
        if (err.message.includes('Unexpected token')) {
          console.error('Server HTML Response:', text)
          // Usually 413 Payload Too Large or 504 Gateway Timeout or 502 Bad Gateway
          if (text.includes('413') || text.includes('Too Large')) throw new Error('File terlalu besar (Limit Server)')
          if (text.includes('504') || text.includes('Timeout')) throw new Error('Proses AI Timeout (melebihi limit waktu server)')
          throw new Error(`Server mengembalikan HTML (Error Server): ${text.substring(0, 50)}...`)
        }
        throw err
      }
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.setAttribute('style', '')
    const file = e.dataTransfer.files[0]
    if (!file) return
    setPreview([])
    if (mode === 'qris') handleQrisFile(file)
    else handleMutasiFile(file)
  }

  const removeRow = (idx: number) => setPreview(prev => prev.filter(r => r._idx !== idx))
  const updateRow = (idx: number, updates: any) =>
    setPreview(prev => prev.map(r => r._idx === idx ? { ...r, ...updates } : r))

  // ─── Save ──────────────────────────────────────────────────────────────────
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
  const isMutasi = mode === 'mutasi-pdf' || mode === 'mutasi-image'

  // ─── Accept types ─────────────────────────────────────────────────────────
  const acceptMap: Record<UploadMode, string> = {
    'qris': '.xlsx,.xls',
    'mutasi-pdf': '.pdf',
    'mutasi-image': '.jpg,.jpeg,.png,.webp',
  }

  // ─── Mode config ──────────────────────────────────────────────────────────
  const modes: { id: UploadMode; label: string; icon: any; desc: string; color: string }[] = [
    {
      id: 'qris',
      label: 'Upload QRIS',
      icon: Table,
      desc: 'File .xlsx dari DSP QRIS export',
      color: '#22c55e',
    },
    {
      id: 'mutasi-pdf',
      label: 'Mutasi Bank (PDF)',
      icon: FileText,
      desc: 'PDF e-Statement BCA Syariah / BSI',
      color: '#3b82f6',
    },
    {
      id: 'mutasi-image',
      label: 'Mutasi Bank (Screenshot)',
      icon: Camera,
      desc: 'Screenshot / foto mutasi BCA / BSI',
      color: '#a855f7',
    },
  ]

  const currentMode = modes.find(m => m.id === mode)!

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Upload Data</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Upload QRIS, mutasi bank PDF, atau screenshot mutasi
          </p>
        </div>

        {/* Mode tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {modes.map(m => {
            const Icon = m.icon
            const active = mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setPreview([]) }}
                className="flex items-start gap-3 p-4 rounded-xl text-left transition-all"
                style={{
                  background: active ? `rgba(${m.color === '#22c55e' ? '34,197,94' : m.color === '#3b82f6' ? '59,130,246' : '168,85,247'},0.08)` : 'var(--bg-card)',
                  border: active ? `1px solid ${m.color}40` : '1px solid var(--bg-border)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: active ? `${m.color}20` : 'rgba(255,255,255,0.04)' }}
                >
                  <Icon size={18} style={{ color: active ? m.color : 'var(--text-secondary)' }} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: active ? m.color : 'var(--text-primary)' }}>
                    {m.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{m.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Bank selector for mutasi modes */}
        {isMutasi && (
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Bank:</span>
            {BANK_OPTIONS.map(b => (
              <button
                key={b}
                onClick={() => setBank(b)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: bank === b ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)',
                  border: bank === b ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--bg-border)',
                  color: bank === b ? '#3b82f6' : 'var(--text-secondary)',
                }}
              >
                {b === 'BCA' ? 'BCA Syariah' : 'BSI'}
              </button>
            ))}
            {mode === 'mutasi-image' && (
              <span className="text-xs ml-1 px-2 py-1 rounded" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
                📸 AI Vision akan membaca screenshot
              </span>
            )}
          </div>
        )}

        {/* Upload area */}
        {preview.length === 0 && (
          <div
            className="card p-10 text-center cursor-pointer transition-all"
            style={{ border: '2px dashed var(--bg-border)' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => {
              e.preventDefault()
              e.currentTarget.style.borderColor = currentMode.color
            }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)' }}
            onDrop={handleDrop}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="spinner" />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {mode === 'mutasi-pdf' && 'Memproses PDF dengan GPT-4o...'}
                  {mode === 'mutasi-image' && 'Membaca screenshot dengan AI Vision...'}
                  {mode === 'qris' && 'Memproses file QRIS...'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {isMutasi ? 'Proses AI biasanya 10–30 detik, harap tunggu' : ''}
                </p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${currentMode.color}15` }}>
                  <currentMode.icon size={28} style={{ color: currentMode.color }} />
                </div>
                <p className="font-semibold text-base mb-1">Klik atau drag & drop file di sini</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {mode === 'qris' && 'Format: .xlsx (DSP QRIS Export)'}
                  {mode === 'mutasi-pdf' && `Format: PDF mutasi ${bank} Syariah`}
                  {mode === 'mutasi-image' && `Format: JPG/PNG screenshot mutasi ${bank}`}
                </p>
                {isMutasi && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    Diproses otomatis oleh AI — tidak perlu format khusus
                  </p>
                )}
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept={acceptMap[mode]}
              className="hidden"
              onChange={handleFileDrop}
            />
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">{preview.length} baris terdeteksi</span>
                {totalDuplicate > 0 && (
                  <span className="text-xs px-2 py-1 rounded badge-cek-manual">
                    {totalDuplicate} duplikat (dilewati)
                  </span>
                )}
                <span className="text-xs px-2 py-1 rounded badge-valid">
                  {totalNonDuplicate} akan disimpan
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPreview([]); if (fileRef.current) fileRef.current.value = '' }}
                  className="btn-secondary"
                >
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
                          <th className="text-right px-4 py-2 text-xs uppercase" style={{ color: '#22c55e' }}>Jumlah</th>
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
                            <td className="px-4 py-2 whitespace-nowrap">{row.created_date?.substring(0, 10)}</td>
                            <td className="px-4 py-2" style={{ maxWidth: 160 }}><div className="truncate">{row.merchant_name}</div></td>
                            <td className="px-4 py-2 text-right font-medium" style={{ color: '#22c55e' }}>{formatRupiah(row.amount)}</td>
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
                              <span className={`badge-${row.isDuplicate ? 'cek-manual' : 'valid'} text-xs px-2 py-0.5 rounded`}>
                                {row.isDuplicate ? 'duplikat' : row.status}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 whitespace-nowrap">{row.tanggal}</td>
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
