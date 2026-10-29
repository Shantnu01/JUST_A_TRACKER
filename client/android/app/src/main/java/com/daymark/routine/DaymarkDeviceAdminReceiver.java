package com.daymark.routine;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

/**
 * Android Device Administrator Receiver.
 * When enabled, the Android OS prevents the Daymark Routine app from being uninstalled.
 */
public class DaymarkDeviceAdminReceiver extends DeviceAdminReceiver {

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Toast.makeText(context, "🛡️ Daymark Anti-Uninstall Protection Activated", Toast.LENGTH_SHORT).show();
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        BlockerSessionManager session = BlockerSessionManager.getInstance(context);
        if (session.isSessionActive()) {
            return "⚠️ Warning: A Daymark Focus Shield session is currently active. Disabling Device Admin will break your focus commitment!";
        }
        return "Disabling will remove anti-uninstall protection for Daymark Focus Shield.";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Toast.makeText(context, "Daymark Anti-Uninstall Protection Deactivated", Toast.LENGTH_SHORT).show();
    }
}
