import { Fragment } from "react";
import { useTranslation } from "react-i18next";
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

/**
 * PriceHistoryTable
 * Multi-column per-product table showing every Bid/Counter price for each round.
 * Shared between Buyer, Supplier and Admin negotiation detail screens.
 */
export function PriceHistoryTable({ products, maxRoundShown, agreedByName }: Props) {
  const { t } = useTranslation();
  const { unit } = useWeightUnit();

  return (
    <div className="nd-card">
      <div className="nd-card-head">
        <strong>
          {t("negotiation.history.title", "Price history per product")}
        </strong>
      </div>
      <div className="nd-price-scroll-wrap" style={{ overflowX: "auto" }}>
        <table className="nd-price-table">
          <thead>
            <tr>
              <th>{t("negotiation.history.col.product", "Product")}</th>
              <th>
                {t("negotiation.history.col.qty", {
                  defaultValue: "Qty ({{unit}})",
                  unit: weightLabel(unit),
                })}
              </th>
              <th>{t("negotiation.history.col.asking", "Asking")}</th>
              {Array.from({ length: maxRoundShown }, (_, i) => (
                <Fragment key={`h-${i}`}>
                  <th className="col-bid">
                    {t("negotiation.history.col.bidR", {
                      defaultValue: "Bid R{{n}}",
                      n: i + 1,
                    })}
                  </th>
                  <th className="col-counter">
                    {t("negotiation.history.col.counterR", {
                      defaultValue: "Counter R{{n}}",
                      n: i + 1,
                    })}
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const qtyKg = p.qtyLb / LB_PER_KG;
              const agreed = agreedByName?.get(p.name);
              const rowStyle = agreed
                ? { background: "rgba(34,197,94,0.06)" }
                : undefined;
              return (
                <tr key={p.name} style={rowStyle}>
                  <td>
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
                  <td>{fmtWeight(qtyKg, unit)}</td>
                  <td>${fmtPrice(p.askingUsdKg, unit)}</td>
                  {Array.from({ length: maxRoundShown }, (_, i) => {
                    const round = i + 1;
                    const bidV = getKg(p, "bid", round);
                    const cntV = getKg(p, "counter", round);
                    const isCurrentCounter = round === maxRoundShown;
                    const showAgreedInLast = agreed && isCurrentCounter;
                    return (
                      <Fragment key={`v-${i}`}>
                        <td className="col-bid">
                          {bidV != null ? `$${fmtPrice(bidV, unit)}` : "—"}
                        </td>
                        <td
                          className={`col-counter${
                            isCurrentCounter ? " col-counter--current" : ""
                          }`}
                          style={
                            showAgreedInLast
                              ? { color: "#15803d", fontWeight: 600 }
                              : undefined
                          }
                        >
                          {showAgreedInLast
                            ? `$${fmtPrice(agreed!.price, unit)} 🔒`
                            : cntV != null
                              ? `$${fmtPrice(cntV, unit)}`
                              : "—"}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PriceHistoryTable;