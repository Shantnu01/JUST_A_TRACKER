import React, { useState, useEffect, useCallback } from 'react';
import { Download, Sparkles, RefreshCw, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';

const CURRENT_APP_VERSION = '1.0.0';

export function useAppUpdateCheck(apiBase = '/api') {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Compare semver like '1.0.2' > '1.0.0'
  const isNewerVersion = (latest, current) => {
    if (!latest || !current) return false;
    const lParts = latest.replace(/^v/, '').split('.').map(Number);
    const cParts = current.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  };

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`${apiBase}/app-version`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUpdateInfo(data);
      setLastChecked(new Date());

      const newer = isNewerVersion(data.latest_version, CURRENT_APP_VERSION);
      setHasUpdate(newer);
      return { hasUpdate: newer, data };
    } catch (err) {
      console.warn('[AppUpdate] Update check failed:', err.message);
      return { hasUpdate: false, error: err.message };
    } finally {
      setIsChecking(false);
    }
  }, [apiBase]);

  useEffect(() => {
    // Initial check on mount
    checkForUpdates();
    // Check every 30 minutes in background
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: updateInfo?.latest_version || CURRENT_APP_VERSION,
    updateInfo,
    hasUpdate: hasUpdate && !dismissed,
    isChecking,
    lastChecked,
    dismissUpdate: () => setDismissed(true),
    checkForUpdates
  };
}

/**
 * Visual Banner shown when a new update is published.
 */
export default function AppUpdateBanner({ updateState, onDownloadStarted }) {
  const { currentVersion, latestVersion, updateInfo, hasUpdate, dismissUpdate } = updateState;
  const [downloading, setDownloading] = useState(false);

  if (!hasUpdate || !updateInfo) return null;

  // Determine platform
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isWindows = typeof navigator !== 'undefined' && /windows|win32/i.test(navigator.userAgent);

  const downloadUrl = isAndroid
    ? (updateInfo.apk_url || '/download/android')
    : (updateInfo.exe_url || '/download/pc');

  const handleInstallClick = () => {
    setDownloading(true);
    if (onDownloadStarted) onDownloadStarted();

    // Trigger direct file download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', isAndroid ? 'Daymark-Routine-Android.apk' : 'Daymark-Routine-PC.exe');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <aside
      aria-label="Application update alert"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        maxWidth: '420px',
        width: 'calc(100% - 48px)',
        zIndex: 9999,
        background: 'linear-gradient(135deg, rgba(20, 24, 38, 0.96) 0%, rgba(12, 14, 22, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(245, 158, 11, 0.45)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65), 0 0 24px rgba(245, 158, 11, 0.15)',
        borderRadius: '16px',
        padding: '18px 20px',
        color: '#FAF8FF',
        animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'grid',
              placeItems: 'center',
              color: '#F59E0B',
              flexShrink: 0
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#F59E0B'
                }}
              >
                UPDATE AVAILABLE
              </span>
              <span
                style={{
                  fontSize: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  color: '#94A3B8'
                }}
              >
                v{currentVersion} → v{latestVersion}
              </span>
            </div>
            <h4 style={{ margin: '3px 0 0', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
              {updateInfo.title || `Daymark Routine v${latestVersion}`}
            </h4>
          </div>
        </div>

        <button
          onClick={dismissUpdate}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'grid',
            placeItems: 'center'
          }}
          title="Dismiss update"
        >
          <X size={16} />
        </button>
      </div>

      <p
        style={{
          margin: '10px 0 14px',
          fontSize: '12.5px',
          color: '#CBD5E1',
          lineHeight: '1.45',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        {updateInfo.notes}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handleInstallClick}
          disabled={downloading}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            border: 'none',
            color: '#0F172A',
            fontWeight: 800,
            fontSize: '13px',
            padding: '10px 16px',
            borderRadius: '10px',
            cursor: downloading ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
            transition: 'all 0.15s ease'
          }}
        >
          <Download size={15} />
          <span>
            {downloading
              ? 'Starting Download...'
              : isAndroid
              ? 'Install APK Update'
              : 'Download PC Update'}
          </span>
        </button>

        <button
          onClick={dismissUpdate}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#E2E8F0',
            fontWeight: 600,
            fontSize: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          Later
        </button>
      </div>
    </aside>
  );
}
