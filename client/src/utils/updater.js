import { Capacitor } from '@capacitor/core';

export const CURRENT_APP_VERSION = '1.0.0';

/**
 * Compare two semver strings: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1, v2) {
  const parts1 = String(v1 || '0.0.0').replace(/^v/, '').split('.').map(Number);
  const parts2 = String(v2 || '0.0.0').replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Check if running inside Electron desktop app
 */
export function isElectron() {
  return typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.includes('Electron');
}

/**
 * Check for newer version from server
 */
export async function checkForAppUpdate(apiEndpoint) {
  try {
    const res = await fetch(`${apiEndpoint}/app-version`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.latest_version) {
      const hasUpdate = compareVersions(data.latest_version, CURRENT_APP_VERSION) > 0;
      return hasUpdate ? data : null;
    }
  } catch (err) {
    console.debug('[Updater] Check failed:', err.message);
  }
  return null;
}

/**
 * Execute update based on platform (Android APK, Windows PC EXE, or Web)
 */
export function executeAppUpdate(updateInfo) {
  if (!updateInfo) return;

  const isAndroid = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent));
  const isPc = isElectron() || (typeof navigator !== 'undefined' && /windows|win32/i.test(navigator.userAgent));

  if (isAndroid) {
    // Android Phone APK direct download/install
    const url = updateInfo.apk_url || '/download/android';
    if (Capacitor.isNativePlatform()) {
      window.open(url, '_system');
    } else {
      triggerBrowserDownload(url, 'Daymark-Routine-Android.apk');
    }
  } else if (isPc) {
    // Windows Desktop EXE direct download
    const url = updateInfo.exe_url || '/download/pc';
    if (window.shell && window.shell.openExternal) {
      window.shell.openExternal(url);
    } else {
      triggerBrowserDownload(url, 'Daymark-Routine-PC.exe');
    }
  } else {
    // Web browser: purge service worker cache and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload(true);
  }
}

function triggerBrowserDownload(url, filename) {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.open(url, '_blank');
  }
}
