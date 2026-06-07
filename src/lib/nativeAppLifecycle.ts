import { Capacitor } from "@capacitor/core";

/** Subscribe to native app foreground events. Safe when App plugin is missing. */
export async function subscribeNativeAppResume(onActive: () => void): Promise<() => void> {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("App")) {
    return () => {};
  }

  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) onActive();
    });
    return () => void handle.remove();
  } catch (err) {
    console.warn("[native] App plugin unavailable:", err);
    return () => {};
  }
}
