import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || true,
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));

let pool = null;
let dbInitialized = false;

function initPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[Database] DATABASE_URL not provided. Operating in offline/browser-storage fallback mode.');
    return null;
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  const sslSetting = process.env.PGSSL === 'true' || (!isLocal && process.env.PGSSL !== 'false')
    ? { rejectUnauthorized: false }
    : false;

  const newPool = new Pool({
    connectionString,
    ssl: sslSetting
  });

  newPool.on('error', (err) => {
    console.error('[Database Pool Error]:', err.message);
  });

  return newPool;
}

pool = initPool();

async function ensureTable() {
  if (!pool || dbInitialized) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS routine_days (
      day_date DATE PRIMARY KEY,
      checks JSONB NOT NULL DEFAULT '{}'::jsonb,
      notes TEXT NOT NULL DEFAULT '',
      completed_minutes JSONB NOT NULL DEFAULT '{}'::jsonb,
      alarms JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    dbInitialized = true;
    console.log('[Database] Connected and schema verified.');
  } catch (error) {
    console.error('[Database Init Error]:', error.message);
  }
}

app.get('/api/health', async (_req, res) => {
  if (!pool) {
    return res.json({
      status: 'ok',
      database: 'not_configured',
      message: 'Running in browser-storage fallback mode until DATABASE_URL is provided.'
    });
  }
  try {
    await ensureTable();
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return res.status(503).json({ status: 'degraded', database: 'unavailable', error: error.message });
  }
});

app.get('/api/days/:date', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database is not configured. Set DATABASE_URL in server/.env.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.date)) {
    return res.status(400).json({ error: 'Date must use YYYY-MM-DD format.' });
  }
  try {
    await ensureTable();
    const result = await pool.query(
      'SELECT day_date, checks, notes, completed_minutes, alarms, updated_at FROM routine_days WHERE day_date = $1',
      [req.params.date]
    );
    return res.json(result.rows[0] || {
      day_date: req.params.date,
      checks: {},
      notes: '',
      completed_minutes: {},
      alarms: {}
    });
  } catch (error) {
    console.error('Read day failed:', error.message);
    return res.status(500).json({ error: 'Unable to read routine data.' });
  }
});

app.put('/api/days/:date', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database is not configured. Set DATABASE_URL in server/.env.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.date)) {
    return res.status(400).json({ error: 'Date must use YYYY-MM-DD format.' });
  }
  const { checks = {}, notes = '', completed_minutes = {}, alarms = {} } = req.body || {};
  if (typeof checks !== 'object' || typeof completed_minutes !== 'object' || typeof alarms !== 'object' || typeof notes !== 'string') {
    return res.status(400).json({ error: 'Invalid routine payload.' });
  }
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO routine_days (day_date, checks, notes, completed_minutes, alarms, updated_at)
       VALUES ($1, $2::jsonb, $3, $4::jsonb, $5::jsonb, NOW())
       ON CONFLICT (day_date) DO UPDATE SET checks=EXCLUDED.checks, notes=EXCLUDED.notes,
         completed_minutes=EXCLUDED.completed_minutes, alarms=EXCLUDED.alarms, updated_at=NOW()
       RETURNING day_date, checks, notes, completed_minutes, alarms, updated_at`,
      [req.params.date, JSON.stringify(checks), notes.slice(0, 10000), JSON.stringify(completed_minutes), JSON.stringify(alarms)]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Save day failed:', error.message);
    return res.status(500).json({ error: 'Unable to save routine data.' });
  }
});

// Serve frontend build in production / single-service deployment
app.use(express.static(clientDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return next();
});

async function start() {
  if (pool) {
    await ensureTable();
  }
  app.listen(port, () => {
    console.log(`Routine API & WebApp listening on http://localhost:${port}`);
  });
}

start().catch(error => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
