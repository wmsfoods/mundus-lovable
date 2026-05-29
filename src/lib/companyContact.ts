import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort lookup of the primary contact e-mail for a company.
 * Used by negotiation flows to send transactional e-mails through
 * the central queue (email_queue) — never throws.
 *
 * Order of preference:
 *   1. company_users where role like '%master%' (active first)
 *   2. company_users any active row
 *   3. users table by company_id / active_company_id
 */
export async function getCompanyPrimaryContact(
  companyId?: string | null,
): Promise<{ email: string; name: string } | null> {
  if (!companyId) return null;
  try {
    // 0) SECURITY DEFINER RPC — works across companies for negotiation
    //    counterparties (regular RLS would block buyer↔supplier lookups).
    const { data: rpcRow } = await (supabase as any).rpc(
      "get_company_primary_contact",
      { p_company_id: companyId },
    );
    const rpc = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
    if (rpc?.email) {
      return { email: rpc.email, name: rpc.full_name || "" };
    }

    // 1) company_users — masters first (fallback for same-company callers)
    const { data: cu } = await (supabase as any)
      .from("company_users")
      .select("email, full_name, role, status")
      .eq("company_id", companyId)
      .order("role", { ascending: true })
      .limit(20);
    const rows: any[] = Array.isArray(cu) ? cu : [];
    const masterActive = rows.find(
      (r) => r?.email && /master/i.test(r?.role ?? "") && r?.status !== "invited",
    );
    if (masterActive?.email) {
      return { email: masterActive.email, name: masterActive.full_name || "" };
    }
    const anyActive = rows.find((r) => r?.email && r?.status !== "invited");
    if (anyActive?.email) {
      return { email: anyActive.email, name: anyActive.full_name || "" };
    }
    const anyRow = rows.find((r) => r?.email);
    if (anyRow?.email) {
      return { email: anyRow.email, name: anyRow.full_name || "" };
    }

    // 2) users table fallback
    const { data: u } = await (supabase as any)
      .from("users")
      .select("email, full_name")
      .or(`company_id.eq.${companyId},active_company_id.eq.${companyId}`)
      .limit(1)
      .maybeSingle();
    if (u?.email) return { email: u.email, name: u.full_name || "" };
  } catch (e) {
    console.warn("[getCompanyPrimaryContact] lookup failed", e);
  }
  return null;
}