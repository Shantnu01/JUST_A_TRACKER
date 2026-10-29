import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import offlineSyncEngine from '../utils/offlineSyncEngine';

export default function OfflineSyncIndicator({ apiBase = '/api', token = null, onSyncComplete = null }) {
  const [isOnline, setIsOnline] = useState(offlineSyncEngine.isOnline());
  const [pendingCount, setPendingCount] = useState(offlineSyncEngine.getPendingCount());
  const [syncState, setSyncState] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [syncProgress, setSyncProgress] = useState(null);

  useEffect(() => {
    const unsubscribe = offlineSyncEngine.subscribe(evt => {
      if (evt.type === 'network') {
        setIsOnline(evt.isOnline);
        setPendingCount(evt.pendingCount);
        if (evt.isOnline && evt.pendingCount > 0) {
          triggerSync();
        }
      } else if (evt.type === 'enqueued' || evt.type === 'pruned') {
        setPendingCount(evt.pendingCount);
      } else if (evt.type === 'sync_start') {
        setSyncState('syncing');
      } else if (evt.type === 'sync_complete') {
        setSyncState('synced');
        setPendingCount(0);
        setTimeout(() => setSyncState('idle'), 3500);
        if (onSyncComplete) onSyncComplete();
      } else if (evt.type === 'sync_error') {
        setSyncState('error');
      }
    });

    // Check if we came back online with pending queue
    if (isOnline && pendingCount > 0) {
      triggerSync();
    }

    return () => unsubscribe();
  }, [apiBase, token]);

  const triggerSync = async () => {
    if (syncState === 'syncing') return;
    setSyncState('syncing');
    const result = await offlineSyncEngine.syncOfflineQueueInChunks(apiBase, token, progress => {
      setSyncProgress(progress);
    });
    if (!result.success && result.reason !== 'offline') {
      setSyncState('error');
    }
  };

  // If online, not syncing, and no pending items, show a minimal subtle indicator
  if (isOnline && pendingCount === 0 && syncState === 'idle') {
    return (
      <div
        className="sync-status-pill online"
        title="All offline changes synchronized with server"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 9px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          color: '#4ADE80',
          cursor: 'default'
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
        <span>Synced</span>
      </div>
    );
  }

  // When syncing
  if (syncState === 'syncing') {
    return (
      <div
        className="sync-status-pill syncing"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          color: '#60A5FA',
          cursor: 'wait'
        }}
      >
        <RefreshCw size={11} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
        <span>
          {syncProgress
            ? `Syncing Chunk ${syncProgress.currentChunk}/${syncProgress.totalChunks}`
            : 'Syncing Changes...'}
        </span>
      </div>
    );
  }

  // Just synced
  if (syncState === 'synced') {
    return (
      <div
        className="sync-status-pill synced"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          background: 'rgba(34, 197, 94, 0.18)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          color: '#4ADE80'
        }}
      >
        <CheckCircle2 size={12} />
        <span>All Synced</span>
      </div>
    );
  }

  // When offline or has pending items
  return (
    <button
      onClick={triggerSync}
      type="button"
      className="sync-status-pill pending"
      title={isOnline ? "Click to sync offline changes now" : "Offline mode: changes safely stored locally"}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 11px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 700,
        background: isOnline ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        border: `1px solid ${isOnline ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
        color: isOnline ? '#F59E0B' : '#F87171',
        cursor: isOnline ? 'pointer' : 'default'
      }}
    >
      {isOnline ? <RefreshCw size={11} /> : <WifiOff size={11} />}
      <span>
        {isOnline
          ? `${pendingCount} Queued • Sync Now`
          : `Offline • ${pendingCount} Queued`}
      </span>
    </button>
  );
}
