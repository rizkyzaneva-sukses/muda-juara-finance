'use client'
import AppLayout from '@/components/layout/AppLayout'
import { BookOpen, Target, Settings, Zap, ArrowRight, Table, Server } from 'lucide-react'

export default function PanduanPage() {
    return (
        <AppLayout>
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="border-b pb-6" style={{ borderColor: 'var(--bg-border)' }}>
                    <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Buku Panduan & Referensi</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Dokumentasi lengkap cara kerja sistem Muda Juara Finance, alur kerja, dan glosarium istilah yang digunakan.
                    </p>
                </div>

                {/* Istilah & Kamus Data */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen size={20} style={{ color: 'var(--accent-gold)' }} />
                        <h2 className="text-xl font-semibold">Kamus Istilah & Konsep Dasar</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="card p-5">
                            <h3 className="font-semibold text-sm mb-2 text-blue-400">QRIS (Matched, Pending, Verified)</h3>
                            <ul className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <li><strong className="text-white">Pending:</strong> Data QRIS mentah yang baru diupload dan belum dicocokkan dengan mutasi bank mana pun.</li>
                                <li><strong className="text-white">Matched:</strong> Data QRIS yang sudah otomatis tercocokkan dengan uang yang masuk / cair di mutasi bank pada menu Rekonsiliasi.</li>
                                <li><strong className="text-white">Verified:</strong> Data QRIS yang di-assign secara manual (diberi Kementerian + Jenis) sebelum uangnya benar-benar cair di bank. Status ini membiarkan AI tahu bahwa data ini sudah aman masuk ke Laporan meskipun belum "Matched".</li>
                            </ul>
                        </div>
                        <div className="card p-5">
                            <h3 className="font-semibold text-sm mb-2 text-green-400">Mutasi & Status Transaksi</h3>
                            <ul className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <li><strong className="text-white">Cek Manual:</strong> Status default mutasi baru. Artinya admin harus memeriksa dan menugaskan Kementerian/Jenis kegiatan.</li>
                                <li><strong className="text-white">Valid:</strong> Mutasi yang sudah lengkap datanya (Punya Kementerian, Punya Program, Punya Jenis).</li>
                                <li><strong className="text-white">MDR (Merchant Discount Rate):</strong> Potongan biaya 0.7% yang diambil bank setiap ada orang bayar via QRIS.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Alur Kerja Utama */}
                <section className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap size={20} style={{ color: 'var(--accent-gold)' }} />
                        <h2 className="text-xl font-semibold">Alur Kerja (Workflow) Sistem</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="card p-5 border-l-4" style={{ borderLeftColor: '#3b82f6' }}>
                            <h3 className="font-bold mb-2">1. Manajemen QRIS & Rekonsiliasi (Uang Masuk)</h3>
                            <ol className="list-decimal pl-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <li>Export data Excel (<code>.xlsx</code>) harian/mingguan dari Dashboard DSP QRIS.</li>
                                <li>Masuk ke menu <strong className="text-white">Upload Mutasi</strong> {'->'} Pilih tab <strong className="text-white">Upload QRIS</strong>, lalu upload filenya. Data ini otomatis masuk menjadi status <code>pending</code>.</li>
                                <li>Untuk memastikan uang tersebut cair: Upload PDF Mutasi Bank BCA Syariah terbaru di menu Upload Mutasi.</li>
                                <li>Masuk ke menu <strong className="text-white">Rekonsiliasi QRIS</strong>, klik tombol kuning <strong className="text-white">"Jalankan Rekonsiliasi"</strong>.</li>
                                <li>Sistem akan menyusuri hingga maksimal +4 hari kedepan untuk mencari kecocokan nominal antara Qris Pending dengan Mutasi BCA. Jika cocok, status akan berubah jadi <code>matched</code> dan dipotong biaya MDR 0.7% otomatis di Laporan.</li>
                            </ol>
                        </div>

                        <div className="card p-5 border-l-4" style={{ borderLeftColor: '#22c55e' }}>
                            <h3 className="font-bold mb-2">2. Manajemen Mutasi Bank (BSI & BCA)</h3>
                            <ol className="list-decimal pl-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <li>Download e-Statement / mutasi bulanan dalam bentuk gambar (Screenshot) atau dokumen (PDF).</li>
                                <li>Bawa ke <strong className="text-white">Upload Mutasi</strong> dan pilih sumber bank yang sesuai (BCA/BSI).</li>
                                <li>AI akan membaca baris per baris secara cerdas. Jika AI melihat kode unik di akhir nominal transfer Bank BSI (misalkan 1.000.<strong>105</strong>), AI akan otomatis memberi label Kementerian dan Kegiatan secara mandiri (Auto-Valid).</li>
                                <li>Klik "Simpan Data". Untuk data yang gagal "Auto-Valid", statusnya akan masuk menjadi <code>Cek Manual</code>.</li>
                            </ol>
                        </div>

                        <div className="card p-5 border-l-4" style={{ borderLeftColor: '#eab308' }}>
                            <h3 className="font-bold mb-2">3. Koreksi Data & Pelaporan</h3>
                            <ol className="list-decimal pl-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <li>Buka menu <strong className="text-white">Koreksi</strong>. Di sini berkumpul seluruh data yang masih berstatus <code>Cek Manual</code> atau belum tertaut ke Kementerian/Jenis.</li>
                                <li>Gunakan fitur "Aksi Massal" (berada di tabel paling atas setelah mencentang beberapa baris) untuk secara serentak mengelompokkan data ke Kementerian, Jenis Transaksi, atau Program Event yang sama.</li>
                                <li>Setelah semuanya beres dirapikan dan statusnya menjadi <code>Valid</code>, periksa menu <strong className="text-white">Dashboard</strong> dan <strong className="text-white">Laporan</strong> untuk melihat pembukuan rapi per kementerian, jenis, dan tanggal.</li>
                            </ol>
                        </div>
                    </div>
                </section>

                {/* Master Data */}
                <section className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Server size={20} style={{ color: 'var(--accent-gold)' }} />
                        <h2 className="text-xl font-semibold">Aturan Main Master Data & Kode</h2>
                    </div>
                    <div className="card p-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <p className="mb-4">
                            Aplikasi ini berputar pada sebuah sistem kode unik mutasi (khusus bank BSI). Hal ini memudahkan pelacakan
                            transfer yang dilakukan anggota. Struktur master data adalah:
                        </p>
                        <ul className="space-y-3">
                            <li>
                                <strong className="text-white">Kementerian (Contoh: "01")</strong> - Merupakan kode wajib di awal pendataan yang mewakili unit/divisi. (01 Untuk SDM, dll).
                            </li>
                            <li>
                                <strong className="text-white">Jenis Transaksi (Contoh: "05")</strong> - Merupakan sub-kode dari kegiatan untuk pemasukan (Misal 05 Untuk Pendaftaran). Pemasukan dan Pengeluaran menggunakan "Jenis Transaksi" yang sama sistemnya, hanya berbeda label.
                            </li>
                            <li>
                                <strong className="text-white">Kode Unik Transfer (Kombinasi)</strong> - Ketika digabungkan antara (Kementerian = 01) dan (Jenis = 05), jadilah kode <strong>105</strong>. Artinya pen-transfer diwajibkan menulis angka 105 di akhir jumlah transfer (misal Rp 50.105) agar AI otomatis memvalidasinya ke sistem tanpa admin perlu bekerja.
                            </li>
                        </ul>
                    </div>
                </section>

            </div>
        </AppLayout>
    )
}
