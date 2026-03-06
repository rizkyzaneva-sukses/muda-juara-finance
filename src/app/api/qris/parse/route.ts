import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { parseQrisCode } from '@/lib/qris'
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

    const existingSet = new Set(
      existing?.map(q => `${q.tid}-${q.amount}`) || []
    )

    const preview = rows.map((row: any, idx: number) => {
      const amount = parseInt(row.AMOUNT || row.amount || 0)
      const tid = row.TID || row.tid || ''
      const isDuplicate = existingSet.has(`${tid}-${amount}`)

      const code = parseQrisCode(amount)
      const kem = code.status === 'valid' ? kemMap.get(code.ministryCode) : null
      const jenis = code.status === 'valid' ? jenisMap.get(code.transactionCode) : null

      return {
        _idx: idx,
        created_date: row.CREATED_DATE || row.created_date,
        merchant_name: row.MERCHANT_NAME || row.merchant_name || '',
        merchant_id: row.MERCHANT_ID || row.merchant_id || '',
        tid,
        amount,
        transaction_type: row.TRANSACTION_TYPE || row.transaction_type || '',
        kementerian_id: kem?.id || null,
        kementerian_nama: kem?.nama || null,
        jenis_transaksi_id: jenis?.id || null,
        jenis_nama: jenis?.nama || null,
        status: code.status === 'valid' ? 'pending' : 'cek_manual',
        isDuplicate,
      }
    })

    return NextResponse.json({ preview })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
