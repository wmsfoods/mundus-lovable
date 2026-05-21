import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MOCK_SUPPLIER_COMPANY_ID = "0c543bae-647d-4f2e-980a-e35e70a94674";

export type SupplierProfileType =
  | "master_supplier"
  | "operator"
  | "export_manager"
  | "quality_control"
  | "logistics";

export type SupplierUser = {
  id: string;
  name: string;
  jobTitle: string;
  email: string;
  profileType: SupplierProfileType;
  createdAt: string;
  lastLoginAt: string | null;
  status: "active" | "invited" | "inactive";
};

export function useSupplierUsers() {
  const [data, setData] = useState<SupplierUser[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows, error: err } = await (supabase as any)
      .from("company_users")
      .select("id, full_name, email, role, status, created_at, accepted_at")
      .eq("company_id", MOCK_SUPPLIER_COMPANY_ID)
      .order("created_at", { ascending: true });
    if (err) {
      setError(err as unknown as Error);
      setData([]);
    } else {
      setData(
        (rows || []).map((r: any) => ({
          id: r.id,
          name: r.full_name || r.email || "—",
          jobTitle: "",
          email: r.email || "",
          profileType: (r.role || "operator") as SupplierProfileType,
          createdAt: r.created_at,
          lastLoginAt: r.accepted_at,
          status: (r.status === "pending" ? "invited" : r.status) as SupplierUser["status"],
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