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

    // 9. User Coding Profiles (LeetCode, GitHub, Solved DSA)
    await pool.query(`CREATE TABLE IF NOT EXISTS user_coding_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      leetcode_username TEXT DEFAULT '',
      github_username TEXT DEFAULT '',
      codeforces_username TEXT DEFAULT '',
      solved_dsa_ids JSONB DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // 10. Pod Code Snippets & Peer Reviews
    await pool.query(`CREATE TABLE IF NOT EXISTS pod_code_snippets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      problem_url TEXT DEFAULT '',
      language TEXT NOT NULL DEFAULT 'javascript',
      code TEXT NOT NULL,
      notes TEXT DEFAULT '',
      likes INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS pod_snippet_replies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      snippet_id UUID REFERENCES pod_code_snippets(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      comment TEXT NOT NULL,
      suggested_code TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

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

// ================= CODING HUB ENDPOINTS =================
const codingCache = new Map();

function getCached(key) {
  const item = codingCache.get(key);
  if (item && Date.now() - item.time < 5 * 60 * 1000) {
    return item.data;
  }
  return null;
}

function setCached(key, data) {
  codingCache.set(key, { time: Date.now(), data });
}

// 1. Get or Update User Coding Profile (LeetCode & GitHub handles, Solved DSA)
app.get('/api/coding/profile', optionalAuth, async (req, res) => {
  if (!req.user || !pool) {
    return res.json({ leetcode_username: '', github_username: '', codeforces_username: '', solved_dsa_ids: [] });
  }
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT leetcode_username, github_username, codeforces_username, solved_dsa_ids FROM user_coding_profiles WHERE user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }
    return res.json({ leetcode_username: '', github_username: '', codeforces_username: '', solved_dsa_ids: [] });
  } catch (err) {
    console.error('Fetch coding profile error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch coding profile' });
  }
});

