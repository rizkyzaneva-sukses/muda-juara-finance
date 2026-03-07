import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { MDR_RATE } from '@/lib/qris'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const dateFrom = searchParams.get('date_from')
        const dateTo = searchParams.get('date_to')
        const kemId = searchParams.get('kementerian_id')
        const programId = searchParams.get('program_event_id')
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
            .limit(100000)

        if (dateFrom) query = query.gte('tanggal', dateFrom)
        if (dateTo) query = query.lte('tanggal', dateTo)
        if (kemId) query = query.eq('kementerian_id', kemId)
        if (programId) query = query.eq('program_event_id', programId)
        if (sumber) query = query.eq('sumber', sumber)

        const { data: dbTransaksi, error } = await query
        if (error) throw error

        let transaksi = [...(dbTransaksi || [])]

        // Fetch QRIS data if sumber is empty or specifically asking for QRIS
        if (!sumber || sumber === 'QRIS') {
            let qrisQuery = supabaseAdmin
                .from('transaksi_qris')
                .select(`
                    *,
                    kementerian:kementerian_id(id, kode, nama),
                    jenis_transaksi:jenis_transaksi_id(id, kode, nama),
                    program_event:program_event_id(id, nama)
                `)
                .in('status', ['matched', 'verified'])
                .limit(100000)

            if (dateFrom) qrisQuery = qrisQuery.gte('created_date', dateFrom)
            if (dateTo) qrisQuery = qrisQuery.lte('created_date', dateTo)
            if (kemId) qrisQuery = qrisQuery.eq('kementerian_id', kemId)
            if (programId) qrisQuery = qrisQuery.eq('program_event_id', programId)

            const { data: qrisData } = await qrisQuery

            const mappedQris = qrisData?.map(q => ({
                id: 'qris-' + q.id,
                keterangan: 'QRIS - ' + (q.merchant_name || 'Transaksi'),
                jumlah: q.amount,
                sumber: 'QRIS',
                tipe: 'masuk', // QRIS is generally incoming
                tanggal: q.created_date ? q.created_date.substring(0, 10) : '',
                kementerian_id: q.kementerian_id,
                jenis_transaksi_id: q.jenis_transaksi_id,
                program_event_id: q.program_event_id,
                kementerian: q.kementerian,
                jenis_transaksi: q.jenis_transaksi,
                program_event: q.program_event,
                kategori_pengeluaran: null,
                status: 'valid' // 'matched' qris behaves as valid transaction
            })) || []

            transaksi = [...transaksi, ...mappedQris]
        }

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

            const actualJumlah = t.sumber === 'QRIS' ? t.jumlah * (1 - MDR_RATE) : t.jumlah

            if (t.tipe === 'masuk') {
                byKem[kemKey].total_masuk += actualJumlah
                byKem[kemKey].count_masuk++
            } else {
                byKem[kemKey].total_keluar += actualJumlah
                byKem[kemKey].count_keluar++
            }
        })

        // Summary by Program Event
        const byProgram: Record<string, any> = {}
        transaksi?.forEach(t => {
            const progKey = t.program_event_id?.toString() || 'tanpa'
            if (!byProgram[progKey]) {
                byProgram[progKey] = {
                    program_id: t.program_event_id,
                    program_nama: t.program_event?.nama || 'Tanpa Program/Event',
                    total_masuk: 0,
                    total_keluar: 0,
                    count_masuk: 0,
                    count_keluar: 0,
                }
            }

            const actualJumlah = t.sumber === 'QRIS' ? t.jumlah * (1 - MDR_RATE) : t.jumlah

            if (t.tipe === 'masuk') {
                byProgram[progKey].total_masuk += actualJumlah
                byProgram[progKey].count_masuk++
            } else {
                byProgram[progKey].total_keluar += actualJumlah
                byProgram[progKey].count_keluar++
            }
        })

        // Summary by month
        const byMonth: Record<string, any> = {}
        transaksi?.forEach(t => {
            const month = t.tanggal?.substring(0, 7) // YYYY-MM
            if (!month) return

            const actualJumlah = t.sumber === 'QRIS' ? t.jumlah * (1 - MDR_RATE) : t.jumlah

            if (!byMonth[month]) byMonth[month] = { month, total_masuk: 0, total_keluar: 0, count: 0 }
            if (t.tipe === 'masuk') byMonth[month].total_masuk += actualJumlah
            else byMonth[month].total_keluar += actualJumlah
            byMonth[month].count++
        })

        // Totals
        const totalMasuk = transaksi?.filter(t => t.tipe === 'masuk').reduce((s, t) => {
            const act = t.sumber === 'QRIS' ? t.jumlah * (1 - MDR_RATE) : t.jumlah;
            return s + act;
        }, 0) || 0
        const totalKeluar = transaksi?.filter(t => t.tipe === 'keluar').reduce((s, t) => {
            const act = t.sumber === 'QRIS' ? t.jumlah * (1 - MDR_RATE) : t.jumlah;
            return s + act;
        }, 0) || 0

        return NextResponse.json({
            transaksi,
            summary: {
                total_masuk: totalMasuk,
                total_keluar: totalKeluar,
                saldo: totalMasuk - totalKeluar,
                total_transaksi: transaksi?.length || 0,
            },
            by_kementerian: Object.values(byKem).sort((a: any, b: any) => b.total_masuk - a.total_masuk),
            by_program: Object.values(byProgram).sort((a: any, b: any) => b.total_masuk - a.total_masuk),
            by_month: Object.values(byMonth).sort((a: any, b: any) => a.month.localeCompare(b.month)),
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
