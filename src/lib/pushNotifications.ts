import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

const PUSH_NAV_EVENT = "mundus-push-navigate";
let listenersAttached = false;
let registrationStarted = false;

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
  if (!userId) return;

  const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
  await supabase.from("device_push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" },
  );
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

  // Foreground: in-app Realtime already updates the bell; avoid duplicate OS banner noise.
  handles.push(
    await PushNotifications.addListener("pushNotificationReceived", () => {
      /* intentionally empty */
    }),
  );

  void handles;
}

/** Register for push on native platforms after login. Safe to call multiple times. */
export async function registerPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (registrationStarted) {
    await PushNotifications.register();
    return;
  }
  registrationStarted = true;

  await attachListeners();

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") return;

  await PushNotifications.register();
}

/** Remove all tokens for the current user on sign-out. */
export async function unregisterPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  await supabase.from("device_push_tokens").delete().eq("user_id", userId);
  registrationStarted = false;
}
