import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { parseQrisCode, isAutoSkipMybb } from '@/lib/qris'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    // Endpoint untuk mengambil master data (untuk keperluan template CSV)
    try {
        const [k, j, kp, pe] = await Promise.all([
            supabaseAdmin.from('kementerian').select('id, kode, nama').order('kode'),
            supabaseAdmin.from('jenis_transaksi').select('id, kode, nama').order('kode'),
            supabaseAdmin.from('kategori_pengeluaran').select('id, nama').order('nama'),
            supabaseAdmin.from('program_event').select('id, nama').order('nama'),
        ])
        return NextResponse.json({
            kementerian: k.data || [],
            jenis_transaksi: j.data || [],
            kategori_pengeluaran: kp.data || [],
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
        const { rows, bank } = await req.json()

        // Load all master data for lookup
        const [kemData, jenisData, kategoriData, programData] = await Promise.all([
            supabaseAdmin.from('kementerian').select('id, kode, nama'),
            supabaseAdmin.from('jenis_transaksi').select('id, kode, nama'),
            supabaseAdmin.from('kategori_pengeluaran').select('id, nama'),
            supabaseAdmin.from('program_event').select('id, nama'),
        ])

        const kementerian = kemData.data || []
        const jenisTransaksi = jenisData.data || []
        const kategoriPengeluaran = kategoriData.data || []
        const programEvent = programData.data || []

        // Auto-parse maps (by kode QRIS)
        const kemByKode = new Map(kementerian.map(k => [k.kode, k.id]))
        const jenisByKode = new Map(jenisTransaksi.map(j => [j.kode, j.id]))

        // Lookup maps by nama (case-insensitive, trimmed)
        const normalize = (s: string) => (s || '').toLowerCase().trim()

        const kemByNama = new Map(kementerian.map(k => [normalize(k.nama), k.id]))
        const kemByKodeNama = new Map(kementerian.map(k => [normalize(k.kode), k.id]))
        const jenisByNama = new Map(jenisTransaksi.map(j => [normalize(j.nama), j.id]))
        const jenisByKodeNama = new Map(jenisTransaksi.map(j => [normalize(j.kode), j.id]))
        const kategoriByNama = new Map(kategoriPengeluaran.map(k => [normalize(k.nama), k.id]))
        const programByNama = new Map(programEvent.map(p => [normalize(p.nama), p.id]))

        const lookupId = (
            value: string,
            byNama: Map<string, number>,
            byKode?: Map<string, number>
        ): number | null => {
            if (!value || !value.trim()) return null
            const n = normalize(value)
            return byNama.get(n) || byKode?.get(n) || null
        }

        // Duplicate detection
        const normalizeStr = (str: string) => {
            if (!str) return ''
            return str.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40)
        }

        const sumber = bank || 'manual'
        const { data: existing } = await supabaseAdmin
            .from('transaksi')
            .select('tanggal, keterangan, jumlah, sumber')
            .eq('sumber', sumber)

        const existingSet = new Set(
            existing?.map(t => `${t.tanggal}-${normalizeStr(t.keterangan)}-${t.jumlah}`) || []
        )

        // ── Helper: konversi berbagai format tanggal ke YYYY-MM-DD ──────────────
        const parseDate = (raw: any): string => {
            if (!raw && raw !== 0) return ''
            const s = raw.toString().trim()

            // Excel serial number (misal: 46059)
            if (/^\d{4,6}$/.test(s) && Number(s) > 30000 && Number(s) < 60000) {
                // Excel epoch: Jan 1 1900 = day 1, plus Excel's infamous Feb 29 1900 bug (+1)
                const jsDate = new Date(Math.round((Number(s) - 25569) * 86400 * 1000))
                const y = jsDate.getUTCFullYear()
                const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0')
                const d = String(jsDate.getUTCDate()).padStart(2, '0')
                return `${y}-${m}-${d}`
            }

            // Format DD/MM/YYYY atau D/M/YYYY
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
                const [dd, mm, yyyy] = s.split('/')
                return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
            }

            // Format DD-MM-YYYY
            if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
                const [dd, mm, yyyy] = s.split('-')
                return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
            }

            // Sudah format YYYY-MM-DD atau YYYY-DD-MM atau ISO
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
                const [yyyy, p1, p2] = s.substring(0, 10).split('-')
                // Jika p1 > 12, berarti formatnya YYYY-DD-MM (misal 2026-28-02), jadi ditukar jadi YYYY-MM-DD
                if (Number(p1) > 12 && Number(p2) <= 12) {
                    return `${yyyy}-${p2}-${p1}`
                }
                return s.substring(0, 10)
            }

            return s
        }

        const preview = rows.map((row: any, idx: number) => {
            const tanggal = parseDate(row.tanggal || row.TANGGAL || '')
            const keterangan = (row.keterangan || row.deskripsi || '').toString().trim()
            const debitRaw = row.debit || row.debet || 0
            const kreditRaw = row.kredit || 0
            const sumberRow = (row.sumber || sumber || 'manual').toString().trim()

            // Kolom baru dari CSV
            const kemCol = (row.kementerian || '').toString().trim()
            const jenisCol = (row.jenis_transaksi || row.jenis || '').toString().trim()
            const kategoriCol = (row.kategori_pengeluaran || row.kategori || '').toString().trim()
            const programCol = (row.program_event || row.program || row.event || '').toString().trim()

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

            // Priority: CSV column value → QRIS auto parse
            let kemId: number | null = lookupId(kemCol, kemByNama, kemByKodeNama)
            let jenisId: number | null = null
            let kategoriId: number | null = null
            let programId: number | null = lookupId(programCol, programByNama)
            let status = isAutoWait ? 'valid' : 'cek_manual'

            if (isAutoWait) {
                // Untuk "Pencairan QRIS" / MYBB, ini netral, jadi semua mapping dihapus.
                kemId = null
                jenisId = null
                kategoriId = null
                programId = null
            } else if (tipe === 'masuk') {
                jenisId = lookupId(jenisCol, jenisByNama, jenisByKodeNama)

                // If not found in CSV, try QRIS auto-parse
                if (!kemId || !jenisId) {
                    const code = parseQrisCode(jumlah)
                    if (code.status === 'valid') {
                        if (!kemId) kemId = kemByKode.get(code.ministryCode) || null
                        if (!jenisId) jenisId = jenisByKode.get(code.transactionCode) || null
                    }
                }
            } else {
                // keluar: use kategori_pengeluaran
                kategoriId = lookupId(kategoriCol, kategoriByNama)
                    || lookupId(jenisCol, kategoriByNama)
            }

            // Determine status based on filled data
            if (!isAutoWait) {
                const filled = [kemId, tipe === 'masuk' ? jenisId : kategoriId].filter(Boolean).length
                if (filled >= 2) status = 'valid'
                else if (filled >= 1) status = 'valid'
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
                kategori_pengeluaran_id: kategoriId,
                program_event_id: programId,
                isDuplicate,
                isAutoWait,
                // Labels for display in preview
                _kem_nama: kementerian.find(k => k.id === kemId)?.nama || null,
                _jenis_nama: jenisTransaksi.find(j => j.id === jenisId)?.nama
                    || kategoriPengeluaran.find(k => k.id === kategoriId)?.nama || null,
                _program_nama: programEvent.find(p => p.id === programId)?.nama || null,
            }
        })

        return NextResponse.json({ preview })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
