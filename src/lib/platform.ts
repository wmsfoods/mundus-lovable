import { Capacitor } from "@capacitor/core";

let safeAreaListenerAttached = false;

/**
 * WKWebView often reports env(safe-area-inset-*) as 0 on fixed roots.
 * Probe the real insets once and expose them as CSS variables.
 */
export function applySafeAreaInsets(): void {
  if (typeof document === "undefined") return;

  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position: fixed",
    "top: 0",
    "left: 0",
    "visibility: hidden",
    "pointer-events: none",
    "padding-top: env(safe-area-inset-top)",
    "padding-right: env(safe-area-inset-right)",
    "padding-bottom: env(safe-area-inset-bottom)",
    "padding-left: env(safe-area-inset-left)",
  ].join(";");
  document.documentElement.appendChild(probe);

  const style = getComputedStyle(probe);
  const root = document.documentElement;
  if (style.paddingTop) root.style.setProperty("--safe-top", style.paddingTop);
  if (style.paddingRight) root.style.setProperty("--safe-right", style.paddingRight);
  if (style.paddingBottom) root.style.setProperty("--safe-bottom", style.paddingBottom);
  if (style.paddingLeft) root.style.setProperty("--safe-left", style.paddingLeft);
  probe.remove();

  if (!safeAreaListenerAttached) {
    safeAreaListenerAttached = true;
    window.addEventListener("resize", applySafeAreaInsets, { passive: true });
  }
}

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
