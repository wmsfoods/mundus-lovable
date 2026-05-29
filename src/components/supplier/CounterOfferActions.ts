import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import { auditLog } from "@/lib/auditLog";
import { getCompanyPrimaryContact } from "@/lib/companyContact";
import { sendEmailNotification } from "@/lib/emailSender";

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

  // Fire dealClosed e-mails through the central queue (best-effort, non-blocking).
  (async () => {
    try {
      const items = neg.offer?.items ?? [];
      const supplierCompanyId = neg.offer?.supplier_id;
      const buyerCompanyId = (neg as any).buyer_company_id;
      const supplierCompany = neg.offer?.supplier_name ?? "Supplier";
      const buyerCompany =
        (neg as any).buyer_company?.name ?? (neg as any).buyer_company_name ?? "Buyer";
      const offerNumber = String(neg.offer?.offer_number ?? "");
      const cutName = items[0]?.customer_product?.name ?? "Offer";
      const totalQty = items.reduce((s, it) => s + Number(it.amount || 0), 0);
      const settledValue =
        (neg as any).settled_total_value ??
        items.reduce((s, it) => s + Number(it.price) * Number(it.amount || 0), 0);
      const askingAvg =
        totalQty > 0
          ? items.reduce((s, it) => s + Number(it.price) * Number(it.amount || 0), 0) /
            totalQty
          : 0;
      const finalAvg = totalQty > 0 ? settledValue / totalQty : askingAvg;
      const fmt = (n: number) =>
        n.toLocaleString(undefined, { maximumFractionDigits: 2 });
      const baseVars: any = {
        cutName,
        offerNumber,
        quantity: fmt(totalQty),
        rounds: (neg as any).current_round ?? 1,
        askingPrice: askingAvg.toFixed(2),
        finalPrice: finalAvg.toFixed(2),
        movementPct:
          askingAvg > 0 ? (((finalAvg - askingAvg) / askingAvg) * 100).toFixed(1) : "0.0",
        totalValue: fmt(settledValue),
        incoterm: (neg as any).incoterm ?? "FOB",
        origin: "",
        originFlag: "",
        destination: neg.port?.country?.english_name ?? "",
        destFlag: "",
        shipment: "",
        supplierCompany,
        buyerCompany,
        advancePct: "30",
        advanceAmount: fmt(settledValue * 0.3),
        supplierCompanyId,
      };
      const [s, b] = await Promise.all([
        getCompanyPrimaryContact(supplierCompanyId),
        getCompanyPrimaryContact(buyerCompanyId),
      ]);
      if (s?.email)
        await sendEmailNotification("dealClosed" as any, s.email, {
          ...baseVars,
          name: s.name || supplierCompany,
        });
      if (b?.email)
        await sendEmailNotification("dealClosed" as any, b.email, {
          ...baseVars,
          name: b.name || buyerCompany,
        });
    } catch (e) {
      console.warn("[email] dealClosed queue failed", e);
    }
  })();

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

  // Fire negotiationRejected e-mails to both sides (best-effort).
  (async () => {
    try {
      const items = neg.offer?.items ?? [];
      const offerNumber = String(neg.offer?.offer_number ?? "");
      const cutName = items[0]?.customer_product?.name ?? "Offer";
      const rounds = (neg as any).current_round ?? 1;
      const lastBid =
        (neg as any).current_price_per_kg ??
        Number(items[0]?.price ?? 0);
      const lastCounter = lastBid;
      const baseVars: any = {
        cutName,
        offerNumber,
        lastBid: Number(lastBid).toFixed(2),
        lastCounter: Number(lastCounter).toFixed(2),
        gap: "0.00",
        gapPct: "0.0",
        rounds,
        reason: (neg as any).rejection_reason ?? undefined,
        supplierCompanyId: neg.offer?.supplier_id,
      };
      const [s, b] = await Promise.all([
        getCompanyPrimaryContact(neg.offer?.supplier_id),
        getCompanyPrimaryContact((neg as any).buyer_company_id),
      ]);
      if (s?.email)
        await sendEmailNotification("negotiationRejected" as any, s.email, {
          ...baseVars,
          name: s.name || neg.offer?.supplier_name || "Supplier",
        });
      if (b?.email)
        await sendEmailNotification("negotiationRejected" as any, b.email, {
          ...baseVars,
          name: b.name || "Buyer",
        });
    } catch (e) {
      console.warn("[email] negotiationRejected queue failed", e);
    }
  })();

  return true;
}