import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FclAllocation = {
  total: number;
  sold: number;
  inNegotiation: number;
  available: number;
  soldBuyers: string[]; // company names that already closed
  loading: boolean;
};

type Row = {
  fcl_count: number | null;
  status: string;
  buyer_company_id: string | null;
  buyer_company: { name: string | null } | null;
};

/**
 * Compute FCL availability for an offer.
 *
 *   sold           = sum of fcl_count where status = bid_accepted
 *   inNegotiation  = sum of fcl_count where status in active negotiation states
 *   available      = total - sold - inNegotiation
 */
export function useRemainingFcl(
  offerId: string | undefined | null,
  totalFcl: number | null | undefined,
): FclAllocation {
  const [state, setState] = useState<FclAllocation>({
    total: totalFcl ?? 1,
    sold: 0,
    inNegotiation: 0,
    available: totalFcl ?? 1,
    soldBuyers: [],
    loading: true,
  });

  useEffect(() => {
    if (!offerId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("negotiations")
        .select("fcl_count, status, buyer_company_id, buyer_company:companies!negotiations_buyer_company_id_fkey(name)")
        .eq("offer_id", offerId)
        .is("deleted_at", null);
      if (cancelled) return;
      const rows = (data ?? []) as unknown as Row[];
      let sold = 0;
      let inNegotiation = 0;
      const soldBuyers = new Set<string>();
      for (const r of rows) {
        const n = Number(r.fcl_count ?? 1);
        if (r.status === "bid_accepted") {
          sold += n;
          if (r.buyer_company?.name) soldBuyers.add(r.buyer_company.name);
        } else if (["awaiting_supplier", "pending_buyer_review"].includes(r.status)) {
          inNegotiation += n;
        }
      }
      const total = Math.max(1, totalFcl ?? 1);
      setState({
        total,
        sold,
        inNegotiation,
        available: Math.max(0, total - sold - inNegotiation),
        soldBuyers: Array.from(soldBuyers),
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId, totalFcl]);

  return state;
}
