import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { action, entity } = await req.json()

    if (action === 'seed') {
      // Seed program events
      const { data: kem } = await supabaseAdmin.from('kementerian').select('id, kode')
      const { data: jenis } = await supabaseAdmin.from('jenis_transaksi').select('id, kode')

      const kemMap = new Map(kem?.map(k => [k.kode, k.id]))
      const jenisMap = new Map(jenis?.map(j => [j.kode, j.id]))

      const programs = [
        { nama: 'Bukber 2026', kementerian_kode: '01', jenis_kode: '11', target_dana: 20000000, deskripsi: 'Buka Bersama Kabinet Muda Juara 2026' },
        { nama: 'Bukber 2026 - Sponsor', kementerian_kode: '01', jenis_kode: '10', target_dana: 5000000 },
        { nama: 'Sertijab 2026', kementerian_kode: '01', jenis_kode: '11', target_dana: 3000000, deskripsi: 'Serah Terima Jabatan Kabinet' },
        { nama: 'Umroh MJ - Indra', kementerian_kode: null, jenis_kode: null, deskripsi: 'Umroh Kabinet Kang Furqon' },
        { nama: 'Donasi Cisarua', kementerian_kode: null, jenis_kode: '13', deskripsi: 'Donasi Untuk Warga Cisarua' },
        { nama: 'Infaq Shubuh Rutin', kementerian_kode: '04', jenis_kode: '15', is_rutin: true, deskripsi: 'Program rutin infaq shubuh' },
        { nama: 'Wakaf Masjid Al-Mujahidin', kementerian_kode: null, jenis_kode: '16', deskripsi: 'Wakaf pembangunan masjid' },
        { nama: 'Kegiatan Liqo Rutin', kementerian_kode: '01', jenis_kode: '17', is_rutin: true },
      ]

      for (const p of programs) {
        await supabaseAdmin.from('program_event').insert({
          nama: p.nama,
          kementerian_id: p.kementerian_kode ? kemMap.get(p.kementerian_kode) : null,
          jenis_transaksi_id: p.jenis_kode ? jenisMap.get(p.jenis_kode) : null,
          target_dana: p.target_dana || 0,
          is_rutin: p.is_rutin || false,
          deskripsi: p.deskripsi || null,
        })
      }

      // Seed sample transactions
      const today = new Date()
      const sampleTrx = [
        { tanggal: '2026-02-25', keterangan: 'QRIS Bukber - Sample', jumlah: 170311, tipe: 'masuk', sumber: 'BCA', status: 'valid', kementerian_kode: '03', jenis_kode: '11' },
        { tanggal: '2026-02-25', keterangan: 'QRIS Infaq Shubuh - Sample', jumlah: 10415, tipe: 'masuk', sumber: 'BCA', status: 'valid', kementerian_kode: '04', jenis_kode: '15' },
        { tanggal: '2026-02-26', keterangan: 'BIF IN - Transfer Sponsor', jumlah: 1000110, tipe: 'masuk', sumber: 'BCA', status: 'valid', kementerian_kode: '01', jenis_kode: '10' },
        { tanggal: '2026-02-18', keterangan: 'BIF OUT - DP Venue Bukber MJ 2026', jumlah: 2000000, tipe: 'keluar', sumber: 'BCA', status: 'koreksi', kementerian_kode: '01', jenis_kode: null },
        { tanggal: '2026-02-24', keterangan: 'BIF OUT - Santunan Ibu Iin', jumlah: 1000000, tipe: 'keluar', sumber: 'BCA', status: 'koreksi', kementerian_kode: '04', jenis_kode: null },
        { tanggal: '2026-02-26', keterangan: 'Transfer tidak dikenal', jumlah: 500000, tipe: 'masuk', sumber: 'BSI', status: 'cek_manual' },
      ]

      for (const t of sampleTrx) {
        await supabaseAdmin.from('transaksi').insert({
          tanggal: t.tanggal,
          keterangan: t.keterangan,
          jumlah: t.jumlah,
          tipe: t.tipe,
          sumber: t.sumber,
          status: t.status,
          kementerian_id: t.kementerian_kode ? kemMap.get(t.kementerian_kode) : null,
          jenis_transaksi_id: t.jenis_kode ? jenisMap.get(t.jenis_kode) : null,
        })
      }

      return NextResponse.json({ success: true, message: 'Data dummy berhasil dibuat' })
    }

    if (action === 'reset-transaksi') {
      await supabaseAdmin.from('log_rekonsiliasi').delete().neq('id', 0)
      await supabaseAdmin.from('transaksi_qris').delete().neq('id', 0)
      await supabaseAdmin.from('transaksi').delete().neq('id', 0)
      await supabaseAdmin.from('program_event').delete().neq('id', 0)
      return NextResponse.json({ success: true, message: 'Transaksi dan program berhasil direset' })
    }

    if (action === 'reset-all') {
      await supabaseAdmin.from('log_rekonsiliasi').delete().neq('id', 0)
      await supabaseAdmin.from('transaksi_qris').delete().neq('id', 0)
      await supabaseAdmin.from('transaksi').delete().neq('id', 0)
      await supabaseAdmin.from('program_event').delete().neq('id', 0)
      await supabaseAdmin.from('kategori_pengeluaran').delete().neq('id', 0)
      await supabaseAdmin.from('jenis_transaksi').delete().neq('id', 0)
      await supabaseAdmin.from('kementerian').delete().neq('id', 0)
      await supabaseAdmin.from('rekening').delete().neq('id', 0)
      return NextResponse.json({ success: true, message: 'Semua data berhasil direset' })
    }

    if (action === 'delete-entity' && entity) {
      const entityMap: Record<string, string> = {
        transaksi: 'transaksi',
        qris: 'transaksi_qris',
        program: 'program_event',
        kategori: 'kategori_pengeluaran',
        rekonsiliasi: 'log_rekonsiliasi',
        kementerian: 'kementerian',
        jenis: 'jenis_transaksi',
        rekening: 'rekening',
      }
      const table = entityMap[entity]
      if (table) {
        await supabaseAdmin.from(table).delete().neq('id', 0)
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { count: cekManual } = await supabaseAdmin
      .from('transaksi')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cek_manual')

    const { count: qrisPending } = await supabaseAdmin
      .from('transaksi_qris')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return NextResponse.json({ cek_manual: cekManual, qris_pending: qrisPending })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
