import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { parseQrisCode, isAutoSkipMybb } from '@/lib/qris'
import { supabaseAdmin } from '@/lib/supabase'

// GET: ambil master data untuk keperluan template
export async function GET() {
    try {
        const [k, j, pe] = await Promise.all([
            supabaseAdmin.from('kementerian').select('id, kode, nama').order('kode'),
            supabaseAdmin.from('jenis_transaksi').select('id, kode, nama').order('kode'),
            supabaseAdmin.from('program_event').select('id, nama').order('nama'),
        ])
        return NextResponse.json({
            kementerian: k.data || [],
            jenis_transaksi: j.data || [],
            program_event: pe.data || [],
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    if (!isAdminRequest(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { rows } = await req.json()

        // Load master data
        const [kemData, jenisData, programData] = await Promise.all([
            supabaseAdmin.from('kementerian').select('id, kode, nama'),
            supabaseAdmin.from('jenis_transaksi').select('id, kode, nama'),
            supabaseAdmin.from('program_event').select('id, nama'),
        ])

        const kementerian = kemData.data || []
        const jenisTransaksi = jenisData.data || []
        const programEvent = programData.data || []

        // By kode QRIS (auto-parse)
        const kemByKode = new Map(kementerian.map(k => [k.kode, k]))
        const jenisByKode = new Map(jenisTransaksi.map(j => [j.kode, j]))

        // By nama (lookup dari kolom CSV)
        const normalize = (s: string) => (s || '').toLowerCase().trim()
        const kemByNama = new Map(kementerian.map(k => [normalize(k.nama), k]))
        const kemByKodeN = new Map(kementerian.map(k => [normalize(k.kode), k]))
        const jenisByNama = new Map(jenisTransaksi.map(j => [normalize(j.nama), j]))
        const jenisByKodeN = new Map(jenisTransaksi.map(j => [normalize(j.kode), j]))
        const programByNama = new Map(programEvent.map(p => [normalize(p.nama), p]))

        const lookupKem = (val: string) => {
            if (!val) return null
            const n = normalize(val)
            return kemByNama.get(n) || kemByKodeN.get(n) || null
        }
        const lookupJenis = (val: string) => {
            if (!val) return null
            const n = normalize(val)
            return jenisByNama.get(n) || jenisByKodeN.get(n) || null
        }
        const lookupProgram = (val: string) => {
            if (!val) return null
            return programByNama.get(normalize(val)) || null
        }

        // Helper konversi tanggal (Excel serial / DD/MM/YYYY / ISO)
        const parseDate = (raw: any): string => {
            if (!raw && raw !== 0) return ''
            const s = raw.toString().trim()
            if (/^\d{4,6}$/.test(s) && Number(s) > 30000 && Number(s) < 60000) {
                const jsDate = new Date(Math.round((Number(s) - 25569) * 86400 * 1000))
                const y = jsDate.getUTCFullYear()
                const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0')
                const d = String(jsDate.getUTCDate()).padStart(2, '0')
                return `${y}-${m}-${d}`
            }
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
                const [dd, mm, yyyy] = s.split('/')
                return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
            }
            if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
                const [dd, mm, yyyy] = s.split('-')
                return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
            }
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
            return s
        }

        // Check duplicates
        const { data: existing } = await supabaseAdmin
            .from('transaksi_qris')
            .select('tid, amount, created_date')

        const normalizeDate = (d: string) => d ? d.replace(/\//g, '-').substring(0, 10) : ''
        const existingSet = new Set(
            existing?.map(q => `${normalizeDate(q.created_date)}-${q.tid}-${q.amount}`) || []
        )

        const preview = rows.map((row: any, idx: number) => {
            // Support berbagai header (uppercase / lowercase)
            const amountRaw = row.amount || row.AMOUNT || row.jumlah || row.JUMLAH || 0
            const amount = typeof amountRaw === 'string'
                ? parseInt(amountRaw.replace(/[^0-9]/g, '') || '0', 10)
                : Math.round(Number(amountRaw) || 0)

            const tid = (row.tid || row.TID || row.transaction_id || row.TRANSACTION_ID || '').toString().trim()
            const rawDate = row.created_date || row.CREATED_DATE || row.tanggal || row.TANGGAL || ''
            const created_date = parseDate(rawDate)
            const merchant_name = (row.merchant_name || row.MERCHANT_NAME || row.merchant || '').toString().trim()
            const merchant_id = (row.merchant_id || row.MERCHANT_ID || '').toString().trim()
            const transaction_type = (row.transaction_type || row.TRANSACTION_TYPE || '').toString().trim()

            // Kolom mapping dari CSV
            const kemCol = (row.kementerian || row.KEMENTERIAN || '').toString().trim()
            const jenisCol = (row.jenis_transaksi || row.jenis || row.JENIS || '').toString().trim()
            const programCol = (row.program_event || row.program || row.event || '').toString().trim()

            const isDuplicate = existingSet.has(`${created_date}-${tid}-${amount}`)
            const isAutoWait = isAutoSkipMybb(merchant_name)

            // Priority: kolom CSV → QRIS auto-parse dari amount
            let kemObj = lookupKem(kemCol)
            let jenisObj = lookupJenis(jenisCol)
            let programObj = lookupProgram(programCol)

            if (!isAutoWait && (!kemObj || !jenisObj)) {
                const code = parseQrisCode(amount)
                if (code.status === 'valid') {
                    if (!kemObj) kemObj = kemByKode.get(code.ministryCode) || null
                    if (!jenisObj) jenisObj = jenisByKode.get(code.transactionCode) || null
                }
            }

            let status = isAutoWait ? 'valid' : 'cek_manual'
            if (!isAutoWait && (kemObj || jenisObj)) status = 'pending'

            return {
                _idx: idx,
                created_date,
                merchant_name,
                merchant_id,
                tid,
                amount,
                transaction_type,
                kementerian_id: kemObj?.id || null,
                kementerian_nama: kemObj?.nama || null,
                jenis_transaksi_id: jenisObj?.id || null,
                jenis_nama: jenisObj?.nama || null,
                program_event_id: programObj?.id || null,
                program_nama: programObj?.nama || null,
                status,
                isDuplicate,
                isAutoWait,
            }
        })

        return NextResponse.json({ preview })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
