import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Zap,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import {
  getBlockerStatus,
  getInstalledApps,
  checkBlockerPermissions,
  openAccessibilitySettings,
  openOverlaySettings,
  openDeviceAdminSettings,
  startShieldSession,
  stopShieldSession,
  useEmergencyPass
} from '../utils/appBlocker';

export default function FocusShieldModal({ isOpen, onClose, setToast }) {
  const [status, setStatus] = useState({
    isActive: false,
    remainingSeconds: 0,
    blockedPackages: [],
    isEmergencyPassAvailable: true,
    isEmergencyPassActive: false,
    remainingEmergencySeconds: 0
  });

  const [permissions, setPermissions] = useState({
    accessibilityEnabled: false,
    overlayEnabled: false,
    deviceAdminEnabled: false
  });

  const [installedApps, setInstalledApps] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([
    'com.google.android.youtube',
    'com.instagram.android',
    'com.reddit.frontpage',
    'com.twitter.android'
  ]);
  const [durationMinutes, setDurationMinutes] = useState(180); // Default 3 hours
  const [allowEmergencyPass, setAllowEmergencyPass] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Poll status and permissions when modal is open
  const refresh = useCallback(async () => {
    try {
      const [st, perm, apps] = await Promise.all([
        getBlockerStatus(),
        checkBlockerPermissions(),
        getInstalledApps()
      ]);
      if (st) setStatus(st);
      if (perm) setPermissions(perm);
      if (apps && apps.length > 0) setInstalledApps(apps);
    } catch (e) {
      console.warn('[FocusShieldModal] refresh error:', e);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [isOpen, refresh]);

  const togglePackage = (pkg) => {
    setSelectedPackages(prev => 
      prev.includes(pkg) ? prev.filter(p => p !== pkg) : [...prev, pkg]
    );
  };

  const handleStartShield = async () => {
    if (selectedPackages.length === 0) {
      if (setToast) setToast('⚠️ Please select at least one app to shield.');
      return;
    }

    setLoading(true);
    try {
      const res = await startShieldSession(selectedPackages, durationMinutes, allowEmergencyPass);
      if (res && res.success) {
        if (setToast) setToast(`🛡️ Ultra Focus Shield engaged for ${durationMinutes} minutes!`);
        await refresh();
      } else {
        if (setToast) setToast(res?.message || 'Failed to start session.');
      }
    } catch (e) {
      if (setToast) setToast('Error: ' + (e.message || 'Could not engage shield.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyPass = async () => {
    setLoading(true);
    try {
      const res = await useEmergencyPass();
      if (res && res.success) {
        if (setToast) setToast('⏱️ 5-Minute Emergency Pass Activated! Use it wisely.');
        await refresh();
      } else {
        if (setToast) setToast('❌ Emergency pass is no longer available.');
      }
    } catch (e) {
      if (setToast) setToast('Emergency pass error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (totalSec) => {
    if (!totalSec || totalSec <= 0) return '00:00:00';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return installedApps;
    const q = searchQuery.toLowerCase();
    return installedApps.filter(a => 
      (a.name && a.name.toLowerCase().includes(q)) || 
      (a.package && a.package.toLowerCase().includes(q))
    );
  }, [installedApps, searchQuery]);

  if (!isOpen) return null;

  const allPermsGranted = permissions.accessibilityEnabled && permissions.overlayEnabled;

  return (
    <div className="focus-shield-overlay" onClick={onClose}>
      <div className="focus-shield-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="shield-modal-header">
          <div className="shield-header-title-wrap">
            <div className={`shield-icon-badge ${status.isActive ? 'active' : ''}`}>
              <Shield size={24} />
            </div>
            <div>
              <div className="shield-eyebrow">KERNEL-LEVEL PROTECTION</div>
              <h2 className="shield-modal-title">Ultra Focus Shield & Blocker</h2>
            </div>
          </div>
          <button className="shield-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ACTIVE LOCKDOWN BANNER (Shown when session is active) */}
        {status.isActive ? (
          <div className="shield-active-state-box">
            <div className="shield-active-pulse-ring">
              <span className="pulse-circle" />
              <Lock size={32} />
            </div>

            <div className="shield-timer-display">
              <span className="timer-val">{formatTime(status.remainingSeconds)}</span>
              <span className="timer-label">SESSION TIME REMAINING</span>
            </div>

            {/* Emergency Pass Status */}
            {status.isEmergencyPassActive ? (
              <div className="emergency-active-banner">
                <Zap size={16} />
                <span>
                  EMERGENCY PASS RUNNING: <strong>{formatTime(status.remainingEmergencySeconds)}</strong> LEFT
                </span>
              </div>
            ) : status.isEmergencyPassAvailable ? (
              <div className="emergency-available-box">
                <p>Need access for a quick urgent task? You have 1 emergency allowance.</p>
                <button
                  type="button"
                  className="emergency-trigger-btn"
                  onClick={handleEmergencyPass}
                  disabled={loading}
                >
                  <Zap size={14} />
                  <span>Use 1x Emergency Pass (5 Minutes)</span>
                </button>
              </div>
            ) : (
              <div className="emergency-exhausted-badge">
                <AlertTriangle size={14} />
                <span>1x Emergency pass already used. Full lockdown enforced.</span>
              </div>
            )}

            {/* Blocked Apps count */}
            <div className="active-blocked-tags">
              <span>Shielding {status.blockedPackages?.length || 0} Apps (Floating windows & Pop-ups caught instantly)</span>
            </div>
          </div>
        ) : (
          /* CONFIGURATION VIEW (When idle) */
          <div className="shield-config-scroll">
            {/* 1. Android Permission Status Cards */}
            <div className="shield-permissions-section">
              <div className="section-head">
                <span className="section-step">STEP 1</span>
                <h4>Required Android Shield Permissions</h4>
              </div>

              <div className="permission-cards-grid">
                {/* Accessibility Permission */}
                <div className={`permission-card ${permissions.accessibilityEnabled ? 'granted' : 'needed'}`}>
                  <div className="perm-info">
                    <strong>Accessibility Watchdog</strong>
                    <p>Detects full-screen, split-screen, and floating pop-ups.</p>
                  </div>
                  {permissions.accessibilityEnabled ? (
                    <span className="perm-badge ok"><Check size={12} /> Active</span>
                  ) : (
                    <button type="button" className="perm-action-btn" onClick={openAccessibilitySettings}>
                      Enable
                    </button>
                  )}
                </div>

                {/* Overlay Permission */}
                <div className={`permission-card ${permissions.overlayEnabled ? 'granted' : 'needed'}`}>
                  <div className="perm-info">
                    <strong>Draw Over Other Apps</strong>
                    <p>Shows the immediate lockdown screen when an app is caught.</p>
                  </div>
                  {permissions.overlayEnabled ? (
                    <span className="perm-badge ok"><Check size={12} /> Active</span>
                  ) : (
                    <button type="button" className="perm-action-btn" onClick={openOverlaySettings}>
                      Enable
                    </button>
                  )}
                </div>

                {/* Anti-Uninstall Device Admin */}
                <div className={`permission-card ${permissions.deviceAdminEnabled ? 'granted' : 'optional'}`}>
                  <div className="perm-info">
                    <strong>Anti-Uninstall Device Admin</strong>
                    <p>Greys out "Uninstall" in Android settings during focus blocks.</p>
                  </div>
                  {permissions.deviceAdminEnabled ? (
                    <span className="perm-badge ok"><ShieldCheck size={12} /> Protected</span>
                  ) : (
                    <button type="button" className="perm-action-btn admin" onClick={openDeviceAdminSettings}>
                      Protect APK
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Duration Selector */}
            <div className="shield-duration-section">
              <div className="section-head">
                <span className="section-step">STEP 2</span>
                <h4>Session Lockdown Duration</h4>
              </div>

              <div className="duration-pills-row">
                {[
                  { label: '30 Min', mins: 30 },
                  { label: '1 Hour', mins: 60 },
                  { label: '2 Hours', mins: 120 },
                  { label: '3 Hours', mins: 180 },
                  { label: '4 Hours', mins: 240 },
                  { label: '5 Hours', mins: 300 }
                ].map(opt => (
                  <button
                    key={opt.mins}
                    type="button"
                    className={`duration-pill ${durationMinutes === opt.mins ? 'active' : ''}`}
                    onClick={() => setDurationMinutes(opt.mins)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Emergency Pass Toggle */}
            <div className="shield-emergency-option-card">
              <label className="emergency-checkbox-label">
                <input
                  type="checkbox"
                  checked={allowEmergencyPass}
                  onChange={e => setAllowEmergencyPass(e.target.checked)}
                />
                <div className="emergency-opt-content">
                  <div className="emergency-opt-title">
                    <Zap size={14} />
                    <span>Include 1x Emergency Pass (5 Minutes)</span>
                  </div>
                  <p>
                    Allows exactly ONE 5-minute unlock during an emergency. When the 5 minutes expire,
                    the app is locked again for the remaining hours with no more passes.
                  </p>
                </div>
              </label>
            </div>

            {/* 4. Select Apps to Shield */}
            <div className="shield-apps-section">
              <div className="section-head">
                <div className="section-head-left">
                  <span className="section-step">STEP 3</span>
                  <h4>Target Distracting Apps ({selectedPackages.length} Selected)</h4>
                </div>
                <div className="section-head-actions">
                  <button
                    type="button"
                    className="select-all-btn"
                    onClick={() => {
                      if (selectedPackages.length === installedApps.length) {
                        setSelectedPackages([]);
                      } else {
                        setSelectedPackages(installedApps.map(a => a.package));
                      }
                    }}
                  >
                    {selectedPackages.length === installedApps.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Search Box */}
              <div className="apps-search-wrap">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search installed apps..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Apps Grid */}
              <div className="apps-checkbox-list">
                {filteredApps.map(app => {
                  const isChecked = selectedPackages.includes(app.package);
                  return (
                    <div
                      key={app.package}
                      className={`app-item-row ${isChecked ? 'selected' : ''}`}
                      onClick={() => togglePackage(app.package)}
                    >
                      <div className="app-item-left">
                        <div className={`app-check-box ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <Check size={12} />}
                        </div>
                        <div className="app-meta">
                          <strong className="app-name">{app.name}</strong>
                          <span className="app-pkg">{app.package}</span>
                        </div>
                      </div>
                      {app.category && <span className="app-cat-badge">{app.category}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Engage Shield Button */}
            <div className="shield-footer-action">
              <button
                type="button"
                className="engage-shield-btn"
                onClick={handleStartShield}
                disabled={loading || selectedPackages.length === 0}
              >
                <Shield size={18} />
                <span>
                  {loading 
                    ? 'Engaging Shield...' 
                    : `Engage Ultra Shield (${durationMinutes} Mins · ${selectedPackages.length} Apps)`}
                </span>
              </button>
              <p className="shield-sub-warning">
                🔒 Once engaged, blocked apps cannot be opened. Floating windows and pop-ups will be dismissed immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
