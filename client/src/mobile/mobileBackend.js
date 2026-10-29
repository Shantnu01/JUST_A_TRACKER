/**
 * Daymark Mobile Phone Dedicated Backend Service
 * 
 * Separate backend layer specifically for the Android Phone APK.
 * 
 * Responsibilities:
 * 1. Handles phone-specific features:
 *    - Ultra App Blocker (floating window defense, split screen catch, overlay)
 *    - Strict 5-minute break-glass emergency pass
 *    - Device Administrator anti-uninstall shield
 *    - Hardware vibration & local alarm scheduling
 * 
 * 2. For all common/shared functions (Routine, Habits, Study Pods, User Auth):
 *    - Directly calls the primary website backend API at:
 *      https://just-a-tracker.onrender.com/api
 *    - Does NOT modify or duplicate the website backend.
 */

import {
  getBlockerStatus,
  startBlockerSession,
  stopBlockerSession,
  useEmergencyPass,
  checkBlockerPermissions,
  openAccessibilitySettings,
  openOverlaySettings,
  openDeviceAdminSettings,
  getInstalledApps
} from '../utils/appBlocker';

export const WEBSITE_API_BASE = 'https://just-a-tracker.onrender.com/api';

/**
 * Common API Caller: delegates read/write requests to the Website Backend
 */
export async function callWebsiteBackend(endpoint, options = {}) {
  const url = `${WEBSITE_API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'android-mobile',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Website API error ${response.status}: ${errorText}`);
  }

  return await response.json();
}

/**
 * 1. PHONE-SPECIFIC BACKEND FUNCTIONS (Ultra Blocker & Hardware Alarms)
 */
export const PhoneServices = {
  // Ultra Blocker Controls
  getStatus: getBlockerStatus,
  startFocusShield: startBlockerSession,
  stopFocusShield: stopBlockerSession,
  triggerEmergencyPass: useEmergencyPass,
  checkPermissions: checkBlockerPermissions,
  openAccessibility: openAccessibilitySettings,
  openOverlay: openOverlaySettings,
  openDeviceAdmin: openDeviceAdminSettings,
  getInstalledAppsList: getInstalledApps
};

/**
 * 2. SHARED SERVICES: Calling the Website Backend APIs
 */
export const SharedServices = {
  // Routine & Timetable
  getDay: async (date, token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await callWebsiteBackend(`/days/${date}`, { headers });
  },

  saveDay: async (date, dayData, token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await callWebsiteBackend(`/days/${date}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(dayData)
    });
  },

  // Study Pods (Join, Read, Leaderboard)
  getPods: async (token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await callWebsiteBackend('/groups', { headers });
  },

  joinPod: async (inviteCode, token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await callWebsiteBackend('/groups/join', {
      method: 'POST',
      headers,
      body: JSON.stringify({ invite_code: inviteCode })
    });
  },

  getPodLeaderboard: async (podId, token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await callWebsiteBackend(`/groups/${podId}/leaderboard`, { headers });
  },

  // Authentication
  login: async (username, password) => {
    return await callWebsiteBackend('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  register: async (username, password) => {
    return await callWebsiteBackend('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }
};

export default {
  Phone: PhoneServices,
  Shared: SharedServices,
  WEBSITE_API_BASE
};
