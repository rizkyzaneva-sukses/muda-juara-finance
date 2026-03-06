# Muda Juara Finance Dashboard

Sistem manajemen keuangan untuk Kabinet Muda Juara — mencatat, mengklasifikasikan, merekonsiliasi, dan melaporkan transaksi QRIS + Transfer Bank.

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **AI Parsing**: OpenAI GPT-4o
- **Deploy**: Docker + Easypanel

## Fitur
- Dashboard publik dengan ringkasan saldo + rincian 3 level (Kementerian → Jenis → Program)
- Upload QRIS Excel dengan auto-mapping 3-digit kode
- Upload Mutasi Bank PDF dengan AI parsing (OpenAI)
- Rekonsiliasi QRIS vs pencairan BCA
- Koreksi transaksi cek manual
- Laporan lengkap dengan export Excel
- Master Data: Kementerian, Jenis Transaksi, Program & Event, Kategori Pengeluaran, Rekening

## Setup Lokal

```bash
# Clone dan install
npm install
cd client && npm install && cd ..

# Copy env
cp .env.example .env
# Edit .env dengan nilai yang sesuai

# Run development
npm run dev
```

## Deploy ke Easypanel + Supabase

### 1. Setup Supabase
1. Buat project baru di supabase.com
2. Copy connection string dari Settings → Database
3. Format: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`

### 2. Setup Easypanel
1. Buat app baru di Easypanel
2. Pilih source: GitHub atau Docker
3. Set environment variables:
   - `DATABASE_URL` = connection string Supabase
   - `OPENAI_API_KEY` = API key dari platform.openai.com
   - `ADMIN_PASSWORD` = password login admin
   - `JWT_SECRET` = string random (min 32 karakter)
   - `NODE_ENV` = production
   - `PORT` = 3001

### 3. Build & Deploy
```bash
# Build Docker image
docker build -t muda-juara-finance .

# Push ke registry atau gunakan Easypanel git deploy
```

### 4. Database Migration
Database schema otomatis ter-create saat pertama kali server start.
Seed data master (kementerian, jenis transaksi, kategori pengeluaran) juga otomatis.

## Sistem Kode QRIS

Format: `Nominal = Jumlah Bersih + Kode Kementerian (1 digit) + Kode Jenis (2 digit)`

| Kode Kementerian | Nama |
|---|---|
| 1 | Kementerian SDM |
| 2 | Kementerian Ekonomi |
| 3 | Kementerian Pendidikan |
| 4 | Kementerian Sosial |
| 5 | KemenPorPar |
| 6 | Kementerian Luar Negeri |
| 7 | Kominfo |
| 8 | Kementerian Muslimah |
| 9 | Menkumham & Nilai |

| Kode Jenis | Nama |
|---|---|
| 10 | Sponsor |
| 11 | Pendaftaran |
| 12 | Infaq Kegiatan MJ |
| 13 | Donasi Umum |
| 15 | Infaq Shubuh |
| 16 | Wakaf Pembangunan Masjid |
| 17 | Kegiatan MJ |
| 96 | Yayasan |
| 97 | Pengembalian Biaya Transfer |

Contoh: Rp 10.415 → 415 → Kementerian 4 (Sosial) + Jenis 15 (Infaq Shubuh) ✅
