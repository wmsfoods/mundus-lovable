import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminCompanyUserRow = {
  id: string;
  user_id: string | null;
  company_id: string;
  full_name: string;
  email: string;
  role: string | null;
  status: string;
  job_title: string | null;
  phone: string | null;
  notes: string | null;
  language: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  // company joined fields
  company_name: string;
  company_country: string | null;
  company_logo: string | null;
  company_is_buyer: boolean;
  company_is_supplier: boolean;
  company_status: string | null;
};

export function useAdminCompanyUsers() {
  const [rows, setRows] = useState<AdminCompanyUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await (supabase as any)
      .from("company_users")
      .select(
        `id, user_id, company_id, full_name, email, role, status, job_title,
         phone, notes, language, avatar_url, joined_at, accepted_at, created_at,
         updated_at, updated_by,
         companies:company_id ( name, country, logo_url, is_buyer, is_supplier, status )`
      )
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (err) {
      setError(err.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const raw = (data || []) as any[];

    // Resolve updated_by → name (single batched lookup)
    const updaterIds = Array.from(new Set(raw.map((r) => r.updated_by).filter(Boolean))) as string[];
    let updaterMap: Record<string, string> = {};
    if (updaterIds.length) {
      const { data: users } = await (supabase as any)
        .from("users")
        .select("id, name, email")
        .in("id", updaterIds);
      (users || []).forEach((u: any) => {
        updaterMap[u.id] = u.name || u.email || "—";
      });
    }

    setRows(
      raw.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        company_id: r.company_id,
        full_name: r.full_name || "",
        email: r.email || "",
        role: r.role,
        status: r.status || "active",
        job_title: r.job_title,
        phone: r.phone,
        notes: r.notes,
        language: r.language,
        avatar_url: r.avatar_url,
        joined_at: r.joined_at,
        accepted_at: r.accepted_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        updated_by: r.updated_by,
        updated_by_name: r.updated_by ? updaterMap[r.updated_by] ?? null : null,
        company_name: r.companies?.name ?? "—",
        company_country: r.companies?.country ?? null,
        company_logo: r.companies?.logo_url ?? null,
        company_is_buyer: !!r.companies?.is_buyer,
        company_is_supplier: !!r.companies?.is_supplier,
        company_status: r.companies?.status ?? null,
      })),
    );
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const companies = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    rows.forEach((r) => {
      if (!seen.has(r.company_id)) seen.set(r.company_id, { id: r.company_id, name: r.company_name });
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  return { rows, loading, error, refetch: load, companies };
}