import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all pending QRIS
    const { data: qrisData } = await supabaseAdmin
      .from('transaksi_qris')
      .select('*')
      .eq('status', 'pending')

    // Get all TRF BATCH MYBB from BCA
    const { data: bcaCredits } = await supabaseAdmin
      .from('transaksi')
      .select('*')
      .eq('sumber', 'BCA')
      .eq('tipe', 'masuk')
      .ilike('keterangan', '%TRF BATCH MYBB%')

    // Group QRIS by date
    const qrisByDate = new Map<string, { total: number; ids: number[] }>()
    qrisData?.forEach(q => {
      const date = q.created_date?.substring(0, 10)
      if (!date) return
      if (!qrisByDate.has(date)) qrisByDate.set(date, { total: 0, ids: [] })
      const entry = qrisByDate.get(date)!
      entry.total += q.amount
      entry.ids.push(q.id)
    })

    // Group BCA credits by date
    const bcaByDate = new Map<string, { total: number; id: number }>()
    bcaCredits?.forEach(t => {
      const date = t.tanggal
      if (!bcaByDate.has(date)) bcaByDate.set(date, { total: 0, id: t.id })
      bcaByDate.get(date)!.total += t.jumlah
    })

    // Match QRIS dates to BCA dates (same day or +1 day)
    const results: any[] = []
    let totalQris = 0
    let totalCairBank = 0
    let jumlahMatched = 0
    let jumlahPending = 0

    Array.from(qrisByDate.entries()).forEach(([date, qris]) => {
      totalQris += qris.total

      // Try up to 4 days ahead to account for weekends and bank holidays
      let bcaMatch = null
      for (let i = 0; i <= 4; i++) {
        const checkDate = new Date(date)
        checkDate.setDate(checkDate.getDate() + i)
        const checkDateStr = checkDate.toISOString().substring(0, 10)

        if (bcaByDate.has(checkDateStr)) {
          bcaMatch = bcaByDate.get(checkDateStr)
          break
        }
      }

      if (bcaMatch) {
        const selisih = qris.total - bcaMatch.total
        const persen = qris.total > 0 ? ((selisih / qris.total) * 100).toFixed(2) : '0'
        totalCairBank += bcaMatch.total
        jumlahMatched += qris.ids.length

        results.push({
          tanggal_qris: date,
          total_qris: qris.total,
          total_bca: bcaMatch.total,
          selisih,
          persen_mdr: persen,
          qris_ids: qris.ids,
          bca_transaksi_id: bcaMatch.id,
          status: 'matched',
        })

        // Update QRIS status to matched
        supabaseAdmin
          .from('transaksi_qris')
          .update({ status: 'matched', matched_transaksi_id: bcaMatch.id })
          .in('id', qris.ids)
          .then(() => { })
      } else {
        jumlahPending += qris.ids.length
        results.push({
          tanggal_qris: date,
          total_qris: qris.total,
          total_bca: 0,
          selisih: qris.total,
          persen_mdr: '0',
          qris_ids: qris.ids,
          bca_transaksi_id: null,
          status: 'unmatched',
        })
      }
    })

    // Save log
    const today = new Date().toISOString().substring(0, 10)
    await supabaseAdmin.from('log_rekonsiliasi').insert({
      tanggal_rekonsiliasi: today,
      total_qris: totalQris,
      total_cair_bank: totalCairBank,
      selisih: totalQris - totalCairBank,
      persentase_biaya: totalQris > 0 ? ((totalQris - totalCairBank) / totalQris) * 100 : 0,
      jumlah_matched: jumlahMatched,
      jumlah_pending: jumlahPending,
    })

    return NextResponse.json({
      results,
      summary: {
        total_qris: totalQris,
        total_cair_bank: totalCairBank,
        total_selisih: totalQris - totalCairBank,
        jumlah_matched: jumlahMatched,
        jumlah_pending: jumlahPending,
        persen_mdr: totalQris > 0 ? (((totalQris - totalCairBank) / totalQris) * 100).toFixed(2) : '0',
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { data } = await supabaseAdmin
      .from('log_rekonsiliasi')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
