'use client'
import { useState, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { formatRupiah, parseQrisCode, MDR_RATE } from '@/lib/qris'
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
  const [programEvent, setProgramEvent] = useState<any[]>([])

  // Bulk actions state
  const [selectedIdx, setSelectedIdx] = useState<number[]>([])
  const [bulkKem, setBulkKem] = useState<number | null>(null)
  const [bulkJenis, setBulkJenis] = useState<number | null>(null)
  const [bulkKategori, setBulkKategori] = useState<number | null>(null)
  const [bulkProgram, setBulkProgram] = useState<number | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadMasterData = async () => {
    const [k, j, kp, pe] = await Promise.all([
      fetch('/api/master?entity=kementerian').then(r => r.json()),
      fetch('/api/master?entity=jenis-transaksi').then(r => r.json()),
      fetch('/api/master?entity=kategori-pengeluaran').then(r => r.json()),
      fetch('/api/master?entity=program-event').then(r => r.json()),
    ])
    setKementerian(k.data || [])
    setJenisTransaksi(j.data || [])
    setKategoriPengeluaran(kp.data || [])
    setProgramEvent(pe.data || [])
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

  // Add an image compressor to avoid limits
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img
          const MAX_SIZE = 1200 // Max 1200px
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width
            width = MAX_SIZE
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            blob => {
              if (blob) resolve(blob)
              else reject(new Error('Canvas to Blob failed'))
            },
            'image/jpeg',
            0.8
          )
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // ─── Mutasi PDF atau Image ─────────────────────────────────────────────────
  const handleMutasiFile = async (file: File) => {
    await loadMasterData()
    setLoading(true)
    try {
      const mimeType = mode === 'mutasi-pdf' ? 'application/pdf' : 'image/jpeg'
      const formData = new FormData()

      if (mode === 'mutasi-image') {
        const compressedBlob = await compressImage(file)
        formData.append('file', compressedBlob, file.name)
      } else {
        formData.append('file', file)
      }
      formData.append('mimeType', mimeType)
      formData.append('bank', bank)

      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/mutasi/parse', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // NO Content-Type so browser sets boundary
        body: formData,
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

  const removeRow = (idx: number) => {
    setPreview(prev => prev.filter(r => r._idx !== idx))
    setSelectedIdx(prev => prev.filter(i => i !== idx))
  }
  const updateRow = (idx: number, updates: any) =>
    setPreview(prev => prev.map(r => r._idx === idx ? { ...r, ...updates } : r))

  // ─── Bulk Actions ──────────────────────────────────────────────────────────
  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIdx(preview.filter(r => !r.isDuplicate).map(r => r._idx))
    } else {
      setSelectedIdx([])
    }
  }

  const toggleSelect = (idx: number) => {
    setSelectedIdx(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

  const applyBulk = () => {
    if (selectedIdx.length === 0) return
    const updates: any = {}
    if (bulkKem) updates.kementerian_id = bulkKem
    if (bulkJenis) updates.jenis_transaksi_id = bulkJenis
    if (bulkKategori) updates.kategori_pengeluaran_id = bulkKategori
    if (bulkProgram) updates.program_event_id = bulkProgram

    setPreview(prev => prev.map(r => selectedIdx.includes(r._idx) ? { ...r, ...updates } : r))
    setSelectedIdx([])
    setBulkKem(null); setBulkJenis(null); setBulkKategori(null); setBulkProgram(null)
    showToast(`${selectedIdx.length} baris diperbarui otomatis`)
  }

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
                {mode === 'qris' && totalNonDuplicate > 0 && (() => {
                  const qrisAmts = preview.filter(r => !r.isDuplicate).reduce((acc, r) => acc + (r.amount || 0), 0)
                  const qrisMdr = qrisAmts * MDR_RATE
                  const qrisNetto = qrisAmts - qrisMdr
                  return (
                    <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Bruto: {formatRupiah(qrisAmts)} | MDR 0.7%: -{formatRupiah(qrisMdr)} | Netto ke BCA: {formatRupiah(qrisNetto)}
                    </span>
                  )
                })()}
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
              {/* Bulk Actions Toolbar */}
              {selectedIdx.length > 0 && (
                <div className="p-3 border-b flex items-center gap-3 bg-blue-500/10" style={{ borderColor: 'var(--bg-border)' }}>
                  <span className="text-xs font-semibold px-2">{selectedIdx.length} Terpilih:</span>
                  <select
                    value={bulkKem || ''}
                    onChange={e => setBulkKem(e.target.value ? parseInt(e.target.value) : null)}
                    className="input-dark text-xs py-1.5"
                    style={{ minWidth: 140 }}
                  >
                    <option value="">— Kementerian —</option>
                    {kementerian.map((k: any) => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
                  </select>
                  {(() => {
                    const isAllSelectedKeluar = selectedIdx.length > 0 && selectedIdx.every(id => preview.find((r: any) => r._idx === id)?.tipe === 'keluar');

                    if (isAllSelectedKeluar && mode !== 'qris') {
                      return (
                        <select
                          value={bulkKategori || ''}
                          onChange={e => setBulkKategori(e.target.value ? parseInt(e.target.value) : null)}
                          className="input-dark text-xs py-1.5"
                          style={{ minWidth: 140 }}
                        >
                          <option value="">— Pengeluaran —</option>
                          {kategoriPengeluaran.map((kp: any) => <option key={kp.id} value={kp.id}>{kp.nama}</option>)}
                        </select>
                      )
                    }

                    return (
                      <select
                        value={bulkJenis || ''}
                        onChange={e => setBulkJenis(e.target.value ? parseInt(e.target.value) : null)}
                        className="input-dark text-xs py-1.5"
                        style={{ minWidth: 140 }}
                      >
                        <option value="">— Jenis —</option>
                        {jenisTransaksi.map((j: any) => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
                      </select>
                    )
                  })()}
                  <select
                    value={bulkProgram || ''}
                    onChange={e => setBulkProgram(e.target.value ? parseInt(e.target.value) : null)}
                    className="input-dark text-xs py-1.5"
                    style={{ minWidth: 140 }}
                  >
                    <option value="">— Program Event —</option>
                    {programEvent.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                  </select>
                  <button onClick={applyBulk} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 ml-auto">
                    <Check size={14} /> Terapkan
                  </button>
                </div>
              )}

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0" style={{ background: 'var(--bg-card)', zIndex: 10 }}>
                    <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                      <th className="px-3 py-2 text-center w-10">
                        <input
                          type="checkbox"
                          checked={preview.filter(r => !r.isDuplicate).length > 0 && selectedIdx.length === preview.filter(r => !r.isDuplicate).length}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                      </th>
                      {mode === 'qris' ? (
                        <>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Tanggal</th>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Merchant</th>
                          <th className="text-right px-3 py-2 text-xs uppercase" style={{ color: '#22c55e' }}>Jumlah</th>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Kementerian</th>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Jenis</th>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Program</th>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Status</th>
                          <th className="px-3 py-2"></th>
                        </>
                      ) : (
                        <>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Tanggal</th>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Keterangan</th>
                          <th className="text-right px-3 py-2 text-xs uppercase" style={{ color: '#ef4444' }}>Debit</th>
                          <th className="text-right px-3 py-2 text-xs uppercase" style={{ color: '#22c55e' }}>Kredit</th>
                          <th className="text-center px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Tipe</th>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Kementerian</th>
                          <th className="text-left px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Jenis/Ktg/Prog</th>
                          <th className="text-center px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Status</th>
                          <th className="px-3 py-2"></th>
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
                        <td className="px-3 py-2 text-center">
                          {!row.isDuplicate && (
                            <input
                              type="checkbox"
                              checked={selectedIdx.includes(row._idx)}
                              onChange={() => toggleSelect(row._idx)}
                              className="rounded border-gray-600 bg-gray-700"
                            />
                          )}
                        </td>
                        {mode === 'qris' ? (
                          <>
                            <td className="px-3 py-2 whitespace-nowrap">{row.created_date?.substring(0, 10)}</td>
                            <td className="px-3 py-2" style={{ maxWidth: 160 }}><div className="truncate">{row.merchant_name}</div></td>
                            <td className="px-3 py-2 text-right font-medium" style={{ color: '#22c55e' }}>{formatRupiah(row.amount)}</td>
                            {row.isAutoWait ? (
                              <td colSpan={3} className="px-3 py-2 text-center align-middle">
                                <span className="text-[10px] text-blue-300 bg-blue-900/30 px-2 py-1 border border-blue-500/20 rounded">QRIS Settlement — Auto Valid</span>
                              </td>
                            ) : (
                              <>
                                <td className="px-3 py-2">
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
                                <td className="px-3 py-2">
                                  <select
                                    value={row.jenis_transaksi_id || ''}
                                    onChange={e => updateRow(row._idx, { jenis_transaksi_id: e.target.value ? parseInt(e.target.value) : null })}
                                    className="input-dark text-xs py-1"
                                    style={{ minWidth: 120 }}
                                  >
                                    <option value="">— Pilih —</option>
                                    {jenisTransaksi.map((j: any) => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={row.program_event_id || ''}
                                    onChange={e => updateRow(row._idx, { program_event_id: e.target.value ? parseInt(e.target.value) : null })}
                                    className="input-dark text-xs py-1"
                                    style={{ minWidth: 120 }}
                                  >
                                    <option value="">— Pilih Program —</option>
                                    {programEvent.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                                  </select>
                                </td>
                              </>
                            )}
                            <td className="px-3 py-2">
                              <span className={`badge-${row.isDuplicate ? 'cek-manual' : 'valid'} text-xs px-2 py-0.5 rounded`}>
                                {row.isDuplicate ? 'duplikat' : row.status}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 whitespace-nowrap">{row.tanggal}</td>
                            <td className="px-3 py-2" style={{ maxWidth: 180 }}><div className="truncate" title={row.keterangan}>{row.keterangan}</div></td>
                            <td className="px-3 py-2 text-right" style={{ color: '#ef4444' }}>{row.debit > 0 ? formatRupiah(row.debit) : '—'}</td>
                            <td className="px-3 py-2 text-right" style={{ color: '#22c55e' }}>{row.kredit > 0 ? formatRupiah(row.kredit) : '—'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${row.tipe === 'masuk' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {row.tipe.toUpperCase()}
                              </span>
                            </td>
                            {row.isAutoWait ? (
                              <td colSpan={2} className="px-3 py-2 text-center align-middle">
                                <span className="text-[10px] text-blue-300 bg-blue-900/30 px-2 py-1 border border-blue-500/20 rounded">QRIS Settlement — Auto Valid</span>
                              </td>
                            ) : (
                              <>
                                <td className="px-3 py-2">
                                  <select
                                    value={row.kementerian_id || ''}
                                    onChange={e => updateRow(row._idx, { kementerian_id: e.target.value ? parseInt(e.target.value) : null })}
                                    className="input-dark text-xs py-1"
                                    style={{ minWidth: 120, borderColor: row.tipe === 'masuk' && !row.kementerian_id ? 'var(--accent-gold)' : '' }}
                                  >
                                    <option value="">— Pilih —</option>
                                    {kementerian.map((k: any) => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-col gap-1">
                                    {row.tipe === 'masuk' ? (
                                      <select
                                        value={row.jenis_transaksi_id || ''}
                                        onChange={e => updateRow(row._idx, { jenis_transaksi_id: e.target.value ? parseInt(e.target.value) : null })}
                                        className="input-dark text-xs py-1"
                                        style={{ minWidth: 130 }}
                                      >
                                        <option value="">— Jenis Trx —</option>
                                        {jenisTransaksi.map((j: any) => <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>)}
                                      </select>
                                    ) : (
                                      <select
                                        value={row.kategori_pengeluaran_id || ''}
                                        onChange={e => updateRow(row._idx, { kategori_pengeluaran_id: e.target.value ? parseInt(e.target.value) : null })}
                                        className="input-dark text-xs py-1"
                                        style={{ minWidth: 130 }}
                                      >
                                        <option value="">— Kat. Keluar —</option>
                                        {kategoriPengeluaran.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                      </select>
                                    )}
                                    <select
                                      value={row.program_event_id || ''}
                                      onChange={e => updateRow(row._idx, { program_event_id: e.target.value ? parseInt(e.target.value) : null })}
                                      className="input-dark text-[10px] py-0.5 mt-1"
                                      style={{ minWidth: 130, opacity: 0.8 }}
                                    >
                                      <option value="">— + Program —</option>
                                      {programEvent.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                                    </select>
                                  </div>
                                </td>
                              </>
                            )}
                            <td className="px-3 py-2 text-center">
                              <span className={`badge-${row.isDuplicate ? 'cek-manual' : row.status === 'valid' ? 'valid' : 'cek-manual'} text-[10px] px-1.5 py-0.5 rounded`}>
                                {row.isDuplicate ? 'duplikat' : row.status}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2">
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
