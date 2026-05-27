import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function safeCount(table: "companies" | "offers" | "negotiations" | "orders", apply?: (q: any) => any) {
  try {
    const base = supabase.from(table).select("id", { count: "exact", head: true }).is("deleted_at", null);
    const { count, error } = await (apply ? apply(base) : base);
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.warn(`[admin-dashboard] ${table} count failed`, error);
    return 0;
  }
}

export function useAdminDashboard() {
  const companies = useQuery({
    queryKey: ["admin-dash-companies"],
    queryFn: () => safeCount("companies"),
  });

  const activeOffers = useQuery({
    queryKey: ["admin-dash-active-offers"],
    queryFn: () => safeCount("offers", (q) => q.eq("status", "active")),
  });

  const negotiations = useQuery({
    queryKey: ["admin-dash-negs"],
    queryFn: () => safeCount("negotiations"),
  });

  const orders = useQuery({
    queryKey: ["admin-dash-orders"],
    queryFn: () => safeCount("orders"),
  });

  const revenue = useQuery({
    queryKey: ["admin-dash-revenue"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("negotiations")
          .select("settled_total_value")
          .eq("status", "bid_accepted")
          .is("deleted_at", null);
        if (error) throw error;
        return (data ?? []).reduce((s, r) => s + Number(r.settled_total_value ?? 0), 0);
      } catch (error) {
        console.warn("[admin-dashboard] revenue failed", error);
        return 0;
      }
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
