import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SclStatus } from "./useMyCustomers";

export type ConnectedSupplierRow = {
  link_id: string;
  status: SclStatus;
  supplier_office_id: string;
  buyer_company_id: string | null;
  invited_at: string;
  responded_at: string | null;
  reinvite_count: number;
  private_label: string | null;
  notes: string | null;
  office_name: string;
  office_country: string | null;
  parent_company_id: string | null;
  parent_company_name: string | null;
};

const STATUS_ORDER: Record<SclStatus, number> = {
  invited: 0,
  pending_signup: 1,
  accepted: 2,
  declined: 3,
  revoked: 4,
  expired: 5,
};

function useUserCompanyIds(): { ids: string[]; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user?.id) {
      setIds([]);
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: u }, { data: cu }, { data: uo }] = await Promise.all([
        (supabase as any).from("users").select("company_id, active_company_id").eq("id", user.id).maybeSingle(),
        (supabase as any).from("company_users").select("company_id").eq("user_id", user.id).eq("status", "active"),
        (supabase as any).from("user_offices").select("company_id").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const set = new Set<string>();
      if ((u as any)?.company_id) set.add((u as any).company_id);
      if ((u as any)?.active_company_id) set.add((u as any).active_company_id);
      for (const r of (cu as any[]) ?? []) if (r.company_id) set.add(r.company_id);
      for (const r of (uo as any[]) ?? []) if (r.company_id) set.add(r.company_id);
      setIds(Array.from(set));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return { ids, loading };
}

export function useMyConnectedSuppliers(opts: { enabled?: boolean } = {}) {
  const { ids: companyIds, loading: idsLoading } = useUserCompanyIds();

  const query = useQuery({
    enabled: opts.enabled !== false && !idsLoading && companyIds.length > 0,
    queryKey: ["supplier-customer-links", "my-suppliers", companyIds],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("supplier_customer_links")
        .select(
          `id, status, supplier_office_id, buyer_company_id, invited_at, responded_at,
           reinvite_count, private_label, notes,
           office:companies!supplier_customer_links_supplier_office_id_fkey (id, name, country, parent_company_id)`,
        )
        .in("buyer_company_id", companyIds);
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const parentIds = Array.from(
        new Set(rows.map((r) => r.office?.parent_company_id).filter(Boolean)),
      ) as string[];

      let parentsById = new Map<string, { id: string; name: string }>();
      if (parentIds.length) {
        const { data: parents } = await (supabase as any)
          .from("companies")
          .select("id, name")
          .in("id", parentIds);
        parentsById = new Map(((parents as any[]) ?? []).map((p) => [p.id, p]));
      }

      const mapped: ConnectedSupplierRow[] = rows.map((r) => {
        const office = r.office ?? null;
        const parent = office?.parent_company_id
          ? parentsById.get(office.parent_company_id) ?? null
          : null;
        return {
          link_id: r.id,
          status: r.status as SclStatus,
          supplier_office_id: r.supplier_office_id,
          buyer_company_id: r.buyer_company_id,
          invited_at: r.invited_at,
          responded_at: r.responded_at,
          reinvite_count: r.reinvite_count ?? 1,
          private_label: r.private_label,
          notes: r.notes,
          office_name: office?.name ?? "—",
          office_country: office?.country ?? null,
          parent_company_id: office?.parent_company_id ?? null,
          parent_company_name: parent?.name ?? null,
        };
      });

      mapped.sort((a, b) => {
        const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (so !== 0) return so;
        if (a.status === "accepted") {
          const ad = a.responded_at ? Date.parse(a.responded_at) : 0;
          const bd = b.responded_at ? Date.parse(b.responded_at) : 0;
          return bd - ad;
        }
        return Date.parse(b.invited_at) - Date.parse(a.invited_at);
      });
      return mapped;
    },
  });

  return {
    suppliers: query.data ?? [],
    loading: idsLoading || query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}