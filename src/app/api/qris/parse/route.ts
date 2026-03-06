import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { parseQrisCode, isAutoSkipMybb } from '@/lib/qris'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rows } = await req.json()
    // rows: array from xlsx parsing on client side

    const { data: kementerian } = await supabaseAdmin.from('kementerian').select('*')
    const { data: jenisTransaksi } = await supabaseAdmin.from('jenis_transaksi').select('*')

    const kemMap = new Map(kementerian?.map(k => [k.kode, k]) || [])
    const jenisMap = new Map(jenisTransaksi?.map(j => [j.kode, j]) || [])

    // Check duplicates
    const { data: existing } = await supabaseAdmin
      .from('transaksi_qris')
      .select('tid, amount, created_date')

    // Normalize date function to handle both "2026/03/01 04:00:17" and "2026-03-01T04:00:17"
    const normalizeDate = (d: string) => d ? d.replace(/\//g, '-').substring(0, 10) : ''

    const existingSet = new Set(
      existing?.map(q => `${normalizeDate(q.created_date)}-${q.tid}-${q.amount}`) || []
    )

    const preview = rows.map((row: any, idx: number) => {
      const amount = parseInt(row.AMOUNT || row.amount || 0)
      const tid = row.TID || row.tid || ''
      const rowDate = row.CREATED_DATE || row.created_date || ''
      const isDuplicate = existingSet.has(`${normalizeDate(rowDate)}-${tid}-${amount}`)
      const merchant_name = row.MERCHANT_NAME || row.merchant_name || ''
      const isAutoWait = isAutoSkipMybb(merchant_name)

      let kem = null
      let jenis = null
      let status = isAutoWait ? 'valid' : 'cek_manual'

      if (!isAutoWait) {
        const code = parseQrisCode(amount)
        if (code.status === 'valid') {
          kem = kemMap.get(code.ministryCode) || null
          jenis = jenisMap.get(code.transactionCode) || null
          status = 'pending'
        }
      }

      return {
        _idx: idx,
        created_date: row.CREATED_DATE || row.created_date,
        merchant_name,
        merchant_id: row.MERCHANT_ID || row.merchant_id || '',
        tid,
        amount,
        transaction_type: row.TRANSACTION_TYPE || row.transaction_type || '',
        kementerian_id: kem?.id || null,
        kementerian_nama: kem?.nama || null,
        jenis_transaksi_id: jenis?.id || null,
        jenis_nama: jenis?.nama || null,
        status,
        isDuplicate,
        isAutoWait
      }
    })

    return NextResponse.json({ preview })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
