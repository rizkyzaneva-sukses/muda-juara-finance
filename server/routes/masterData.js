import express from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ---- KEMENTERIAN ----
router.get('/kementerian', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM kementerian ORDER BY kode');
  res.json(rows);
});

router.post('/kementerian', requireAdmin, async (req, res) => {
  const { kode, nama } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO kementerian (kode, nama) VALUES ($1, $2) RETURNING *',
    [kode, nama]
  );
  res.json(rows[0]);
});

router.put('/kementerian/:id', requireAdmin, async (req, res) => {
  const { kode, nama } = req.body;
  const { rows } = await pool.query(
    'UPDATE kementerian SET kode=$1, nama=$2 WHERE id=$3 RETURNING *',
    [kode, nama, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/kementerian/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM kementerian WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ---- JENIS TRANSAKSI ----
router.get('/jenis-transaksi', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM jenis_transaksi ORDER BY kode');
  res.json(rows);
});

router.post('/jenis-transaksi', requireAdmin, async (req, res) => {
  const { kode, nama } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO jenis_transaksi (kode, nama) VALUES ($1, $2) RETURNING *',
    [kode, nama]
  );
  res.json(rows[0]);
});

router.put('/jenis-transaksi/:id', requireAdmin, async (req, res) => {
  const { kode, nama } = req.body;
  const { rows } = await pool.query(
    'UPDATE jenis_transaksi SET kode=$1, nama=$2 WHERE id=$3 RETURNING *',
    [kode, nama, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/jenis-transaksi/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM jenis_transaksi WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ---- KATEGORI PENGELUARAN ----
router.get('/kategori-pengeluaran', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM kategori_pengeluaran ORDER BY kelompok, nama');
  res.json(rows);
});

router.post('/kategori-pengeluaran', requireAdmin, async (req, res) => {
  const { nama, kelompok, deskripsi } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO kategori_pengeluaran (nama, kelompok, deskripsi) VALUES ($1, $2, $3) RETURNING *',
    [nama, kelompok, deskripsi]
  );
  res.json(rows[0]);
});

router.put('/kategori-pengeluaran/:id', requireAdmin, async (req, res) => {
  const { nama, kelompok, deskripsi } = req.body;
  const { rows } = await pool.query(
    'UPDATE kategori_pengeluaran SET nama=$1, kelompok=$2, deskripsi=$3 WHERE id=$4 RETURNING *',
    [nama, kelompok, deskripsi, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/kategori-pengeluaran/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM kategori_pengeluaran WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ---- PROGRAM & EVENT ----
router.get('/program-event', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT pe.*, k.nama as kementerian_nama, k.kode as kementerian_kode,
           jt.nama as jenis_nama, jt.kode as jenis_kode
    FROM program_event pe
    LEFT JOIN kementerian k ON pe.kementerian_id = k.id
    LEFT JOIN jenis_transaksi jt ON pe.jenis_transaksi_id = jt.id
    ORDER BY pe.nama
  `);
  res.json(rows);
});

router.post('/program-event', requireAdmin, async (req, res) => {
  const { nama, kementerian_id, jenis_transaksi_id, deskripsi, tanggal_mulai, tanggal_selesai, target_dana, is_rutin } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO program_event (nama, kementerian_id, jenis_transaksi_id, deskripsi, tanggal_mulai, tanggal_selesai, target_dana, is_rutin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [nama, kementerian_id || null, jenis_transaksi_id || null, deskripsi, tanggal_mulai || null, tanggal_selesai || null, target_dana || 0, is_rutin || false]
  );
  res.json(rows[0]);
});

router.put('/program-event/:id', requireAdmin, async (req, res) => {
  const { nama, kementerian_id, jenis_transaksi_id, deskripsi, tanggal_mulai, tanggal_selesai, target_dana, is_rutin } = req.body;
  const { rows } = await pool.query(
    `UPDATE program_event SET nama=$1, kementerian_id=$2, jenis_transaksi_id=$3, deskripsi=$4,
     tanggal_mulai=$5, tanggal_selesai=$6, target_dana=$7, is_rutin=$8 WHERE id=$9 RETURNING *`,
    [nama, kementerian_id || null, jenis_transaksi_id || null, deskripsi, tanggal_mulai || null, tanggal_selesai || null, target_dana || 0, is_rutin || false, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/program-event/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM program_event WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ---- REKENING ----
router.get('/rekening', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM rekening ORDER BY bank');
  res.json(rows);
});

router.post('/rekening', requireAdmin, async (req, res) => {
  const { nama, bank, nomor_rekening, saldo_awal } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO rekening (nama, bank, nomor_rekening, saldo_awal) VALUES ($1, $2, $3, $4) RETURNING *',
    [nama, bank, nomor_rekening, saldo_awal || 0]
  );
  res.json(rows[0]);
});

router.put('/rekening/:id', requireAdmin, async (req, res) => {
  const { nama, bank, nomor_rekening, saldo_awal } = req.body;
  const { rows } = await pool.query(
    'UPDATE rekening SET nama=$1, bank=$2, nomor_rekening=$3, saldo_awal=$4 WHERE id=$5 RETURNING *',
    [nama, bank, nomor_rekening, saldo_awal || 0, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/rekening/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM rekening WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
