import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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

  const total = settledTotal ?? Number(negotiation.settled_total_value ?? 0);

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
          onClick={() => {
            toast(t("engine.deal.orderToast", "Order creation coming soon"));
            nav(perspective === "buyer" ? "/buyer/orders" : "/supplier/sales");
          }}
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
            const price = a?.price_per_kg ?? Number(it.price);
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