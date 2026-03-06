#!/usr/bin/env node
/**
 * Import CSV data to Supabase
 * Run: node scripts/import-csv.js
 * 
 * This script imports all CSV data from H:/APP WEB/TEMPLATE/ to Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://xlksjdhrzbkbenodgras.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsa3NqZGhyemJrYmVub2RncmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTg4NTYsImV4cCI6MjA4ODMzNDg1Nn0.GjpnPNnhQh5o5A4BL5r3NQrkRUkU8j5zWQzC6EV3Bl4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function parseCSV(content) {
    const lines = content.trim().split('\n').filter(l => l.trim())
    const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''))
    const rows = []
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/\r/g, ''))
        if (values.length === 0 || values.every(v => v === '')) continue
        const row = {}
        headers.forEach((h, idx) => {
            row[h] = values[idx] || ''
        })
        rows.push(row)
    }
    return rows
}

async function importKementerian(csvPath) {
    console.log('\n📂 Importing Kementerian...')
    const content = readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(content)

    let success = 0, skipped = 0, errors = 0
    for (const row of rows) {
        const kode = (row['Kode'] || row['kode'] || '').trim()
        const nama = (row['Nama'] || row['nama'] || '').trim()
        if (!kode || !nama) continue

        const { error } = await supabase.from('kementerian').upsert(
            { kode, nama },
            { onConflict: 'kode' }
        )
        if (error) {
            console.log(`  ⚠️  ${kode} - ${nama}: ${error.message}`)
            errors++
        } else {
            console.log(`  ✅ ${kode} - ${nama}`)
            success++
        }
    }
    console.log(`  → ${success} berhasil, ${errors} error`)
    return success
}

async function importJenisTransaksi(csvPath) {
    console.log('\n📂 Importing Jenis Transaksi...')
    const content = readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(content)

    let success = 0, errors = 0
    for (const row of rows) {
        const kode = (row['Kode'] || row['kode'] || '').trim()
        const nama = (row['Nama'] || row['nama'] || '').trim()
        if (!kode || !nama) continue

        const { error } = await supabase.from('jenis_transaksi').upsert(
            { kode, nama },
            { onConflict: 'kode' }
        )
        if (error) {
            console.log(`  ⚠️  ${kode} - ${nama}: ${error.message}`)
            errors++
        } else {
            console.log(`  ✅ ${kode} - ${nama}`)
            success++
        }
    }
    console.log(`  → ${success} berhasil, ${errors} error`)
    return success
}

async function importKategoriPengeluaran(csvPath) {
    console.log('\n📂 Importing Kategori Pengeluaran...')
    const content = readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(content)

    let success = 0, errors = 0
    for (const row of rows) {
        const kelompok = (row['Kelompok'] || row['kelompok'] || '').trim()
        const nama = (row['Nama'] || row['nama'] || '').trim()
        const deskripsi = (row['Deskripsi'] || row['deskripsi'] || '').trim()
        if (!nama) continue

        const { error } = await supabase.from('kategori_pengeluaran').insert({
            kelompok: kelompok || null,
            nama,
            deskripsi: deskripsi || null
        })
        if (error) {
            // Might be duplicate, try upsert by nama
            const { error: e2 } = await supabase.from('kategori_pengeluaran')
                .upsert({ kelompok: kelompok || null, nama, deskripsi: deskripsi || null })
            if (e2) {
                console.log(`  ⚠️  ${nama}: ${e2.message}`)
                errors++
            } else {
                console.log(`  ✅ ${nama}`)
                success++
            }
        } else {
            console.log(`  ✅ ${nama}`)
            success++
        }
    }
    console.log(`  → ${success} berhasil, ${errors} error`)
    return success
}

async function importRekening(csvPath) {
    console.log('\n📂 Importing Rekening...')
    const content = readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(content)

    let success = 0, errors = 0
    for (const row of rows) {
        const bank = (row['Bank'] || row['bank'] || '').trim()
        const nama = (row['Nama'] || row['nama'] || '').trim()
        const nomor = (row['Nomor Rekening'] || row['nomor_rekening'] || '').trim()
        const saldo_awal = parseInt((row['Saldo Awal'] || row['saldo_awal'] || '0').replace(/[^0-9]/g, '')) || 0
        if (!bank || !nama) continue

        // Check if exists
        const { data: existing } = await supabase.from('rekening')
            .select('id').eq('nomor_rekening', nomor).maybeSingle()

        if (existing) {
            const { error } = await supabase.from('rekening')
                .update({ bank, nama, saldo_awal })
                .eq('id', existing.id)
            if (error) { console.log(`  ⚠️  ${nama}: ${error.message}`); errors++ }
            else { console.log(`  ✅ (updated) ${nama} - ${bank}`); success++ }
        } else {
            const { error } = await supabase.from('rekening')
                .insert({ bank, nama, nomor_rekening: nomor, saldo_awal })
            if (error) { console.log(`  ⚠️  ${nama}: ${error.message}`); errors++ }
            else { console.log(`  ✅ ${nama} - ${bank} - Saldo: ${saldo_awal}`); success++ }
        }
    }
    console.log(`  → ${success} berhasil, ${errors} error`)
    return success
}

async function importEvent(csvPath) {
    console.log('\n📂 Importing Program Event...')
    const content = readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(content)

    // Get maps
    const { data: kemData } = await supabase.from('kementerian').select('id,kode')
    const { data: jenisData } = await supabase.from('jenis_transaksi').select('id,kode')
    const kemMap = new Map((kemData || []).map(k => [k.kode, k.id]))
    const jenisMap = new Map((jenisData || []).map(j => [j.kode, j.id]))

    let success = 0, errors = 0
    for (const row of rows) {
        const nama = (row['Nama'] || row['nama'] || '').trim()
        const kemKode = (row['Kementerian Kode'] || row['kementerian_kode'] || '').trim()
        const jenisKode = (row['Jenis Transaksi Kode'] || row['jenis_transaksi_kode'] || '').trim()
        const targetDana = parseInt((row['Target Dana'] || row['target_dana'] || '0').replace(/[^0-9]/g, '')) || 0
        const isRutin = (row['Is Rutin'] || row['is_rutin'] || '0').trim() === '1'
        const deskripsi = (row['Deskripsi'] || row['deskripsi'] || '').trim()
        if (!nama) continue

        const { error } = await supabase.from('program_event').insert({
            nama,
            kementerian_id: kemKode ? (kemMap.get(kemKode) || null) : null,
            jenis_transaksi_id: jenisKode ? (jenisMap.get(jenisKode) || null) : null,
            target_dana: targetDana,
            is_rutin: isRutin,
            deskripsi: deskripsi || null
        })
        if (error) {
            console.log(`  ⚠️  ${nama}: ${error.message}`)
            errors++
        } else {
            console.log(`  ✅ ${nama}`)
            success++
        }
    }
    console.log(`  → ${success} berhasil, ${errors} error`)
    return success
}

async function main() {
    console.log('=====================================')
    console.log('🚀 MUDA JUARA FINANCE - CSV IMPORTER')
    console.log('=====================================')
    console.log(`Target: ${SUPABASE_URL}`)

    // Test connection
    const { data, error: connErr } = await supabase.from('kementerian').select('count').limit(1)
    if (connErr) {
        console.error('\n❌ Koneksi Supabase gagal:', connErr.message)
        console.error('Pastikan SUPABASE_URL dan SUPABASE_ANON_KEY benar, dan schema sudah dibuat.')
        process.exit(1)
    }
    console.log('\n✅ Koneksi Supabase berhasil!')

    const TEMPLATE_DIR = 'H:/APP WEB/TEMPLATE'

    let total = 0

    // Import kementerian
    try {
        total += await importKementerian(`${TEMPLATE_DIR}/kementrian.csv`)
    } catch (e) {
        console.log('⚠️  Gagal import kementerian:', e.message)
    }

    // Import jenis transaksi
    try {
        total += await importJenisTransaksi(`${TEMPLATE_DIR}/jenis transaksi.csv`)
    } catch (e) {
        console.log('⚠️  Gagal import jenis transaksi:', e.message)
    }

    // Import kategori pengeluaran (operasional)
    try {
        total += await importKategoriPengeluaran(`${TEMPLATE_DIR}/operasional.csv`)
    } catch (e) {
        console.log('⚠️  Gagal import kategori pengeluaran:', e.message)
    }

    // Import rekening
    try {
        total += await importRekening(`${TEMPLATE_DIR}/rekening.csv`)
    } catch (e) {
        console.log('⚠️  Gagal import rekening:', e.message)
    }

    // Import event / program
    try {
        total += await importEvent(`${TEMPLATE_DIR}/event.csv`)
    } catch (e) {
        console.log('⚠️  Gagal import event:', e.message)
    }

    console.log('\n=====================================')
    console.log(`✅ SELESAI! Total ${total} data berhasil diimport.`)
    console.log('=====================================')
}

main().catch(console.error)
