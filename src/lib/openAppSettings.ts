import { Capacitor } from "@capacitor/core";

/** Open the app's page in system Settings (iOS/Android). */
export async function openAppSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  if (Capacitor.getPlatform() === "ios") {
    // UIApplication.openSettingsURLString — works from user gesture in WKWebView
    window.location.href = "app-settings:";
    return true;
  }

  if (Capacitor.getPlatform() === "android") {
    try {
      window.location.href =
        "intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S:android.provider.extra.APP_PACKAGE=com.mundustrade.app;end";
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
