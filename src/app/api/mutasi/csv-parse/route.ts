import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { parseQrisCode, isAutoSkipMybb } from '@/lib/qris'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
    if (!isAdminRequest(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { rows, bank } = await req.json()
        // rows: array parsed dari CSV di client side
        // Format kolom CSV: tanggal, keterangan, debit, kredit, sumber

        const { data: kementerian } = await supabaseAdmin.from('kementerian').select('*')
        const { data: jenisTransaksi } = await supabaseAdmin.from('jenis_transaksi').select('*')

        const kemMap = new Map(kementerian?.map(k => [k.kode, k.id]) || [])
        const jenisMap = new Map(jenisTransaksi?.map(j => [j.kode, j.id]) || [])

        const normalizeStr = (str: string) => {
            if (!str) return ''
            return str.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40)
        }

        // Check duplicates against existing data
        const sumber = bank || 'manual'
        const { data: existing } = await supabaseAdmin
            .from('transaksi')
            .select('tanggal, keterangan, jumlah, sumber')
            .eq('sumber', sumber)

        const existingSet = new Set(
            existing?.map(t => `${t.tanggal}-${normalizeStr(t.keterangan)}-${t.jumlah}`) || []
        )

        const preview = rows.map((row: any, idx: number) => {
            // Normalize field names - support both UPPERCASE and lowercase
            const tanggal = (row.tanggal || row.TANGGAL || '').toString().trim()
            const keterangan = (row.keterangan || row.KETERANGAN || row.deskripsi || row.DESKRIPSI || '').toString().trim()
            const debitRaw = row.debit || row.DEBIT || row.debet || row.DEBET || 0
            const kreditRaw = row.kredit || row.KREDIT || row.kredit || 0
            const sumberRow = (row.sumber || row.SUMBER || sumber || 'manual').toString().trim()

            const debit = typeof debitRaw === 'string'
                ? parseInt(debitRaw.replace(/[^0-9]/g, '') || '0', 10)
                : Math.round(Number(debitRaw) || 0)

            const kredit = typeof kreditRaw === 'string'
                ? parseInt(kreditRaw.replace(/[^0-9]/g, '') || '0', 10)
                : Math.round(Number(kreditRaw) || 0)

            const tipe = kredit > 0 ? 'masuk' : 'keluar'
            const jumlah = kredit > 0 ? kredit : debit

            const isDuplicate = existingSet.has(
                `${tanggal}-${normalizeStr(keterangan)}-${jumlah}`
            )

            const isAutoWait = isAutoSkipMybb(keterangan)

            let kemId = null
            let jenisId = null
            let status = isAutoWait ? 'valid' : 'cek_manual'

            if (tipe === 'masuk' && !isAutoWait) {
                const code = parseQrisCode(jumlah)
                if (code.status === 'valid') {
                    kemId = kemMap.get(code.ministryCode) || null
                    jenisId = jenisMap.get(code.transactionCode) || null
                    status = 'valid'
                }
            }

            return {
                _idx: idx,
                tanggal,
                keterangan,
                debit,
                kredit,
                jumlah,
                tipe,
                sumber: sumberRow,
                status,
                kementerian_id: kemId,
                jenis_transaksi_id: jenisId,
                kategori_pengeluaran_id: null,
                program_event_id: null,
                isDuplicate,
                isAutoWait,
            }
        })

        return NextResponse.json({ preview })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
