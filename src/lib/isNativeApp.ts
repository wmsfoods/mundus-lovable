import { Capacitor } from "@capacitor/core";

/** True inside Capacitor iOS/Android shell (not mobile Safari or dev browser). */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
