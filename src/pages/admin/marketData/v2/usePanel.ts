import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PanelFilters } from "./types";

type PanelBody = {
  panel: string;
  filters?: PanelFilters;
  dimension?: string;
  metric?: "volume" | "fob";
  limit?: number;
  rowDim?: string;
  colDim?: string;
  limitRows?: number;
  limitCols?: number;
  scopeShipper?: string;
  scopeConsignee?: string;
  entity?: "shipper" | "consignee";
  q?: string;
};

export function usePanel<T = unknown>(body: PanelBody | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  const key = body ? JSON.stringify(body) : null;

  const run = useCallback(async (force = false) => {
    if (!body) return;
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("agrostats-market-data", {
        body: { action: "panel", ...body, forceRefresh: force },
      });
      if (seq !== seqRef.current) return;
      if (err) throw err;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData((res as any).data as T);
    } catch (e: any) {
      if (seq !== seqRef.current) return;
      setError(e?.message ?? String(e));
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  useEffect(() => { if (key) run(false); /* eslint-disable-next-line */ }, [key]);

  return { data, loading, error, refetch: () => run(true) };
}

export async function searchEntity(entity: "shipper" | "consignee", q: string): Promise<string[]> {
  if (!q || q.length < 2) return [];
  const { data, error } = await supabase.functions.invoke("agrostats-market-data", {
    body: { action: "panel", panel: "search-entity", entity, q },
  });
  if (error) return [];
  const rows = ((data as any)?.data?.rows ?? []) as { name: string }[];
  return rows.map((r) => r.name).filter(Boolean);
}