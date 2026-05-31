import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { applySafeAreaInsets } from "@/lib/platform";

export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "ios") {
      // Keep web content below the status bar; env(safe-area-inset-top) is often 0 in WKWebView.
      await StatusBar.setOverlaysWebView({ overlay: false });
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
}
