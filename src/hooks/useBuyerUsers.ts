import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MOCK_BUYER_COMPANY_ID = "00000000-0000-beef-0000-000000000001";

export type BuyerProfileType =
  | "master_buyer"
  | "procurement"
  | "finance"
  | "compliance";

export type BuyerUser = {
  id: string;
  name: string;
  jobTitle: string;
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

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows, error: err } = await (supabase as any)
      .from("company_users")
      .select("id, full_name, email, role, status, created_at, accepted_at")
      .eq("company_id", MOCK_BUYER_COMPANY_ID)
      .order("created_at", { ascending: true });
    if (err) {
      setError(err as unknown as Error);
      setData([]);
    } else {
      setData(
        (rows || [])
          .filter((r: any) => r.full_name || r.email)
          .map((r: any) => ({
            id: r.id,
            name: r.full_name || r.email || "—",
            jobTitle: "",
            email: r.email || "",
            profileType: (r.role || "procurement") as BuyerProfileType,
            createdAt: r.created_at,
            lastLoginAt: r.accepted_at,
            status: (r.status === "pending" ? "invited" : r.status) as BuyerUser["status"],
          })),
      );
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
