import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const dateFrom = searchParams.get('date_from')
        const dateTo = searchParams.get('date_to')
        const kemId = searchParams.get('kementerian_id')
        const sumber = searchParams.get('sumber')

        // Build filter for transaksi
        let query = supabaseAdmin
            .from('transaksi')
            .select(`
        *,
        kementerian:kementerian_id(id, kode, nama),
        jenis_transaksi:jenis_transaksi_id(id, kode, nama),
        program_event:program_event_id(id, nama),
        kategori_pengeluaran:kategori_pengeluaran_id(id, nama)
      `)
            .in('status', ['valid', 'koreksi', 'lainnya'])
            .order('tanggal', { ascending: false })

        if (dateFrom) query = query.gte('tanggal', dateFrom)
        if (dateTo) query = query.lte('tanggal', dateTo)
        if (kemId) query = query.eq('kementerian_id', kemId)
        if (sumber) query = query.eq('sumber', sumber)

        const { data: transaksi, error } = await query
        if (error) throw error

        // Summary by kementerian
        const byKem: Record<string, any> = {}
        transaksi?.forEach(t => {
            const kemKey = t.kementerian_id?.toString() || 'tanpa'
            if (!byKem[kemKey]) {
                byKem[kemKey] = {
                    kementerian_id: t.kementerian_id,
                    kementerian_kode: t.kementerian?.kode || null,
                    kementerian_nama: t.kementerian?.nama || 'Tanpa Kementerian',
                    total_masuk: 0,
                    total_keluar: 0,
                    count_masuk: 0,
                    count_keluar: 0,
                }
            }
            if (t.tipe === 'masuk') {
                byKem[kemKey].total_masuk += t.jumlah
                byKem[kemKey].count_masuk++
            } else {
                byKem[kemKey].total_keluar += t.jumlah
                byKem[kemKey].count_keluar++
            }
        })

        // Summary by month
        const byMonth: Record<string, any> = {}
        transaksi?.forEach(t => {
            const month = t.tanggal?.substring(0, 7) // YYYY-MM
            if (!month) return
            if (!byMonth[month]) byMonth[month] = { month, total_masuk: 0, total_keluar: 0, count: 0 }
            if (t.tipe === 'masuk') byMonth[month].total_masuk += t.jumlah
            else byMonth[month].total_keluar += t.jumlah
            byMonth[month].count++
        })

        // Totals
        const totalMasuk = transaksi?.filter(t => t.tipe === 'masuk').reduce((s, t) => s + t.jumlah, 0) || 0
        const totalKeluar = transaksi?.filter(t => t.tipe === 'keluar').reduce((s, t) => s + t.jumlah, 0) || 0

        return NextResponse.json({
            transaksi,
            summary: {
                total_masuk: totalMasuk,
                total_keluar: totalKeluar,
                saldo: totalMasuk - totalKeluar,
                total_transaksi: transaksi?.length || 0,
            },
            by_kementerian: Object.values(byKem).sort((a: any, b: any) => b.total_masuk - a.total_masuk),
            by_month: Object.values(byMonth).sort((a: any, b: any) => a.month.localeCompare(b.month)),
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
