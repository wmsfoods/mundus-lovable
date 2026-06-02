import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { applySafeAreaInsets } from "@/lib/platform";

/** Re-apply safe-area CSS vars and light status bar after dark fullscreen flows (onboarding). */
export async function prepareNativeAuthScreen(): Promise<void> {
  applySafeAreaInsets();

  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "ios") {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
    }
  } catch {
    /* plugin unavailable */
  }
}
