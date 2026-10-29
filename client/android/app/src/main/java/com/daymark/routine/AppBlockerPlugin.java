package com.daymark.routine;

import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;

@CapacitorPlugin(name = "AppBlocker")
public class AppBlockerPlugin extends Plugin {

    private BlockerSessionManager sessionManager;

    @Override
    public void load() {
        super.load();
        sessionManager = BlockerSessionManager.getInstance(getContext());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean isActive = sessionManager.isSessionActive();
        ret.put("isActive", isActive);
        ret.put("remainingSeconds", sessionManager.getRemainingSessionSeconds());

        JSArray pkgs = new JSArray();
        for (String p : sessionManager.getBlockedPackages()) {
            pkgs.put(p);
        }
        ret.put("blockedPackages", pkgs);
        ret.put("isEmergencyPassAvailable", sessionManager.isEmergencyPassAvailable());
        ret.put("isEmergencyPassActive", sessionManager.isEmergencyPassActive());
        ret.put("remainingEmergencySeconds", sessionManager.getRemainingEmergencySeconds());

        call.resolve(ret);
    }

    @PluginMethod
    public void startSession(PluginCall call) {
        JSArray pkgsArray = call.getArray("packages", new JSArray());
        int durationMinutes = call.getInt("durationMinutes", 60);
        boolean allowEmergencyPass = call.getBoolean("allowEmergencyPass", true);

        Set<String> set = new HashSet<>();
        for (int i = 0; i < pkgsArray.length(); i++) {
            try {
                String pkg = pkgsArray.getString(i);
                if (pkg != null && !pkg.trim().isEmpty()) {
                    set.add(pkg.trim());
                }
            } catch (Exception ignored) {}
        }

        if (set.isEmpty()) {
            call.reject("Please select at least one application to shield.");
            return;
        }

        sessionManager.startSession(set, durationMinutes, allowEmergencyPass);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("remainingSeconds", sessionManager.getRemainingSessionSeconds());
        call.resolve(ret);
    }

    @PluginMethod
    public void stopSession(PluginCall call) {
        boolean force = call.getBoolean("force", false);
        boolean stopped = sessionManager.stopSession(force);

        JSObject ret = new JSObject();
        ret.put("success", stopped);
        if (!stopped) {
            ret.put("message", "Lockdown session is still active and cannot be terminated early.");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void useEmergencyPass(PluginCall call) {
        boolean ok = sessionManager.useEmergencyPass();
        JSObject ret = new JSObject();
        ret.put("success", ok);
        ret.put("remainingEmergencySeconds", sessionManager.getRemainingEmergencySeconds());
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();

        // 1. Accessibility Service check
        boolean accessibility = isAccessibilityServiceEnabled(ctx, DaymarkAccessibilityService.class);
        ret.put("accessibilityEnabled", accessibility);

        // 2. Overlay / Draw over other apps
        boolean overlay = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            overlay = Settings.canDrawOverlays(ctx);
        }
        ret.put("overlayEnabled", overlay);

        // 3. Device Admin check
        DevicePolicyManager dpm = (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
        ComponentName adminComp = new ComponentName(ctx, DaymarkDeviceAdminReceiver.class);
        boolean adminActive = dpm != null && dpm.isAdminActive(adminComp);
        ret.put("deviceAdminEnabled", adminActive);

        call.resolve(ret);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void openDeviceAdminSettings(PluginCall call) {
        Context ctx = getContext();
        ComponentName adminComp = new ComponentName(ctx, DaymarkDeviceAdminReceiver.class);
        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComp);
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Activate Daymark as a Device Administrator to enable anti-uninstall protection and prevent tampering during active focus sessions.");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        Context ctx = getContext();
        PackageManager pm = ctx.getPackageManager();

        Map<String, String> appsMap = new LinkedHashMap<>();

        // 1. Popular Focus Distractor Presets
        appsMap.put("com.google.android.youtube", "YouTube");
        appsMap.put("com.instagram.android", "Instagram");
        appsMap.put("com.reddit.frontpage", "Reddit");
        appsMap.put("com.twitter.android", "X / Twitter");
        appsMap.put("com.snapchat.android", "Snapchat");
        appsMap.put("com.zhiliaoapp.musically", "TikTok");
        appsMap.put("com.facebook.katana", "Facebook");
        appsMap.put("com.netflix.mediaclient", "Netflix");
        appsMap.put("com.android.chrome", "Google Chrome");

        // 2. Query all launchable apps installed on the device
        Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> pkgAppsList = pm.queryIntentActivities(mainIntent, 0);

        String myPkg = ctx.getPackageName();
        if (pkgAppsList != null) {
            for (ResolveInfo resolveInfo : pkgAppsList) {
                if (resolveInfo.activityInfo != null && resolveInfo.activityInfo.packageName != null) {
                    String pkg = resolveInfo.activityInfo.packageName;
                    if (!myPkg.equals(pkg)) {
                        CharSequence label = resolveInfo.loadLabel(pm);
                        appsMap.put(pkg, label != null ? label.toString() : pkg);
                    }
                }
            }
        }

        // Convert to sorted JSArray
        List<Map.Entry<String, String>> list = new ArrayList<>(appsMap.entrySet());
        Collections.sort(list, new Comparator<Map.Entry<String, String>>() {
            @Override
            public int compare(Map.Entry<String, String> o1, Map.Entry<String, String> o2) {
                return o1.getValue().compareToIgnoreCase(o2.getValue());
            }
        });

        JSArray result = new JSArray();
        for (Map.Entry<String, String> entry : list) {
            JSObject item = new JSObject();
            item.put("package", entry.getKey());
            item.put("name", entry.getValue());
            result.put(item);
        }

        JSObject ret = new JSObject();
        ret.put("apps", result);
        call.resolve(ret);
    }

    private boolean isAccessibilityServiceEnabled(Context context, Class<?> serviceClass) {
        String expectedComponentName = new ComponentName(context, serviceClass).flattenToString();
        String enabledServices = Settings.Secure.getString(
                context.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabledServices == null) return false;

        String[] services = enabledServices.split(":");
        for (String s : services) {
            if (s.equalsIgnoreCase(expectedComponentName)) {
                return true;
            }
        }
        return false;
    }
}
