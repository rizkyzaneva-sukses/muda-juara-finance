import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB } from './db/index.js';

import authRoutes from './routes/auth.js';
import masterDataRoutes from './routes/masterData.js';
import transaksiRoutes from './routes/transaksi.js';
import uploadRoutes from './routes/upload.js';
import qrisRoutes from './routes/qris.js';
import laporanRoutes from './routes/laporan.js';
import devRoutes from './routes/dev.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/master', masterDataRoutes);
app.use('/api/transaksi', transaksiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/qris', qrisRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/dev', devRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

start();
