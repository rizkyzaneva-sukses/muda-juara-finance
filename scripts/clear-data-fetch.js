const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.easypanel');
const envFile = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/(^"|"$)/g, '');
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/(^"|"$)/g, '');
});

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabaseUrl or supabaseKey");
    process.exit(1);
}

async function clearTable(table) {
    console.log(`Menghapus data di tabel ${table}...`);
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=gt.0`, {
        method: 'DELETE',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    if (!res.ok) {
        const text = await res.text();
        console.error(`Gagal menghapus ${table}:`, res.status, text);
    } else {
        console.log(`Berhasil membersihkan tabel ${table}.`);
    }
}

async function main() {
    await clearTable('log_rekonsiliasi');
    await clearTable('transaksi_qris');
    await clearTable('transaksi');
    console.log("Selesai!");
}

main();
