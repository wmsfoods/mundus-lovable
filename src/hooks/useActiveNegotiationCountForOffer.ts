import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = [
  "awaiting_supplier",
  "pending_buyer_review",
  "pending_confirmation",
];

/**
 * Returns the number of "live" negotiations for a given offer — those that would
 * be affected if the supplier flips negotiation_mode on the offer.
 */
export function useActiveNegotiationCountForOffer(offerId: string | null | undefined) {
  const [count, setCount] = useState<number>(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!offerId) {
      setCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      const { count: c } = await supabase
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .eq("offer_id", offerId)
        .in("status", ACTIVE_STATUSES)
        .is("deleted_at", null);
      if (!cancelled) setCount(c ?? 0);
    })();
    return () => { cancelled = true; };
  }, [offerId, tick]);

  return { count, refetch: () => setTick((n) => n + 1) };
}

export const ACTIVE_NEGOTIATION_STATUSES = ACTIVE_STATUSES;