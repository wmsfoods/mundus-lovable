import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminDashboard() {
  const companies = useQuery({
    queryKey: ["admin-dash-companies"],
    queryFn: async () => {
      const { count } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const activeOffers = useQuery({
    queryKey: ["admin-dash-active-offers"],
    queryFn: async () => {
      const { count } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const negotiations = useQuery({
    queryKey: ["admin-dash-negs"],
    queryFn: async () => {
      const { count } = await supabase
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const orders = useQuery({
    queryKey: ["admin-dash-orders"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);
      return count ?? 0;
    },
  });

  const revenue = useQuery({
    queryKey: ["admin-dash-revenue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("negotiations")
        .select("settled_total_value")
        .eq("status", "bid_accepted")
        .is("deleted_at", null);
      return (data ?? []).reduce((s, r) => s + Number(r.settled_total_value ?? 0), 0);
    },
  });

  return {
    companies: companies.data,
    activeOffers: activeOffers.data,
    negotiations: negotiations.data,
    orders: orders.data,
    revenue: revenue.data,
    loading:
      companies.isLoading || activeOffers.isLoading || negotiations.isLoading ||
      orders.isLoading || revenue.isLoading,
  };
}
