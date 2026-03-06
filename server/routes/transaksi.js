import express from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET all transactions with filters
router.get('/', async (req, res) => {
  const { kementerian_id, jenis_transaksi_id, kategori_pengeluaran_id, program_event_id, status, sumber, tipe, search, from, to, page = 1, limit = 50 } = req.query;

  let where = [];
  let params = [];
  let i = 1;

  if (kementerian_id) { where.push(`t.kementerian_id = $${i++}`); params.push(kementerian_id); }
  if (jenis_transaksi_id) { where.push(`t.jenis_transaksi_id = $${i++}`); params.push(jenis_transaksi_id); }
  if (kategori_pengeluaran_id) { where.push(`t.kategori_pengeluaran_id = $${i++}`); params.push(kategori_pengeluaran_id); }
  if (program_event_id) { where.push(`t.program_event_id = $${i++}`); params.push(program_event_id); }
  if (status) { where.push(`t.status = $${i++}`); params.push(status); }
  if (sumber) { where.push(`t.sumber = $${i++}`); params.push(sumber); }
  if (tipe) { where.push(`t.tipe = $${i++}`); params.push(tipe); }
  if (from) { where.push(`t.tanggal >= $${i++}`); params.push(from); }
  if (to) { where.push(`t.tanggal <= $${i++}`); params.push(to); }
  if (search) { where.push(`t.keterangan ILIKE $${i++}`); params.push(`%${search}%`); }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const countQuery = `SELECT COUNT(*) FROM transaksi t ${whereStr}`;
  const dataQuery = `
    SELECT t.*,
      k.nama as kementerian_nama, k.kode as kementerian_kode,
      jt.nama as jenis_nama, jt.kode as jenis_kode,
      kp.nama as kategori_pengeluaran_nama, kp.kelompok as kategori_kelompok,
      pe.nama as program_event_nama
    FROM transaksi t
    LEFT JOIN kementerian k ON t.kementerian_id = k.id
    LEFT JOIN jenis_transaksi jt ON t.jenis_transaksi_id = jt.id
    LEFT JOIN kategori_pengeluaran kp ON t.kategori_pengeluaran_id = kp.id
    LEFT JOIN program_event pe ON t.program_event_id = pe.id
    ${whereStr}
    ORDER BY t.tanggal DESC, t.id DESC
    LIMIT $${i++} OFFSET $${i++}
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, params),
    pool.query(dataQuery, [...params, parseInt(limit), offset])
  ]);

  res.json({
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit)
  });
});

// GET dashboard summary
router.get('/summary', async (req, res) => {
  const { from, to } = req.query;
  let dateFilter = '';
  let params = [];

  if (from && to) {
    dateFilter = 'WHERE tanggal BETWEEN $1 AND $2';
    params = [from, to];
  }

  // Saldo rekening
  const rekeningQuery = await pool.query(`
    SELECT r.id, r.nama, r.bank, r.saldo_awal,
      COALESCE(SUM(CASE WHEN t.tipe='masuk' AND t.status IN ('valid','koreksi','lainnya') THEN t.jumlah ELSE 0 END), 0) as total_masuk,
      COALESCE(SUM(CASE WHEN t.tipe='keluar' AND t.status IN ('valid','koreksi','lainnya') THEN t.jumlah ELSE 0 END), 0) as total_keluar
    FROM rekening r
    LEFT JOIN transaksi t ON t.sumber = r.bank
    GROUP BY r.id
  `);

  // Total masuk/keluar periode
  const totalsQuery = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN tipe='masuk' AND status IN ('valid','koreksi','lainnya') THEN jumlah ELSE 0 END), 0) as total_masuk,
      COALESCE(SUM(CASE WHEN tipe='keluar' AND status IN ('valid','koreksi','lainnya') THEN jumlah ELSE 0 END), 0) as total_keluar,
      COUNT(CASE WHEN tipe='masuk' AND status IN ('valid','koreksi','lainnya') THEN 1 END) as count_masuk,
      COUNT(CASE WHEN status='cek_manual' THEN 1 END) as count_cek_manual
    FROM transaksi ${dateFilter}
  `, params);

  // Per kementerian breakdown
  const kemQuery = await pool.query(`
    SELECT
      k.id, k.kode, k.nama,
      COALESCE(SUM(CASE WHEN t.tipe='masuk' AND t.sumber='QRIS' AND t.status IN ('valid','koreksi') THEN t.jumlah ELSE 0 END), 0) as qris,
      COALESCE(SUM(CASE WHEN t.tipe='masuk' AND t.sumber IN ('BCA','BSI') AND t.status IN ('valid','koreksi','lainnya') THEN t.jumlah ELSE 0 END), 0) as transfer,
      COALESCE(SUM(CASE WHEN t.tipe='keluar' AND t.status IN ('valid','koreksi','lainnya') THEN t.jumlah ELSE 0 END), 0) as pengeluaran,
      COUNT(CASE WHEN t.tipe='masuk' THEN 1 END) as txn_count
    FROM kementerian k
    LEFT JOIN transaksi t ON t.kementerian_id = k.id
    GROUP BY k.id, k.kode, k.nama
    HAVING SUM(t.jumlah) > 0 OR COUNT(t.id) > 0
    ORDER BY k.kode
  `);

  // QRIS stats
  const qrisQuery = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN tq.status='matched' THEN tq.amount ELSE 0 END), 0) as total_matched,
      COALESCE(SUM(tq.amount), 0) as total_all,
      COUNT(CASE WHEN tq.status='pending' THEN 1 END) as count_pending,
      COUNT(CASE WHEN tq.status='cek_manual' THEN 1 END) as count_cek_manual
    FROM transaksi_qris tq
  `);

  // Recent transactions
  const recentQuery = await pool.query(`
    SELECT t.*,
      k.nama as kementerian_nama,
      jt.nama as jenis_nama,
      kp.nama as kategori_pengeluaran_nama,
      pe.nama as program_event_nama
    FROM transaksi t
    LEFT JOIN kementerian k ON t.kementerian_id = k.id
    LEFT JOIN jenis_transaksi jt ON t.jenis_transaksi_id = jt.id
    LEFT JOIN kategori_pengeluaran kp ON t.kategori_pengeluaran_id = kp.id
    LEFT JOIN program_event pe ON t.program_event_id = pe.id
    ORDER BY t.tanggal DESC, t.id DESC
    LIMIT 10
  `);

  const rekening = rekeningQuery.rows;
  const saldoBCA = rekening.find(r => r.bank === 'BCA');
  const saldoBSI = rekening.find(r => r.bank === 'BSI');

  const calcSaldo = (r) => r ? (parseInt(r.saldo_awal) + parseInt(r.total_masuk) - parseInt(r.total_keluar)) : 0;

  res.json({
    saldo: {
      bca: calcSaldo(saldoBCA),
      bsi: calcSaldo(saldoBSI),
      total: calcSaldo(saldoBCA) + calcSaldo(saldoBSI)
    },
    totals: totalsQuery.rows[0],
    kementerian: kemQuery.rows,
    qris: qrisQuery.rows[0],
    recent: recentQuery.rows
  });
});

// GET detail per kementerian with jenis & program breakdown
router.get('/breakdown', async (req, res) => {
  const { from, to } = req.query;
  let dateFilter = from && to ? `AND t.tanggal BETWEEN '${from}' AND '${to}'` : '';

  const query = `
    SELECT
      k.id as kem_id, k.kode as kem_kode, k.nama as kem_nama,
      jt.id as jenis_id, jt.kode as jenis_kode, jt.nama as jenis_nama,
      pe.id as pe_id, pe.nama as pe_nama, pe.is_rutin,
      kp.id as kp_id, kp.nama as kp_nama, kp.kelompok as kp_kelompok,
      t.tipe,
      COALESCE(SUM(CASE WHEN t.tipe='masuk' AND t.sumber='QRIS' THEN t.jumlah ELSE 0 END), 0) as qris,
      COALESCE(SUM(CASE WHEN t.tipe='masuk' AND t.sumber IN ('BCA','BSI','manual') THEN t.jumlah ELSE 0 END), 0) as transfer,
      COALESCE(SUM(CASE WHEN t.tipe='keluar' THEN t.jumlah ELSE 0 END), 0) as pengeluaran,
      COUNT(CASE WHEN t.tipe='masuk' THEN 1 END) as txn_count
    FROM transaksi t
    LEFT JOIN kementerian k ON t.kementerian_id = k.id
    LEFT JOIN jenis_transaksi jt ON t.jenis_transaksi_id = jt.id
    LEFT JOIN program_event pe ON t.program_event_id = pe.id
    LEFT JOIN kategori_pengeluaran kp ON t.kategori_pengeluaran_id = kp.id
    WHERE t.status IN ('valid', 'koreksi', 'lainnya') ${dateFilter}
    GROUP BY k.id, k.kode, k.nama, jt.id, jt.kode, jt.nama, pe.id, pe.nama, pe.is_rutin, kp.id, kp.nama, kp.kelompok, t.tipe
    ORDER BY k.kode NULLS LAST, jt.kode NULLS LAST, pe.nama NULLS LAST
  `;

  const { rows } = await pool.query(query);
  res.json(rows);
});

// POST create manual transaction
router.post('/', requireAdmin, async (req, res) => {
  const { tanggal, keterangan, jumlah, tipe, sumber, status, kementerian_id, jenis_transaksi_id, kategori_pengeluaran_id, program_event_id } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO transaksi (tanggal, keterangan, jumlah, tipe, sumber, status, kementerian_id, jenis_transaksi_id, kategori_pengeluaran_id, program_event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [tanggal, keterangan, jumlah, tipe, sumber || 'manual', status || 'valid', kementerian_id || null, jenis_transaksi_id || null, kategori_pengeluaran_id || null, program_event_id || null]
  );
  res.json(rows[0]);
});

// PUT update transaction (koreksi)
router.put('/:id', requireAdmin, async (req, res) => {
  const { kementerian_id, jenis_transaksi_id, kategori_pengeluaran_id, program_event_id, status, keterangan } = req.body;

  const newStatus = status || (kementerian_id ? 'koreksi' : 'lainnya');

  const { rows } = await pool.query(
    `UPDATE transaksi SET
      kementerian_id=$1, jenis_transaksi_id=$2, kategori_pengeluaran_id=$3,
      program_event_id=$4, status=$5, keterangan=COALESCE($6, keterangan)
     WHERE id=$7 RETURNING *`,
    [kementerian_id || null, jenis_transaksi_id || null, kategori_pengeluaran_id || null, program_event_id || null, newStatus, keterangan, req.params.id]
  );
  res.json(rows[0]);
});

// PUT bulk update
router.put('/bulk/update', requireAdmin, async (req, res) => {
  const { ids, kementerian_id, jenis_transaksi_id, kategori_pengeluaran_id, program_event_id } = req.body;

  if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });

  const newStatus = kementerian_id ? 'koreksi' : 'lainnya';

  await pool.query(
    `UPDATE transaksi SET kementerian_id=$1, jenis_transaksi_id=$2, kategori_pengeluaran_id=$3, program_event_id=$4, status=$5
     WHERE id = ANY($6)`,
    [kementerian_id || null, jenis_transaksi_id || null, kategori_pengeluaran_id || null, program_event_id || null, newStatus, ids]
  );
  res.json({ success: true, updated: ids.length });
});

// DELETE transaction
router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM transaksi WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
