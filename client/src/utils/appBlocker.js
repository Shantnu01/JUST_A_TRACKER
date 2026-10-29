// Capacitor Bridge for Daymark Ultra App Blocker & Focus Shield
import { Capacitor } from '@capacitor/core';

const AppBlockerNative = Capacitor.isNativePlatform() && Capacitor.Plugins?.AppBlocker 
  ? Capacitor.Plugins.AppBlocker 
  : null;

// Mock state for browser / desktop testing
let mockState = {
  isActive: false,
  remainingSeconds: 0,
  blockedPackages: ['com.google.android.youtube', 'com.instagram.android'],
  isEmergencyPassAvailable: true,
  isEmergencyPassActive: false,
  remainingEmergencySeconds: 0
};

export const DEFAULT_PRESET_APPS = [
  { package: 'com.google.android.youtube', name: 'YouTube', category: 'Video' },
  { package: 'com.instagram.android', name: 'Instagram', category: 'Social' },
  { package: 'com.reddit.frontpage', name: 'Reddit', category: 'Forums' },
  { package: 'com.twitter.android', name: 'X / Twitter', category: 'Social' },
  { package: 'com.snapchat.android', name: 'Snapchat', category: 'Messaging' },
  { package: 'com.zhiliaoapp.musically', name: 'TikTok', category: 'Shorts' },
  { package: 'com.facebook.katana', name: 'Facebook', category: 'Social' },
  { package: 'com.netflix.mediaclient', name: 'Netflix', category: 'Entertainment' },
  { package: 'com.android.chrome', name: 'Google Chrome', category: 'Browser' }
];

export async function getBlockerStatus() {
  if (AppBlockerNative) {
    try {
      return await AppBlockerNative.getStatus();
    } catch (e) {
      console.warn('[AppBlocker] getStatus error:', e);
    }
  }
  return { ...mockState };
}

export async function getInstalledApps() {
  if (AppBlockerNative) {
    try {
      const res = await AppBlockerNative.getInstalledApps();
      if (res && res.apps && res.apps.length > 0) {
        return res.apps;
      }
    } catch (e) {
      console.warn('[AppBlocker] getInstalledApps error:', e);
    }
  }
  return DEFAULT_PRESET_APPS;
}

export async function checkBlockerPermissions() {
  if (AppBlockerNative) {
    try {
      return await AppBlockerNative.checkPermissions();
    } catch (e) {
      console.warn('[AppBlocker] checkPermissions error:', e);
    }
  }
  return {
    accessibilityEnabled: false,
    overlayEnabled: false,
    deviceAdminEnabled: false
  };
}

export async function openAccessibilitySettings() {
  if (AppBlockerNative) {
    await AppBlockerNative.openAccessibilitySettings();
  } else {
    alert('Accessibility settings are only available on Android devices.');
  }
}

export async function openOverlaySettings() {
  if (AppBlockerNative) {
    await AppBlockerNative.openOverlaySettings();
  } else {
    alert('Draw Over Other Apps settings are only available on Android devices.');
  }
}

export async function openDeviceAdminSettings() {
  if (AppBlockerNative) {
    await AppBlockerNative.openDeviceAdminSettings();
  } else {
    alert('Device Admin settings are only available on Android devices.');
  }
}

export async function startShieldSession(packages, durationMinutes = 60, allowEmergencyPass = true) {
  if (AppBlockerNative) {
    return await AppBlockerNative.startSession({
      packages,
      durationMinutes,
      allowEmergencyPass
    });
  }
  // Mock browser simulation
  mockState.isActive = true;
  mockState.remainingSeconds = durationMinutes * 60;
  mockState.blockedPackages = packages;
  mockState.isEmergencyPassAvailable = allowEmergencyPass;
  mockState.isEmergencyPassActive = false;
  mockState.remainingEmergencySeconds = 0;
  return { success: true };
}

export async function stopShieldSession(force = false) {
  if (AppBlockerNative) {
    return await AppBlockerNative.stopSession({ force });
  }
  mockState.isActive = false;
  return { success: true };
}

export async function useEmergencyPass() {
  if (AppBlockerNative) {
    return await AppBlockerNative.useEmergencyPass();
  }
  if (mockState.isEmergencyPassAvailable) {
    mockState.isEmergencyPassAvailable = false;
    mockState.isEmergencyPassActive = true;
    mockState.remainingEmergencySeconds = 300;
    return { success: true };
  }
  return { success: false };
}
