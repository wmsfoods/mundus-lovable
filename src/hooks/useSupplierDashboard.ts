import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useSupplierScope } from "@/hooks/useSupplierScope";
import { useFamilyContext } from "@/hooks/useFamilyContext";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

export function useSupplierDashboard() {
  const { company } = useCurrentCompany();
  const companyId = company?.id ?? null;
  const { scopeIds, loading: scopeLoading } = useSupplierScope();
  const fam = useFamilyContext();
  const scopeKey = scopeIds.join(",");
  const scopeReady = !scopeLoading && scopeIds.length > 0;
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] ?? "").startsWith("sup-dash-") });
  }, [qc]);
  useRealtimeRefresh({ table: "offers", onRefresh: invalidate, enabled: !!companyId });
  useRealtimeRefresh({ table: "negotiations", onRefresh: invalidate, enabled: !!companyId });
  useRealtimeRefresh({ table: "orders", onRefresh: invalidate, enabled: !!companyId });
  useRealtimeRefresh({ table: "buyer_requests", onRefresh: invalidate, enabled: !!companyId });

  const activeOffers = useQuery({
    queryKey: ["sup-dash-active-offers", companyId, scopeKey],
    enabled: !!companyId && scopeReady,
    queryFn: async () => {
      const { count } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .in("supplier_id", scopeIds)
        .eq("status", "active")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const totalOffers = useQuery({
    queryKey: ["sup-dash-total-offers", companyId, scopeKey],
    enabled: !!companyId && scopeReady,
    queryFn: async () => {
      const { count } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .in("supplier_id", scopeIds)
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const offerIds = useQuery({
    queryKey: ["sup-dash-offer-ids", companyId, scopeKey],
    enabled: !!companyId && scopeReady,
    queryFn: async () => {
      const { data } = await supabase
        .from("offers")
        .select("id")
        .in("supplier_id", scopeIds)
        .is("deleted_at", null);
      return (data ?? []).map((o) => o.id);
    },
  });

  const ids = offerIds.data ?? [];

  const pendingNegs = useQuery({
    queryKey: ["sup-dash-pending-negs", companyId, scopeKey, ids.length],
    enabled: !!companyId && scopeReady && offerIds.isFetched,
    queryFn: async () => {
      if (!ids.length) return 0;
      const { count } = await supabase
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .in("offer_id", ids)
        .eq("status", "awaiting_supplier")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const inNegotiation = useQuery({
    queryKey: ["sup-dash-in-neg", companyId, scopeKey, ids.length],
    enabled: !!companyId && scopeReady && offerIds.isFetched,
    queryFn: async () => {
      if (!ids.length) return 0;
      const { count } = await supabase
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .in("offer_id", ids)
        .not("status", "in", "(expired,offer_withdrawn,bid_accepted,offer_rejected)")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const closedDeals = useQuery({
    queryKey: ["sup-dash-closed", companyId, scopeKey, ids.length],
    enabled: !!companyId && scopeReady && offerIds.isFetched,
    queryFn: async () => {
      if (!ids.length) return 0;
      const { count } = await supabase
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .in("offer_id", ids)
        .eq("status", "bid_accepted")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const incomingRequests = useQuery({
    queryKey: ["sup-dash-incoming-requests", companyId, scopeKey, fam.familyRootId, fam.isFamilyHq, fam.isHqLevelUser],
    enabled: !!companyId && scopeReady && !fam.loading,
    queryFn: async () => {
      let q = supabase
        .from("buyer_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "with_responses"])
        .is("deleted_at", null);

      if (fam.isFamilyHq && fam.isHqLevelUser && fam.familyRootId) {
        // HQ pool: family-targeted requests (assigned or not) + assigned to any family office
        const officeFilter = fam.familyOfficeIds.length
          ? `,assigned_office_id.in.(${fam.familyOfficeIds.join(",")})`
          : "";
        q = q.or(`target_supplier_id.eq.${fam.familyRootId}${officeFilter}`);
      } else if (fam.isFamilyHq && !fam.isHqLevelUser && scopeIds.length) {
        // Office operator inside a family: only what's been routed to me
        q = q.in("assigned_office_id", scopeIds);
      } else {
        // Single-office supplier — direct + targeted
        q = q.or(`target_supplier_id.is.null,target_supplier_id.in.(${scopeIds.join(",")})`);
      }
      const { count } = await q;
      return count ?? 0;
    },
  });

  return {
    activeOffers: activeOffers.data,
    totalOffers: totalOffers.data,
    pendingNegs: pendingNegs.data,
    inNegotiation: inNegotiation.data,
    closedDeals: closedDeals.data,
    incomingRequests: incomingRequests.data,
    loading:
      activeOffers.isLoading || totalOffers.isLoading || pendingNegs.isLoading ||
      inNegotiation.isLoading || closedDeals.isLoading || incomingRequests.isLoading,
  };
}
