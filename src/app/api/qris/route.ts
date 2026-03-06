import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      amount: Math.round(Number(r.amount)),
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
    const sortBy = searchParams.get('sort_by') || 'created_date'
    const sortOrder = searchParams.get('sort_order') === 'asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    let query = supabaseAdmin
      .from('transaksi_qris')
      .select(`
        *,
        kementerian:kementerian_id(id, kode, nama),
        jenis_transaksi:jenis_transaksi_id(id, kode, nama),
        program_event:program_event_id(id, nama)
      `, { count: 'exact' })
      .order(sortBy, { ascending: sortOrder })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)
    if (kemId) {
      if (kemId === 'null') {
        query = query.is('kementerian_id', null)
      } else {
        query = query.eq('kementerian_id', kemId)
      }
    }
    if (dateFrom) query = query.gte('created_date', dateFrom)
    if (dateTo) query = query.lte('created_date', dateTo)

    const [queryRes, statsRes] = await Promise.all([
      query,
      supabaseAdmin.from('transaksi_qris').select('status, amount')
    ])

    const { data, error, count } = queryRes
    if (error) throw error

    return NextResponse.json({ data, count, stats: statsRes.data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { ids, updates } = await req.json()
    if (!ids || !updates || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('transaksi_qris')
      .update(updates)
      .in('id', ids)
      .select()

    if (error) throw error

    return NextResponse.json({ updated: data?.length, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    if (body.ids && Array.isArray(body.ids)) {
      const { error } = await supabaseAdmin.from('transaksi_qris').delete().in('id', body.ids)
      if (error) throw error
      return NextResponse.json({ success: true, deleted: body.ids.length })
    } else if (body.id) {
      const { error } = await supabaseAdmin.from('transaksi_qris').delete().eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