app.put('/api/coding/profile', optionalAuth, async (req, res) => {
  const { leetcode_username = '', github_username = '', codeforces_username = '', solved_dsa_ids = [] } = req.body;
  if (!req.user || !pool) {
    return res.json({ leetcode_username, github_username, codeforces_username, solved_dsa_ids });
  }
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO user_coding_profiles (user_id, leetcode_username, github_username, codeforces_username, solved_dsa_ids, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         leetcode_username = EXCLUDED.leetcode_username,
         github_username = EXCLUDED.github_username,
         codeforces_username = EXCLUDED.codeforces_username,
         solved_dsa_ids = EXCLUDED.solved_dsa_ids,
         updated_at = NOW()
       RETURNING leetcode_username, github_username, codeforces_username, solved_dsa_ids`,
      [req.user.id, leetcode_username.trim(), github_username.trim(), codeforces_username.trim(), JSON.stringify(solved_dsa_ids)]
    );
    return res.json({ success: true, profile: result.rows[0] });
  } catch (err) {
    console.error('Update coding profile error:', err.message);
    return res.status(500).json({ error: 'Failed to update coding profile' });
  }
});

// 2. Fetch LeetCode performance stats with caching & fallback
app.get('/api/coding/leetcode/:username', async (req, res) => {
  const username = req.params.username.trim();
  if (!username) return res.status(400).json({ error: 'Username required' });

  const cacheKey = `leetcode:${username.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const apiRes = await fetch(`https://alfa-leetcode-api.onrender.com/userProfile/${encodeURIComponent(username)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!apiRes.ok) {
      return res.status(404).json({ error: `LeetCode profile for "${username}" not found or service unavailable.` });
    }

    const data = await apiRes.json();
    if (data.errors || (!data.totalSolved && data.totalSolved !== 0)) {
      return res.status(404).json({ error: `LeetCode profile "${username}" not found.` });
    }

    const allSubmissions = data.totalSubmissions?.find(s => s.difficulty === 'All')?.submissions || 0;
    const allAc = data.totalSolved || 0;
    const acceptanceRate = allSubmissions > 0 ? ((allAc / allSubmissions) * 100).toFixed(1) + '%' : '0%';

    const payload = {
      username,
      profileUrl: `https://leetcode.com/u/${username}`,
      totalSolved: data.totalSolved || 0,
      totalQuestions: data.totalQuestions || 3300,
      easySolved: data.easySolved || 0,
      totalEasy: data.totalEasy || 820,
      mediumSolved: data.mediumSolved || 0,
      totalMedium: data.totalMedium || 1700,
      hardSolved: data.hardSolved || 0,
      totalHard: data.totalHard || 750,
      ranking: data.ranking || null,
      reputation: data.reputation || 0,
      acceptanceRate,
      recentSubmissions: (data.recentSubmissions || []).slice(0, 5)
    };

    setCached(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error('LeetCode fetch error:', err.message);
    return res.status(502).json({
      error: 'Unable to reach LeetCode service at the moment.',
      username,
      fallbackUrl: `https://leetcode.com/u/${username}`
    });
  }
});

// 3. Fetch GitHub Profile & Recent Repositories (with rate-limit fallback)
app.get('/api/coding/github/:username', async (req, res) => {
  const username = req.params.username.trim();
  if (!username) return res.status(400).json({ error: 'Username required' });

  const cacheKey = `github:${username.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const fallbackPayload = {
    user: {
      login: username,
      name: username,
      avatar_url: `https://github.com/${username}.png`,
      html_url: `https://github.com/${username}`,
      bio: 'Public GitHub developer account',
      public_repos: null,
      followers: null,
      following: null,
      rate_limited: false
    },
    repos: [],
    chartUrl: `https://ghchart.rshah.org/315b45/${encodeURIComponent(username)}`
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const headers = { 'User-Agent': 'DaymarkRoutineTracker' };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers,
        signal: controller.signal
      }),
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6`, {
        headers,
        signal: controller.signal
      })
    ]);
    clearTimeout(timeoutId);

    if (userRes.status === 403 || userRes.status === 429) {
      // Rate-limited by GitHub IP quota: gracefully return the fallback payload with avatar & heatmap
      fallbackPayload.user.rate_limited = true;
      setCached(cacheKey, fallbackPayload);
      return res.json(fallbackPayload);
    }

    if (!userRes.ok) {
      return res.status(userRes.status).json({ error: `GitHub user "${username}" not found.` });
    }

    const userData = await userRes.json();
    let reposData = [];
    if (reposRes.ok) {
      const rawRepos = await reposRes.json();
      if (Array.isArray(rawRepos)) {
        reposData = rawRepos.map(r => ({
          name: r.name,
          html_url: r.html_url,
          description: r.description,
          language: r.language,
          stargazers_count: r.stargazers_count,
          forks_count: r.forks_count,
          updated_at: r.updated_at
        }));
      }
    }

    const payload = {
      user: {
        login: userData.login,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url || `https://github.com/${username}.png`,
        html_url: userData.html_url,
        bio: userData.bio,
        public_repos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        created_at: userData.created_at,
        rate_limited: false
      },
      repos: reposData,
      chartUrl: `https://ghchart.rshah.org/315b45/${encodeURIComponent(username)}`
    };

    setCached(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.warn('GitHub fetch error (using fallback):', err.message);
    fallbackPayload.user.rate_limited = true;
    setCached(cacheKey, fallbackPayload);
    return res.json(fallbackPayload);
  }
});

// 4. Upcoming & Weekly Coding Contests Schedule
app.get('/api/coding/contests', (_req, res) => {
  // Curated recurring programming contest calendar
  const now = new Date();
  const contests = [
    {
      id: 'lc-weekly',
      platform: 'LeetCode',
      name: 'LeetCode Weekly Contest',
      scheduleText: 'Every Sunday · 08:00 AM IST (02:30 UTC)',
      duration: '1h 30m',
      url: 'https://leetcode.com/contest/',
      tone: 'amber'
    },
    {
      id: 'lc-biweekly',
      platform: 'LeetCode',
      name: 'LeetCode Biweekly Contest',
      scheduleText: 'Alternate Saturdays · 08:00 PM IST (14:30 UTC)',
      duration: '1h 30m',
      url: 'https://leetcode.com/contest/',
      tone: 'amber'
    },
    {
      id: 'cf-round',
      platform: 'Codeforces',
      name: 'Codeforces Round (Div. 2 & Div. 3)',
      scheduleText: 'Weekly regular rounds',
      duration: '2h 15m',
      url: 'https://codeforces.com/contests',
      tone: 'blue'
    },
    {
      id: 'atcoder-abc',
      platform: 'AtCoder',
      name: 'AtCoder Beginner Contest (ABC)',
      scheduleText: 'Every Saturday · 05:30 PM IST (12:00 UTC)',
      duration: '1h 40m',
      url: 'https://atcoder.jp/contests',
      tone: 'green'
    }
  ];

  return res.json({ contests, timestamp: now.toISOString() });
});

