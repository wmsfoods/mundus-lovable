import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useBuyerScope } from "@/hooks/useBuyerScope";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

export function useBuyerDashboard() {
  const { company } = useCurrentCompany();
  const companyId = company?.id ?? null;
  const { scopeIds, loading: scopeLoading } = useBuyerScope();
  const scopeKey = scopeIds.join(",");
  const ready = !scopeLoading && scopeIds.length > 0;
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] ?? "").startsWith("buyer-dash-") });
  }, [qc]);
  useRealtimeRefresh({ table: "offers", onRefresh: invalidate, enabled: !!companyId });
  useRealtimeRefresh({ table: "negotiations", onRefresh: invalidate, enabled: !!companyId });
  useRealtimeRefresh({ table: "orders", onRefresh: invalidate, enabled: !!companyId });
  useRealtimeRefresh({ table: "buyer_requests", onRefresh: invalidate, enabled: !!companyId });

  const negotiations = useQuery({
    queryKey: ["buyer-dash-negs", scopeKey],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .in("buyer_company_id", scopeIds)
        .not("status", "in", "(expired,offer_withdrawn,bid_accepted)")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const closedDeals = useQuery({
    queryKey: ["buyer-dash-deals", scopeKey],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .in("buyer_company_id", scopeIds)
        .eq("status", "bid_accepted")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const orders = useQuery({
    queryKey: ["buyer-dash-orders", scopeKey],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("buyer_company_id", scopeIds)
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const requests = useQuery({
    queryKey: ["buyer-dash-requests", scopeKey],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("buyer_requests")
        .select("id", { count: "exact", head: true })
        .in("buyer_company_id", scopeIds)
        .in("status", ["new", "with_responses"])
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const marketplaceOffers = useQuery({
    queryKey: ["buyer-dash-mkt-offers"],
    queryFn: async () => {
      const { count } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  return {
    marketplaceOffers: marketplaceOffers.data,
    negotiations: negotiations.data,
    closedDeals: closedDeals.data,
    orders: orders.data,
    requests: requests.data,
    loading:
      negotiations.isLoading || closedDeals.isLoading || orders.isLoading ||
      requests.isLoading || marketplaceOffers.isLoading,
  };
}
