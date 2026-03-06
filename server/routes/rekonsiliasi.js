import express from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET QRIS list with filters
router.get('/qris', async (req, res) => {
  const { status, kementerian_id, jenis_id, search, from, to, page = 1, limit = 50 } = req.query;

  let where = [];
  let params = [];
  let i = 1;

  if (status) { where.push(`tq.status = $${i++}`); params.push(status); }
  if (kementerian_id) { where.push(`tq.kementerian_id = $${i++}`); params.push(kementerian_id); }
  if (jenis_id) { where.push(`tq.jenis_transaksi_id = $${i++}`); params.push(jenis_id); }
  if (from) { where.push(`tq.created_date >= $${i++}`); params.push(from); }
  if (to) { where.push(`tq.created_date <= $${i++}`); params.push(to); }
  if (search) { where.push(`tq.merchant_name ILIKE $${i++}`); params.push(`%${search}%`); }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows } = await pool.query(`
    SELECT tq.*,
      k.nama as kementerian_nama, k.kode as kementerian_kode,
      jt.nama as jenis_nama, jt.kode as jenis_kode,
      pe.nama as program_event_nama
    FROM transaksi_qris tq
    LEFT JOIN kementerian k ON tq.kementerian_id = k.id
    LEFT JOIN jenis_transaksi jt ON tq.jenis_transaksi_id = jt.id
    LEFT JOIN program_event pe ON tq.program_event_id = pe.id
    ${whereStr}
    ORDER BY tq.created_date DESC
    LIMIT $${i++} OFFSET $${i++}
  `, [...params, parseInt(limit), offset]);

  const countResult = await pool.query(`SELECT COUNT(*) FROM transaksi_qris tq ${whereStr}`, params);

  res.json({ data: rows, total: parseInt(countResult.rows[0].count) });
});

// GET QRIS stats
router.get('/qris/stats', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(amount), 0) as total_all,
      COALESCE(SUM(CASE WHEN status='matched' THEN amount ELSE 0 END), 0) as total_matched,
      COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END), 0) as total_pending,
      COUNT(*) as count_all,
      COUNT(CASE WHEN status='matched' THEN 1 END) as count_matched,
      COUNT(CASE WHEN status='pending' THEN 1 END) as count_pending,
      COUNT(CASE WHEN status='cek_manual' THEN 1 END) as count_cek_manual
    FROM transaksi_qris
  `);
  res.json(rows[0]);
});

// Run reconciliation
router.post('/run', requireAdmin, async (req, res) => {
  try {
    // Get all pending QRIS grouped by date
    const qrisResult = await pool.query(`
      SELECT DATE(created_date) as tanggal, SUM(amount) as total_qris
      FROM transaksi_qris
      WHERE status = 'pending'
      GROUP BY DATE(created_date)
      ORDER BY tanggal
    `);

    // Get TRF BATCH MYBB transactions from BCA
    const bcaResult = await pool.query(`
      SELECT tanggal, SUM(jumlah) as total_cair, keterangan
      FROM transaksi
      WHERE sumber = 'BCA'
        AND tipe = 'masuk'
        AND keterangan ILIKE '%TRF BATCH MYBB%'
        AND status = 'valid'
      GROUP BY tanggal, keterangan
      ORDER BY tanggal
    `);

    const logs = [];

    for (const qrisDay of qrisResult.rows) {
      // Find matching BCA settlement (same day or +1 day)
      const matchDate1 = qrisDay.tanggal;
      const matchDate2 = new Date(qrisDay.tanggal);
      matchDate2.setDate(matchDate2.getDate() + 1);
      const matchDate2Str = matchDate2.toISOString().split('T')[0];

      const bcaMatch = bcaResult.rows.find(b =>
        b.tanggal === matchDate1 || b.tanggal === matchDate2Str
      );

      if (bcaMatch) {
        const selisih = parseInt(qrisDay.total_qris) - parseInt(bcaMatch.total_cair);
        const pct = ((selisih / parseInt(qrisDay.total_qris)) * 100).toFixed(2);

        // Mark QRIS as matched
        await pool.query(`
          UPDATE transaksi_qris
          SET status = 'matched'
          WHERE DATE(created_date) = $1 AND status = 'pending'
        `, [qrisDay.tanggal]);

        // Save reconciliation log
        await pool.query(`
          INSERT INTO log_rekonsiliasi (tanggal_rekonsiliasi, sumber, total_qris, total_cair_bank, selisih, persentase_biaya)
          VALUES ($1, 'QRIS-BCA', $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [qrisDay.tanggal, qrisDay.total_qris, bcaMatch.total_cair, selisih, pct]);

        logs.push({
          tanggal: qrisDay.tanggal,
          total_qris: qrisDay.total_qris,
          total_cair: bcaMatch.total_cair,
          selisih,
          pct,
          status: 'matched'
        });
      } else {
        logs.push({
          tanggal: qrisDay.tanggal,
          total_qris: qrisDay.total_qris,
          total_cair: 0,
          selisih: qrisDay.total_qris,
          status: 'unmatched'
        });
      }
    }

    res.json({ logs, total_processed: qrisResult.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Rekonsiliasi gagal', detail: err.message });
  }
});

// GET reconciliation logs
router.get('/logs', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM log_rekonsiliasi ORDER BY tanggal_rekonsiliasi DESC LIMIT 100'
  );
  res.json(rows);
});

// Update QRIS row (inline edit)
router.put('/qris/:id', requireAdmin, async (req, res) => {
  const { kementerian_id, jenis_transaksi_id, program_event_id, status } = req.body;
  const { rows } = await pool.query(
    `UPDATE transaksi_qris SET kementerian_id=$1, jenis_transaksi_id=$2, program_event_id=$3, status=COALESCE($4, status)
     WHERE id=$5 RETURNING *`,
    [kementerian_id || null, jenis_transaksi_id || null, program_event_id || null, status, req.params.id]
  );
  res.json(rows[0]);
});

// Bulk update QRIS
router.put('/qris/bulk/update', requireAdmin, async (req, res) => {
  const { ids, kementerian_id, jenis_transaksi_id, program_event_id } = req.body;
  await pool.query(
    'UPDATE transaksi_qris SET kementerian_id=$1, jenis_transaksi_id=$2, program_event_id=$3 WHERE id = ANY($4)',
    [kementerian_id || null, jenis_transaksi_id || null, program_event_id || null, ids]
  );
  res.json({ success: true, updated: ids.length });
});

export default router;
