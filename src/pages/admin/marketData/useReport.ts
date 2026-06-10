import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MarketFilters = {
  dateFrom?: string;
  dateTo?: string;
  products?: string[];
  destCountries?: string[];
  shippers?: string[];
  consignees?: string[];
  polPorts?: string[];
};

type Options = { entity?: string; enabled?: boolean };

export function useReport<T = any>(report: string, filters: MarketFilters, opts: Options = {}) {
  const { entity, enabled = true } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify({ report, filters, entity });

  const run = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("agrostats-market-data", {
        body: { action: "report", report, filters, entity, forceRefresh: force },
      });
      if (err) throw err;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData((res as any).data as T);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [report, key, entity]);

  useEffect(() => {
    if (!enabled) return;
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { data, loading, error, refetch: () => run(true) };
}