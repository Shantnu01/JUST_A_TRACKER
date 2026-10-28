import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, NotificationType } from '@capacitor/haptics';

const ALARM_CHANNEL_ID = 'daymark_routine_alarms';

/**
 * Initialize native local notification channels on Android
 */
export async function initNativeAlarms() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Create high-priority alarm notification channel on Android
    await LocalNotifications.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Routine Alarms & Reminders',
      description: 'High-priority notifications for routine timetable alerts',
      importance: 5, // NotificationManager.IMPORTANCE_HIGH / MAX
      visibility: 1, // VISIBILITY_PUBLIC (shows on lockscreen)
      vibration: true,
      sound: 'alarm.wav',
      lights: true,
      lightColor: '#e59400'
    });

    // Handle when user taps notification
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('[NativeAlarm] User opened alarm notification:', notification);
    });
  } catch (err) {
    console.warn('[NativeAlarm] Error during channel init:', err);
  }
}

/**
 * Convert alarm ID string to a positive 32-bit integer for Capacitor/Android
 */
function toNotificationId(idStr) {
  let hash = 0;
  const str = String(idStr);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

/**
 * Sync routine alarms with Android native alarm manager (LocalNotifications)
 * @param {Array} alarms - Array of alarm objects: { id, time: 'HH:MM', label, enabled }
 */
export async function syncNativeAlarms(alarms) {
  if (!Capacitor.isNativePlatform() || !Array.isArray(alarms)) return;

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }

    // Cancel pending notifications first to avoid ghost duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications && pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const now = new Date();
    const notificationsToSchedule = [];

    alarms.forEach(alarm => {
      if (!alarm.enabled || !alarm.time) return;

      const [hours, minutes] = alarm.time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return;

      const alarmDate = new Date();
      alarmDate.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (alarmDate.getTime() <= now.getTime()) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }

      notificationsToSchedule.push({
        id: toNotificationId(alarm.id),
        title: `⏰ Routine Alert: ${alarm.time}`,
        body: alarm.label || 'Time for your routine activity!',
        schedule: {
          at: alarmDate,
          allowWhileIdle: true
        },
        channelId: ALARM_CHANNEL_ID,
        sound: 'alarm.wav',
        extra: {
          alarmId: alarm.id,
          time: alarm.time
        }
      });
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }
  } catch (err) {
    console.warn('[NativeAlarm] Error scheduling native alarms:', err);
  }
}

/**
 * Trigger native haptic feedback (vibration)
 */
export async function triggerNativeHaptic() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {}
}

/**
 * Check if running in native app wrapper (Android or iOS)
 */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}
