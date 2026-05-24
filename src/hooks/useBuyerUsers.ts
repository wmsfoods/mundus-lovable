import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

/** @deprecated Use useCurrentCompany(). Kept for legacy imports. */
export const MOCK_BUYER_COMPANY_ID = "00000000-0000-beef-0000-000000000001";

export type BuyerProfileType =
  | "master_buyer"
  | "procurement"
  | "import_manager"
  | "quality_control"
  | "logistics"
  // legacy
  | "finance"
  | "compliance";

export type BuyerUser = {
  id: string;
  userNumber: number;
  name: string;
  jobTitle: string;
  phone: string | null;
  notes: string | null;
  email: string;
  profileType: BuyerProfileType;
  createdAt: string;
  lastLoginAt: string | null;
  status: "active" | "invited" | "inactive";
};

export function useBuyerUsers() {
  const [data, setData] = useState<BuyerUser[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { company } = useCurrentCompany();
  const companyId = company?.id ?? null;

  const load = useCallback(async () => {
    if (!companyId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: rows, error: err } = await (supabase as any)
      .from("company_users")
      .select("id, full_name, email, role, status, created_at, accepted_at, job_title, phone, notes, last_login_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (err) {
      setError(err as unknown as Error);
      setData([]);
    } else {
      setData(
        (rows || [])
          .filter((r: any) => r.full_name || r.email)
          .map((r: any, idx: number) => ({
            id: r.id,
            userNumber: idx + 1,
            name: r.full_name || r.email || "—",
            jobTitle: r.job_title || "",
            phone: r.phone || null,
            notes: r.notes || null,
            email: r.email || "",
            profileType: (r.role || "procurement") as BuyerProfileType,
            createdAt: r.created_at,
            lastLoginAt: r.last_login_at || r.accepted_at,
            status: (r.status === "pending" ? "invited" : r.status) as BuyerUser["status"],
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
