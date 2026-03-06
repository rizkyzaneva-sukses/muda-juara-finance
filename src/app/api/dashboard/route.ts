import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MDR_RATE = 0.007;

export async function GET(req: NextRequest) {
  try {
    // Get rekening saldo awal
    const { data: rekening } = await supabaseAdmin
      .from('rekening')
      .select('*')

    const rekeningBCA = rekening?.find(r => r.bank === 'BCA Syariah')
    const rekeningBSI = rekening?.find(r => r.bank === 'BSI')

    // Get all transaksi
    const { data: transaksi } = await supabaseAdmin
      .from('transaksi')
      .select('*')
      .in('status', ['valid', 'koreksi', 'lainnya'])

    let totalMasukBCA = rekeningBCA?.saldo_awal || 0
    let totalKeluarBCA = 0
    let totalMasukBSI = rekeningBSI?.saldo_awal || 0
    let totalKeluarBSI = 0
    let totalMasuk = 0
    let totalKeluar = 0

    transaksi?.forEach(t => {
      if (t.tipe === 'masuk') {
        totalMasuk += t.jumlah
        if (t.sumber === 'BCA') totalMasukBCA += t.jumlah
        if (t.sumber === 'BSI') totalMasukBSI += t.jumlah
        if (t.sumber === 'QRIS') totalMasukBCA += (t.jumlah * (1 - MDR_RATE))
      } else {
        totalKeluar += t.jumlah
        if (t.sumber === 'BCA') totalKeluarBCA += t.jumlah
        if (t.sumber === 'BSI') totalKeluarBSI += t.jumlah
        if (t.sumber === 'QRIS') totalKeluarBCA += t.jumlah // if any outgoing QRIS
      }
    })

    const saldoBCA = totalMasukBCA - totalKeluarBCA
    const saldoBSI = totalMasukBSI - totalKeluarBSI

    // Get rincian per kementerian
    const { data: allTrx } = await supabaseAdmin
      .from('transaksi')
      .select(`
        *,
        kementerian:kementerian_id(id, kode, nama),
        jenis_transaksi:jenis_transaksi_id(id, kode, nama),
        program_event:program_event_id(id, nama),
        kategori_pengeluaran:kategori_pengeluaran_id(id, nama)
      `)
      .in('status', ['valid', 'koreksi', 'lainnya'])

    // Get QRIS matched
    const { data: qrisMatched } = await supabaseAdmin
      .from('transaksi_qris')
      .select(`
        *,
        kementerian:kementerian_id(id, kode, nama),
        jenis_transaksi:jenis_transaksi_id(id, kode, nama),
        program_event:program_event_id(id, nama)
      `)
      .eq('status', 'matched')

    // Build rincian grouped
    const rincianMap = new Map()

    // Process transaksi masuk
    allTrx?.filter(t => t.tipe === 'masuk').forEach(t => {
      const kemId = t.kementerian_id || 'tanpa'
      const jenisId = t.jenis_transaksi_id || 'tanpa'
      const progId = t.program_event_id || 'belum'

      const key = `${kemId}-${jenisId}-${progId}`
      if (!rincianMap.has(key)) {
        rincianMap.set(key, {
          kementerian_id: t.kementerian_id,
          kementerian_kode: t.kementerian?.kode || null,
          kementerian_nama: t.kementerian?.nama || 'Tanpa Kementerian',
          jenis_id: t.jenis_transaksi_id,
          jenis_kode: t.jenis_transaksi?.kode || null,
          jenis_nama: t.jenis_transaksi?.nama || 'Tanpa Jenis',
          program_id: t.program_event_id,
          program_nama: t.program_event?.nama || (t.program_event_id ? '' : 'Belum diassign'),
          txn: 0, qris: 0, transfer: 0, pengeluaran: 0, sisa: 0, persen: 0
        })
      }
      const entry = rincianMap.get(key)
      entry.txn++
      if (t.sumber === 'BCA' || t.sumber === 'BSI') {
        entry.transfer += t.jumlah
      }
    })

    // Process QRIS matched
    qrisMatched?.forEach(q => {
      const kemId = q.kementerian_id || 'tanpa'
      const jenisId = q.jenis_transaksi_id || 'tanpa'
      const progId = q.program_event_id || 'belum'

      const key = `${kemId}-${jenisId}-${progId}`
      if (!rincianMap.has(key)) {
        rincianMap.set(key, {
          kementerian_id: q.kementerian_id,
          kementerian_kode: q.kementerian?.kode || null,
          kementerian_nama: q.kementerian?.nama || 'Tanpa Kementerian',
          jenis_id: q.jenis_transaksi_id,
          jenis_kode: q.jenis_transaksi?.kode || null,
          jenis_nama: q.jenis_transaksi?.nama || 'Tanpa Jenis',
          program_id: q.program_event_id,
          program_nama: q.program_event?.nama || 'Belum diassign',
          txn: 0, qris: 0, transfer: 0, pengeluaran: 0, sisa: 0, persen: 0
        })
      }
      rincianMap.get(key).qris += (q.amount * (1 - MDR_RATE))
    })

    // Process pengeluaran
    allTrx?.filter(t => t.tipe === 'keluar').forEach(t => {
      const kemId = t.kementerian_id || 'tanpa'
      const progId = t.program_event_id || 'belum'

      // Find matching masuk entry or create pengeluaran entry
      let found = false
      rincianMap.forEach((entry, key) => {
        if (entry.kementerian_id === t.kementerian_id && entry.program_id === t.program_event_id) {
          entry.pengeluaran += t.jumlah
          found = true
        }
      })

      if (!found) {
        const key = `keluar-${kemId}-${progId}`
        if (!rincianMap.has(key)) {
          rincianMap.set(key, {
            kementerian_id: t.kementerian_id,
            kementerian_kode: t.kementerian?.kode || null,
            kementerian_nama: t.kementerian?.nama || 'Tanpa Kementerian',
            jenis_id: null,
            jenis_kode: null,
            jenis_nama: t.kategori_pengeluaran?.nama || 'Pengeluaran',
            program_id: t.program_event_id,
            program_nama: t.program_event?.nama || 'Tanpa Program',
            txn: 0, qris: 0, transfer: 0, pengeluaran: 0, sisa: 0, persen: 0
          })
        }
        rincianMap.get(key).pengeluaran += t.jumlah
      }
    })

    // Calculate sisa and persen
    const rincian = Array.from(rincianMap.values())
    const totalSisa = rincian.reduce((sum, r) => sum + (r.qris + r.transfer - r.pengeluaran), 0)
    rincian.forEach(r => {
      r.sisa = r.qris + r.transfer - r.pengeluaran
      r.persen = totalSisa > 0 ? Math.round((r.sisa / totalSisa) * 1000) / 10 : 0
    })

    // Recent transactions
    const { data: recentTrx } = await supabaseAdmin
      .from('transaksi')
      .select(`
        *,
        kementerian:kementerian_id(kode, nama),
        jenis_transaksi:jenis_transaksi_id(kode, nama),
        program_event:program_event_id(nama),
        kategori_pengeluaran:kategori_pengeluaran_id(nama)
      `)
      .order('tanggal', { ascending: false })
      .limit(10)

    // Count cek manual
    const { count: cekManualCount } = await supabaseAdmin
      .from('transaksi')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cek_manual')

    return NextResponse.json({
      stats: {
        saldo_bca: saldoBCA,
        saldo_bsi: saldoBSI,
        total_saldo: saldoBCA + saldoBSI,
        total_masuk: totalMasuk,
        total_keluar: totalKeluar,
        saldo_berjalan: totalMasuk - totalKeluar,
        jumlah_transaksi_masuk: transaksi?.filter(t => t.tipe === 'masuk').length || 0,
        jumlah_transaksi_keluar: transaksi?.filter(t => t.tipe === 'keluar').length || 0,
        cek_manual_count: cekManualCount || 0,
      },
      rincian,
      recent_transaksi: recentTrx || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
