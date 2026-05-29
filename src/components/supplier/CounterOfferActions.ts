import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import { auditLog } from "@/lib/auditLog";
import { getCompanyPrimaryContact } from "@/lib/companyContact";
import { sendEmailNotification } from "@/lib/emailSender";

export async function acceptNegotiation(
  neg: RealNegotiationRow,
  perspective: "supplier" | "buyer" = "supplier",
): Promise<boolean> {
  // Two-step confirmation: this only moves the negotiation to
  // `pending_confirmation`. The counterparty must call confirmNegotiation
  // to actually close the deal and create the order.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? null;
  if (authError || !userId) {
    toast.error("Please sign in again before accepting.");
    return false;
  }
  const { error } = await supabase.rpc("accept_negotiation", {
    p_negotiation_id: neg.id,
    p_user_id: userId,
    p_accepted_by: perspective,
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
  auditLog({
    action: "negotiation.accepted_pending_confirmation",
    category: "negotiation",
    entityType: "negotiation",
    entityId: neg.id,
    details: { acceptedBy: perspective },
  });

  // Notify counterparty (in-app + email) that they must confirm.
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
      const settledValue =
        (neg as any).settled_total_value ??
        (neg as any).accepted_total_value ??
        items.reduce((s, it) => s + Number(it.price) * Number(it.amount || 0), 0);
      const fmt = (n: number) =>
        n.toLocaleString(undefined, { maximumFractionDigits: 2 });
      // Counterparty = whoever did NOT accept
      const counterpartyIsSupplier = perspective === "buyer";
      const counterpartyCompanyId = counterpartyIsSupplier ? supplierCompanyId : buyerCompanyId;
      const counterpartyCompanyName = counterpartyIsSupplier ? supplierCompany : buyerCompany;
      const negotiationUrl = `https://app.mundustrade.us/${counterpartyIsSupplier ? "supplier" : "buyer"}/negotiations/${neg.id}`;
      const cp = await getCompanyPrimaryContact(counterpartyCompanyId);
      if (cp?.email) {
        await sendEmailNotification("dealAwaitingConfirmation" as any, cp.email, {
          name: cp.name || counterpartyCompanyName,
          cutName,
          offerNumber,
          totalValue: fmt(Number(settledValue) || 0),
          acceptedBy: perspective,
          counterpartyCompany: counterpartyIsSupplier ? buyerCompany : supplierCompany,
          negotiationUrl,
          supplierCompanyId,
        });
      }
      // In-app notification to active users of the counterparty company
      try {
        const { data: targets } = await supabase.rpc("get_company_active_user_ids", {
          p_company_id: counterpartyCompanyId,
        });
        const userIds = (targets as any[] | null)?.map((r) => r.user_id).filter(Boolean) ?? [];
        if (userIds.length > 0) {
          await supabase.rpc("enqueue_app_notifications", {
            p_user_ids: userIds,
            p_company_id: counterpartyCompanyId ?? null,
            p_title: counterpartyIsSupplier
              ? "Buyer accepted — confirm the deal"
              : "Supplier accepted your bid — confirm the deal",
            p_body: `${cutName} · M-${offerNumber} · US$ ${fmt(Number(settledValue) || 0)}`,
            p_icon: "handshake",
            p_category: "negotiation",
            p_link_url: `/${counterpartyIsSupplier ? "supplier" : "buyer"}/negotiations/${neg.id}`,
            p_link_label: "Review & Confirm",
            p_related_type: "negotiation",
            p_related_id: neg.id,
          });
        }
      } catch (e) {
        console.warn("[notify] awaitingConfirmation in-app failed", e);
      }
    } catch (e) {
      console.warn("[email] dealAwaitingConfirmation queue failed", e);
    }
  })();

  return true;
}

/** Counterparty confirms a pending acceptance — this actually closes the deal. */
export async function confirmNegotiation(neg: RealNegotiationRow): Promise<boolean> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? null;
  if (authError || !userId) {
    toast.error("Please sign in again before confirming.");
    return false;
  }
  const { data, error } = await supabase.rpc("confirm_negotiation", {
    p_negotiation_id: neg.id,
    p_user_id: userId,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (msg.includes("not_counterparty")) {
      toast.error("Only the counterparty (the side that did not accept) can confirm.");
    } else if (msg.includes("invalid_status")) {
      toast.error("This negotiation is no longer awaiting confirmation.");
    } else {
      toast.error(msg || "Failed to confirm");
    }
    return false;
  }
  toast.success("🎉 Deal confirmed — order created.");
  auditLog({
    action: "negotiation.deal_closed",
    category: "negotiation",
    entityType: "negotiation",
    entityId: neg.id,
    details: { confirmedFromPending: true, orderId: (data as any)?.order_id ?? null },
  });

  // Send the dealClosed emails to both sides (best-effort).
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
        (data as any)?.settled_total_value ??
        (neg as any).accepted_total_value ??
        items.reduce((s, it) => s + Number(it.price) * Number(it.amount || 0), 0);
      const askingAvg =
        totalQty > 0
          ? items.reduce((s, it) => s + Number(it.price) * Number(it.amount || 0), 0) / totalQty
          : 0;
      const finalAvg = totalQty > 0 ? settledValue / totalQty : askingAvg;
      const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
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