import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useBuyerScope } from "@/hooks/useBuyerScope";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

export type BuyerRequestStatus =
  | "new"
  | "with_responses"
  | "offer_sent"
  | "closed"
  | "not_interested";

export type BuyerRequestRow = {
  id: string;
  request_number: number;
  buyer_company_id: string;
  buyer_user_id: string | null;
  product_name: string;
  category: string | null;
  specification: string | null;
  destination_country: string;
  destination_port: string | null;
  incoterm: string | null;
  container_size: string | null;
  container_count: number | null;
  quantity_kg: number;
  temperature: string | null;
  target_price_usd: number | null;
  shipment_date: string | null;
  additional_info: string | null;
  status: BuyerRequestStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  origin_countries?: string[] | null;
  any_origin?: boolean | null;
  attachments?: Array<{ name: string; url: string; size?: number; type?: string }> | null;
  target_supplier_id?: string | null;
  cut_region?: string | null;
};

export function useBuyerRequests() {
  const { company } = useCurrentCompany();
  const { scopeIds, loading: scopeLoading } = useBuyerScope();
  const [data, setData] = useState<BuyerRequestRow[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  useRealtimeRefresh({ table: "buyer_requests", onRefresh: bump, enabled: !!company?.id });

  useEffect(() => {
    if (scopeLoading) return;
    if (!scopeIds.length) { setData([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("buyer_requests")
        .select("*")
        .in("buyer_company_id", scopeIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setError(error.message);
      else setData((data ?? []) as unknown as BuyerRequestRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scopeIds.join(","), scopeLoading, refreshKey]);

  const counts = {
    all: data.length,
    new: data.filter((r) => r.status === "new").length,
    with_responses: data.filter((r) => r.status === "with_responses").length,
    offer_sent: data.filter((r) => r.status === "offer_sent").length,
    closed: data.filter((r) => r.status === "closed").length,
    not_interested: data.filter((r) => r.status === "not_interested").length,
  };
  return { data, counts, isLoading, error };
}

export function useBuyerRequest(id: string) {
  const [data, setData] = useState<BuyerRequestRow | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("buyer_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) setError(error.message);
      setData((data ?? null) as unknown as BuyerRequestRow | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  return { data, isLoading, error, reload: () => setVersion((v) => v + 1) };
}