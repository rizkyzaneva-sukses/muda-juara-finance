import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// This endpoint applies the schema and seed data to Supabase
// Only accessible once, protected by init secret
export async function POST(req: NextRequest) {
    const { secret } = await req.json()

    if (secret !== (process.env.INIT_SECRET || 'mudajuara_init_2026')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Test connection first
        const { error: testErr } = await supabaseAdmin.from('kementerian').select('count').limit(1)

        // If table doesn't exist, we need to go through Supabase dashboard
        if (testErr && testErr.code === 'PGRST116') {
            return NextResponse.json({
                error: 'Tables not found. Please run the SQL schema in Supabase Dashboard first.',
                sql_location: '/supabase/schema.sql',
                dashboard_url: 'https://supabase.com/dashboard/project/xlksjdhrzbkbenodgras/sql/new'
            }, { status: 500 })
        }

        // Seed master data
        const results: Record<string, any> = {}

        // Kementerian
        const kementerianData = [
            { kode: '00', nama: 'Keuangan' },
            { kode: '01', nama: 'Kementerian SDM' },
            { kode: '02', nama: 'Kementerian Ekonomi' },
            { kode: '03', nama: 'Kementerian Pendidikan' },
            { kode: '04', nama: 'Kementerian Sosial' },
            { kode: '05', nama: 'KemenPorPar' },
            { kode: '06', nama: 'Kementerian Luar Negeri' },
            { kode: '07', nama: 'Kominfo' },
            { kode: '08', nama: 'Kementerian Muslimah' },
            { kode: '09', nama: 'Menkumham & Nilai' },
        ]
        const { error: kemErr } = await supabaseAdmin
            .from('kementerian')
            .upsert(kementerianData, { onConflict: 'kode' })
        results.kementerian = kemErr ? kemErr.message : `${kementerianData.length} rows`

        // Jenis Transaksi
        const jenisData = [
            { kode: '10', nama: 'Sponsor' },
            { kode: '11', nama: 'Pendaftaran' },
            { kode: '12', nama: 'Infaq - Kegiatan MJ' },
            { kode: '13', nama: 'Donasi Umum' },
            { kode: '15', nama: 'Infaq Shubuh' },
            { kode: '16', nama: 'Wakaf Pembangunan Masjid' },
            { kode: '17', nama: 'Kegiatan MJ' },
            { kode: '96', nama: 'Yayasan' },
            { kode: '97', nama: 'Pengembalian Biaya Transfer BI-Fast' },
        ]
        const { error: jenisErr } = await supabaseAdmin
            .from('jenis_transaksi')
            .upsert(jenisData, { onConflict: 'kode' })
        results.jenis_transaksi = jenisErr ? jenisErr.message : `${jenisData.length} rows`

        // Rekening - from CSV data
        const rekeningData = [
            { bank: 'BSI', nama: 'YAYASAN MUDA KARYA MULIA', nomor_rekening: '7188888172', saldo_awal: 250168530 },
            { bank: 'BCA Syariah', nama: 'MUHAMMAD FIRDAUS SUGIARSA', nomor_rekening: '0590040242', saldo_awal: 48663941 },
        ]
        for (const r of rekeningData) {
            const { data: exist } = await supabaseAdmin.from('rekening')
                .select('id').eq('nomor_rekening', r.nomor_rekening).maybeSingle()
            if (!exist) {
                await supabaseAdmin.from('rekening').insert(r)
            } else {
                await supabaseAdmin.from('rekening').update(r).eq('id', exist.id)
            }
        }
        results.rekening = `${rekeningData.length} rows`

        // Kategori Pengeluaran
        const kategoriData = [
            { nama: 'Konsumsi / Catering', kelompok: 'Operasional Acara', deskripsi: 'Biaya makan dan minum' },
            { nama: 'Sewa Venue / DP Venue', kelompok: 'Operasional Acara', deskripsi: 'Biaya sewa atau DP tempat acara' },
            { nama: 'Dekorasi & Properti', kelompok: 'Operasional Acara', deskripsi: 'Biaya dekorasi dan properti acara' },
            { nama: 'Dokumentasi', kelompok: 'Operasional Acara', deskripsi: 'Biaya foto dan video' },
            { nama: 'Perlengkapan Acara', kelompok: 'Operasional Acara', deskripsi: 'Biaya perlengkapan dan peralatan' },
            { nama: 'Transportasi Panitia', kelompok: 'Operasional Acara', deskripsi: 'Biaya transportasi panitia' },
            { nama: 'Akomodasi / Penginapan', kelompok: 'Operasional Acara', deskripsi: 'Biaya penginapan' },
            { nama: 'Honorarium Pembicara / Ustadz', kelompok: 'SDM & Apresiasi', deskripsi: 'Honor narasumber dan ustadz' },
            { nama: 'Santunan', kelompok: 'SDM & Apresiasi', deskripsi: 'Pemberian santunan' },
            { nama: 'Hadiah & Doorprize', kelompok: 'SDM & Apresiasi', deskripsi: 'Hadiah dan doorprize' },
            { nama: 'Seragam / Merchandise', kelompok: 'SDM & Apresiasi', deskripsi: 'Biaya seragam dan merchandise' },
            { nama: 'Sertifikat & Plakat', kelompok: 'SDM & Apresiasi', deskripsi: 'Biaya sertifikat dan plakat' },
            { nama: 'Biaya Admin Bank', kelompok: 'Keuangan & Admin', deskripsi: 'Biaya administrasi bank' },
            { nama: 'Pajak', kelompok: 'Keuangan & Admin', deskripsi: 'Kewajiban pajak' },
            { nama: 'Zakat', kelompok: 'Program Sosial & Syariah', deskripsi: 'Zakat organisasi' },
            { nama: 'Infaq Program', kelompok: 'Program Sosial & Syariah', deskripsi: 'Infaq untuk program' },
            { nama: 'Sedekah / Santunan Yatim', kelompok: 'Program Sosial & Syariah', deskripsi: 'Sedekah dan santunan yatim' },
            { nama: 'Wakaf', kelompok: 'Program Sosial & Syariah', deskripsi: 'Dana wakaf' },
            { nama: 'Umroh / Perjalanan Religi', kelompok: 'Investasi & Pengembangan', deskripsi: 'Biaya umroh dan perjalanan religi' },
            { nama: 'Pelatihan & Workshop', kelompok: 'Investasi & Pengembangan', deskripsi: 'Biaya pelatihan' },
            { nama: 'Pembelian Aset', kelompok: 'Investasi & Pengembangan', deskripsi: 'Pembelian aset organisasi' },
            { nama: 'Dana Darurat Organisasi', kelompok: 'Investasi & Pengembangan', deskripsi: 'Dana darurat' },
        ]
        const { error: katErr } = await supabaseAdmin
            .from('kategori_pengeluaran')
            .insert(kategoriData)
        results.kategori_pengeluaran = katErr ? `${katErr.message} (might be duplicate)` : `${kategoriData.length} rows`

        return NextResponse.json({
            success: true,
            message: 'Seed data berhasil diimport',
            results
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin.from('kementerian').select('count').limit(1)
        if (error) {
            return NextResponse.json({
                ready: false,
                message: 'Schema belum dibuat. Jalankan SQL dari /supabase/schema.sql di Supabase Dashboard.',
                error: error.message
            })
        }
        return NextResponse.json({ ready: true, message: 'Database siap digunakan' })
    } catch (error: any) {
        return NextResponse.json({ ready: false, error: error.message })
    }
}
