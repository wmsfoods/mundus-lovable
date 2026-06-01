/**
 * Mobile push notifications — Phase 1 stub.
 *
 * No Capacitor PushNotifications plugin is installed yet and there is no
 * `device_push_tokens` table, so this helper is intentionally a no-op that
 * resolves successfully. This satisfies the "degrade gracefully" requirement
 * (callers can always await it without try/catch).
 *
 * Phase 2 TODO:
 *   - install @capacitor/push-notifications
 *   - capture token on app start (src/capacitor.ts)
 *   - create `device_push_tokens(user_id, token, platform)` table + RLS
 *   - add `supabase/functions/send-push/index.ts` (FCM/APNs)
 *   - replace the body of `sendPushToCompanyUsers` with a call to that fn
 */

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  category?: string;
};

export async function sendPushToCompanyUsers(
  _companyId: string | null | undefined,
  _payload: PushPayload,
): Promise<{ delivered: number; skipped: boolean }> {
  // Phase 1: no tokens registered anywhere → always "skipped".
  // Returning a resolved value (never throws) guarantees graceful degradation.
  return { delivered: 0, skipped: true };
}