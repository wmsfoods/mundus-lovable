import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { History, ArrowRight } from "lucide-react";
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
  /** ISO timestamp of the most recent round. Used to highlight the card when fresh (<24h). */
  lastRoundAt?: string | null;
};

function getKg(p: PriceHistoryProduct, type: "bid" | "counter", round: number): number | undefined {
  const key = `${type}R${round}UsdKg` as keyof PriceHistoryProduct;
  return p[key] as number | undefined;
}

function fmtUsd(n: number): string {
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

function fmtUsd2(n: number): string {
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))}`;
}

function latestBidPerKg(p: PriceHistoryProduct): number | undefined {
  return p.bidR4UsdKg ?? p.bidR3UsdKg ?? p.bidR2UsdKg ?? p.bidR1UsdKg;
}
function latestCounterPerKg(p: PriceHistoryProduct): number | undefined {
  return p.counterR4UsdKg ?? p.counterR3UsdKg ?? p.counterR2UsdKg ?? p.counterR1UsdKg;
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
export function PriceHistoryTable({ products, maxRoundShown, agreedByName, lastRoundAt }: Props) {
  const { t } = useTranslation();
  const { unit } = useWeightUnit();

  // Totals computed in USD (qtyKg * $/kg) — unit-agnostic.
  const startTotal = products.reduce((s, p) => s + (p.qtyLb / LB_PER_KG) * p.askingUsdKg, 0);
  const currentTotal = products.reduce(
    (s, p) => s + (p.qtyLb / LB_PER_KG) * lastKnownPerKg(p, maxRoundShown),
    0,
  );
  const askingTotal = startTotal;

  // "Fresh" highlight when the latest round happened in the last 24h.
  const freshInfo = (() => {
    if (!lastRoundAt) return null;
    const ts = new Date(lastRoundAt).getTime();
    if (!Number.isFinite(ts)) return null;
    const diffMs = Date.now() - ts;
    if (diffMs < 0 || diffMs > 24 * 60 * 60 * 1000) return null;
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const minutes = Math.floor(diffMs / (60 * 1000));
    return { hours, minutes };
  })();

  // Mini-stat direction (current vs asking)
  const delta = currentTotal - askingTotal;
  const deltaPct = askingTotal > 0 ? (delta / askingTotal) * 100 : 0;
  const statTone =
    Math.abs(delta) < 0.5 ? "flat" : delta < 0 ? "down" : "up";

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
    <div className={`nd-card nd-price-history${freshInfo ? " is-fresh" : ""}`}>
      <span className="nd-ph-accent" aria-hidden />
      <div className="nd-price-history__head">
        <div className="nd-price-history__title">
          <span className="nd-ph-icon" aria-hidden>
            <History size={16} />
          </span>
          <span className="nd-ph-titles">
            <strong>{t("negotiation.history.title", "Price details — full history")}</strong>
            <span className="nd-ph-subtitle">
              {t("negotiation.history.subtitle", {
                defaultValue: "Every bid and counter, round by round",
              })}
            </span>
          </span>
          {freshInfo && (
            <span className="nd-ph-fresh-pill" title={lastRoundAt ?? undefined}>
              <span className="nd-ph-fresh-dot" />
              {freshInfo.hours >= 1
                ? t("negotiation.history.freshAgo", {
                    defaultValue: "Updated {{h}}h ago",
                    h: freshInfo.hours,
                  })
                : t("negotiation.history.freshNow", {
                    defaultValue: "Just updated",
                  })}
            </span>
          )}
        </div>
        <div className={`nd-ph-stat is-${statTone}`}>
          <div className="nd-ph-stat__row">
            <span className="nd-ph-stat__from">{fmtUsd(askingTotal)}</span>
            <ArrowRight size={14} className="nd-ph-stat__arrow" aria-hidden />
            <span className="nd-ph-stat__to">{fmtUsd(currentTotal)}</span>
          </div>
          <div className="nd-ph-stat__label">
            {maxRoundShown > 0
              ? t("negotiation.history.roundsCount", {
                  defaultValue: "{{n}} round(s) negotiated · {{pct}}",
                  n: maxRoundShown,
                  pct:
                    Math.abs(deltaPct) < 0.05
                      ? "0.0%"
                      : `${delta < 0 ? "−" : "+"}${Math.abs(deltaPct).toFixed(1)}%`,
                })
              : t("negotiation.history.askingOnly", {
                  defaultValue: "Asking price · no rounds yet",
                })}
          </div>
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
              <th aria-hidden />
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
              <th className="num">{t("negotiation.history.col.gap", { defaultValue: "Gap" })}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const qtyKg = p.qtyLb / LB_PER_KG;
              const agreed = agreedByName?.get(p.name);
              const lb = latestBidPerKg(p);
              const lc = latestCounterPerKg(p);
              const hasGap = lb != null && lc != null;
              const gap = hasGap ? (lc! - lb!) : 0;
              const gapAbs = Math.abs(gap);
              let gapColor = "#6b7280";
              let gapIcon = "—";
              if (hasGap && gap > 0.001) { gapColor = "#dc2626"; gapIcon = "↘"; }
              else if (hasGap && gap < -0.001) { gapColor = "#15803d"; gapIcon = "↗"; }
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
                  <td className="num whitespace-nowrap" style={{ color: gapColor, fontWeight: 600 }}>
                    {hasGap ? (
                      gapAbs < 0.001
                        ? <>— $0.00</>
                        : <>{gapIcon} ${fmtPrice(gapAbs, unit)}</>
                    ) : (
                      "—"
                    )}
                  </td>
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
                <td className="num" aria-hidden />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(() => {
        const totalOriginal = products.reduce((s, p) => s + (p.qtyLb / LB_PER_KG) * p.askingUsdKg, 0);
        const totalLatestBid = products.reduce((s, p) => {
          const lb = latestBidPerKg(p);
          return lb != null ? s + (p.qtyLb / LB_PER_KG) * lb : s;
        }, 0);
        const totalLatestCounter = products.reduce((s, p) => {
          const lc = latestCounterPerKg(p);
          return lc != null ? s + (p.qtyLb / LB_PER_KG) * lc : s;
        }, 0);
        const gapTotal = totalLatestCounter - totalLatestBid;
        const gapPct = totalLatestBid > 0 ? (gapTotal / totalLatestBid) * 100 : 0;
        const movementTotal = totalLatestBid - totalOriginal;
        const movementPct = totalOriginal > 0 ? (movementTotal / totalOriginal) * 100 : 0;

        const colorFor = (v: number) => {
          if (Math.abs(v) < 0.005) return "#6b7280";
          return v > 0 ? "#dc2626" : "#15803d";
        };
        const signFmt = (usd: number, pct: number) => {
          if (Math.abs(usd) < 0.005) return `$0.00 (0.0%)`;
          const sign = usd > 0 ? "+" : "-";
          return `${sign}${fmtUsd2(usd)} (${sign}${Math.abs(pct).toFixed(1)}%)`;
        };

        return (
          <div className="nd-price-history__footer grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="rounded-md border p-3" style={{ background: "#f9fafb" }}>
              <div className="text-xs text-muted-foreground mb-1">
                {t("negotiation.history.footer.gap", { defaultValue: "Gap: Last Bid vs Last Counter" })}
              </div>
              <div className="text-lg font-semibold" style={{ color: colorFor(gapTotal) }}>
                {signFmt(gapTotal, gapPct)}
              </div>
            </div>
            <div className="rounded-md border p-3" style={{ background: "#f9fafb" }}>
              <div className="text-xs text-muted-foreground mb-1">
                {t("negotiation.history.footer.movement", { defaultValue: "Movement: Latest Bid vs Original" })}
              </div>
              <div className="text-lg font-semibold" style={{ color: colorFor(movementTotal) }}>
                {signFmt(movementTotal, movementPct)}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default PriceHistoryTable;