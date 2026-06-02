import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}
