/**
 * Daymark Laptop Desktop Backend
 * 
 * Separate, dedicated backend for the Windows PC application.
 * Manages local desktop file-system caching, native PC background alarms,
 * and delegates shared requests (study pods, routine sync, profile) directly
 * to the primary live website backend API at https://just-a-tracker.onrender.com/api.
 */

const { ipcMain, app, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const WEB_API_BASE = 'https://just-a-tracker.onrender.com/api';
const LOCAL_CACHE_FILE = path.join(app.getPath('userData'), 'daymark-pc-cache.json');

// --- In-memory & disk local cache for offline PC operation ---
function readLocalCache() {
  try {
    if (fs.existsSync(LOCAL_CACHE_FILE)) {
      const raw = fs.readFileSync(LOCAL_CACHE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[DesktopBackend] Cache read warning:', err.message);
  }
  return { days: {}, settings: {}, alarms: {} };
}

function writeLocalCache(data) {
  try {
    fs.writeFileSync(LOCAL_CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[DesktopBackend] Cache write error:', err.message);
  }
}

// --- Delegate network calls to Website Backend API ---
async function forwardToWebBackend(endpoint, options = {}) {
  const url = `${WEB_API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'desktop-pc',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`Web backend returned HTTP ${response.status}`);
  }
  return await response.json();
}

function initDesktopBackend() {
  console.log('[DesktopBackend] Initialized dedicated PC service layer.');

  // IPC: Check connection to website backend
  ipcMain.handle('desktop:check-health', async () => {
    try {
      const data = await forwardToWebBackend('/health');
      return { status: 'ok', online: true, remote: data };
    } catch (err) {
      return { status: 'offline', online: false, error: err.message };
    }
  });

  // IPC: Read day data (checks cache, then updates from website backend)
  ipcMain.handle('desktop:get-day', async (_event, { date, token }) => {
    const cache = readLocalCache();
    let localData = cache.days[date] || null;

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const remoteData = await forwardToWebBackend(`/days/${date}`, { headers });
      cache.days[date] = remoteData;
      writeLocalCache(cache);
      return remoteData;
    } catch {
      // Offline fallback: return cached copy
      return localData || { day_date: date, checks: {}, notes: '', completed_minutes: {}, alarms: {} };
    }
  });

  // IPC: Save day data
  ipcMain.handle('desktop:save-day', async (_event, { date, dayData, token }) => {
    const cache = readLocalCache();
    cache.days[date] = dayData;
    writeLocalCache(cache);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const result = await forwardToWebBackend(`/days/${date}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(dayData)
      });
      return { success: true, synced: true, result };
    } catch (err) {
      // Saved locally in cache, will sync when online
      return { success: true, synced: false, queuedOffline: true };
    }
  });

  // IPC: Show native PC Desktop Notification
  ipcMain.on('desktop:notify', (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({
        title: title || 'Daymark Routine Tracker',
        body: body || 'Time for your next focus session.',
        icon: path.join(__dirname, 'icon.png')
      }).show();
    }
  });
}

module.exports = {
  initDesktopBackend,
  forwardToWebBackend,
  readLocalCache,
  writeLocalCache,
  WEB_API_BASE
};
