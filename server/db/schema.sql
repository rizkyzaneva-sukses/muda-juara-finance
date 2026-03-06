-- Muda Juara Finance Dashboard - Database Schema
-- Run this on Supabase SQL Editor

-- =====================
-- MASTER DATA TABLES
-- =====================

CREATE TABLE IF NOT EXISTS kementerian (
  id SERIAL PRIMARY KEY,
  kode VARCHAR(2) UNIQUE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jenis_transaksi (
  id SERIAL PRIMARY KEY,
  kode VARCHAR(2) UNIQUE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kategori_pengeluaran (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kelompok VARCHAR(100),
  deskripsi TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_event (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kementerian_id INTEGER REFERENCES kementerian(id) ON DELETE SET NULL,
  jenis_transaksi_id INTEGER REFERENCES jenis_transaksi(id) ON DELETE SET NULL,
  deskripsi TEXT,
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  target_dana BIGINT DEFAULT 0,
  is_rutin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rekening (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  bank VARCHAR(100) NOT NULL,
  nomor_rekening VARCHAR(50),
  saldo_awal BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Legacy table (kept for backward compatibility)
CREATE TABLE IF NOT EXISTS kategori_lainnya (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  jenis_transaksi_id INTEGER REFERENCES jenis_transaksi(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- TRANSACTION TABLES
-- =====================

CREATE TABLE IF NOT EXISTS transaksi (
  id SERIAL PRIMARY KEY,
  tanggal DATE NOT NULL,
  keterangan TEXT,
  jumlah BIGINT NOT NULL,
  tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
  sumber VARCHAR(20) NOT NULL CHECK (sumber IN ('BCA', 'BSI', 'manual', 'QRIS')),
  status VARCHAR(20) NOT NULL DEFAULT 'cek_manual' CHECK (status IN ('valid', 'cek_manual', 'koreksi', 'lainnya')),
  kementerian_id INTEGER REFERENCES kementerian(id) ON DELETE SET NULL,
  jenis_transaksi_id INTEGER REFERENCES jenis_transaksi(id) ON DELETE SET NULL,
  kategori_pengeluaran_id INTEGER REFERENCES kategori_pengeluaran(id) ON DELETE SET NULL,
  program_event_id INTEGER REFERENCES program_event(id) ON DELETE SET NULL,
  kategori_lainnya_id INTEGER REFERENCES kategori_lainnya(id) ON DELETE SET NULL,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaksi_qris (
  id SERIAL PRIMARY KEY,
  created_date TIMESTAMP,
  merchant_name VARCHAR(255),
  merchant_id VARCHAR(100),
  tid VARCHAR(100),
  amount BIGINT NOT NULL,
  kementerian_id INTEGER REFERENCES kementerian(id) ON DELETE SET NULL,
  jenis_transaksi_id INTEGER REFERENCES jenis_transaksi(id) ON DELETE SET NULL,
  program_event_id INTEGER REFERENCES program_event(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'cek_manual')),
  matched_transaksi_id INTEGER REFERENCES transaksi(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS log_rekonsiliasi (
  id SERIAL PRIMARY KEY,
  tanggal_rekonsiliasi DATE NOT NULL,
  sumber VARCHAR(20),
  total_qris BIGINT DEFAULT 0,
  total_cair_bank BIGINT DEFAULT 0,
  selisih BIGINT DEFAULT 0,
  persentase_biaya DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- SEED MASTER DATA
-- =====================

INSERT INTO kementerian (kode, nama) VALUES
('00', 'Keuangan'),
('01', 'Kementerian SDM'),
('02', 'Kementerian Ekonomi'),
('03', 'Kementerian Pendidikan'),
('04', 'Kementerian Sosial'),
('05', 'KemenPorPar'),
('06', 'Kementerian Luar Negeri'),
('07', 'Kominfo'),
('08', 'Kementerian Muslimah'),
('09', 'Menkumham & Nilai')
ON CONFLICT (kode) DO NOTHING;

INSERT INTO jenis_transaksi (kode, nama) VALUES
('10', 'Sponsor'),
('11', 'Pendaftaran'),
('12', 'Infaq - Kegiatan MJ'),
('13', 'Donasi Umum'),
('15', 'Infaq Shubuh'),
('16', 'Wakaf Pembangunan Masjid'),
('17', 'Kegiatan MJ'),
('96', 'Yayasan'),
('97', 'Pengembalian Biaya Transfer BI-Fast')
ON CONFLICT (kode) DO NOTHING;

INSERT INTO kategori_pengeluaran (nama, kelompok, deskripsi) VALUES
('Konsumsi / Catering', 'Operasional Acara', 'Biaya makan dan minum'),
('Sewa Venue / DP Venue', 'Operasional Acara', 'Biaya sewa tempat acara'),
('Dekorasi & Properti', 'Operasional Acara', 'Biaya dekorasi dan properti acara'),
('Dokumentasi (Foto/Video)', 'Operasional Acara', 'Biaya dokumentasi'),
('Perlengkapan Acara', 'Operasional Acara', 'Biaya perlengkapan dan peralatan'),
('Transportasi Panitia', 'Operasional Acara', 'Biaya perjalanan panitia'),
('Akomodasi / Penginapan', 'Operasional Acara', 'Biaya penginapan'),
('Honorarium Pembicara / Ustadz', 'SDM & Apresiasi', 'Honorarium narasumber'),
('Santunan', 'SDM & Apresiasi', 'Pemberian santunan'),
('Hadiah & Doorprize', 'SDM & Apresiasi', 'Hadiah dan doorprize'),
('Seragam / Merchandise', 'SDM & Apresiasi', 'Biaya seragam dan merchandise'),
('Sertifikat & Plakat', 'SDM & Apresiasi', 'Biaya sertifikat dan plakat'),
('Biaya Admin Bank', 'Keuangan & Admin', 'Biaya administrasi bank'),
('Pajak', 'Keuangan & Admin', 'Kewajiban pajak'),
('Zakat', 'Program Sosial & Syariah', 'Zakat organisasi'),
('Infaq Program', 'Program Sosial & Syariah', 'Infaq untuk program'),
('Sedekah / Santunan Yatim', 'Program Sosial & Syariah', 'Sedekah dan santunan anak yatim'),
('Wakaf', 'Program Sosial & Syariah', 'Dana wakaf'),
('Umroh / Perjalanan Religi', 'Investasi & Pengembangan', 'Biaya umroh dan perjalanan religi'),
('Pelatihan & Workshop', 'Investasi & Pengembangan', 'Biaya pelatihan'),
('Pembelian Aset', 'Investasi & Pengembangan', 'Pembelian aset organisasi'),
('Dana Darurat Organisasi', 'Investasi & Pengembangan', 'Dana darurat dan cadangan')
ON CONFLICT DO NOTHING;
