import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve the negotiation_id linked to an order/sale row. Returns null while
 * loading or when the order has no linked negotiation (direct deal edge case).
 */
export function useOrderNegotiationId(orderId: string | null | undefined): {
  negotiationId: string | null;
  loading: boolean;
} {
  const [negotiationId, setNegotiationId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(orderId));

  useEffect(() => {
    let cancelled = false;
    if (!orderId) {
      setNegotiationId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("negotiation_id")
        .eq("id", orderId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setNegotiationId(null);
      } else {
        setNegotiationId(((data as any)?.negotiation_id as string) ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return { negotiationId, loading };
}