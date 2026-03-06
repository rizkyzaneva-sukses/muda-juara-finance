import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rows } = await req.json()

    const toInsert = rows.map((r: any) => ({
      created_date: r.created_date,
      merchant_name: r.merchant_name,
      merchant_id: r.merchant_id,
      tid: r.tid,
      amount: r.amount,
      transaction_type: r.transaction_type,
      kementerian_id: r.kementerian_id,
      jenis_transaksi_id: r.jenis_transaksi_id,
      program_event_id: r.program_event_id || null,
      status: r.status || 'pending',
    }))

    const { data, error } = await supabaseAdmin
      .from('transaksi_qris')
      .insert(toInsert)
      .select()

    if (error) throw error

    return NextResponse.json({ saved: data?.length, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const kemId = searchParams.get('kementerian_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabaseAdmin
      .from('transaksi_qris')
      .select(`
        *,
        kementerian:kementerian_id(id, kode, nama),
        jenis_transaksi:jenis_transaksi_id(id, kode, nama),
        program_event:program_event_id(id, nama)
      `, { count: 'exact' })
      .order('created_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)
    if (kemId) query = query.eq('kementerian_id', kemId)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ data, count })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
