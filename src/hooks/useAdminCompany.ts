import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminCompanyFull = {
  id: string;
  company_number: number;
  name: string;
  tax_id: string;
  country: string;
  state: string;
  city: string | null;
  address: string;
  zip_code: string | null;
  phone: string;
  website: string | null;
  logo_url: string | null;
  is_buyer: boolean;
  is_supplier: boolean;
  is_verified: boolean;
  rating: number | null;
  business_types: string | null;
  protein_profiles: string[] | null;
  preferred_cuts: string[] | null;
  status: string | null;
  onboarded_at: string | null;
  onboarded_by: string | null;
  onboarded_from_prospect_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CompanyPatch = Partial<Omit<AdminCompanyFull, "id" | "company_number" | "created_at" | "updated_at">>;

export function useAdminCompany(id: string | undefined) {
  const [data, setData] = useState<AdminCompanyFull | null>(null);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: row, error: err } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (err) setError(err.message);
    setData((row as AdminCompanyFull) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (patch: CompanyPatch): Promise<{ ok: boolean; error?: string }> => {
    if (!id) return { ok: false, error: "missing_id" };
    const { error: err } = await supabase.from("companies").update(patch as never).eq("id", id);
    if (err) return { ok: false, error: err.message };
    await load();
    return { ok: true };
  }, [id, load]);

  const create = useCallback(async (payload: CompanyPatch): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { data: row, error: err } = await supabase
      .from("companies")
      .insert(payload as never)
      .select("id")
      .single();
    if (err) return { ok: false, error: err.message };
    return { ok: true, id: (row as { id: string }).id };
  }, []);

  const setActive = useCallback(async (active: boolean) => {
    return save({ status: active ? "active" : "inactive" });
  }, [save]);

  return { data, loading, error, refresh: load, save, create, setActive };
}