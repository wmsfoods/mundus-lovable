import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentTermScope = "international" | "usa_domestic" | "all";

const FALLBACK: Record<Exclude<PaymentTermScope, "all">, string[]> = {
  international: [
    "100% TT",
    "100% Advance",
    "100% LC at Sight",
    "100% CAD",
    "10% Advance, Balance TT",
    "20% Advance, Balance TT",
    "25% Advance, Balance TT",
    "30% Advance, Balance TT",
    "40% Advance, Balance TT",
    "50% Advance, Balance TT",
    "60% Advance, Balance TT",
  ],
  usa_domestic: [
    "10% Advance, Balance 7 Days TIS",
    "20% Advance, Balance 7 Days TIS",
    "30% Advance, Balance 7 Days TIS",
    "40% Advance, Balance 7 Days TIS",
    "50% Advance, Balance 7 Days TIS",
    "10% Advance, Balance 14 Days TIS",
    "20% Advance, Balance 14 Days TIS",
    "30% Advance, Balance 14 Days TIS",
    "40% Advance, Balance 14 Days TIS",
    "50% Advance, Balance 14 Days TIS",
    "7 Net",
    "14 Net",
    "15 Net",
    "21 Net",
    "30 Net",
    "Due on Receipt",
  ],
};

const cache = new Map<PaymentTermScope, string[]>();
const inflight = new Map<PaymentTermScope, Promise<string[]>>();

async function fetchTerms(scope: PaymentTermScope): Promise<string[]> {
  if (cache.has(scope)) return cache.get(scope)!;
  if (inflight.has(scope)) return inflight.get(scope)!;

  const p = (async () => {
    let q = (supabase as any)
      .from("payment_terms")
      .select("label,scope,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order");
    if (scope !== "all") q = q.eq("scope", scope);
    const { data, error } = await q;
    if (error || !data || data.length === 0) {
      const fb =
        scope === "all"
          ? [...FALLBACK.international, ...FALLBACK.usa_domestic]
          : FALLBACK[scope];
      cache.set(scope, fb);
      return fb;
    }
    const labels = data.map((r: any) => r.label as string);
    cache.set(scope, labels);
    return labels;
  })();

  inflight.set(scope, p);
  try {
    return await p;
  } finally {
    inflight.delete(scope);
  }
}

export function usePaymentTerms(opts: { scope?: PaymentTermScope } = {}) {
  const scope = opts.scope ?? "international";
  const [terms, setTerms] = useState<string[]>(() => cache.get(scope) ?? []);
  const [loading, setLoading] = useState<boolean>(!cache.has(scope));

  useEffect(() => {
    let alive = true;
    if (cache.has(scope)) {
      setTerms(cache.get(scope)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchTerms(scope).then((t) => {
      if (!alive) return;
      setTerms(t);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [scope]);

  return { terms, loading };
}