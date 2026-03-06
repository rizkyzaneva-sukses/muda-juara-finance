import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { autoMapQRIS, checkDuplicateQRIS } from '../services/qrisService.js';
import { parseBankStatementPDF } from '../services/openaiService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Upload QRIS Excel
router.post('/qris', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet);

    const rows = raw.map(r => ({
      created_date: r['CREATED_DATE'] || r['created_date'],
      merchant_name: r['MERCHANT_NAME'] || r['merchant_name'],
      merchant_id: r['MERCHANT_ID'] || r['merchant_id'],
      tid: r['TID'] || r['tid'],
      amount: parseInt(String(r['AMOUNT'] || r['amount'] || '0').replace(/[^0-9]/g, ''))
    })).filter(r => r.amount > 0);

    const mapped = await autoMapQRIS(rows);
    const withDupCheck = await checkDuplicateQRIS(mapped);

    res.json({ preview: withDupCheck, total: withDupCheck.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save QRIS after preview
router.post('/qris/save', authMiddleware, async (req, res) => {
  const { rows } = req.body;
  let saved = 0;
  for (const row of rows) {
    if (row.isDuplicate) continue;
    await query(
      `INSERT INTO transaksi_qris (created_date, merchant_name, merchant_id, tid, amount, kementerian_id, jenis_transaksi_id, program_event_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [row.created_date, row.merchant_name, row.merchant_id, row.tid, row.amount,
       row.kementerian_id, row.jenis_transaksi_id, row.program_event_id || null, row.status]
    );
    saved++;
  }
  res.json({ saved });
});

// Upload Bank Statement PDF
router.post('/mutasi', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { sumber } = req.body; // 'BCA' or 'BSI'
    const base64 = req.file.buffer.toString('base64');
    const parsed = await parseBankStatementPDF(base64);
    
    // Check duplicates
    const withDupCheck = [];
    for (const t of parsed) {
      const existing = await query(
        `SELECT id FROM transaksi WHERE tanggal=$1 AND jumlah=$2 AND tipe=$3 AND sumber=$4 AND keterangan=$5`,
        [t.tanggal, t.jumlah, t.tipe, sumber, t.keterangan]
      );
      withDupCheck.push({ ...t, sumber, isDuplicate: existing.rows.length > 0 });
    }

    res.json({ preview: withDupCheck, total: withDupCheck.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save mutasi after preview
router.post('/mutasi/save', authMiddleware, async (req, res) => {
  const { rows } = req.body;
  let saved = 0;
  for (const row of rows) {
    if (row.isDuplicate || row._deleted) continue;
    await query(
      `INSERT INTO transaksi (tanggal, keterangan, jumlah, tipe, sumber, status, kementerian_id, jenis_transaksi_id, kategori_pengeluaran_id, program_event_id, raw_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [row.tanggal, row.keterangan, row.jumlah, row.tipe, row.sumber, row.status,
       row.kementerian_id || null, row.jenis_transaksi_id || null,
       row.kategori_pengeluaran_id || null, row.program_event_id || null,
       JSON.stringify(row.raw_data || {})]
    );
    saved++;
  }
  res.json({ saved });
});

export default router;
