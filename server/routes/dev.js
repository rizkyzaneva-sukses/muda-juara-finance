import express from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET migration status
router.get('/migration-status', authMiddleware, async (req, res) => {
  const r = await query(`
    SELECT COUNT(*) as unassigned
    FROM transaksi
    WHERE status = 'cek_manual' AND kementerian_id IS NULL
  `);
  res.json({ unassigned: parseInt(r.rows[0].unassigned) });
});

// POST seed dummy data
router.post('/seed', authMiddleware, async (req, res) => {
  try {
    // Get master data IDs
    const kem = await query('SELECT id, kode FROM kementerian');
    const jt = await query('SELECT id, kode FROM jenis_transaksi');
    const kp = await query('SELECT id, nama FROM kategori_pengeluaran');

    const kemMap = {};
    kem.rows.forEach(k => { kemMap[k.kode] = k.id; });
    const jtMap = {};
    jt.rows.forEach(j => { jtMap[j.kode] = j.id; });
    const kpMap = {};
    kp.rows.forEach(k => { kpMap[k.nama] = k.id; });

    // Seed rekening
    await query(`
      INSERT INTO rekening (nama, bank, nomor_rekening, saldo_awal) VALUES
      ('Rekening Utama BCA Syariah', 'BCA', '0590040242', 48663941),
      ('Rekening BSI Yayasan', 'BSI', '7188888172', 258168530)
      ON CONFLICT DO NOTHING
    `);

    // Seed program event
    await query(`DELETE FROM program_event`);
    const peResult = await query(`
      INSERT INTO program_event (nama, kementerian_id, jenis_transaksi_id, deskripsi, target_dana, is_rutin) VALUES
      ('Bukber 2026', $1, $2, 'Buka Bersama Kabinet Muda Juara 2026', 20000000, false),
      ('Bukber 2026 - Sponsor', $1, $3, 'Sponsorship Bukber 2026', 5000000, false),
      ('Sertijab 2026', $1, $2, 'Serah Terima Jabatan Kabinet', 10000000, false),
      ('Umroh MJ - Indra', NULL, NULL, 'Umroh Kabinet Kang Furqon', 0, false),
      ('Donasi Cisarua', NULL, $4, 'Donasi untuk warga Cisarua', 0, false),
      ('Infaq Shubuh Rutin', $5, $6, 'Infaq rutin setelah sholat shubuh', 0, true),
      ('Wakaf Masjid', NULL, $7, 'Wakaf pembangunan masjid', 0, false),
      ('Kegiatan Liqo Rutin', $1, $8, 'Kegiatan liqo mingguan', 0, true)
      RETURNING id, nama
    `, [kemMap['01'], jtMap['11'], jtMap['10'], jtMap['13'], kemMap['04'], jtMap['15'], jtMap['16'], jtMap['17']]);

    const peMap = {};
    peResult.rows.forEach(p => { peMap[p.nama] = p.id; });

    // Seed sample transaksi masuk
    await query(`DELETE FROM transaksi`);
    await query(`DELETE FROM transaksi_qris`);

    const today = new Date();
    const sampleTransaksi = [
      ['2026-02-06', 'TRF BATCH MYBB - PEMBAYARAN 060226', 1259124, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-19', 'TRF BATCH MYBB - Pembayaran Merchant 190226', 17948, 'masuk', 'BCA', 'valid', null, null, null, null],
      ['2026-02-20', 'TRF BATCH MYBB - Pembayaran Trx 190226', 251428, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-23', 'TRF BATCH MYBB - Pembayaran Trx Batch 2', 1880168, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-24', 'TRF BATCH MYBB - Pembayaran Trx 230226', 1194175, 'masuk', 'BCA', 'valid', kemMap['04'], jtMap['15'], null, peMap['Infaq Shubuh Rutin']],
      ['2026-02-26', 'BIF IN - Liqo Pa Riza utk MJ', 1000110, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['10'], null, peMap['Bukber 2026 - Sponsor']],
      ['2026-02-27', 'TRF BATCH MYBB - Pembayaran Trx 260226', 1412473, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-28', 'BIF IN - FLIP - Anwar Syidiq', 260111, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-28', 'ATR HELMI ILHAM NURKHOLIS', 85111, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-28', 'MBSTRF MOCHAMMAD - Faisal Istri Anak', 215111, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-28', 'MBSTRF ADI AHMADI', 85111, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-28', 'BIF IN - LILIS KARMILA - Bukber MJ Didit dan Istri', 170111, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-28', 'BIF IN - ASFIYANI NUR ASIKIN - M.Rizky MJ 6', 215111, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      ['2026-02-28', 'BIF IN - ROSINTA', 170111, 'masuk', 'BCA', 'valid', kemMap['01'], jtMap['11'], null, peMap['Bukber 2026']],
      // Keluar
      ['2026-02-18', 'BIF OUT - KAGUM GUNA USAHA - DP venue Bukber MJ 2026', 2000000, 'keluar', 'BCA', 'valid', kemMap['01'], null, kpMap['Sewa Venue / DP Venue'], peMap['Bukber 2026']],
      ['2026-02-24', 'BIF OUT - IIN INDRIYANI - Santunan', 1000000, 'keluar', 'BCA', 'valid', kemMap['04'], null, kpMap['Santunan'], null],
      ['2026-02-10', 'BY MUTASI 11 LEMBAR', 55000, 'keluar', 'BCA', 'valid', null, null, kpMap['Biaya Admin Bank'], null],
      // Cek manual
      ['2026-02-28', 'SWT SUPARDI', 85000, 'masuk', 'BCA', 'cek_manual', null, null, null, null],
    ];

    for (const t of sampleTransaksi) {
      await query(
        `INSERT INTO transaksi (tanggal, keterangan, jumlah, tipe, sumber, status, kementerian_id, jenis_transaksi_id, kategori_pengeluaran_id, program_event_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        t
      );
    }

    // Seed QRIS
    const qrisSamples = [
      ['2026-02-25 04:36:34', 'Muda Juara', 'MJ001', 'A01', 10415, kemMap['04'], jtMap['15'], peMap['Infaq Shubuh Rutin'], 'pending'],
      ['2026-02-25 04:39:54', 'Muda Juara', 'MJ001', 'A01', 20415, kemMap['04'], jtMap['15'], peMap['Infaq Shubuh Rutin'], 'pending'],
      ['2026-02-25 05:06:02', 'Muda Juara', 'MJ001', 'A01', 20111, kemMap['01'], jtMap['11'], peMap['Bukber 2026'], 'pending'],
      ['2026-02-26 16:16:49', 'Muda Juara', 'MJ001', 'A01', 1000000, null, null, null, 'cek_manual'],
    ];

    for (const q of qrisSamples) {
      await query(
        `INSERT INTO transaksi_qris (created_date, merchant_name, merchant_id, tid, amount, kementerian_id, jenis_transaksi_id, program_event_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, q
      );
    }

    res.json({ success: true, message: 'Data dummy berhasil dibuat' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reset transactions only
router.post('/reset-transaksi', authMiddleware, async (req, res) => {
  await query('DELETE FROM log_rekonsiliasi');
  await query('DELETE FROM transaksi_qris');
  await query('DELETE FROM transaksi');
  res.json({ success: true });
});

// POST reset all data
router.post('/reset-all', authMiddleware, async (req, res) => {
  await query('DELETE FROM log_rekonsiliasi');
  await query('DELETE FROM transaksi_qris');
  await query('DELETE FROM transaksi');
  await query('DELETE FROM program_event');
  await query('DELETE FROM kategori_pengeluaran');
  await query('DELETE FROM jenis_transaksi');
  await query('DELETE FROM kementerian');
  await query('DELETE FROM rekening');
  await query('DELETE FROM kategori_lainnya');
  res.json({ success: true });
});

// POST reset specific entity
router.post('/reset-entity', authMiddleware, async (req, res) => {
  const { entity } = req.body;
  const allowed = ['transaksi', 'transaksi_qris', 'program_event', 'kategori_pengeluaran', 'log_rekonsiliasi', 'kementerian', 'jenis_transaksi', 'rekening', 'kategori_lainnya'];
  if (!allowed.includes(entity)) return res.status(400).json({ error: 'Invalid entity' });
  await query(`DELETE FROM ${entity}`);
  res.json({ success: true });
});

export default router;
