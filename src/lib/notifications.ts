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
  const { error } = await supabase.from("app_notifications").insert({
    user_id: params.userId,
    company_id: params.companyId ?? null,
    title: params.title,
    body: params.body ?? null,
    icon: params.icon ?? "bell",
    category: params.category ?? "system",
    link_url: params.linkUrl ?? null,
    link_label: params.linkLabel ?? null,
    related_type: params.relatedType ?? null,
    related_id: params.relatedId ?? null,
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
  const { data: members, error: membersErr } = await supabase
    .from("company_users")
    .select("user_id, status")
    .eq("company_id", params.companyId);

  if (membersErr) {
    console.warn("[notifications] notifyCompanyUsers lookup failed:", membersErr.message);
    return;
  }

  const recipients = (members ?? [])
    .filter((m) => m.user_id && (!m.status || m.status === "active" || m.status === "accepted"))
    .map((m) => m.user_id as string);

  if (recipients.length === 0) return;

  const rows = recipients.map((uid) => ({
    user_id: uid,
    company_id: params.companyId,
    title: params.title,
    body: params.body ?? null,
    icon: params.icon ?? "bell",
    category: params.category ?? "system",
    link_url: params.linkUrl ?? null,
    link_label: params.linkLabel ?? null,
    related_type: params.relatedType ?? null,
    related_id: params.relatedId ?? null,
  }));

  const { error } = await supabase.from("app_notifications").insert(rows);
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