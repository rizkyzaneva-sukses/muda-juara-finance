import express from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { runReconciliation } from '../services/reconService.js';

const router = express.Router();

// GET QRIS list
router.get('/', async (req, res) => {
  const { kementerian_id, jenis_transaksi_id, status, dari, sampai, search, page = 1, limit = 50 } = req.query;
  let conditions = [];
  let params = [];
  let i = 1;

  if (kementerian_id) { conditions.push(`q.kementerian_id = $${i++}`); params.push(kementerian_id); }
  if (jenis_transaksi_id) { conditions.push(`q.jenis_transaksi_id = $${i++}`); params.push(jenis_transaksi_id); }
  if (status) { conditions.push(`q.status = $${i++}`); params.push(status); }
  if (dari) { conditions.push(`DATE(q.created_date) >= $${i++}`); params.push(dari); }
  if (sampai) { conditions.push(`DATE(q.created_date) <= $${i++}`); params.push(sampai); }
  if (search) { conditions.push(`q.merchant_name ILIKE $${i++}`); params.push(`%${search}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const countRes = await query(`SELECT COUNT(*) FROM transaksi_qris q ${where}`, params);
  params.push(parseInt(limit), offset);

  const r = await query(`
    SELECT q.*, k.nama as kementerian_nama, jt.nama as jenis_nama, pe.nama as program_nama
    FROM transaksi_qris q
    LEFT JOIN kementerian k ON q.kementerian_id = k.id
    LEFT JOIN jenis_transaksi jt ON q.jenis_transaksi_id = jt.id
    LEFT JOIN program_event pe ON q.program_event_id = pe.id
    ${where}
    ORDER BY q.created_date DESC
    LIMIT $${i++} OFFSET $${i++}
  `, params);

  // Stats
  const stats = await query(`
    SELECT 
      COUNT(*) as total,
      SUM(amount) as total_amount,
      SUM(CASE WHEN status='matched' THEN 1 ELSE 0 END) as matched,
      SUM(CASE WHEN status='matched' THEN amount ELSE 0 END) as matched_amount,
      SUM(CASE WHEN status='cek_manual' THEN 1 ELSE 0 END) as cek_manual,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending
    FROM transaksi_qris
  `);

  res.json({ 
    data: r.rows, 
    total: parseInt(countRes.rows[0].count),
    stats: stats.rows[0]
  });
});

// PUT update QRIS classification
router.put('/:id', authMiddleware, async (req, res) => {
  const { kementerian_id, jenis_transaksi_id, program_event_id, status } = req.body;
  const r = await query(
    `UPDATE transaksi_qris SET kementerian_id=$1, jenis_transaksi_id=$2, program_event_id=$3, status=$4 WHERE id=$5 RETURNING *`,
    [kementerian_id || null, jenis_transaksi_id || null, program_event_id || null, status || 'pending', req.params.id]
  );
  res.json(r.rows[0]);
});

// PUT bulk update QRIS
router.put('/bulk/update', authMiddleware, async (req, res) => {
  const { ids, kementerian_id, jenis_transaksi_id, program_event_id } = req.body;
  await query(
    `UPDATE transaksi_qris SET kementerian_id=$1, jenis_transaksi_id=$2, program_event_id=$3 WHERE id = ANY($4)`,
    [kementerian_id || null, jenis_transaksi_id || null, program_event_id || null, ids]
  );
  res.json({ success: true });
});

// POST run reconciliation
router.post('/rekonsiliasi/run', authMiddleware, async (req, res) => {
  try {
    // Clear old logs first
    await query('DELETE FROM log_rekonsiliasi');
    const logs = await runReconciliation();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET reconciliation logs
router.get('/rekonsiliasi/logs', async (req, res) => {
  const r = await query('SELECT * FROM log_rekonsiliasi ORDER BY tanggal_rekonsiliasi DESC');
  res.json(r.rows);
});

export default router;
