import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'daymark-super-pod-secret-2026';

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
    ssl: sslSetting,
    connectionTimeoutMillis: 5000
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
    // 1. Legacy/Guest table
    await pool.query(`CREATE TABLE IF NOT EXISTS routine_days (
      day_date DATE PRIMARY KEY,
      checks JSONB NOT NULL DEFAULT '{}'::jsonb,
      notes TEXT NOT NULL DEFAULT '',
      completed_minutes JSONB NOT NULL DEFAULT '{}'::jsonb,
      alarms JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    // 2. Settings table
    await pool.query(`CREATE TABLE IF NOT EXISTS routine_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    // 3. Users table (JWT Authentication)
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#315b45',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // 4. Study Groups (Max 5 members)
    await pool.query(`CREATE TABLE IF NOT EXISTS study_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      invite_code VARCHAR(8) UNIQUE NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // 5. Group Memberships (Many-to-Many)
    await pool.query(`CREATE TABLE IF NOT EXISTS group_members (
      group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (group_id, user_id)
    )`);

    // 6. User-specific Routine Days (Account tracking)
    await pool.query(`CREATE TABLE IF NOT EXISTS user_routine_days (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      day_date DATE NOT NULL,
      checks JSONB NOT NULL DEFAULT '{}'::jsonb,
      notes TEXT NOT NULL DEFAULT '',
      completed_minutes JSONB NOT NULL DEFAULT '{}'::jsonb,
      alarms JSONB NOT NULL DEFAULT '{}'::jsonb,
      points INT DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, day_date)
    )`);

    // 7. Live Presence & Activity
    await pool.query(`CREATE TABLE IF NOT EXISTS user_presence (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      is_studying BOOLEAN DEFAULT false,
      current_block_title TEXT DEFAULT '',
      session_started_at TIMESTAMPTZ,
      last_seen TIMESTAMPTZ DEFAULT NOW()
    )`);

    // 8. Group Nudges
    await pool.query(`CREATE TABLE IF NOT EXISTS group_nudges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
      from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      acknowledged BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`ALTER TABLE group_nudges ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;`);

    dbInitialized = true;
    console.log('[Database] Connected and schema verified.');
  } catch (error) {
    console.error('[Database Init Error]:', error.message);
  }
}

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function optionalAuth(req, _res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

const avatarColors = ['#315b45', '#4c6c86', '#896b4d', '#77638c', '#9a6661', '#3b7a57', '#5b6b8c'];

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Health Check
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

// ================= AUTH ENDPOINTS =================
app.post('/api/auth/register', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const { username, password } = req.body || {};
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const cleanUsername = username.trim();
  try {
    await ensureTable();
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const color = avatarColors[Math.abs(cleanUsername.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % avatarColors.length];

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, avatar_color)
       VALUES ($1, $2, $3)
       RETURNING id, username, avatar_color`,
      [cleanUsername, passwordHash, color]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token, user });
  } catch (error) {
    console.error('Register failed:', error.message);
    return res.status(500).json({ error: 'Failed to create user account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    await ensureTable();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar_color: user.avatar_color
      }
    });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  try {
    await ensureTable();
    const result = await pool.query('SELECT id, username, avatar_color FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Fetch me failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// ================= STUDY PODS (GROUPS) ENDPOINTS =================
// List user's groups
app.get('/api/groups', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT g.id, g.name, g.invite_code, g.created_at, g.created_by,
         (SELECT count(*)::int FROM group_members WHERE group_id = g.id) as member_count
       FROM study_groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('List groups failed:', error.message);
    return res.status(500).json({ error: 'Failed to list study pods.' });
  }
});

// Create new group (User is added as first member)
app.post('/api/groups', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Pod name must be at least 2 characters.' });
  }

  const cleanName = name.trim().slice(0, 40);
  try {
    await ensureTable();

    let code = generateInviteCode();
    // ensure unique code
    let tries = 0;
    while (tries < 5) {
      const check = await pool.query('SELECT id FROM study_groups WHERE invite_code = $1', [code]);
      if (check.rows.length === 0) break;
      code = generateInviteCode();
      tries++;
    }

    const groupResult = await pool.query(
      `INSERT INTO study_groups (name, invite_code, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, invite_code, created_at`,
      [cleanName, code, req.user.id]
    );
    const group = groupResult.rows[0];

    // Add creator to group_members
    await pool.query(
      `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)`,
      [group.id, req.user.id]
    );

    return res.json({ ...group, member_count: 1 });
  } catch (error) {
    console.error('Create group failed:', error.message);
    return res.status(500).json({ error: 'Failed to create study pod.' });
  }
});

// Join group by invite code (Max 5 members)
app.post('/api/groups/join', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const { invite_code } = req.body || {};
  if (!invite_code || typeof invite_code !== 'string') {
    return res.status(400).json({ error: 'Invite code is required.' });
  }

  const code = invite_code.trim().toUpperCase();
  try {
    await ensureTable();
    const groupResult = await pool.query('SELECT id, name, invite_code FROM study_groups WHERE invite_code = $1', [code]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: `No study pod found with invite code "${code}".` });
    }

    const group = groupResult.rows[0];

    // Check member count (Max 5)
    const countResult = await pool.query('SELECT count(*)::int as count FROM group_members WHERE group_id = $1', [group.id]);
    const currentCount = countResult.rows[0].count;
    if (currentCount >= 5) {
      return res.status(400).json({ error: 'This study pod is full (maximum 5 members reached).' });
    }

    // Check if user is already a member
    const memberCheck = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [group.id, req.user.id]);
    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You are already a member of this study pod.' });
    }

    await pool.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [group.id, req.user.id]);
    return res.json({ ...group, member_count: currentCount + 1 });
  } catch (error) {
    console.error('Join group failed:', error.message);
    return res.status(500).json({ error: 'Failed to join study pod.' });
  }
});

// Get group members & live daily performance
app.get('/api/groups/:id/members', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const groupId = req.params.id;

  try {
    await ensureTable();
    // Verify user is in group
    const memberCheck = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, req.user.id]);
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this study pod.' });
    }

    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_color, gm.joined_at,
         COALESCE(p.is_studying, false) as is_studying,
         COALESCE(p.current_block_title, '') as current_block_title,
         p.session_started_at,
         p.last_seen,
         COALESCE(d.completed_minutes, '{}'::jsonb) as today_completed_minutes,
         COALESCE(d.checks, '{}'::jsonb) as today_checks,
         COALESCE(d.notes, '') as today_notes
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       LEFT JOIN user_presence p ON p.user_id = u.id
       LEFT JOIN user_routine_days d ON d.user_id = u.id AND d.day_date = CURRENT_DATE
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Fetch group members failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch pod members.' });
  }
});

// Leave group
app.post('/api/groups/:id/leave', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  try {
    await ensureTable();
    await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Leave group failed:', error.message);
    return res.status(500).json({ error: 'Failed to leave pod.' });
  }
});

// ================= GRIND POINTS SCORING HELPER =================
function calculateGrindPoints(completedMinutesObj = {}, checksObj = {}, notes = '') {
  const totalMins = Object.values(completedMinutesObj).reduce((a, b) => a + Number(b || 0), 0);
  const habitsDone = Object.values(checksObj).filter(Boolean).length;

  // 1. Focus time: 10 GP per 30 minutes
  let points = Math.floor(totalMins / 30) * 10;

  // 2. Minimum goal milestone: 6+ hours (360 mins) => +30 GP
  if (totalMins >= 360) points += 30;

  // 3. Full day monster goal: 10+ hours (600 mins) => additional +30 GP (+60 total)
  if (totalMins >= 600) points += 30;

  // 4. Habits: 5 GP per checked habit
  points += habitsDone * 5;

  // 5. Daily Ship log bonus: +15 GP if meaningful notes logged (>= 10 chars)
  if (typeof notes === 'string' && notes.trim().length >= 10) {
    points += 15;
  }

  return { points, totalMins, habitsDone };
}

// ================= LIVE PRESENCE & HEARTBEAT =================
app.post('/api/presence/heartbeat', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const { is_studying = false, current_block_title = '' } = req.body || {};
  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO user_presence (user_id, is_studying, current_block_title, session_started_at, last_seen)
       VALUES ($1, $2, $3, CASE WHEN $2 THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         is_studying = EXCLUDED.is_studying,
         current_block_title = EXCLUDED.current_block_title,
         session_started_at = CASE
           WHEN EXCLUDED.is_studying AND NOT user_presence.is_studying THEN NOW()
           WHEN NOT EXCLUDED.is_studying THEN NULL
           ELSE user_presence.session_started_at
         END,
         last_seen = NOW()`,
      [req.user.id, Boolean(is_studying), String(current_block_title).slice(0, 50)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error.message);
    return res.status(500).json({ error: 'Failed to update presence.' });
  }
});

