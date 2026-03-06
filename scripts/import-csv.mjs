#!/usr/bin/env node
/**
 * Import CSV data to Supabase
 * Run: node scripts/import-csv.mjs
 * 
 * Imports all CSV files from H:/APP WEB/TEMPLATE/ to Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://xlksjdhrzbkbenodgras.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsa3NqZGhyemJrYmVub2RncmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTg4NTYsImV4cCI6MjA4ODMzNDg1Nn0.GjpnPNnhQh5o5A4BL5r3NQrkRUkU8j5zWQzC6EV3Bl4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function parseCSV(content) {
    const lines = content.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''))
    const rows = []
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/\r/g, ''))
        if (values.every(v => v === '')) continue
        const row = {}
        headers.forEach((h, idx) => { row[h] = values[idx] || '' })
        rows.push(row)
    }
    return rows
}

async function importKementerian(csvPath) {
    console.log('\n📂 Importing Kementerian...')
    try {
        const content = readFileSync(csvPath, 'utf-8')
        const rows = parseCSV(content)
        let success = 0, errors = 0
        for (const row of rows) {
            const kode = (row['Kode'] || '').trim()
            const nama = (row['Nama'] || '').trim()
            if (!kode || !nama) continue
            const { error } = await supabase.from('kementerian').upsert({ kode, nama }, { onConflict: 'kode' })
            if (error) { console.log(`  ⚠️  ${kode} - ${nama}: ${error.message}`); errors++ }
            else { console.log(`  ✅ ${kode} - ${nama}`); success++ }
        }
        console.log(`  → ${success} berhasil, ${errors} error`)
        return success
    } catch (e) { console.log('  ❌ Error:', e.message); return 0 }
}

async function importJenisTransaksi(csvPath) {
    console.log('\n📂 Importing Jenis Transaksi...')
    try {
        const content = readFileSync(csvPath, 'utf-8')
        const rows = parseCSV(content)
        let success = 0, errors = 0
        for (const row of rows) {
            const kode = (row['Kode'] || '').trim()
            const nama = (row['Nama'] || '').trim()
            if (!kode || !nama) continue
            const { error } = await supabase.from('jenis_transaksi').upsert({ kode, nama }, { onConflict: 'kode' })
            if (error) { console.log(`  ⚠️  ${kode} - ${nama}: ${error.message}`); errors++ }
            else { console.log(`  ✅ ${kode} - ${nama}`); success++ }
        }
        console.log(`  → ${success} berhasil, ${errors} error`)
        return success
    } catch (e) { console.log('  ❌ Error:', e.message); return 0 }
}

async function importKategoriPengeluaran(csvPath) {
    console.log('\n📂 Importing Kategori Pengeluaran (Operasional)...')
    try {
        const content = readFileSync(csvPath, 'utf-8')
        const rows = parseCSV(content)
        let success = 0, errors = 0
        for (const row of rows) {
            const kelompok = (row['Kelompok'] || '').trim()
            const nama = (row['Nama'] || '').trim()
            const deskripsi = (row['Deskripsi'] || '').trim()
            if (!nama) continue
            const { error } = await supabase.from('kategori_pengeluaran').insert({
                kelompok: kelompok || null, nama, deskripsi: deskripsi || null
            })
            if (error) { console.log(`  ⚠️  ${nama}: ${error.message}`); errors++ }
            else { console.log(`  ✅ ${nama}`); success++ }
        }
        console.log(`  → ${success} berhasil, ${errors} error`)
        return success
    } catch (e) { console.log('  ❌ Error:', e.message); return 0 }
}

async function importRekening(csvPath) {
    console.log('\n📂 Importing Rekening...')
    try {
        const content = readFileSync(csvPath, 'utf-8')
        const rows = parseCSV(content)
        let success = 0, errors = 0
        for (const row of rows) {
            const bank = (row['Bank'] || '').trim()
            const nama = (row['Nama'] || '').trim()
            const nomor_rekening = (row['Nomor Rekening'] || '').trim()
            const saldo_awal = parseInt((row['Saldo Awal'] || '0').replace(/[^0-9]/g, '')) || 0
            if (!bank || !nama) continue
            const { data: existing } = await supabase.from('rekening').select('id').eq('nomor_rekening', nomor_rekening).maybeSingle()
            if (existing) {
                const { error } = await supabase.from('rekening').update({ bank, nama, saldo_awal }).eq('id', existing.id)
                if (error) { console.log(`  ⚠️  ${nama}: ${error.message}`); errors++ }
                else { console.log(`  ✅ (update) ${nama} - ${bank}`); success++ }
            } else {
                const { error } = await supabase.from('rekening').insert({ bank, nama, nomor_rekening, saldo_awal })
                if (error) { console.log(`  ⚠️  ${nama}: ${error.message}`); errors++ }
                else { console.log(`  ✅ ${nama} - ${bank} - Saldo: Rp${saldo_awal.toLocaleString()}`); success++ }
            }
        }
        console.log(`  → ${success} berhasil, ${errors} error`)
        return success
    } catch (e) { console.log('  ❌ Error:', e.message); return 0 }
}

async function importProgramEvent(csvPath) {
    console.log('\n📂 Importing Program Event...')
    try {
        const content = readFileSync(csvPath, 'utf-8')
        const rows = parseCSV(content)

        const { data: kemData } = await supabase.from('kementerian').select('id,kode')
        const { data: jenisData } = await supabase.from('jenis_transaksi').select('id,kode')
        const kemMap = new Map((kemData || []).map(k => [k.kode, k.id]))
        const jenisMap = new Map((jenisData || []).map(j => [j.kode, j.id]))

        let success = 0, errors = 0
        for (const row of rows) {
            const nama = (row['Nama'] || '').trim()
            const kemKode = (row['Kementerian Kode'] || '').trim()
            const jenisKode = (row['Jenis Transaksi Kode'] || '').trim()
            const target_dana = parseInt((row['Target Dana'] || '0').replace(/[^0-9]/g, '')) || 0
            const is_rutin = (row['Is Rutin'] || '0').trim() === '1'
            const deskripsi = (row['Deskripsi'] || '').trim()
            if (!nama) continue

            const { error } = await supabase.from('program_event').insert({
                nama,
                kementerian_id: kemKode ? (kemMap.get(kemKode) || null) : null,
                jenis_transaksi_id: jenisKode ? (jenisMap.get(jenisKode) || null) : null,
                target_dana, is_rutin,
                deskripsi: deskripsi || null
            })
            if (error) { console.log(`  ⚠️  ${nama}: ${error.message}`); errors++ }
            else { console.log(`  ✅ ${nama}`); success++ }
        }
        console.log(`  → ${success} berhasil, ${errors} error`)
        return success
    } catch (e) { console.log('  ❌ Error:', e.message); return 0 }
}

async function main() {
    console.log('=========================================')
    console.log('🚀 MUDA JUARA FINANCE - CSV DATA IMPORTER')
    console.log('=========================================')
    console.log(`Target: ${SUPABASE_URL}\n`)

    // Test connection
    const { error: connErr } = await supabase.from('kementerian').select('count').limit(1)
    if (connErr) {
        if (connErr.message.includes('does not exist') || connErr.code === 'PGRST116') {
            console.error('\n❌ TABEL BELUM DIBUAT!')
            console.error('────────────────────────────────────────')
            console.error('Silakan buat tabel terlebih dahulu di Supabase:')
            console.error('1. Buka: https://supabase.com/dashboard/project/xlksjdhrzbkbenodgras/sql/new')
            console.error('2. Copy-paste isi file: supabase/schema.sql')
            console.error('3. Klik Run/Execute')
            console.error('4. Jalankan script ini kembali')
            console.error('────────────────────────────────────────')
        } else {
            console.error('\n❌ Koneksi gagal:', connErr.message)
            console.error('Periksa koneksi internet dan credentials Supabase.')
        }
        process.exit(1)
    }
    console.log('✅ Koneksi Supabase berhasil!\n')

    const TEMPLATE_DIR = 'H:/APP WEB/TEMPLATE'
    let total = 0

    total += await importKementerian(`${TEMPLATE_DIR}/kementrian.csv`)
    total += await importJenisTransaksi(`${TEMPLATE_DIR}/jenis transaksi.csv`)
    total += await importKategoriPengeluaran(`${TEMPLATE_DIR}/operasional.csv`)
    total += await importRekening(`${TEMPLATE_DIR}/rekening.csv`)
    total += await importProgramEvent(`${TEMPLATE_DIR}/event.csv`)

    console.log('\n=========================================')
    console.log(`✅ SELESAI! Total ${total} data berhasil diimport ke Supabase.`)
    console.log('=========================================')
}

main().catch(console.error)
