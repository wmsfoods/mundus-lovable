import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { applySafeAreaInsets } from "@/lib/platform";
import { registerPushNotifications } from "@/lib/pushNotifications";

export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "ios") {
      // Edge-to-edge: use env(safe-area-inset-*) / --safe-top in CSS (no extra black band).
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

  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  void registerPushNotifications();
}
