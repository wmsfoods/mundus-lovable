import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

const PUSH_NAV_EVENT = "mundus-push-navigate";
const PENDING_TOKEN_KEY = "mundus.pendingPushToken";
const PERMISSION_TIMEOUT_MS = 90_000;
const PERMISSION_POLL_DELAYS_MS = [500, 1000, 2000, 3000, 5000];

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

async function persistPendingToken(token: string): Promise<void> {
  pendingPushToken = token;
  try {
    await Preferences.set({ key: PENDING_TOKEN_KEY, value: token });
  } catch {
    /* ignore */
  }
}

async function clearPendingToken(): Promise<void> {
  pendingPushToken = null;
  try {
    await Preferences.remove({ key: PENDING_TOKEN_KEY });
  } catch {
    /* ignore */
  }
}

async function loadPersistedPendingToken(): Promise<void> {
  if (pendingPushToken) return;
  try {
    const { value } = await Preferences.get({ key: PENDING_TOKEN_KEY });
    if (value) pendingPushToken = value;
  } catch {
    /* ignore */
  }
}

async function resolveUserId(): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user?.id) return userData.user.id;
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user?.id ?? null;
}

async function saveToken(token: string): Promise<void> {
  const userId = await resolveUserId();
  if (!userId) {
    await persistPendingToken(token);
    console.info("[push] token queued (no session yet)");
    return;
  }

  await clearPendingToken();

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
    console.warn("[push] saveToken failed:", error.message, error.code);
    await persistPendingToken(token);
  } else {
    console.info("[push] saveToken ok for", userId.slice(0, 8));
  }
}

/** Re-request APNs/FCM token after listeners are attached (iOS may skip if already registered). */
async function forceRegister(): Promise<void> {
  try {
    await PushNotifications.unregister();
  } catch {
    /* unregister may be unsupported on some platforms */
  }
  await PushNotifications.register();
}

async function registerIfGranted(): Promise<boolean> {
  const perm = await PushNotifications.checkPermissions();
  if (perm.receive !== "granted") return false;
  await forceRegister();
  return true;
}

/** Flush pending token and re-register so the device token is saved for the logged-in user. */
export async function syncPushTokenForUser(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await loadPersistedPendingToken();
  await flushPendingPushToken();

  if (!isPushPluginReady()) return;

  try {
    await attachListeners();
    if (await registerIfGranted()) return;
    for (const delay of PERMISSION_POLL_DELAYS_MS) {
      await new Promise((r) => window.setTimeout(r, delay));
      if (await registerIfGranted()) return;
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
      console.info("[push] registration event, len=", token.value.length);
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
    if (await registerIfGranted()) return;
    // Native permission dialog may still be open when this runs.
    for (const delay of PERMISSION_POLL_DELAYS_MS) {
      await new Promise((r) => window.setTimeout(r, delay));
      if (await registerIfGranted()) return;
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

    await forceRegister();
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
  await loadPersistedPendingToken();
  if (!pendingPushToken) return;
  const token = pendingPushToken;
  await saveToken(token);
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const userId = await resolveUserId();
  if (!userId) return;
  await supabase.from("device_push_tokens").delete().eq("user_id", userId);
  await clearPendingToken();
}
