import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OfferBidStatus {
  hasBids: boolean;
  bidCount: number;
  loading: boolean;
}

/**
 * Returns whether a given offer has cut_rounds (active buyer bids) pointing to it.
 * When hasBids=true, the edit page should lock price/qty/cut fields to prevent
 * the FK-blocked DELETE+INSERT duplication path. Hot path: offer edit screens.
 */
export function useOfferHasActiveBids(offerId: string | null | undefined): OfferBidStatus {
  const [state, setState] = useState<OfferBidStatus>({
    hasBids: false,
    bidCount: 0,
    loading: !!offerId,
  });

  useEffect(() => {
    let cancelled = false;
    if (!offerId) {
      setState({ hasBids: false, bidCount: 0, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      const { data: items } = await supabase
        .from("offer_items")
        .select("id")
        .eq("offer_id", offerId);
      const ids = (items ?? []).map((r: any) => r.id as string);
      if (ids.length === 0) {
        if (!cancelled) setState({ hasBids: false, bidCount: 0, loading: false });
        return;
      }
      const { count } = await supabase
        .from("cut_rounds")
        .select("id", { count: "exact", head: true })
        .in("offer_item_id", ids);
      if (!cancelled) {
        setState({
          hasBids: (count ?? 0) > 0,
          bidCount: count ?? 0,
          loading: false,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  return state;
}