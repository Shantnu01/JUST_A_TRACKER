package com.daymark.routine;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.os.Build;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import java.util.List;

/**
 * High-Performance Accessibility Watchdog.
 * Detects targeted distracting applications across:
 * 1. Fullscreen activities
 * 2. Floating windows / Freeform pop-ups
 * 3. Split-screen multi-window
 * 4. Picture-in-picture (PiP)
 * 5. System Settings tampering attempts (Force stop / disable admin during session)
 */
public class DaymarkAccessibilityService extends AccessibilityService {

    private BlockerSessionManager sessionManager;
    private long lastTriggerTime = 0;
    private static final long TRIGGER_DEBOUNCE_MS = 600;

    @Override
    public void onCreate() {
        super.onCreate();
        sessionManager = BlockerSessionManager.getInstance(this);
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED | AccessibilityEvent.TYPE_WINDOWS_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.notificationTimeout = 40;
        info.flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS 
                   | AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
        setServiceInfo(info);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || sessionManager == null) return;
        if (!sessionManager.isSessionActive()) return;

        // 1. Direct event package check
        CharSequence pkgChar = event.getPackageName();
        if (pkgChar != null) {
            String pkg = pkgChar.toString();
            if (checkAndBlockPackage(pkg)) {
                return;
            }

            // Anti-Tamper: Guard Settings page
            if ("com.android.settings".equals(pkg) || "com.google.android.packageinstaller".equals(pkg)) {
                if (isSettingsTamperingAttempt(event)) {
                    performGlobalAction(GLOBAL_ACTION_HOME);
                    return;
                }
            }
        }

        // 2. Multi-window / Floating window inspection (Android 5.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                List<AccessibilityWindowInfo> windows = getWindows();
                if (windows != null) {
                    for (AccessibilityWindowInfo window : windows) {
                        AccessibilityNodeInfo rootNode = window.getRoot();
                        if (rootNode != null) {
                            CharSequence windowPkg = rootNode.getPackageName();
                            if (windowPkg != null) {
                                String wPkg = windowPkg.toString();
                                if (checkAndBlockPackage(wPkg)) {
                                    rootNode.recycle();
                                    return;
                                }
                            }
                            rootNode.recycle();
                        }
                    }
                }
            } catch (Exception ignored) {
                // Ignore window query failures gracefully
            }
        }
    }

    private boolean checkAndBlockPackage(String packageName) {
        if ("com.daymark.routine".equals(packageName)) {
            return false;
        }

        if (sessionManager.isPackageBlocked(packageName)) {
            long now = System.currentTimeMillis();
            if (now - lastTriggerTime > TRIGGER_DEBOUNCE_MS) {
                lastTriggerTime = now;

                // 1. Instantly dismiss the distracting app (kills floating window & full screen)
                performGlobalAction(GLOBAL_ACTION_HOME);

                // 2. Launch the Focus Shield Lock Screen
                Intent overlay = new Intent(this, BlockOverlayActivity.class);
                overlay.putExtra(BlockOverlayActivity.EXTRA_BLOCKED_PACKAGE, packageName);
                overlay.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK 
                               | Intent.FLAG_ACTIVITY_CLEAR_TOP 
                               | Intent.FLAG_ACTIVITY_NO_ANIMATION);
                startActivity(overlay);
            }
            return true;
        }
        return false;
    }

    /**
     * Prevents user from disabling Daymark permissions or uninstalling via Settings during active blocks.
     */
    private boolean isSettingsTamperingAttempt(AccessibilityEvent event) {
        AccessibilityNodeInfo source = event.getSource();
        if (source == null) return false;

        try {
            // Check if user navigated to Daymark app management or device admin page
            List<AccessibilityNodeInfo> daymarkMatches = source.findAccessibilityNodeInfosByText("Daymark");
            if (daymarkMatches != null && !daymarkMatches.isEmpty()) {
                // If viewing Daymark's App Info or Device Admin page, block immediately
                return true;
            }

            List<AccessibilityNodeInfo> forceStopMatches = source.findAccessibilityNodeInfosByText("Force stop");
            if (forceStopMatches != null && !forceStopMatches.isEmpty()) {
                List<AccessibilityNodeInfo> routineMatches = source.findAccessibilityNodeInfosByText("Daymark Routine");
                if (routineMatches != null && !routineMatches.isEmpty()) {
                    return true;
                }
            }
        } catch (Exception ignored) {
        } finally {
            source.recycle();
        }
        return false;
    }

    @Override
    public void onInterrupt() {
        // Required callback
    }
}
