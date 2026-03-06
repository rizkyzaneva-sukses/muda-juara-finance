import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables!");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        query: "UPDATE transaksi SET status = 'valid' WHERE keterangan ILIKE '%TRF BATCH MYBB%';"
    });

    // if exec_sql doesn't exist, we can just fetch and update via API
    if (error) {
        console.log("exec_sql RPC not found or failed, falling back to API update...", error);

        const { data: trx, error: fetchErr } = await supabaseAdmin
            .from('transaksi')
            .select('id')
            .ilike('keterangan', '%TRF BATCH MYBB%');

        if (fetchErr) {
            console.error(fetchErr);
            process.exit(1);
        }

        if (trx && trx.length > 0) {
            const ids = trx.map(t => t.id);
            console.log(`Found ${ids.length} rows to update.`);
            const { error: updateErr } = await supabaseAdmin
                .from('transaksi')
                .update({ status: 'valid' })
                .in('id', ids);

            if (updateErr) {
                console.error("Update failed", updateErr);
            } else {
                console.log(`Updated ${ids.length} rows to valid!`);
            }
        } else {
            console.log("No TRF BATCH MYBB rows found to update.");
        }
    } else {
        console.log("SQL executed successfully via RPC!");
    }
}

run();
