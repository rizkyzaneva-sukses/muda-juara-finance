import express from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET migration status
router.get('/migration-status', requireAdmin, async (req, res) => {
  const result = await pool.query(`
    SELECT COUNT(*) as unassigned
    FROM transaksi
    WHERE status IN ('valid','koreksi','lainnya')
      AND program_event_id IS NULL
      AND kategori_pengeluaran_id IS NULL
      AND kementerian_id IS NOT NULL
  `);
  res.json({ unassigned: parseInt(result.rows[0].unassigned) });
});

// GET transactions for migration
router.get('/migration-data', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT t.*, k.nama as kementerian_nama, kl.nama as kategori_lama_nama,
      jt.nama as jenis_nama
    FROM transaksi t
    LEFT JOIN kementerian k ON t.kementerian_id = k.id
    LEFT JOIN jenis_transaksi jt ON t.jenis_transaksi_id = jt.id
    LEFT JOIN kategori_lainnya kl ON t.kategori_lainnya_id = kl.id
    WHERE t.program_event_id IS NULL AND t.kategori_pengeluaran_id IS NULL
      AND t.status IN ('valid','koreksi','lainnya')
    ORDER BY t.tanggal DESC
    LIMIT 200
  `);
  res.json(rows);
});

// POST auto migration
router.post('/migration-auto', requireAdmin, async (req, res) => {
  const peResult = await pool.query('SELECT id, nama FROM program_event');
  const kpResult = await pool.query('SELECT id, nama FROM kategori_pengeluaran');
  const txResult = await pool.query(`
    SELECT t.id, t.tipe, t.keterangan, kl.nama as kategori_lama
    FROM transaksi t
    LEFT JOIN kategori_lainnya kl ON t.kategori_lainnya_id = kl.id
    WHERE t.program_event_id IS NULL AND t.kategori_pengeluaran_id IS NULL
  `);

  const keywords_pe = {
    'bukber': 'Bukber', 'sertijab': 'Sertijab', 'umroh': 'Umroh',
    'cisarua': 'Cisarua', 'liqo': 'Liqo', 'wakaf': 'Wakaf'
  };
  const keywords_kp = {
    'konsumsi': 'Konsumsi', 'catering': 'Konsumsi', 'transport': 'Transportasi',
    'santunan': 'Santunan', 'venue': 'Sewa Venue', 'dp': 'Sewa Venue',
    'bagi hasil': 'Biaya Admin Bank', 'admin': 'Biaya Admin Bank',
    'pajak': 'Pajak', 'honorarium': 'Honorarium', 'seragam': 'Seragam'
  };

  let matched = 0;
  const preview = [];

  for (const tx of txResult.rows) {
    const text = (tx.keterangan + ' ' + (tx.kategori_lama || '')).toLowerCase();
    let peMatch = null;
    let kpMatch = null;

    // Try program_event match
    for (const [keyword, target] of Object.entries(keywords_pe)) {
      if (text.includes(keyword)) {
        peMatch = peResult.rows.find(p => p.nama.toLowerCase().includes(target.toLowerCase()));
        if (peMatch) break;
      }
    }

    // Try kategori_pengeluaran match for keluar
    if (tx.tipe === 'keluar') {
      for (const [keyword, target] of Object.entries(keywords_kp)) {
        if (text.includes(keyword)) {
          kpMatch = kpResult.rows.find(k => k.nama.toLowerCase().includes(target.toLowerCase()));
          if (kpMatch) break;
        }
      }
    }

    if (peMatch || kpMatch) {
      preview.push({
        id: tx.id,
        keterangan: tx.keterangan,
        pe_nama: peMatch?.nama,
        pe_id: peMatch?.id,
        kp_nama: kpMatch?.nama,
        kp_id: kpMatch?.id
      });
    }
  }

  res.json({ preview, total: txResult.rows.length, matchable: preview.length });
});

// POST confirm auto migration
router.post('/migration-confirm', requireAdmin, async (req, res) => {
  const { items } = req.body;
  let updated = 0;

  for (const item of items) {
    await pool.query(
      'UPDATE transaksi SET program_event_id=$1, kategori_pengeluaran_id=$2 WHERE id=$3',
      [item.pe_id || null, item.kp_id || null, item.id]
    );
    updated++;
  }

  res.json({ updated });
});

// POST seed dummy data
router.post('/seed', requireAdmin, async (req, res) => {
  try {
    // Get master data IDs
    const kemResult = await pool.query('SELECT id, kode FROM kementerian');
    const jenisResult = await pool.query('SELECT id, kode FROM jenis_transaksi');
    const kemMap = Object.fromEntries(kemResult.rows.map(r => [r.kode, r.id]));
    const jenisMap = Object.fromEntries(jenisResult.rows.map(r => [r.kode, r.id]));

    // Seed rekening
    await pool.query(`
      INSERT INTO rekening (nama, bank, nomor_rekening, saldo_awal) VALUES
      ('Rekening BCA Syariah Kabinet', 'BCA', '0590040242', 48663941),
      ('Rekening BSI Yayasan', 'BSI', '7188888172', 258168530)
      ON CONFLICT DO NOTHING
    `);

    // Seed program events
    const programs = [
      { nama: 'Bukber 2026', kem: '01', jenis: '11', target: 20000000 },
      { nama: 'Bukber 2026 - Sponsor', kem: '01', jenis: '10', target: 5000000 },
      { nama: 'Sertijab 2026', kem: '01', jenis: '11', target: 5000000 },
      { nama: 'Infaq Shubuh Rutin', kem: '04', jenis: '15', target: 0, is_rutin: true },
      { nama: 'Wakaf Masjid', kem: null, jenis: '16', target: 50000000 },
      { nama: 'Donasi Cisarua', kem: null, jenis: '13', target: 10000000 },
      { nama: 'Umroh MJ - Indra', kem: null, jenis: null, target: 255000000, deskripsi: 'Umroh Kabinet Kang Furqon' },
      { nama: 'Kegiatan Liqo Rutin', kem: '01', jenis: '17', target: 0, is_rutin: true },
    ];

    for (const p of programs) {
      const kemId = p.kem ? kemMap[p.kem] : null;
      const jenisId = p.jenis ? jenisMap[p.jenis] : null;
      await pool.query(
        `INSERT INTO program_event (nama, kementerian_id, jenis_transaksi_id, target_dana, is_rutin, deskripsi)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [p.nama, kemId, jenisId, p.target || 0, p.is_rutin || false, p.deskripsi || null]
      );
    }

    const peResult = await pool.query('SELECT id, nama FROM program_event');
    const peMap = Object.fromEntries(peResult.rows.map(r => [r.nama, r.id]));

    // Seed sample transactions
    const sampleTx = [
      { tanggal: '2026-02-25', keterangan: 'QRIS Pendaftaran Bukber', jumlah: 10415, tipe: 'masuk', sumber: 'QRIS', status: 'valid', kem: '04', jenis: '15', pe: 'Infaq Shubuh Rutin' },
      { tanggal: '2026-02-25', keterangan: 'QRIS Pendaftaran Bukber', jumlah: 20415, tipe: 'masuk', sumber: 'QRIS', status: 'valid', kem: '04', jenis: '15', pe: 'Infaq Shubuh Rutin' },
      { tanggal: '2026-02-25', keterangan: 'Transfer Pendaftaran SDM', jumlah: 30411, tipe: 'masuk', sumber: 'BCA', status: 'valid', kem: '01', jenis: '11', pe: 'Bukber 2026' },
      { tanggal: '2026-02-26', keterangan: 'TRF BATCH MYBB - Pembayaran Trx', jumlah: 785622, tipe: 'masuk', sumber: 'BCA', status: 'valid', kem: null, jenis: null, pe: null },
      { tanggal: '2026-02-26', keterangan: 'Liqo Pa Riza utk MJ', jumlah: 1000110, tipe: 'masuk', sumber: 'BCA', status: 'koreksi', kem: '01', jenis: '10', pe: 'Bukber 2026 - Sponsor' },
      { tanggal: '2026-02-18', keterangan: 'DP Venue Bukber MJ 2026', jumlah: 2000000, tipe: 'keluar', sumber: 'BCA', status: 'koreksi', kem: '01', jenis: null, kp: 'Sewa Venue / DP Venue', pe: 'Bukber 2026' },
      { tanggal: '2026-02-24', keterangan: 'Santunan Ibu Iin', jumlah: 1000000, tipe: 'keluar', sumber: 'BCA', status: 'koreksi', kem: '04', jenis: null, kp: 'Santunan', pe: null },
      { tanggal: '2026-02-10', keterangan: 'BY MUTASI 11 LEMBAR', jumlah: 55000, tipe: 'keluar', sumber: 'BCA', status: 'lainnya', kem: null, jenis: null, kp: 'Biaya Admin Bank', pe: null },
      { tanggal: '2026-02-28', keterangan: 'QRIS Unknown Code', jumlah: 300000, tipe: 'masuk', sumber: 'QRIS', status: 'cek_manual', kem: null, jenis: null, pe: null },
    ];

    const kpResult = await pool.query('SELECT id, nama FROM kategori_pengeluaran');
    const kpMap = Object.fromEntries(kpResult.rows.map(r => [r.nama, r.id]));

    for (const tx of sampleTx) {
      await pool.query(
        `INSERT INTO transaksi (tanggal, keterangan, jumlah, tipe, sumber, status, kementerian_id, jenis_transaksi_id, kategori_pengeluaran_id, program_event_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          tx.tanggal, tx.keterangan, tx.jumlah, tx.tipe, tx.sumber, tx.status,
          tx.kem ? kemMap[tx.kem] : null,
          tx.jenis ? jenisMap[tx.jenis] : null,
          tx.kp ? kpMap[tx.kp] : null,
          tx.pe ? peMap[tx.pe] : null
        ]
      );
    }

    res.json({ success: true, message: 'Data dummy berhasil dibuat' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Seed gagal', detail: err.message });
  }
});

// DELETE reset transactions only
router.delete('/reset-transaksi', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM log_rekonsiliasi');
  await pool.query('DELETE FROM transaksi_qris');
  await pool.query('DELETE FROM transaksi');
  res.json({ success: true });
});

// DELETE reset all
router.delete('/reset-all', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM log_rekonsiliasi');
  await pool.query('DELETE FROM transaksi_qris');
  await pool.query('DELETE FROM transaksi');
  await pool.query('DELETE FROM program_event');
  await pool.query('DELETE FROM kategori_pengeluaran');
  await pool.query('DELETE FROM jenis_transaksi');
  await pool.query('DELETE FROM kementerian');
  await pool.query('DELETE FROM rekening');
  res.json({ success: true });
});

// DELETE per entity
router.delete('/entity/:name', requireAdmin, async (req, res) => {
  const tableMap = {
    transaksi: 'transaksi',
    'transaksi-qris': 'transaksi_qris',
    'program-event': 'program_event',
    'kategori-pengeluaran': 'kategori_pengeluaran',
    'log-rekonsiliasi': 'log_rekonsiliasi',
    kementerian: 'kementerian',
    'jenis-transaksi': 'jenis_transaksi',
    rekening: 'rekening',
    'kategori-lainnya': 'kategori_lainnya'
  };

  const table = tableMap[req.params.name];
  if (!table) return res.status(400).json({ error: 'Entity not found' });

  await pool.query(`DELETE FROM ${table}`);
  res.json({ success: true, deleted: table });
});

export default router;
