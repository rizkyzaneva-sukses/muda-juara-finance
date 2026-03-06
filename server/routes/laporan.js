import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const { from, to, kementerian_id } = req.query;
    let where = ["t.status IN ('valid','koreksi','lainnya')"];
    let params = [];
    let i = 1;

    if (from) { where.push(`t.tanggal >= $${i++}`); params.push(from); }
    if (to) { where.push(`t.tanggal <= $${i++}`); params.push(to); }
    if (kementerian_id) { where.push(`t.kementerian_id = $${i++}`); params.push(kementerian_id); }

    const whereStr = 'WHERE ' + where.join(' AND ');

    const [totals, breakdown] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN tipe='masuk' THEN jumlah ELSE 0 END), 0) as total_masuk,
          COALESCE(SUM(CASE WHEN tipe='keluar' THEN jumlah ELSE 0 END), 0) as total_keluar,
          COUNT(*) as total_txn
        FROM transaksi t ${whereStr}
      `, params),
      pool.query(`
        SELECT
          k.id as kem_id, k.kode as kem_kode, k.nama as kem_nama,
          jt.id as jenis_id, jt.kode as jenis_kode, jt.nama as jenis_nama,
          pe.id as pe_id, pe.nama as pe_nama,
          kp.id as kp_id, kp.nama as kp_nama,
          t.tipe,
          COALESCE(SUM(CASE WHEN t.tipe='masuk' AND t.sumber='QRIS' THEN t.jumlah ELSE 0 END),0) as qris,
          COALESCE(SUM(CASE WHEN t.tipe='masuk' AND t.sumber IN ('BCA','BSI','manual') THEN t.jumlah ELSE 0 END),0) as transfer,
          COALESCE(SUM(CASE WHEN t.tipe='keluar' THEN t.jumlah ELSE 0 END),0) as pengeluaran,
          COUNT(CASE WHEN t.tipe='masuk' THEN 1 END) as txn_count
        FROM transaksi t
        LEFT JOIN kementerian k ON t.kementerian_id = k.id
        LEFT JOIN jenis_transaksi jt ON t.jenis_transaksi_id = jt.id
        LEFT JOIN program_event pe ON t.program_event_id = pe.id
        LEFT JOIN kategori_pengeluaran kp ON t.kategori_pengeluaran_id = kp.id
        ${whereStr}
        GROUP BY k.id,k.kode,k.nama,jt.id,jt.kode,jt.nama,pe.id,pe.nama,kp.id,kp.nama,t.tipe
        ORDER BY k.kode NULLS LAST, jt.kode NULLS LAST
      `, params)
    ]);

    res.json({
      total_masuk: parseInt(totals.rows[0].total_masuk),
      total_keluar: parseInt(totals.rows[0].total_keluar),
      total_txn: parseInt(totals.rows[0].total_txn),
      breakdown: breakdown.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
