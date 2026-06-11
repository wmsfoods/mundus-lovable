import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtPrice, priceLabel } from "@/lib/units";
import { getAgreedItems } from "@/lib/negotiationEngine";

/** Show when negotiation.status === 'bid_accepted'. */
export function DealClosedBanner({
  negotiation,
  perspective,
  settledTotal,
}: {
  negotiation: RealNegotiationRow;
  perspective: "buyer" | "supplier";
  /** Optional override of settled total; falls back to negotiation.settled_total_value. */
  settledTotal?: number;
}) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { unit } = useWeightUnit();
  const pLbl = priceLabel(unit);
  const items = negotiation.offer?.items ?? [];
  const agreedMap = new Map(getAgreedItems(negotiation).map((a) => [a.offer_item_id, a] as const));

  // Build map of latest settled price per offer_item_id from the rounds history.
  // When a deal closes via "accept bid", the accepted price equals the last
  // cut_round price_per_kg recorded for that item (the buyer's last bid).
  const latestPriceByItem = new Map<string, number>();
  const sortedRounds = [...(negotiation.rounds ?? [])].sort((a, b) => a.round - b.round);
  for (const r of sortedRounds) {
    for (const cr of r.cut_rounds ?? []) {
      const cp = Array.isArray(cr.counter_proposals)
        ? cr.counter_proposals[0]
        : cr.counter_proposals;
      const price = cp?.price_per_kg ?? cr.price_per_kg;
      if (typeof price === "number" && !Number.isNaN(price)) {
        latestPriceByItem.set(cr.offer_item_id, price);
      }
    }
  }

  const total = settledTotal ?? Number(negotiation.settled_total_value ?? 0);
  const orderNumber = negotiation.order?.order_number;
  const orderHref = orderNumber
    ? `${perspective === "buyer" ? "/buyer/orders" : "/supplier/sales"}/${String(orderNumber).padStart(7, "0")}`
    : (perspective === "buyer" ? "/buyer/orders" : "/supplier/sales");

  return (
    <div
      className="rounded-xl border-2 p-5 mb-4"
      style={{ borderColor: "#15803d", background: "rgba(21,128,61,0.08)" }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-base font-semibold" style={{ color: "#15803d" }}>
            🎉 {t("engine.deal.title", "Deal closed! Order will be created.")}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t("engine.deal.subtitle", "Final settled total")}: <span className="font-semibold tabular-nums">US$ {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <Button
          onClick={() => nav(orderHref)}
          style={{ background: "#15803d", color: "#fff" }}
          className="hover:opacity-90"
        >
          {t("engine.deal.viewOrder", "View Order")}
        </Button>
      </div>

      {items.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {items.map((it) => {
            const a = agreedMap.get(it.id);
            const price = a?.price_per_kg ?? latestPriceByItem.get(it.id) ?? Number(it.price);
            return (
              <div key={it.id} className="flex items-center justify-between rounded-md bg-white/60 px-3 py-1.5">
                <span className="truncate">{it.customer_product?.name ?? "—"}</span>
                <span className="tabular-nums font-medium">
                  {fmtPrice(price, unit)} {pLbl}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DealClosedBanner;