// ================= CODEFORCES RATING & BATTLE ARENA =================
function getCfRankColor(rankStr = '') {
  const r = (rankStr || '').toLowerCase();
  if (r.includes('legendary') || r.includes('grandmaster')) return '#dc2626';
  if (r.includes('master')) return '#f59e0b';
  if (r.includes('candidate')) return '#9333ea';
  if (r.includes('expert')) return '#2563eb';
  if (r.includes('specialist')) return '#06b6d4';
  if (r.includes('pupil')) return '#16a34a';
  return '#64748b';
}

app.get('/api/coding/codeforces/:handle', async (req, res) => {
  const handle = req.params.handle.trim();
  if (!handle) return res.status(400).json({ error: 'Handle required' });

  const cacheKey = `cf:${handle.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const apiRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!apiRes.ok) {
      return res.status(404).json({ error: `Codeforces user "${handle}" not found.` });
    }

    const data = await apiRes.json();
    if (data.status !== 'OK' || !data.result || data.result.length === 0) {
      return res.status(404).json({ error: `Codeforces handle "${handle}" not found.` });
    }

    const u = data.result[0];
    const payload = {
      handle: u.handle,
      rating: u.rating || 0,
      maxRating: u.maxRating || 0,
      rank: u.rank ? u.rank.charAt(0).toUpperCase() + u.rank.slice(1) : 'Unrated',
      maxRank: u.maxRank ? u.maxRank.charAt(0).toUpperCase() + u.maxRank.slice(1) : 'Unrated',
      avatar: u.titlePhoto || u.avatar || `https://userpic.codeforces.org/no-avatar.jpg`,
      contribution: u.contribution || 0,
      organization: u.organization || '',
      rankColor: getCfRankColor(u.rank),
      profileUrl: `https://codeforces.com/profile/${u.handle}`
    };

    setCached(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error('Codeforces fetch error:', err.message);
    return res.status(502).json({ error: 'Unable to reach Codeforces API at this time.' });
  }
});

