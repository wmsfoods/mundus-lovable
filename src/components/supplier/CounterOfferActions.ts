import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";

/** Sum of latest *bid* round (odd round) — used for accept totals. */
function latestBidTotal(neg: RealNegotiationRow): number {
  const bidRounds = (neg.rounds ?? []).filter((r) => r.round % 2 === 1);
  const last = bidRounds[bidRounds.length - 1];
  if (!last) return 0;
  return (last.cut_rounds ?? []).reduce(
    (s, c) => s + Number(c.price_per_kg) * Number(c.quantity_kg),
    0,
  );
}

/** Sum of latest *counter* round (even round). */
function latestCounterTotal(neg: RealNegotiationRow): number {
  const counters = (neg.rounds ?? []).filter((r) => r.round % 2 === 0);
  const last = counters[counters.length - 1];
  if (!last) return 0;
  return (last.cut_rounds ?? []).reduce(
    (s, c) => s + Number(c.price_per_kg) * Number(c.quantity_kg),
    0,
  );
}

export async function acceptNegotiation(
  neg: RealNegotiationRow,
  perspective: "supplier" | "buyer" = "supplier",
): Promise<boolean> {
  // Supplier accepts buyer's latest bid; buyer accepts supplier's latest counter.
  const settled = perspective === "supplier" ? latestBidTotal(neg) : latestCounterTotal(neg);
  const { error } = await supabase
    .from("negotiations")
    .update({
      status: "bid_accepted",
      settled_total_value: settled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", neg.id);
  if (error) {
    toast.error(error.message);
    return false;
  }
  toast.success("Bid accepted! Order will be created.");
  return true;
}

export async function rejectNegotiation(neg: RealNegotiationRow): Promise<boolean> {
  const { error } = await supabase
    .from("negotiations")
    .update({ status: "offer_rejected", updated_at: new Date().toISOString() })
    .eq("id", neg.id);
  if (error) {
    toast.error(error.message);
    return false;
  }
  toast("Bid rejected.");
  return true;
}