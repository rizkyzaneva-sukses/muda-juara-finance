import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const TABLES: Record<string, string> = {
  kementerian: 'kementerian',
  'jenis-transaksi': 'jenis_transaksi',
  'kategori-pengeluaran': 'kategori_pengeluaran',
  'program-event': 'program_event',
  rekening: 'rekening',
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entity = searchParams.get('entity') || 'kementerian'
    const table = TABLES[entity]

    if (!table) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 400 })
    }

    let query = supabaseAdmin.from(table).select('*').order('id')

    if (entity === 'program-event') {
      query = supabaseAdmin
        .from('program_event')
        .select(`*, kementerian:kementerian_id(kode, nama), jenis_transaksi:jenis_transaksi_id(kode, nama)`)
        .order('id')
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { entity, ...body } = await req.json()
    const table = TABLES[entity]
    if (!table) return NextResponse.json({ error: 'Entity not found' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from(table).insert(body).select().single()
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
    const { entity, id, ...updates } = await req.json()
    const table = TABLES[entity]
    if (!table) return NextResponse.json({ error: 'Entity not found' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from(table).update(updates).eq('id', id).select().single()
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
    const { entity, id } = await req.json()
    const table = TABLES[entity]
    if (!table) return NextResponse.json({ error: 'Entity not found' }, { status: 400 })

    const { error } = await supabaseAdmin.from(table).delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
