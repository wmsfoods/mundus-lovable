import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

/** @deprecated Use useCurrentCompany(). Kept for legacy imports. */
export const MOCK_SUPPLIER_COMPANY_ID = "0c543bae-647d-4f2e-980a-e35e70a94674";

export type SupplierProfileType =
  | "master_supplier"
  | "operator"
  | "export_manager"
  | "quality_control"
  | "logistics";

export type SupplierUser = {
  id: string;
  userNumber: number;
  name: string;
  jobTitle: string;
  phone: string | null;
  notes: string | null;
  email: string;
  profileType: SupplierProfileType;
  createdAt: string;
  lastLoginAt: string | null;
  status: "active" | "invited" | "inactive";
  avatarUrl: string | null;
  inviteToken: string | null;
};

export function useSupplierUsers(companyIdOverride?: string | null) {
  const [data, setData] = useState<SupplierUser[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { company } = useCurrentCompany();
  const companyId = companyIdOverride ?? company?.id ?? null;

  const load = useCallback(async () => {
    if (!companyId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: rows, error: err } = await (supabase as any)
      .from("company_users")
      .select("id, full_name, email, role, status, created_at, accepted_at, job_title, phone, notes, last_login_at, avatar_url, invite_token")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (err) {
      setError(err as unknown as Error);
      setData([]);
    } else {
      setData(
        (rows || []).map((r: any, idx: number) => ({
          id: r.id,
          userNumber: idx + 1,
          name: r.full_name || r.email || "—",
          jobTitle: r.job_title || "",
          phone: r.phone || null,
          notes: r.notes || null,
          email: r.email || "",
          profileType: (r.role || "operator") as SupplierProfileType,
          createdAt: r.created_at,
          lastLoginAt: r.last_login_at || r.accepted_at,
          status: (r.status === "pending" ? "invited" : r.status) as SupplierUser["status"],
          avatarUrl: r.avatar_url || null,
          inviteToken: r.invite_token || null,
        })),
      );
      setError(null);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}