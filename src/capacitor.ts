import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { applySafeAreaInsets } from "@/lib/platform";
import { initPushNotifications } from "@/lib/pushNotifications";

export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "ios") {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
      document.body.classList.add("status-bar-overlay");
    }
  } catch {
    // Status bar plugin not available on all platforms
  }

  applySafeAreaInsets();

  try {
    await SplashScreen.hide();
  } catch {
    // Splash may already be hidden
  }

  applySafeAreaInsets();

  // Listeners only — permission dialog is native (AppDelegate on iOS).
  void initPushNotifications();

  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) applySafeAreaInsets();
  });

  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
}
