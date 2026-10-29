package com.daymark.routine;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Manages the active Focus Shield session, blocked package list,
 * duration timer, and the single-use 5-minute Emergency Pass.
 */
public class BlockerSessionManager {
    private static final String PREF_NAME = "daymark_shield_prefs";
    private static final String KEY_IS_ACTIVE = "shield_is_active";
    private static final String KEY_END_TIME = "shield_end_time";
    private static final String KEY_TOTAL_DURATION_MS = "shield_total_duration_ms";
    private static final String KEY_BLOCKED_PACKAGES = "shield_blocked_packages";
    private static final String KEY_HAS_EMERGENCY_PASS = "shield_has_emergency_pass";
    private static final String KEY_EMERGENCY_USED = "shield_emergency_used";
    private static final String KEY_EMERGENCY_ACTIVE = "shield_emergency_active";
    private static final String KEY_EMERGENCY_END_TIME = "shield_emergency_end_time";

    private static BlockerSessionManager instance;
    private final SharedPreferences prefs;

    private BlockerSessionManager(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public static synchronized BlockerSessionManager getInstance(Context context) {
        if (instance == null) {
            instance = new BlockerSessionManager(context);
        }
        return instance;
    }

    public synchronized void startSession(Set<String> packages, long durationMinutes, boolean allowEmergencyPass) {
        long now = System.currentTimeMillis();
        long durationMs = durationMinutes * 60 * 1000L;
        long endTime = now + durationMs;

        prefs.edit()
            .putBoolean(KEY_IS_ACTIVE, true)
            .putLong(KEY_END_TIME, endTime)
            .putLong(KEY_TOTAL_DURATION_MS, durationMs)
            .putStringSet(KEY_BLOCKED_PACKAGES, new HashSet<>(packages))
            .putBoolean(KEY_HAS_EMERGENCY_PASS, allowEmergencyPass)
            .putBoolean(KEY_EMERGENCY_USED, false)
            .putBoolean(KEY_EMERGENCY_ACTIVE, false)
            .putLong(KEY_EMERGENCY_END_TIME, 0L)
            .apply();
    }

    public synchronized boolean stopSession(boolean force) {
        long now = System.currentTimeMillis();
        long endTime = prefs.getLong(KEY_END_TIME, 0L);

        // If not force, only allow stopping if time has elapsed
        if (!force && now < endTime) {
            return false;
        }

        prefs.edit()
            .putBoolean(KEY_IS_ACTIVE, false)
            .putBoolean(KEY_EMERGENCY_ACTIVE, false)
            .apply();
        return true;
    }

    /**
     * Activates the 1-time 5-minute Emergency Pass.
     * Returns true if successfully activated, false if already used or session inactive.
     */
    public synchronized boolean useEmergencyPass() {
        if (!isSessionActive()) {
            return false;
        }

        boolean hasPass = prefs.getBoolean(KEY_HAS_EMERGENCY_PASS, true);
        boolean alreadyUsed = prefs.getBoolean(KEY_EMERGENCY_USED, false);

        if (!hasPass || alreadyUsed) {
            return false;
        }

        long now = System.currentTimeMillis();
        long emergencyDurationMs = 5 * 60 * 1000L; // 5 minutes strictly
        long emergencyEndTime = now + emergencyDurationMs;

        prefs.edit()
            .putBoolean(KEY_EMERGENCY_USED, true)
            .putBoolean(KEY_EMERGENCY_ACTIVE, true)
            .putLong(KEY_EMERGENCY_END_TIME, emergencyEndTime)
            .apply();

        return true;
    }

    public synchronized boolean isSessionActive() {
        boolean active = prefs.getBoolean(KEY_IS_ACTIVE, false);
        if (!active) return false;

        long now = System.currentTimeMillis();
        long endTime = prefs.getLong(KEY_END_TIME, 0L);

        if (now >= endTime) {
            // Session expired naturally
            prefs.edit()
                .putBoolean(KEY_IS_ACTIVE, false)
                .putBoolean(KEY_EMERGENCY_ACTIVE, false)
                .apply();
            return false;
        }

        return true;
    }

    public synchronized boolean isEmergencyPassActive() {
        if (!isSessionActive()) return false;
        boolean emergencyActive = prefs.getBoolean(KEY_EMERGENCY_ACTIVE, false);
        if (!emergencyActive) return false;

        long now = System.currentTimeMillis();
        long emergencyEndTime = prefs.getLong(KEY_EMERGENCY_END_TIME, 0L);

        if (now >= emergencyEndTime) {
            // Emergency 5 mins expired! Relock immediately!
            prefs.edit()
                .putBoolean(KEY_EMERGENCY_ACTIVE, false)
                .apply();
            return false;
        }

        return true;
    }

    public synchronized boolean isPackageBlocked(String packageName) {
        if (packageName == null) return false;
        if (!isSessionActive()) return false;

        // If currently in the 5-minute emergency grace window, permit usage!
        if (isEmergencyPassActive()) {
            return false;
        }

        Set<String> blocked = prefs.getStringSet(KEY_BLOCKED_PACKAGES, Collections.emptySet());
        return blocked.contains(packageName);
    }

    public synchronized long getRemainingSessionSeconds() {
        if (!isSessionActive()) return 0;
        long now = System.currentTimeMillis();
        long endTime = prefs.getLong(KEY_END_TIME, 0L);
        return Math.max(0, (endTime - now) / 1000L);
    }

    public synchronized long getRemainingEmergencySeconds() {
        if (!isEmergencyPassActive()) return 0;
        long now = System.currentTimeMillis();
        long emergencyEndTime = prefs.getLong(KEY_EMERGENCY_END_TIME, 0L);
        return Math.max(0, (emergencyEndTime - now) / 1000L);
    }

    public synchronized boolean isEmergencyPassAvailable() {
        boolean hasPass = prefs.getBoolean(KEY_HAS_EMERGENCY_PASS, true);
        boolean alreadyUsed = prefs.getBoolean(KEY_EMERGENCY_USED, false);
        return hasPass && !alreadyUsed;
    }

    public synchronized Set<String> getBlockedPackages() {
        return prefs.getStringSet(KEY_BLOCKED_PACKAGES, Collections.emptySet());
    }
}
