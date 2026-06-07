import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

const PUSH_NAV_EVENT = "mundus-push-navigate";
const PERMISSION_TIMEOUT_MS = 90_000;

let listenersAttached = false;
let registrationInFlight: Promise<"granted" | "denied" | "unavailable"> | null = null;
let pendingPushToken: string | null = null;

function dispatchPushNavigate(url: string) {
  if (!url) return;
  window.dispatchEvent(new CustomEvent(PUSH_NAV_EVENT, { detail: url }));
}

export function onPushNavigate(handler: (url: string) => void): () => void {
  const listener = (e: Event) => {
    const url = (e as CustomEvent<string>).detail;
    if (url) handler(url);
  };
  window.addEventListener(PUSH_NAV_EVENT, listener);
  return () => window.removeEventListener(PUSH_NAV_EVENT, listener);
}

async function saveToken(token: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    pendingPushToken = token;
    return;
  }

  pendingPushToken = null;

  const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
  const { error } = await supabase.from("device_push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" },
  );
  if (error) {
    console.warn("[push] saveToken failed:", error.message);
  } else {
    console.info("[push] saveToken ok for", userId.slice(0, 8));
  }
}

/** Flush pending token and re-register so the device token is saved for the logged-in user. */
export async function syncPushTokenForUser(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await flushPendingPushToken();

  if (!isPushPluginReady()) return;

  try {
    await attachListeners();
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === "granted") {
      await PushNotifications.register();
    }
  } catch (err) {
    console.warn("[push] syncPushTokenForUser failed:", err);
  }
}

async function attachListeners(): Promise<void> {
  if (listenersAttached) return;
  listenersAttached = true;

  const handles: PluginListenerHandle[] = [];

  handles.push(
    await PushNotifications.addListener("registration", (token) => {
      void saveToken(token.value);
    }),
  );

  handles.push(
    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registrationError", err.error);
    }),
  );

  handles.push(
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url =
        action.notification.data?.url ??
        action.notification.data?.link_url ??
        "";
      dispatchPushNavigate(String(url));
    }),
  );

  handles.push(
    await PushNotifications.addListener("pushNotificationReceived", () => {
      /* foreground — in-app Realtime handles the bell */
    }),
  );

  void handles;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

function isPushPluginReady(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  if (!Capacitor.isPluginAvailable("PushNotifications")) {
    console.error(
      "[push] PushNotifications plugin is not linked in the native build. " +
        "Rebuild in Xcode after `npm run build:mobile`.",
    );
    return false;
  }
  return true;
}

/**
 * Attach listeners and register for a token if permission was already granted.
 * The permission dialog is shown natively in AppDelegate (iOS) at launch.
 */
export async function initPushNotifications(): Promise<void> {
  if (!isPushPluginReady()) return;

  try {
    await attachListeners();
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === "granted") {
      await PushNotifications.register();
    }
  } catch (err) {
    console.warn("[push] init failed:", err);
  }
}

async function registerPushNotificationsOnce(): Promise<"granted" | "denied" | "unavailable"> {
  if (!isPushPluginReady()) return "unavailable";

  try {
    await attachListeners();

    let perm = await PushNotifications.checkPermissions();

    if (perm.receive === "prompt") {
      try {
        perm = await withTimeout(
          PushNotifications.requestPermissions(),
          PERMISSION_TIMEOUT_MS,
          "requestPermissions",
        );
      } catch (err) {
        console.warn("[push] requestPermissions failed:", err);
        return "denied";
      }
    } else if (perm.receive !== "granted") {
      return "denied";
    }

    if (perm.receive !== "granted") {
      return "denied";
    }

    await PushNotifications.register();
    return "granted";
  } catch (err) {
    console.warn("[push] register failed:", err);
    return "denied";
  }
}

/** Manual retry from settings. */
export async function registerPushNotifications(): Promise<"granted" | "denied" | "unavailable"> {
  if (!Capacitor.isNativePlatform()) return "unavailable";

  if (!registrationInFlight) {
    registrationInFlight = registerPushNotificationsOnce().finally(() => {
      registrationInFlight = null;
    });
  }

  return registrationInFlight;
}

export async function getPushPermissionStatus(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return "unavailable";
  try {
    const perm = await PushNotifications.checkPermissions();
    return perm.receive;
  } catch {
    return "unavailable";
  }
}

/** Save token received before login, once user authenticates. */
export async function flushPendingPushToken(): Promise<void> {
  if (!pendingPushToken) return;
  const token = pendingPushToken;
  pendingPushToken = null;
  await saveToken(token);
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  await supabase.from("device_push_tokens").delete().eq("user_id", userId);
}