// ================= NUDGE SYSTEM =================
app.post('/api/groups/:id/nudge', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const groupId = req.params.id;
  const { to_user_id } = req.body || {};
  if (!to_user_id) return res.status(400).json({ error: 'Recipient is required.' });
  if (to_user_id === req.user.id) return res.status(400).json({ error: 'You cannot nudge yourself.' });

  try {
    await ensureTable();
    // Verify both are in the group
    const check = await pool.query(
      `SELECT count(*)::int as count FROM group_members WHERE group_id = $1 AND user_id IN ($2, $3)`,
      [groupId, req.user.id, to_user_id]
    );
    if (check.rows[0].count < 2) {
      return res.status(403).json({ error: 'Both users must be members of the pod.' });
    }

    // Rate limit: 1 nudge per user pair per 5 minutes
    const recent = await pool.query(
      `SELECT created_at FROM group_nudges 
       WHERE group_id = $1 AND from_user_id = $2 AND to_user_id = $3 
       AND created_at > NOW() - INTERVAL '5 minutes'`,
      [groupId, req.user.id, to_user_id]
    );
    if (recent.rows.length > 0) {
      return res.status(429).json({ error: 'You recently nudged this friend. Please wait 5 minutes before nudging again.' });
    }

    await pool.query(
      `INSERT INTO group_nudges (group_id, from_user_id, to_user_id) VALUES ($1, $2, $3)`,
      [groupId, req.user.id, to_user_id]
    );

    return res.json({ success: true, message: 'Nudge sent successfully!' });
  } catch (error) {
    console.error('Nudge error:', error.message);
    return res.status(500).json({ error: 'Failed to send nudge.' });
  }
});

