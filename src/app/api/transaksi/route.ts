import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const tipe = searchParams.get('tipe')
    const sumber = searchParams.get('sumber')
    const kemId = searchParams.get('kementerian_id')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    let query = supabaseAdmin
      .from('transaksi')
      .select(`
        *,
        kementerian:kementerian_id(id, kode, nama),
        jenis_transaksi:jenis_transaksi_id(id, kode, nama),
        program_event:program_event_id(id, nama),
        kategori_pengeluaran:kategori_pengeluaran_id(id, nama)
      `, { count: 'exact' })
      .order('tanggal', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)
    if (tipe) query = query.eq('tipe', tipe)
    if (sumber) query = query.eq('sumber', sumber)
    if (kemId) query = query.eq('kementerian_id', kemId)
    if (search) query = query.ilike('keterangan', `%${search}%`)
    if (dateFrom) query = query.gte('tanggal', dateFrom)
    if (dateTo) query = query.lte('tanggal', dateTo)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ data, count, page, limit })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('transaksi')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, ...updates } = await req.json()

    // Determine status after update
    if (updates.kementerian_id || updates.jenis_transaksi_id || updates.kategori_pengeluaran_id) {
      updates.status = updates.kementerian_id ? 'koreksi' : 'lainnya'
    }

    const { data, error } = await supabaseAdmin
      .from('transaksi')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('transaksi').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
