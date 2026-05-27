import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import { auditLog } from "@/lib/auditLog";

export async function acceptNegotiation(
  neg: RealNegotiationRow,
  _perspective: "supplier" | "buyer" = "supplier",
): Promise<boolean> {
  // Use the RPC so the order/order_items are created atomically and
  // the offer is marked sold_out when FCLs run out.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? null;
  if (authError || !userId) {
    toast.error("Please sign in again before accepting.");
    return false;
  }
  const { error } = await supabase.rpc("accept_negotiation", {
    p_negotiation_id: neg.id,
    p_user_id: userId,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (msg.includes("cannot_accept_own_round")) {
      toast.error("You can't accept your own last proposal — wait for the counterparty's response.");
    } else {
      toast.error(msg || "Failed to accept");
    }
    return false;
  }
  toast.success("Bid accepted! Order will be created.");
  auditLog({
    action: "negotiation.deal_closed",
    category: "negotiation",
    entityType: "negotiation",
    entityId: neg.id,
    details: {
      finalValue: (neg as any).current_price_per_kg ?? (neg as any).price_per_kg ?? null,
      rounds: (neg as any).current_round ?? null,
    },
  });
  return true;
}

export async function rejectNegotiation(neg: RealNegotiationRow): Promise<boolean> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? null;
  if (authError || !userId) {
    toast.error("Please sign in again before rejecting.");
    return false;
  }
  const { error } = await supabase.rpc("reject_negotiation", {
    p_negotiation_id: neg.id,
    p_user_id: userId,
    p_reason: null,
  });
  if (error) {
    toast.error(error.message);
    return false;
  }
  toast("Bid rejected.");
  auditLog({
    action: "negotiation.rejected",
    category: "negotiation",
    entityType: "negotiation",
    entityId: neg.id,
    severity: "warn",
  });
  return true;
}