app.get('/api/nudges/unread', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT n.id, n.group_id, g.name as group_name, u.username as from_username, n.created_at
       FROM group_nudges n
       JOIN users u ON u.id = n.from_user_id
       JOIN study_groups g ON g.id = n.group_id
       WHERE n.to_user_id = $1 AND n.acknowledged = false AND n.created_at > NOW() - INTERVAL '24 hours'
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );

    if (result.rows.length > 0) {
      const ids = result.rows.map(r => r.id);
      await pool.query(`UPDATE group_nudges SET acknowledged = true WHERE id = ANY($1::uuid[])`, [ids]);
    }

    return res.json(result.rows);
  } catch (error) {
    console.error('Fetch nudges error:', error.message);
    return res.status(500).json({ error: 'Failed to read nudges.' });
  }
});

// ================= COMPETITIVE LEADERBOARD & 1:00 AM RECAP =================
app.get('/api/groups/:id/leaderboard', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const groupId = req.params.id;
  const targetDate = req.query.date || new Date().toISOString().slice(0, 10);

  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_color,
         COALESCE(p.is_studying, false) as is_studying,
         COALESCE(p.current_block_title, '') as current_block_title,
         COALESCE(d.completed_minutes, '{}'::jsonb) as completed_minutes,
         COALESCE(d.checks, '{}'::jsonb) as checks,
         COALESCE(d.notes, '') as notes
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       LEFT JOIN user_presence p ON p.user_id = u.id
       LEFT JOIN user_routine_days d ON d.user_id = u.id AND d.day_date = $2
       WHERE gm.group_id = $1`,
      [groupId, targetDate]
    );

    const membersWithScores = result.rows.map(member => {
      const { points, totalMins, habitsDone } = calculateGrindPoints(
        member.completed_minutes,
        member.checks,
        member.notes
      );
      return {
        id: member.id,
        username: member.username,
        avatar_color: member.avatar_color,
        is_studying: member.is_studying,
        current_block_title: member.current_block_title,
        total_minutes: totalMins,
        habits_done: habitsDone,
        notes: member.notes,
        points
      };
    });

    // Sort descending by points, then total focus minutes
    membersWithScores.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.total_minutes - a.total_minutes;
    });

    // Assign rank and MVP Crown bonus (+50 GP to #1 if points > 0)
    const ranked = membersWithScores.map((m, index) => {
      const isWinner = index === 0 && m.points > 0;
      return {
        ...m,
        rank: index + 1,
        is_winner: isWinner,
        points: isWinner ? m.points + 50 : m.points
      };
    });

    const totalPodMinutes = ranked.reduce((acc, m) => acc + m.total_minutes, 0);
    const totalPodHabits = ranked.reduce((acc, m) => acc + m.habits_done, 0);

    return res.json({
      date: targetDate,
      group_id: groupId,
      total_pod_minutes: totalPodMinutes,
      total_pod_habits: totalPodHabits,
      members: ranked
    });
  } catch (error) {
    console.error('Leaderboard error:', error.message);
    return res.status(500).json({ error: 'Failed to compute leaderboard.' });
  }
});

// ================= ROUTINE TRACKING ENDPOINTS =================
// Supports both authenticated users (isolated) and guests (legacy)
app.get('/api/days/:date', optionalAuth, async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database is not configured. Set DATABASE_URL in server/.env.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.date)) {
    return res.status(400).json({ error: 'Date must use YYYY-MM-DD format.' });
  }

  try {
    await ensureTable();
    if (req.user) {
      const result = await pool.query(
        'SELECT day_date, checks, notes, completed_minutes, alarms, points, updated_at FROM user_routine_days WHERE user_id = $1 AND day_date = $2',
        [req.user.id, req.params.date]
      );
      return res.json(result.rows[0] || {
        day_date: req.params.date,
        checks: {},
        notes: '',
        completed_minutes: {},
        alarms: {},
        points: 0
      });
    } else {
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
    }
  } catch (error) {
    console.error('Read day failed:', error.message);
    return res.status(500).json({ error: 'Unable to read routine data.' });
  }
});

app.put('/api/days/:date', optionalAuth, async (req, res) => {
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
    if (req.user) {
      const { points } = calculateGrindPoints(completed_minutes, checks, notes);
      const result = await pool.query(
        `INSERT INTO user_routine_days (user_id, day_date, checks, notes, completed_minutes, alarms, points, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6::jsonb, $7, NOW())
         ON CONFLICT (user_id, day_date) DO UPDATE SET checks=EXCLUDED.checks, notes=EXCLUDED.notes,
           completed_minutes=EXCLUDED.completed_minutes, alarms=EXCLUDED.alarms, points=EXCLUDED.points, updated_at=NOW()
         RETURNING day_date, checks, notes, completed_minutes, alarms, points, updated_at`,
        [req.user.id, req.params.date, JSON.stringify(checks), notes.slice(0, 10000), JSON.stringify(completed_minutes), JSON.stringify(alarms), points]
      );
      return res.json(result.rows[0]);
    } else {
      const result = await pool.query(
        `INSERT INTO routine_days (day_date, checks, notes, completed_minutes, alarms, updated_at)
         VALUES ($1, $2::jsonb, $3, $4::jsonb, $5::jsonb, NOW())
         ON CONFLICT (day_date) DO UPDATE SET checks=EXCLUDED.checks, notes=EXCLUDED.notes,
           completed_minutes=EXCLUDED.completed_minutes, alarms=EXCLUDED.alarms, updated_at=NOW()
         RETURNING day_date, checks, notes, completed_minutes, alarms, updated_at`,
        [req.params.date, JSON.stringify(checks), notes.slice(0, 10000), JSON.stringify(completed_minutes), JSON.stringify(alarms)]
      );
      return res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Save day failed:', error.message);
    return res.status(500).json({ error: 'Unable to save routine data.' });
  }
});

// ================= ROUTINE SETTINGS ENDPOINTS =================
// User-isolated timetable: each user customizes and saves their own schedule
app.get('/api/settings/schedule', optionalAuth, async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database is not configured. Set DATABASE_URL in server/.env.' });
  }
  const settingKey = req.user ? `schedule:${req.user.id}` : 'schedule:default';
  try {
    await ensureTable();
    const result = await pool.query('SELECT value FROM routine_settings WHERE key = $1', [settingKey]);
    if (result.rows.length > 0) {
      return res.json(result.rows[0].value);
    }
    // Fallback to default if user hasn't customized yet
    if (req.user) {
      const def = await pool.query('SELECT value FROM routine_settings WHERE key = $1', ['schedule:default']);
      if (def.rows.length > 0) return res.json(def.rows[0].value);
    }
    return res.json(null);
  } catch (error) {
    console.error('Read schedule settings failed:', error.message);
    return res.status(500).json({ error: 'Unable to read schedule settings.' });
  }
});

app.put('/api/settings/schedule', optionalAuth, async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database is not configured. Set DATABASE_URL in server/.env.' });
  }
  const scheduleData = req.body;
  if (!Array.isArray(scheduleData)) {
    return res.status(400).json({ error: 'Schedule must be an array of routine blocks.' });
  }
  const settingKey = req.user ? `schedule:${req.user.id}` : 'schedule:default';
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO routine_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING key, value, updated_at`,
      [settingKey, JSON.stringify(scheduleData)]
    );
    return res.json({ success: true, schedule: result.rows[0].value });
  } catch (error) {
    console.error('Save schedule settings failed:', error.message);
    return res.status(500).json({ error: 'Unable to save schedule settings.' });
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
  app.listen(port, () => {
    console.log(`Routine API & WebApp listening on http://localhost:${port}`);
  });
  if (pool) {
    ensureTable().catch(err => {
      console.warn('[Database] Initial connection attempt deferred:', err.message);
    });
  }
}

start().catch(error => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
