import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AppNotificationInsert = {
  userId: string;
  companyId?: string | null;
  title: string;
  body?: string | null;
  icon?: string;
  category?: string;
  linkUrl?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
};

/** Insert a single in-app notification (service role). Triggers push dispatch via DB webhook/trigger. */
export async function insertAppNotification(
  supabase: SupabaseClient,
  params: AppNotificationInsert,
): Promise<void> {
  const { error } = await supabase.from("app_notifications").insert({
    user_id: params.userId,
    company_id: params.companyId ?? null,
    title: params.title,
    body: params.body ?? null,
    icon: params.icon ?? "bell",
    category: params.category ?? "system",
    link_url: params.linkUrl ?? null,
    link_label: params.linkUrl ? "Open" : null,
    related_type: params.relatedType ?? null,
    related_id: params.relatedId ?? null,
  });
  if (error) console.warn("[insertAppNotification]", error.message);
}

/** Fan-out in-app notifications to all active users of a company. */
export async function insertAppNotificationForCompany(
  supabase: SupabaseClient,
  companyId: string,
  params: Omit<AppNotificationInsert, "userId" | "companyId">,
): Promise<void> {
  const { data: recipients, error } = await supabase.rpc("get_company_active_user_ids", {
    p_company_id: companyId,
  });
  if (error || !recipients?.length) return;

  const rows = (recipients as { user_id: string }[])
    .map((r) => r.user_id)
    .filter(Boolean)
    .map((userId) => ({
      user_id: userId,
      company_id: companyId,
      title: params.title,
      body: params.body ?? null,
      icon: params.icon ?? "bell",
      category: params.category ?? "system",
      link_url: params.linkUrl ?? null,
      link_label: params.linkUrl ? "Open" : null,
      related_type: params.relatedType ?? null,
      related_id: params.relatedId ?? null,
    }));

  if (rows.length === 0) return;
  const { error: insertErr } = await supabase.from("app_notifications").insert(rows);
  if (insertErr) console.warn("[insertAppNotificationForCompany]", insertErr.message);
}
