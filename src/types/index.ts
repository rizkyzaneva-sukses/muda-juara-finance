export interface Kementerian {
  id: number
  kode: string
  nama: string
  created_at: string
}

export interface JenisTransaksi {
  id: number
  kode: string
  nama: string
  created_at: string
}

export interface KategoriPengeluaran {
  id: number
  nama: string
  kelompok: string
  deskripsi: string
  created_at: string
}

export interface ProgramEvent {
  id: number
  nama: string
  kementerian_id: number | null
  jenis_transaksi_id: number | null
  deskripsi: string | null
  tanggal_mulai: string | null
  tanggal_selesai: string | null
  target_dana: number
  is_rutin: boolean
  created_at: string
  kementerian?: Kementerian
  jenis_transaksi?: JenisTransaksi
}

export interface Rekening {
  id: number
  nama: string
  bank: string
  nomor_rekening: string
  saldo_awal: number
  created_at: string
}

export interface Transaksi {
  id: number
  tanggal: string
  keterangan: string
  jumlah: number
  tipe: 'masuk' | 'keluar'
  sumber: 'BCA' | 'BSI' | 'manual'
  status: 'valid' | 'cek_manual' | 'koreksi' | 'lainnya'
  kementerian_id: number | null
  jenis_transaksi_id: number | null
  kategori_pengeluaran_id: number | null
  program_event_id: number | null
  kategori_lainnya_id: number | null
  raw_data: any
  created_at: string
  kementerian?: Kementerian
  jenis_transaksi?: JenisTransaksi
  kategori_pengeluaran?: KategoriPengeluaran
  program_event?: ProgramEvent
}

export interface TransaksiQris {
  id: number
  created_date: string
  merchant_name: string
  merchant_id: string
  tid: string
  amount: number
  transaction_type: string
  kementerian_id: number | null
  jenis_transaksi_id: number | null
  program_event_id: number | null
  status: 'pending' | 'matched' | 'cek_manual'
  matched_transaksi_id: number | null
  created_at: string
  kementerian?: Kementerian
  jenis_transaksi?: JenisTransaksi
  program_event?: ProgramEvent
}

export interface LogRekonsiliasi {
  id: number
  tanggal_rekonsiliasi: string
  periode_mulai: string
  periode_selesai: string
  total_qris: number
  total_cair_bank: number
  selisih: number
  persentase_biaya: number
  jumlah_matched: number
  jumlah_pending: number
  notes: string
  created_at: string
}

export interface DashboardStats {
  saldo_bca: number
  saldo_bsi: number
  total_saldo: number
  total_masuk: number
  total_keluar: number
  saldo_berjalan: number
  jumlah_transaksi_masuk: number
  jumlah_transaksi_keluar: number
}

export interface RincianKementerian {
  kementerian_id: number | null
  kementerian_kode: string | null
  kementerian_nama: string
  jenis_id: number | null
  jenis_kode: string | null
  jenis_nama: string | null
  program_id: number | null
  program_nama: string | null
  txn: number
  qris: number
  transfer: number
  pengeluaran: number
  sisa: number
  persen: number
}

export interface QrisCode {
  ministryCode: string
  transactionCode: string
  status: 'valid' | 'cek_manual'
}
