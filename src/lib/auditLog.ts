import { supabase } from "@/integrations/supabase/client";

export type AuditCategory =
  | "offer"
  | "request"
  | "negotiation"
  | "order"
  | "company"
  | "user"
  | "catalog"
  | "system"
  | "auth";

export interface AuditEntry {
  action: string;
  category: AuditCategory;
  entityType?: string;
  entityId?: string | null;
  entityLabel?: string | null;
  details?: Record<string, any>;
  severity?: "info" | "warn" | "critical";
}

/**
 * Fire-and-forget audit log. NEVER throws. NEVER blocks the main flow.
 * Resolves the actor (user + company + role) from the current session.
 */
export function auditLog(entry: AuditEntry): void {
  void writeAudit(entry).catch((e) => {
    console.warn("[audit] Failed to log:", e);
  });
}

async function writeAudit(entry: AuditEntry) {
  const { data: { user } } = await supabase.auth.getUser();

  let companyId: string | null = null;
  let companyName: string | null = null;
  let actorRole: "supplier" | "buyer" | "admin" | "system" = "system";

  if (user) {
    // users table holds active_company_id / company_id
    const { data: u } = await supabase
      .from("users")
      .select("active_company_id, company_id")
      .eq("id", user.id)
      .maybeSingle();

    companyId = (u as any)?.active_company_id ?? (u as any)?.company_id ?? null;

    // Admin check via the existing helper
    try {
      const { data: isAdmin } = await supabase.rpc("is_mundus_admin");
      if (isAdmin === true) actorRole = "admin";
    } catch {
      /* ignore — function may not exist on older envs */
    }

    if (companyId) {
      const { data: co } = await supabase
        .from("companies")
        .select("name, is_supplier, is_buyer")
        .eq("id", companyId)
        .maybeSingle();
      companyName = co?.name ?? null;
      if (actorRole !== "admin") {
        actorRole = co?.is_supplier ? "supplier" : co?.is_buyer ? "buyer" : "system";
      }
    }
  }

  await supabase.from("audit_log" as any).insert({
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    company_id: companyId,
    company_name: companyName,
    actor_role: actorRole,
    action: entry.action,
    category: entry.category,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    entity_label: entry.entityLabel ?? null,
    details: entry.details ?? {},
    severity: entry.severity ?? "info",
  });
}