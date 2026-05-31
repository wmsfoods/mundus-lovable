import { supabase } from "@/integrations/supabase/client";

export type NotificationIcon =
  | "bell"
  | "package"
  | "chat"
  | "dollar"
  | "truck"
  | "alert"
  | "check";

export type NotificationCategory =
  | "orders"
  | "negotiations"
  | "offers"
  | "requests"
  | "system"
  | "chat";

export type CreateNotificationInput = {
  userId: string;
  companyId?: string | null;
  title: string;
  body?: string;
  icon?: NotificationIcon;
  category?: NotificationCategory;
  linkUrl?: string;
  linkLabel?: string;
  relatedType?: string;
  relatedId?: string;
};

/** Create a single in-app notification for a specific user. */
export async function createNotification(params: CreateNotificationInput) {
  const { error } = await supabase.rpc("enqueue_app_notifications", {
    p_user_ids: [params.userId],
    p_company_id: params.companyId ?? null,
    p_title: params.title,
    p_body: params.body ?? null,
    p_icon: params.icon ?? "bell",
    p_category: params.category ?? "system",
    p_link_url: params.linkUrl ?? null,
    p_link_label: params.linkLabel ?? null,
    p_related_type: params.relatedType ?? null,
    p_related_id: params.relatedId ?? null,
  });
  if (error) {
    // Non-blocking: log but never throw, notifications must never break flows.
    // eslint-disable-next-line no-console
    console.warn("[notifications] createNotification failed:", error.message);
  }
}

export type NotifyCompanyUsersInput = Omit<CreateNotificationInput, "userId" | "companyId"> & {
  companyId: string;
};

/** Fan-out a notification to all active users of a company. */
export async function notifyCompanyUsers(params: NotifyCompanyUsersInput) {
  // Resolve active recipients via SECURITY DEFINER RPC so cross-company
  // notifications (e.g. buyer -> supplier) bypass per-company RLS on company_users.
  const { data: recipients, error: lookupErr } = await supabase.rpc(
    "get_company_active_user_ids",
    { p_company_id: params.companyId },
  );
  if (lookupErr) {
    console.warn("[notifications] notifyCompanyUsers lookup failed:", lookupErr.message);
    return;
  }
  const userIds = (recipients ?? [])
    .map((r: any) => r.user_id as string)
    .filter(Boolean);
  if (userIds.length === 0) return;

  const { error } = await supabase.rpc("enqueue_app_notifications", {
    p_user_ids: userIds,
    p_company_id: params.companyId,
    p_title: params.title,
    p_body: params.body ?? null,
    p_icon: params.icon ?? "bell",
    p_category: params.category ?? "system",
    p_link_url: params.linkUrl ?? null,
    p_link_label: params.linkLabel ?? null,
    p_related_type: params.relatedType ?? null,
    p_related_id: params.relatedId ?? null,
  });
  if (error) {
    console.warn("[notifications] notifyCompanyUsers insert failed:", error.message);
  }
}

/** Format a timestamp like "2m", "14m", "1h", "Yday", "Mon", "Mar 12". */
export function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return "Yday";
  if (diffDays < 7) {
    const d = new Date(then);
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return new Date(then).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}