// Pod CF Battle Arena: Fetches CF ratings for all members in the pod
app.get('/api/groups/:id/cf-arena', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const groupId = req.params.id;
  try {
    await ensureTable();
    const membersRes = await pool.query(
      `SELECT u.id, u.username, u.avatar_color, cp.codeforces_username
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       LEFT JOIN user_coding_profiles cp ON cp.user_id = u.id
       WHERE gm.group_id = $1`,
      [groupId]
    );

    const arenaList = [];
    for (const m of membersRes.rows) {
      const cfHandle = (m.codeforces_username || '').trim();
      let cfData = null;
      if (cfHandle) {
        const cacheKey = `cf:${cfHandle.toLowerCase()}`;
        cfData = getCached(cacheKey);
        if (!cfData) {
          try {
            const apiRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cfHandle)}`);
            if (apiRes.ok) {
              const d = await apiRes.json();
              if (d.status === 'OK' && d.result?.[0]) {
                const u = d.result[0];
                cfData = {
                  handle: u.handle,
                  rating: u.rating || 0,
                  maxRating: u.maxRating || 0,
                  rank: u.rank ? u.rank.charAt(0).toUpperCase() + u.rank.slice(1) : 'Unrated',
                  avatar: u.titlePhoto || u.avatar,
                  rankColor: getCfRankColor(u.rank)
                };
                setCached(cacheKey, cfData);
              }
            }
          } catch {}
        }
      }

      arenaList.push({
        id: m.id,
        username: m.username,
        avatar_color: m.avatar_color,
        cfHandle: cfHandle || null,
        rating: cfData?.rating || 0,
        maxRating: cfData?.maxRating || 0,
        rank: cfData?.rank || (cfHandle ? 'Unrated' : 'Not linked'),
        rankColor: cfData?.rankColor || '#64748b',
        avatar: cfData?.avatar || null
      });
    }

    // Sort descending by CF rating
    arenaList.sort((a, b) => b.rating - a.rating);
    return res.json(arenaList);
  } catch (err) {
    console.error('CF Arena error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch pod CF arena.' });
  }
});

// ================= SMART GITHUB COMMIT VERIFICATION (PROJECT HABIT) =================
async function evaluateProjectCommitVerification(userId, userSchedule, userDayDate) {
  let plannedMinutes = 120;
  if (Array.isArray(userSchedule)) {
    const projBlock = userSchedule.find(s => s.id === 'project' || (s.title && s.title.toLowerCase().includes('project')));
    if (projBlock) {
      if (projBlock.hours) {
        plannedMinutes = Math.round(Number(projBlock.hours) * 60) || 120;
      } else if (projBlock.start && projBlock.end) {
        const [sh, sm] = projBlock.start.split(':').map(Number);
        const [eh, em] = projBlock.end.split(':').map(Number);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60;
        plannedMinutes = diff || 120;
      }
    }
  }

  const thresholdMinutes = Math.ceil(plannedMinutes * 0.75);
  let loggedMinutes = 0;
  let currentChecks = {};
  let currentNotes = '';
  let currentAlarms = {};
  let completedMins = {};

  if (pool && userId) {
    const dayRes = await pool.query(
      `SELECT checks, completed_minutes, notes, alarms FROM user_routine_days WHERE user_id = $1 AND day_date = $2`,
      [userId, userDayDate]
    );
    if (dayRes.rows.length > 0) {
      const row = dayRes.rows[0];
      currentChecks = row.checks || {};
      currentNotes = row.notes || '';
      currentAlarms = row.alarms || {};
      completedMins = row.completed_minutes || {};
      loggedMinutes = Number(completedMins['project'] || 0);
      if (loggedMinutes === 0 && Array.isArray(userSchedule)) {
        const pBlock = userSchedule.find(s => s.title && s.title.toLowerCase().includes('project'));
        if (pBlock && completedMins[pBlock.id]) {
          loggedMinutes = Number(completedMins[pBlock.id]);
        }
      }
    }
  }

  const percent = plannedMinutes > 0 ? Math.round((loggedMinutes / plannedMinutes) * 100) : 0;
  const isEligible = loggedMinutes >= thresholdMinutes;

  if (isEligible && pool && userId) {
    currentChecks['project'] = true;
    const { points } = calculateGrindPoints(completedMins, currentChecks, currentNotes);
    await pool.query(
      `INSERT INTO user_routine_days (user_id, day_date, checks, notes, completed_minutes, alarms, points, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6::jsonb, $7, NOW())
       ON CONFLICT (user_id, day_date) DO UPDATE SET
         checks = EXCLUDED.checks,
         points = EXCLUDED.points,
         updated_at = NOW()`,
      [userId, userDayDate, JSON.stringify(currentChecks), currentNotes, JSON.stringify(completedMins), JSON.stringify(currentAlarms), points]
    );
  }

  return {
    verified: isEligible,
    habitMarked: isEligible,
    loggedMinutes,
    plannedMinutes,
    message: isEligible
      ? `Commit verified on GitHub! Significant project focus detected — Project habit automatically marked Done!`
      : `Commit detected on GitHub, but not enough focused project time has been logged yet today. Keep building!`
  };
}

// Interactive & Background Commit Verifier
app.post('/api/coding/github/verify-commit', optionalAuth, async (req, res) => {
  const { dateKey: reqDate, schedule: clientSchedule, loggedMinutes: clientLogged } = req.body || {};
  const todayStr = reqDate || new Date().toISOString().split('T')[0];

  if (!req.user) {
    // Guest Mode evaluation
    const plannedMinutes = 120;
    const thresholdMinutes = 90;
    const logged = Number(clientLogged || 0);
    const isEligible = logged >= thresholdMinutes;
    return res.json({
      verified: isEligible,
      habitMarked: isEligible,
      loggedMinutes: logged,
      plannedMinutes,
      message: isEligible
        ? `Commit verified on GitHub! Significant project focus detected — Project habit marked Done!`
        : `Commit detected on GitHub, but not enough focused project time has been logged yet today. Keep building!`
    });
  }

  try {
    let userSchedule = clientSchedule;
    if (!userSchedule && pool) {
      const schedRes = await pool.query(`SELECT value FROM routine_settings WHERE key = $1`, [`schedule:${req.user.id}`]);
      if (schedRes.rows.length > 0) userSchedule = schedRes.rows[0].value;
    }
    const result = await evaluateProjectCommitVerification(req.user.id, userSchedule, todayStr);
    return res.json(result);
  } catch (err) {
    console.error('Verify commit error:', err.message);
    return res.status(500).json({ error: 'Commit verification failed.' });
  }
});

// Incoming GitHub Webhook endpoint (triggered on git push)
app.post('/api/webhooks/github/:userId', async (req, res) => {
  const userId = req.params.userId;
  const event = req.headers['x-github-event'];
  if (event !== 'push') {
    return res.json({ ignored: true, message: 'Event ignored (only push events trigger habit verification)' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  try {
    let userSchedule = null;
    if (pool) {
      const schedRes = await pool.query(`SELECT value FROM routine_settings WHERE key = $1`, [`schedule:${userId}`]);
      if (schedRes.rows.length > 0) userSchedule = schedRes.rows[0].value;
    }
    const result = await evaluateProjectCommitVerification(userId, userSchedule, todayStr);
    console.log(`[GitHub Webhook] Push verified for user ${userId}:`, result.message);
    return res.json(result);
  } catch (err) {
    console.error('[GitHub Webhook Error]:', err.message);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});

// ================= POD CODE SNIPPETS & PEER REVIEWS =================
app.get('/api/groups/:id/snippets', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const groupId = req.params.id;
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT s.*, u.username as author_username, u.avatar_color as author_avatar_color,
              COALESCE((SELECT COUNT(*) FROM pod_snippet_replies r WHERE r.snippet_id = s.id), 0) as reply_count
       FROM pod_code_snippets s
       JOIN users u ON u.id = s.user_id
       WHERE s.group_id = $1
       ORDER BY s.created_at DESC LIMIT 20`,
      [groupId]
    );

    // Fetch replies for each snippet
    const snippetsWithReplies = await Promise.all(
      result.rows.map(async (snippet) => {
        const repliesRes = await pool.query(
          `SELECT r.*, u.username, u.avatar_color
           FROM pod_snippet_replies r
           JOIN users u ON u.id = r.user_id
           WHERE r.snippet_id = $1
           ORDER BY r.created_at ASC`,
          [snippet.id]
        );
        return { ...snippet, replies: repliesRes.rows };
      })
    );

    return res.json(snippetsWithReplies);
  } catch (err) {
    console.error('Fetch snippets error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch code snippets.' });
  }
});

