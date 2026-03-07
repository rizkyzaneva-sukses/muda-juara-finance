import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://xlksjdhrzbkbenodgras.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsa3NqZGhyemJrYmVub2RncmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTg4NTYsImV4cCI6MjA4ODMzNDg1Nn0.GjpnPNnhQh5o5A4BL5r3NQrkRUkU8j5zWQzC6EV3Bl4'
)

const { data, error } = await supabase
    .from('transaksi_qris')
    .select('id, created_date, merchant_name, amount, tid, status')
    .order('created_date', { ascending: false })
    .limit(200)

if (error) { console.log('ERROR:' + error.message); process.exit(1) }

const total = data.length
const withTid = data.filter(r => r.tid && r.tid.trim() !== '').length
const emptyTid = total - withTid

const result = {
    total,
    withTid,
    emptyTid,
    sample_with_tid: data.filter(r => r.tid).slice(0, 3).map(r => ({ id: r.id, tid: r.tid, date: r.created_date?.substring(0, 10), merchant: r.merchant_name })),
    sample_empty_tid: data.filter(r => !r.tid || r.tid.trim() === '').slice(0, 3).map(r => ({ id: r.id, date: r.created_date?.substring(0, 10), merchant: r.merchant_name, amount: r.amount }))
}
console.log(JSON.stringify(result, null, 2))
