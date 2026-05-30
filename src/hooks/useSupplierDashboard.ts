import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useSupplierScope } from "@/hooks/useSupplierScope";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

export function useSupplierDashboard() {
  const { company } = useCurrentCompany();
  const companyId = company?.id ?? null;
  const { scopeIds, loading: scopeLoading } = useSupplierScope();
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
    queryKey: ["sup-dash-incoming-requests"],
    queryFn: async () => {
      // TODO phase 3/5: scope incoming requests by office markets
      // (buyer_requests is currently marketplace-wide, no office link yet).
      const { count } = await supabase
        .from("buyer_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "with_responses"])
        .is("deleted_at", null);
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
