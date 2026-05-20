import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminCompanyRow = {
  id: string;
  company_number: number;
  name: string;
  country: string | null;
  state: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  is_buyer: boolean;
  is_supplier: boolean;
  is_verified: boolean;
  status: string | null;
  onboarded_at: string | null;
  created_at: string | null;
};

type State = {
  rows: AdminCompanyRow[];
  loading: boolean;
  error: string | null;
};

export function useAdminCompanies() {
  const [state, setState] = useState<State>({ rows: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id, company_number, name, country, state, city, phone, website, logo_url, is_buyer, is_supplier, is_verified, status, onboarded_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      setState({ rows: [], loading: false, error: error.message });
      return;
    }
    setState({ rows: (data ?? []) as AdminCompanyRow[], loading: false, error: null });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, refresh: load };
}

export type CompanyTypeFilter = "all" | "buyer" | "supplier" | "both";
export type CompanyStatusFilter = "all" | "active" | "inactive";

export function companyType(c: Pick<AdminCompanyRow, "is_buyer" | "is_supplier">): "buyer" | "supplier" | "both" | "none" {
  if (c.is_buyer && c.is_supplier) return "both";
  if (c.is_buyer) return "buyer";
  if (c.is_supplier) return "supplier";
  return "none";
}