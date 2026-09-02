// Daily "tonight's pick" reminder, using @capacitor/local-notifications on the native Android
// build. This is a *local* notification (scheduled on-device, no server/push infra needed) —
// it can't know at schedule time which title will be recommended weeks from now, so the body
// stays generic and the tap opens the app where the real pick is computed live.
//
// On the web build (npm run dev / a browser tab) there is no native notification center to
// schedule into, so every function here becomes a safe no-op instead of throwing.

import { Capacitor } from "@capacitor/core";

const REMINDER_ID = 4200;
const REMINDER_HOUR = 19; // 7pm local time — evening, when people are actually deciding what to watch

function isNative() {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
}

export async function isNotificationSupported() {
  return isNative();
}

// Returns "granted" | "denied" | "unsupported"
export async function requestNotificationPermission() {
  if (!isNative()) return "unsupported";
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted" ? "granted" : "denied";
  } catch (e) {
    return "unsupported";
  }
}

export async function scheduleDailyReminder(unwatchedCount) {
  if (!isNative()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
    const body = unwatchedCount > 0
      ? `${unwatchedCount} title${unwatchedCount === 1 ? "" : "s"} waiting on your list — tap for tonight's pick.`
      : "Open ScenePick for tonight's pick.";
    await LocalNotifications.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: "🎬 What are you watching tonight?",
        body,
        schedule: { on: { hour: REMINDER_HOUR, minute: 0 }, repeats: true, allowWhileIdle: true },
      }],
    });
    return true;
  } catch (e) {
    return false;
  }
}

export async function cancelDailyReminder() {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  } catch (e) {
    // ignore
  }
}
