import { Capacitor } from "@capacitor/core";

/** Sync body classes for native-only CSS overrides (safe-area, scroll, layout). */
export function applyPlatformBodyClasses(): void {
  if (typeof document === "undefined") return;
  const { body, documentElement: html } = document;
  if (!Capacitor.isNativePlatform()) return;

  html.classList.add("is-native-scroll-lock");
  body.classList.add("is-native");
  if (Capacitor.getPlatform() === "ios") {
    body.classList.add("is-native-ios");
  } else if (Capacitor.getPlatform() === "android") {
    body.classList.add("is-native-android");
  }
}

export function isNativeIos(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}
