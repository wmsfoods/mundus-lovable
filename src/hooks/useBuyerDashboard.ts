import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

export function useBuyerDashboard() {
  const { company } = useCurrentCompany();
  const companyId = company?.id ?? null;

  const negotiations = useQuery({
    queryKey: ["buyer-dash-negs", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { count } = await supabase
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .eq("buyer_company_id", companyId!)
        .not("status", "in", "(expired,offer_withdrawn,bid_accepted)")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const closedDeals = useQuery({
    queryKey: ["buyer-dash-deals", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { count } = await supabase
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .eq("buyer_company_id", companyId!)
        .eq("status", "bid_accepted")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const orders = useQuery({
    queryKey: ["buyer-dash-orders", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("buyer_company_id", companyId!)
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const requests = useQuery({
    queryKey: ["buyer-dash-requests", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { count } = await supabase
        .from("buyer_requests")
        .select("id", { count: "exact", head: true })
        .eq("buyer_company_id", companyId!)
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
