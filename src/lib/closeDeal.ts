/**
 * Close Deal helpers — used by buyer OfferDetail and BuyerNegotiationDetail.
 *
 * Flow (Option A, no DB migration):
 *   closeDealFromOffer():
 *     submit_initial_bid (at full asking price)
 *       → accept_negotiation(..., 'buyer')
 *       → DB triggers create the in-app notification on the supplier side
 *       → email + push fired client-side (best-effort, never throws)
 *
 *   closeDealFromNegotiation():
 *     accept_negotiation(..., 'buyer') on the current negotiation
 *       → triggers + notifications as above
 *
 * Authoritative DB status after "Close Deal" is `pending_confirmation`
 * with `accepted_by='buyer'`. The supplier then confirms (creating the
 * order in `awaiting_payment`), rejects, or — if rounds remain — counters.
 */

import { supabase } from "@/integrations/supabase/client";
import type { OfferDetailed } from "@/hooks/useOffer";
import { sendPushToCompanyUsers } from "@/lib/push";
import { getCompanyPrimaryContact } from "@/lib/companyContact";
import { sendEmailNotification } from "@/lib/emailSender";

export type CloseDealResult = {
  negotiationId: string;
};

/**
 * Pick a sensible default incoterm for a "Close Deal from offer" action.
 * If the offer declares any incoterms, use the first; otherwise fall back to FOB.
 */
function defaultIncoterm(offer: OfferDetailed): string {
  const first = offer.incoterms?.[0]?.incoterm_type;
  return first && typeof first === "string" && first.trim() ? first : "FOB";
}

/**
 * Best-effort supplier notification fan-out after a buyer Close Deal.
 * Never throws. Email + push only — in-app is handled by DB triggers
 * (`tg_notify_negotiation_status` fires when status moves to
 * `pending_confirmation`).
 */
async function notifySupplier(params: {
  supplierCompanyId: string | null | undefined;
  supplierName: string;
  buyerCompany: string;
  offerNumber: string;
  cutName: string;
  totalValue: number;
  negotiationId: string;
}) {
  const {
    supplierCompanyId,
    supplierName,
    buyerCompany,
    offerNumber,
    cutName,
    totalValue,
    negotiationId,
  } = params;

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  // Email — reuse the existing dealAwaitingConfirmation template
  try {
    if (supplierCompanyId) {
      const cp = await getCompanyPrimaryContact(supplierCompanyId);
      if (cp?.email) {
        await sendEmailNotification("dealAwaitingConfirmation" as any, cp.email, {
          name: cp.name || supplierName,
          cutName,
          offerNumber,
          totalValue: fmt(Number(totalValue) || 0),
          acceptedBy: "buyer",
          counterpartyCompany: buyerCompany,
          negotiationUrl: `https://app.mundustrade.us/supplier/negotiations/${negotiationId}`,
          supplierCompanyId,
        });
      }
    }
  } catch (e) {
    console.warn("[closeDeal] email notify failed", e);
  }

  // Push — Phase 1 no-op stub; degrades gracefully when no tokens exist.
  try {
    await sendPushToCompanyUsers(supplierCompanyId, {
      title: "Buyer accepted — confirm the deal",
      body: `M-${offerNumber} is awaiting your confirmation`,
      url: `/supplier/negotiations/${negotiationId}`,
      category: "negotiations",
    });
  } catch (e) {
    console.warn("[closeDeal] push notify failed", e);
  }
}

/**
 * Close Deal entry-point #1 — from the buyer OfferDetail page.
 * Creates a fresh negotiation at full asking price and immediately accepts it
 * on behalf of the buyer.
 */
export async function closeDealFromOffer(
  offer: OfferDetailed,
  buyerCompanyId: string,
  buyerUserId: string,
  buyerCompanyName: string,
): Promise<CloseDealResult> {
  if (!offer?.items?.length) {
    throw new Error("Offer has no items to close.");
  }

  const incoterm = defaultIncoterm(offer);
  const fclCount = Math.max(1, Number(offer.total_fcl ?? 1) || 1);
  const items = offer.items.map((it) => ({
    offer_item_id: it.id,
    price_per_kg: Number(it.price),
    quantity_kg: Number(it.amount),
  }));

  // Step 1 — submit a single-round bid at asking price.
  const { data: submitResult, error: submitErr } = await (supabase as any).rpc(
    "submit_initial_bid",
    {
      p_offer_id: offer.id,
      p_buyer_company_id: buyerCompanyId,
      p_created_by_user_id: buyerUserId,
      p_port_id: null,
      p_freight_cost_per_kg: 0,
      p_insurance_per_kg: 0,
      p_fcl_count: fclCount,
      p_incoterm: incoterm,
      p_buyer_message: null,
      p_items: items,
    },
  );
  if (submitErr) throw submitErr;
  const negotiationId = submitResult?.negotiation_id as string | undefined;
  if (!negotiationId) {
    throw new Error("Close Deal: no negotiation id returned by submit_initial_bid.");
  }

  // Step 2 — immediately accept as the buyer (skip if the RPC said an existing
  // active negotiation was found; in that case the buyer should go review it).
  if (!submitResult?.existing) {
    const { error: acceptErr } = await (supabase as any).rpc("accept_negotiation", {
      p_negotiation_id: negotiationId,
      p_user_id: buyerUserId,
      p_accepted_by: "buyer",
    });
    if (acceptErr) throw acceptErr;
  }

  // Step 3 — fan-out (email + push). In-app notification is produced by
  // the DB trigger when status flips to `pending_confirmation`.
  const cutName = offer.items[0]?.customer_product?.name ?? "Offer";
  const totalValue = items.reduce(
    (s, it) => s + it.price_per_kg * it.quantity_kg,
    0,
  );
  await notifySupplier({
    supplierCompanyId: offer.supplier_id,
    supplierName: offer.supplier_name,
    buyerCompany: buyerCompanyName,
    offerNumber: String(offer.offer_number ?? ""),
    cutName,
    totalValue,
    negotiationId,
  });

  return { negotiationId };
}

/**
 * Close Deal entry-point #2 — from inside an existing buyer negotiation.
 * Accepts the current state on behalf of the buyer (the supplier's last
 * counter, or the asking price if none).
 */
export async function closeDealFromNegotiation(params: {
  negotiationId: string;
  buyerUserId: string;
  supplierCompanyId: string | null | undefined;
  supplierName: string;
  buyerCompany: string;
  offerNumber: string;
  cutName: string;
  totalValue: number;
}): Promise<void> {
  const {
    negotiationId,
    buyerUserId,
    supplierCompanyId,
    supplierName,
    buyerCompany,
    offerNumber,
    cutName,
    totalValue,
  } = params;

  const { error } = await (supabase as any).rpc("accept_negotiation", {
    p_negotiation_id: negotiationId,
    p_user_id: buyerUserId,
    p_accepted_by: "buyer",
  });
  if (error) throw error;

  await notifySupplier({
    supplierCompanyId,
    supplierName,
    buyerCompany,
    offerNumber,
    cutName,
    totalValue,
    negotiationId,
  });
}