app.post('/api/groups/:id/snippets', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const groupId = req.params.id;
  const { title, problem_url = '', language = 'javascript', code, notes = '' } = req.body || {};
  if (!title || !code) {
    return res.status(400).json({ error: 'Title and code are required.' });
  }
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO pod_code_snippets (group_id, user_id, title, problem_url, language, code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [groupId, req.user.id, title.trim(), problem_url.trim(), language, code, notes.trim()]
    );
    const created = result.rows[0];
    created.author_username = req.user.username;
    created.author_avatar_color = req.user.avatar_color || '#315b45';
    created.reply_count = 0;
    created.replies = [];
    return res.json(created);
  } catch (err) {
    console.error('Create snippet error:', err.message);
    return res.status(500).json({ error: 'Failed to share code snippet.' });
  }
});

app.post('/api/snippets/:id/replies', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const snippetId = req.params.id;
  const { comment, suggested_code = '' } = req.body || {};
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Comment is required.' });
  }
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO pod_snippet_replies (snippet_id, user_id, comment, suggested_code)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [snippetId, req.user.id, comment.trim(), suggested_code.trim()]
    );
    const row = result.rows[0];
    row.username = req.user.username;
    row.avatar_color = req.user.avatar_color || '#315b45';
    return res.json(row);
  } catch (err) {
    console.error('Post snippet reply error:', err.message);
    return res.status(500).json({ error: 'Failed to post reply.' });
  }
});

app.post('/api/snippets/:id/like', authenticateToken, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured.' });
  const snippetId = req.params.id;
  try {
    await ensureTable();
    const result = await pool.query(
      `UPDATE pod_code_snippets SET likes = likes + 1 WHERE id = $1 RETURNING likes`,
      [snippetId]
    );
    return res.json({ likes: result.rows[0]?.likes || 0 });
  } catch (err) {
    console.error('Like snippet error:', err.message);
    return res.status(500).json({ error: 'Failed to like snippet.' });
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
