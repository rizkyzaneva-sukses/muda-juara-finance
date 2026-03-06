import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { parseBankStatementPDF, parseBankStatementImage } from '@/lib/openai-parser'
import { parseQrisCode, isAutoSkipMybb } from '@/lib/qris'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as Blob
    const mimeType = formData.get('mimeType') as string
    const bank = formData.get('bank') as string

    if (!file) throw new Error('File tidak ditemukan')

    let parsed: any[] = []
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (mimeType === 'application/pdf') {
      parsed = await parseBankStatementPDF(buffer)
    } else if (mimeType.startsWith('image/')) {
      // images are still passed to vision as base64 string
      const base64 = buffer.toString('base64')
      parsed = await parseBankStatementImage(base64, mimeType)
    } else {
      return NextResponse.json({ error: 'Format file tidak didukung' }, { status: 400 })
    }

    // Get kementerian and jenis_transaksi for auto-mapping
    const { data: kementerian } = await supabaseAdmin.from('kementerian').select('*')
    const { data: jenisTransaksi } = await supabaseAdmin.from('jenis_transaksi').select('*')

    const kemMap = new Map(kementerian?.map(k => [k.kode, k.id]) || [])
    const jenisMap = new Map(jenisTransaksi?.map(j => [j.kode, j.id]) || [])

    // Check existing transaksi for duplicate detection
    const { data: existing } = await supabaseAdmin
      .from('transaksi')
      .select('tanggal, keterangan, jumlah, sumber')
      .eq('sumber', bank)

    const existingSet = new Set(
      existing?.map(t => `${t.tanggal}-${t.keterangan?.substring(0, 30)}-${t.jumlah}`) || []
    )

    // Process parsed transactions
    const preview = parsed.map((t, idx) => {
      const isDuplicate = existingSet.has(
        `${t.tanggal}-${t.keterangan?.substring(0, 30)}-${t.kredit || t.debit}`
      )

      const tipe = t.kredit > 0 ? 'masuk' : 'keluar'
      const jumlah = t.kredit > 0 ? t.kredit : t.debit

      const isAutoWait = isAutoSkipMybb(t.keterangan)

      let kemId = null
      let jenisId = null
      let status = isAutoWait ? 'valid' : 'cek_manual'

      if (tipe === 'masuk' && !isAutoWait) {
        const code = parseQrisCode(jumlah)
        if (code.status === 'valid') {
          kemId = kemMap.get(code.ministryCode) || null
          jenisId = jenisMap.get(code.transactionCode) || null
          status = 'valid'
        }
      }

      return {
        _idx: idx,
        tanggal: t.tanggal,
        keterangan: t.keterangan,
        debit: t.debit || 0,
        kredit: t.kredit || 0,
        jumlah,
        tipe,
        sumber: bank,
        status,
        kementerian_id: kemId,
        jenis_transaksi_id: jenisId,
        kategori_pengeluaran_id: null,
        program_event_id: null,
        isDuplicate,
        isAutoWait,
      }
    })

    return NextResponse.json({ preview })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
