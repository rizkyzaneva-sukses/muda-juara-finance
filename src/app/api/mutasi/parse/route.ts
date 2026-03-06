import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { parseBankStatementPDF, parseBankStatementImage } from '@/lib/openai-parser'
import { parseQrisCode, isTrfBatchMybb } from '@/lib/qris'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { fileBase64, mimeType, bank } = await req.json()

    let parsed: any[] = []

    if (mimeType === 'application/pdf') {
      parsed = await parseBankStatementPDF(fileBase64)
    } else if (mimeType.startsWith('image/')) {
      parsed = await parseBankStatementImage(fileBase64, mimeType)
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

      // Auto-detect for masuk
      let kemId = null
      let jenisId = null
      let status = 'cek_manual'

      if (tipe === 'masuk') {
        if (isTrfBatchMybb(t.keterangan)) {
          status = 'valid'
        } else {
          const code = parseQrisCode(jumlah)
          if (code.status === 'valid') {
            kemId = kemMap.get(code.ministryCode) || null
            jenisId = jenisMap.get(code.transactionCode) || null
            status = 'valid'
          }
        }
      }
      // Keluar always cek_manual

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
      }
    })

    return NextResponse.json({ preview })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
