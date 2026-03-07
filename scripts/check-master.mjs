import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://xlksjdhrzbkbenodgras.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsa3NqZGhyemJrYmVub2RncmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTg4NTYsImV4cCI6MjA4ODMzNDg1Nn0.GjpnPNnhQh5o5A4BL5r3NQrkRUkU8j5zWQzC6EV3Bl4'
)

const [k, j, kp, pe] = await Promise.all([
    supabase.from('kementerian').select('id, kode, nama').order('kode'),
    supabase.from('jenis_transaksi').select('id, kode, nama').order('kode'),
    supabase.from('kategori_pengeluaran').select('id, nama').order('nama'),
    supabase.from('program_event').select('id, nama').order('nama'),
])

console.log(JSON.stringify({
    kementerian: k.data,
    jenis_transaksi: j.data,
    kategori_pengeluaran: kp.data,
    program_event: pe.data
}, null, 2))
