import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { transactions } = await req.json()

    const toInsert = transactions.map((t: any) => ({
      tanggal: t.tanggal,
      keterangan: t.keterangan,
      jumlah: Math.round(Number(t.jumlah)),
      tipe: t.tipe,
      sumber: t.sumber,
      status: t.status,
      kementerian_id: t.kementerian_id,
      jenis_transaksi_id: t.jenis_transaksi_id,
      kategori_pengeluaran_id: t.kategori_pengeluaran_id,
      program_event_id: t.program_event_id,
      raw_data: t.raw_data || null,
    }))

    const { data, error } = await supabaseAdmin
      .from('transaksi')
      .insert(toInsert)
      .select()

    if (error) throw error

    return NextResponse.json({ saved: data?.length || 0, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
