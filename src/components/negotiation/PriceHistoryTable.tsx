import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, fmtPrice, weightLabel, LB_PER_KG } from "@/lib/units";

export type PriceHistoryProduct = {
  name: string;
  pack: string;
  qtyLb: number;
  askingUsdKg: number;
  bidR1UsdKg?: number;
  counterR1UsdKg?: number;
  bidR2UsdKg?: number;
  counterR2UsdKg?: number;
  bidR3UsdKg?: number;
  counterR3UsdKg?: number;
  bidR4UsdKg?: number;
  counterR4UsdKg?: number;
};

type AgreedMap = Map<string, { price: number; round: number }>;

type Props = {
  products: PriceHistoryProduct[];
  maxRoundShown: number;
  /** Optional agreed-by-product map (key = product name) to render lock icons */
  agreedByName?: AgreedMap;
  /** When provided, this is used as the localization namespace prefix.
   *  Defaults to "negotiation.history" (with English fallbacks). */
  i18nPrefix?: string;
};

function getKg(p: PriceHistoryProduct, type: "bid" | "counter", round: number): number | undefined {
  const key = `${type}R${round}UsdKg` as keyof PriceHistoryProduct;
  return p[key] as number | undefined;
}

function fmtUsd(n: number): string {
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

/** Last known $/kg for a product across all rounds (counter > bid). Falls back to asking. */
function lastKnownPerKg(p: PriceHistoryProduct, maxRound: number): number {
  for (let r = maxRound; r >= 1; r--) {
    const c = getKg(p, "counter", r);
    if (c != null) return c;
    const b = getKg(p, "bid", r);
    if (b != null) return b;
  }
  return p.askingUsdKg;
}

/**
 * PriceHistoryTable
 * Multi-column per-product table showing every Bid/Counter price for each round.
 * Shared between Buyer, Supplier and Admin negotiation detail screens.
 */
export function PriceHistoryTable({ products, maxRoundShown, agreedByName }: Props) {
  const { t } = useTranslation();
  const { unit } = useWeightUnit();

  // Totals computed in USD (qtyKg * $/kg) — unit-agnostic.
  const startTotal = products.reduce((s, p) => s + (p.qtyLb / LB_PER_KG) * p.askingUsdKg, 0);
  const currentTotal = products.reduce(
    (s, p) => s + (p.qtyLb / LB_PER_KG) * lastKnownPerKg(p, maxRoundShown),
    0,
  );
  const askingTotal = startTotal;
  // Per-round totals (bid / counter) for the footer row.
  const roundTotals = Array.from({ length: maxRoundShown }, (_, i) => {
    const round = i + 1;
    let bid = 0;
    let counter = 0;
    let hasBid = false;
    let hasCounter = false;
    for (const p of products) {
      const qtyKg = p.qtyLb / LB_PER_KG;
      const b = getKg(p, "bid", round);
      const c = getKg(p, "counter", round);
      if (b != null) {
        bid += qtyKg * b;
        hasBid = true;
      }
      if (c != null) {
        counter += qtyKg * c;
        hasCounter = true;
      }
    }
    return { bid, counter, hasBid, hasCounter };
  });

  return (
    <div className="nd-card nd-price-history">
      <div className="nd-price-history__head">
        <div className="nd-price-history__title">
          <FileText size={16} aria-hidden />
          <strong>{t("negotiation.history.title", "Price details — full history")}</strong>
        </div>
        <div className="nd-price-history__summary">
          {t("negotiation.history.summary", {
            defaultValue: "Asking + {{n}} rounds · {{from}} → {{to}}",
            n: maxRoundShown,
            from: fmtUsd(startTotal),
            to: fmtUsd(currentTotal),
          })}
        </div>
      </div>
      <div className="nd-price-scroll-wrap">
        <table className="nd-price-table nd-price-table--grouped">
          <thead>
            <tr className="nd-price-table__group-row">
              <th className="nd-sticky-col" colSpan={3} aria-hidden />
              {Array.from({ length: maxRoundShown }, (_, i) => {
                const round = i + 1;
                const isFinal = round === maxRoundShown && maxRoundShown >= 2;
                return (
                  <th key={`g-${i}`} colSpan={2} className={`nd-round-group${isFinal ? " is-final" : ""}`}>
                    {isFinal
                      ? t("negotiation.history.col.roundFinal", {
                          defaultValue: "Round {{n}} · Final",
                          n: round,
                        })
                      : t("negotiation.history.col.round", { defaultValue: "Round {{n}}", n: round })}
                  </th>
                );
              })}
            </tr>
            <tr>
              <th className="nd-sticky-col">{t("negotiation.history.col.product", "Product")}</th>
              <th className="num">
                {t("negotiation.history.col.qty", {
                  defaultValue: "Qty ({{unit}})",
                  unit: weightLabel(unit),
                })}
              </th>
              <th className="num">{t("negotiation.history.col.asking", "Start · Asking")}</th>
              {Array.from({ length: maxRoundShown }, (_, i) => (
                <Fragment key={`h-${i}`}>
                  <th className="col-bid num">{t("negotiation.history.col.bid", "Bid")}</th>
                  <th className="col-counter num">{t("negotiation.history.col.counter", "Counter")}</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const qtyKg = p.qtyLb / LB_PER_KG;
              const agreed = agreedByName?.get(p.name);
              return (
                <tr key={p.name} className={agreed ? "is-agreed" : undefined}>
                  <td className="nd-sticky-col">
                    <span className="product-name">
                      {agreed && (
                        <span aria-hidden style={{ marginRight: 4 }}>
                          🔒
                        </span>
                      )}
                      {p.name}
                    </span>
                    <span className="product-pack">{p.pack}</span>
                    {agreed && (
                      <span
                        className="inline-block ml-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          background: "rgba(34,197,94,0.15)",
                          color: "#15803d",
                        }}
                      >
                        {t("negotiation.agreedBadge", {
                          defaultValue: "Agreed at ${{price}}/{{unit}}",
                          price: fmtPrice(agreed.price, unit),
                          unit: weightLabel(unit),
                        })}
                      </span>
                    )}
                  </td>
                  <td className="num">{fmtWeight(qtyKg, unit)}</td>
                  <td className="num">${fmtPrice(p.askingUsdKg, unit)}</td>
                  {Array.from({ length: maxRoundShown }, (_, i) => {
                    const round = i + 1;
                    const bidV = getKg(p, "bid", round);
                    const cntV = getKg(p, "counter", round);
                    const isCurrentCounter = round === maxRoundShown;
                    const showAgreedInLast = agreed && isCurrentCounter;
                    return (
                      <Fragment key={`v-${i}`}>
                        <td className="col-bid num">
                          {bidV != null ? `$${fmtPrice(bidV, unit)}` : "—"}
                        </td>
                        <td
                          className={`col-counter num${
                            isCurrentCounter ? " col-counter--current" : ""
                          }`}
                          style={
                            showAgreedInLast
                              ? { color: "#15803d", fontWeight: 600 }
                              : undefined
                          }
                        >
                          {showAgreedInLast ? (
                            `$${fmtPrice(agreed!.price, unit)} 🔒`
                          ) : cntV != null ? (
                            <span className="counter-pill">${fmtPrice(cntV, unit)}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
            {products.length > 1 && (
              <tr className="nd-price-table__totals">
                <td className="nd-sticky-col">
                  <strong>{t("negotiation.history.totalValue", "Total value")}</strong>
                </td>
                <td className="num">
                  <strong>
                    {fmtWeight(
                      products.reduce((s, p) => s + p.qtyLb / LB_PER_KG, 0),
                      unit,
                    )}{" "}
                    {weightLabel(unit)}
                  </strong>
                </td>
                <td className="num"><strong>{fmtUsd(askingTotal)}</strong></td>
                {roundTotals.map((rt, i) => (
                  <Fragment key={`tot-${i}`}>
                    <td className="col-bid num"><strong>{rt.hasBid ? fmtUsd(rt.bid) : "—"}</strong></td>
                    <td className="col-counter num"><strong>{rt.hasCounter ? fmtUsd(rt.counter) : "—"}</strong></td>
                  </Fragment>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PriceHistoryTable;