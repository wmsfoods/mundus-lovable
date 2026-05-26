import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";

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
    toast.error(error.message);
    return false;
  }
  toast.success("Bid accepted! Order will be created.");
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
  return true;
}