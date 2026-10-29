/**
 * ============================================================================
 * DAYMARK OFFLINE SYNC ENGINE (CHUNKED TRANSACTION SYNC)
 * ============================================================================
 * Enables uninterrupted offline usage (e.g. studying for 5+ hours offline).
 * 
 * Architecture:
 * 1. Optimistic Local Persistence: All state updates (habits, focus sessions,
 *    alarm logs, notes) apply instantly to local store and are recorded in
 *    a durable persistent offline queue.
 * 2. Compaction: Successive changes to the same day merge gracefully so 100
 *    sub-edits compact into one clean state without payload bloat.
 * 3. Chunked Batch Uploads: When the network reconnects, changes are pushed
 *    in small chunks (5 items per chunk) with inter-chunk pauses to prevent
 *    overloading Render server and PostgreSQL connection limits.
 * 4. Reactive Network Listeners: Auto-detects 'online' / 'offline' events.
 * ============================================================================
 */

const QUEUE_STORAGE_KEY = 'daymark-offline-queue';
const DEFAULT_CHUNK_SIZE = 5;

export function getDefaultApiBase() {
  if (typeof localStorage !== 'undefined') {
    const custom = localStorage.getItem('daymark-api-url');
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
  }
  const isFile = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
  const isElectron = typeof navigator === 'object' && typeof navigator.userAgent === 'string' && /Electron/i.test(navigator.userAgent);
  if (isFile || isElectron) {
    return 'https://routine-tracker.onrender.com/api';
  }
  return '/api';
}

class OfflineSyncEngine {
  constructor() {
    this.isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.listeners = new Set();
    this.syncInProgress = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  handleNetworkChange(online) {
    this.isOnlineState = online;
    this.notifyListeners({ type: 'network', isOnline: online, pendingCount: this.getPendingCount() });
  }

  isOnline() {
    return this.isOnlineState;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event) {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.warn('[OfflineSyncEngine] Listener error:', e);
      }
    });
  }

  getPendingQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  getPendingCount() {
    return this.getPendingQueue().length;
  }

  /**
   * Enqueues or merges an offline day update.
   * Compaction logic: if an entry for this date already exists in the queue,
   * we deep merge the checks, completedMinutes, alarms, and update notes.
   */
  enqueueDayUpdate(date, dayData) {
    if (!date || !dayData) return;
    try {
      const queue = this.getPendingQueue();
      const existingIdx = queue.findIndex(item => item.date === date);

      const payload = {
        date,
        checks: dayData.checks || {},
        notes: typeof dayData.notes === 'string' ? dayData.notes : '',
        completed_minutes: dayData.completedMinutes || dayData.completed_minutes || {},
        alarms: dayData.alarms || {},
        updatedAt: Date.now()
      };

      if (existingIdx >= 0) {
        // Compact into existing record
        queue[existingIdx] = {
          ...queue[existingIdx],
          checks: { ...(queue[existingIdx].checks || {}), ...payload.checks },
          completed_minutes: { ...(queue[existingIdx].completed_minutes || {}), ...payload.completed_minutes },
          alarms: { ...(queue[existingIdx].alarms || {}), ...payload.alarms },
          notes: payload.notes || queue[existingIdx].notes || '',
          updatedAt: Date.now()
        };
      } else {
        queue.push(payload);
      }

      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      this.notifyListeners({ type: 'enqueued', date, pendingCount: queue.length });
    } catch (err) {
      console.warn('[OfflineSyncEngine] Failed to enqueue offline item:', err);
    }
  }

  /**
   * Removes synced records from the local queue by date.
   */
  removeSyncedDates(syncedDates) {
    try {
      const queue = this.getPendingQueue();
      const dateSet = new Set(syncedDates);
      const remaining = queue.filter(item => !dateSet.has(item.date));
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
      this.notifyListeners({ type: 'pruned', pendingCount: remaining.length });
      return remaining.length;
    } catch {
      return this.getPendingCount();
    }
  }

  /**
   * Performs chunked batch sync.
   * Splits pending items into chunks of `chunkSize` (default 5).
   * Between each chunk, awaits `interChunkDelayMs` to avoid overwhelming backend.
   */
  async syncOfflineQueueInChunks(apiBase = getDefaultApiBase(), token = null, onProgress = null) {
    if (this.syncInProgress) {
      return { success: false, reason: 'sync_already_in_progress' };
    }

    const queue = this.getPendingQueue();
    if (queue.length === 0) {
      return { success: true, processed: 0, pendingRemaining: 0 };
    }

    if (!this.isOnlineState) {
      return { success: false, reason: 'offline', pendingRemaining: queue.length };
    }

    this.syncInProgress = true;
    this.notifyListeners({ type: 'sync_start', totalItems: queue.length });

    let processedTotal = 0;
    const chunkSize = DEFAULT_CHUNK_SIZE;
    const chunks = [];

    for (let i = 0; i < queue.length; i += chunkSize) {
      chunks.push(queue.slice(i, i + chunkSize));
    }

    const totalChunks = chunks.length;

    try {
      for (let cIdx = 0; cIdx < totalChunks; cIdx++) {
        const chunk = chunks[cIdx];
        const chunkDates = chunk.map(i => i.date);

        if (onProgress) {
          onProgress({
            currentChunk: cIdx + 1,
            totalChunks,
            itemsInChunk: chunk.length,
            processedTotal
          });
        }

        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        };

        const response = await fetch(`${apiBase}/days/batch-sync`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            items: chunk,
            chunkIndex: cIdx + 1,
            totalChunks
          })
        });

        if (!response.ok) {
          throw new Error(`Batch sync failed with HTTP ${response.status}`);
        }

        // Successfully synced this chunk: remove from local persistent queue immediately
        this.removeSyncedDates(chunkDates);
        processedTotal += chunk.length;

        // Non-blocking yield between chunks to prevent CPU/network contention
        if (cIdx < totalChunks - 1) {
          await new Promise(r => setTimeout(r, 220));
        }
      }

      this.notifyListeners({ type: 'sync_complete', processedTotal, pendingRemaining: 0 });
      return { success: true, processed: processedTotal, pendingRemaining: 0 };
    } catch (err) {
      console.warn('[OfflineSyncEngine] Chunk sync interrupted:', err.message);
      const remaining = this.getPendingCount();
      this.notifyListeners({ type: 'sync_error', error: err.message, pendingRemaining: remaining });
      return { success: false, error: err.message, pendingRemaining: remaining };
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
export default offlineSyncEngine;
