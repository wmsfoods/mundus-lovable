import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOffice } from "./useActiveOffice";
import { useCurrentCompany } from "./useCurrentCompany";

export type SclStatus =
  | "invited"
  | "pending_signup"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

export type MyCustomerRow = {
  link_id: string;
  status: SclStatus;
  supplier_office_id: string;
  buyer_company_id: string | null;
  user_request_id: string | null;
  invited_at: string;
  responded_at: string | null;
  reinvite_count: number;
  last_decline_at: string | null;
  private_label: string | null;
  notes: string | null;
  invited_by_user_id: string | null;
  /** Unified customer label — buyer company name OR pending invite company name */
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  tax_id: string | null;
  /** true when source is a pending user_request (no buyer_company_id yet) */
  is_pending: boolean;
};

const STATUS_ORDER: Record<SclStatus, number> = {
  invited: 0,
  pending_signup: 1,
  accepted: 2,
  declined: 3,
  revoked: 4,
  expired: 5,
};

export type UseMyCustomersOptions = {
  status?: SclStatus | SclStatus[];
  search?: string;
  enabled?: boolean;
};

export function useMyCustomers(opts: UseMyCustomersOptions = {}) {
  const { activeOfficeId } = useActiveOffice();
  const { company } = useCurrentCompany();
  const officeId = activeOfficeId ?? company?.id ?? null;

  const statuses = useMemo<SclStatus[] | null>(() => {
    if (!opts.status) return null;
    return Array.isArray(opts.status) ? opts.status : [opts.status];
  }, [opts.status]);

  const search = (opts.search ?? "").trim().toLowerCase();

  const query = useQuery({
    enabled: opts.enabled !== false && !!officeId,
    queryKey: ["supplier-customer-links", "my-customers", officeId, statuses, search],
    queryFn: async () => {
      let q = (supabase as any)
        .from("supplier_customer_links")
        .select(
          `id, status, supplier_office_id, buyer_company_id, user_request_id,
           invited_at, responded_at, reinvite_count, last_decline_at,
           private_label, notes, invited_by_user_id,
           buyer:companies!supplier_customer_links_buyer_company_id_fkey (id, name, country, tax_id),
           request:user_requests!supplier_customer_links_user_request_id_fkey (id, company_name, name, email, phone, country, tax_id, status)`,
        )
        .eq("supplier_office_id", officeId);
      if (statuses && statuses.length) q = q.in("status", statuses);
      const { data, error } = await q;
      if (error) throw error;
      const rows: MyCustomerRow[] = ((data ?? []) as any[]).map((r) => {
        const isPending = !r.buyer_company_id && !!r.user_request_id;
        const buyer = r.buyer ?? null;
        const req = r.request ?? null;
        return {
          link_id: r.id,
          status: r.status as SclStatus,
          supplier_office_id: r.supplier_office_id,
          buyer_company_id: r.buyer_company_id,
          user_request_id: r.user_request_id,
          invited_at: r.invited_at,
          responded_at: r.responded_at,
          reinvite_count: r.reinvite_count ?? 1,
          last_decline_at: r.last_decline_at,
          private_label: r.private_label,
          notes: r.notes,
          invited_by_user_id: r.invited_by_user_id,
          company_name: buyer?.name ?? req?.company_name ?? "—",
          contact_name: req?.name ?? null,
          email: req?.email ?? null,
          phone: req?.phone ?? null,
          country: buyer?.country ?? req?.country ?? null,
          tax_id: buyer?.tax_id ?? req?.tax_id ?? null,
          is_pending: isPending,
        };
      });

      const filtered = search
        ? rows.filter((r) => {
            const hay = `${r.company_name} ${r.email ?? ""}`.toLowerCase();
            return hay.includes(search);
          })
        : rows;

      filtered.sort((a, b) => {
        const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (so !== 0) return so;
        if (a.status === "accepted") {
          const ad = a.responded_at ? Date.parse(a.responded_at) : 0;
          const bd = b.responded_at ? Date.parse(b.responded_at) : 0;
          return bd - ad;
        }
        return Date.parse(b.invited_at) - Date.parse(a.invited_at);
      });
      return filtered;
    },
  });

  return {
    customers: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    officeId,
    refetch: query.refetch,
  };
}

export const myCustomersQueryKey = (officeId: string | null | undefined) =>
  ["supplier-customer-links", "my-customers", officeId] as const;