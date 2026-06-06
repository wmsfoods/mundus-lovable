/**
 * Server-side push dispatch helpers.
 * Primary path: INSERT into app_notifications → DB trigger/webhook → send-push edge fn.
 * This helper is for explicit client-side fan-out (e.g. closeDeal) when needed.
 */

import { supabase } from "@/integrations/supabase/client";

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  category?: string;
};

export async function sendPushToCompanyUsers(
  companyId: string | null | undefined,
  payload: PushPayload,
): Promise<{ delivered: number; skipped: boolean }> {
  if (!companyId) return { delivered: 0, skipped: true };

  try {
    const { data: recipients, error: lookupErr } = await supabase.rpc(
      "get_company_active_user_ids",
      { p_company_id: companyId },
    );
    if (lookupErr || !recipients?.length) return { delivered: 0, skipped: true };

    const userIds = (recipients as { user_id: string }[])
      .map((r) => r.user_id)
      .filter(Boolean);
    if (userIds.length === 0) return { delivered: 0, skipped: true };

    let totalDelivered = 0;
    for (const userId of userIds) {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          user_id: userId,
          title: payload.title,
          body: payload.body ?? null,
          url: payload.url ?? null,
          category: payload.category ?? "system",
        },
      });
      if (!error && data && typeof data.delivered === "number") {
        totalDelivered += data.delivered;
      }
    }

    return { delivered: totalDelivered, skipped: totalDelivered === 0 };
  } catch {
    return { delivered: 0, skipped: true };
  }
}
