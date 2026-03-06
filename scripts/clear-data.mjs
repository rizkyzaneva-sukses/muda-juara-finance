import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.easypanel') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabaseUrl or supabaseKey")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearData() {
    console.log("Menghapus data Transaksi QRIS lama...")
    const { error } = await supabase.from('transaksi_qris').delete().neq('id', 0)

    if (error) {
        console.error("Gagal menghapus data:", error)
    } else {
        console.log("Berhasil membersihkan data QRIS lama.")
    }

    console.log("Menghapus data Mutasi/Transaksi lama agar sinkron...")
    const { error: err2 } = await supabase.from('transaksi').delete().neq('id', 0)
    if (err2) {
        console.error("Gagal menghapus transaksi:", err2)
    } else {
        console.log("Berhasil membersihkan data Transaksi.")
    }
}

clearData()
