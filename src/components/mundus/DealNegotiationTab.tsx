import { Fragment } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useOrderNegotiationId } from "@/hooks/useOrderNegotiationId";
import { useBuyerNegotiation } from "@/hooks/useBuyerNegotiations";
import { useRealNegotiation } from "@/hooks/useRealNegotiation";
import { PriceHistoryTable } from "@/components/negotiation/PriceHistoryTable";
import { MAX_DISPLAY_ROUNDS } from "@/lib/negotiationEngine";
import { SparkleIcon } from "@/components/icons";

function fmtUsd(v: number) {
  return `US$ ${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)}`;
}

type Props = {
  orderId: string;
  role: "buyer" | "supplier";
};

/**
 * Negotiation tab inside the Order/Sale detail.
 * Pulls the real negotiation linked to the order (if any) and renders the
 * same PriceHistoryTable shown on the negotiation page, plus the round
 * timeline pills and a link back to the full negotiation.
 */
export function DealNegotiationTab({ orderId, role }: Props) {
  const { t } = useTranslation();
  const tk = (k: string, fallback: string, opts?: Record<string, unknown>) =>
    t(k, { defaultValue: fallback, ...opts }) as string;

  const { negotiationId, loading } = useOrderNegotiationId(orderId);
  const { data: detail } = useBuyerNegotiation(negotiationId ?? "");
  const { data: rawNeg } = useRealNegotiation(negotiationId ?? undefined);

  if (loading) {
    return <div className="ddv-empty">{tk("dealDetail.negotiation.loading", "Loading negotiation…")}</div>;
  }

  if (!negotiationId || !detail) {
    return (
      <div className="ddv-empty">
        {tk("dealDetail.negotiation.none", "No negotiation rounds recorded.")}
      </div>
    );
  }

  const rounds = detail.rounds ?? [];
  const maxRoundShown = Math.min(
    MAX_DISPLAY_ROUNDS,
    Math.max(...rounds.map((r) => r.round), 1),
  );

  const lastRoundAt = rawNeg?.rounds?.length
    ? rawNeg.rounds[rawNeg.rounds.length - 1]?.created_at ?? null
    : null;

  // Build pill timeline (Bid 1 → Counter 1 → Bid 2 → ...)
  type Pill = { type: "bid" | "counter"; round: number; totalUsd: number; current: boolean };
  const pills: Pill[] = [];
  rounds.forEach((r, idx) => {
    const isLast = idx === rounds.length - 1;
    if (r.buyerBidUsd != null) {
      pills.push({ type: "bid", round: r.round, totalUsd: r.buyerBidUsd, current: false });
    }
    if (r.counterUsd != null) {
      pills.push({ type: "counter", round: r.round, totalUsd: r.counterUsd, current: isLast });
    }
  });

  const fullHref =
    role === "supplier"
      ? `/supplier/negotiations/${negotiationId}`
      : `/buyer/negotiations/${negotiationId}`;

  return (
    <>
      {pills.length > 0 && (
        <div className="nd-card">
          <div className="nd-timeline-head">
            <span className="tl-head-title">
              <SparkleIcon size={14} />
              {tk("dealDetail.negotiation.timeline", "Round timeline")}
            </span>
            <Link to={fullHref} className="text-xs font-medium text-[#8B2252] hover:underline">
              {tk("dealDetail.negotiation.openFull", "Open full negotiation →")}
            </Link>
            <span className="tl-head-meta">
              {tk("dealDetail.negotiation.roundOf", "Round {{round}} of {{max}}", {
                round: maxRoundShown,
                max: maxRoundShown,
              })}
            </span>
          </div>
          <div className="nd-timeline-flow">
            {pills.map((p, i) => {
              const label =
                p.type === "bid"
                  ? tk("dealDetail.negotiation.pillBid", "Bid {{n}}", { n: p.round })
                  : p.current
                    ? tk("dealDetail.negotiation.pillCounterCurrent", "Counter {{n}}", { n: p.round })
                    : tk("dealDetail.negotiation.pillCounter", "Counter {{n}}", { n: p.round });
              const cls =
                p.type === "bid"
                  ? "tl-pill tl-pill--bid"
                  : p.current
                    ? "tl-pill tl-pill--counter tl-pill--current"
                    : "tl-pill tl-pill--counter";
              return (
                <Fragment key={`${p.type}-${p.round}-${i}`}>
                  {i > 0 && <span className="tl-sep">→</span>}
                  <span className={cls}>
                    <span className="tl-pill-label">{label}</span>
                    <span>{fmtUsd(p.totalUsd)}</span>
                  </span>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      <PriceHistoryTable
        products={detail.products}
        maxRoundShown={maxRoundShown}
        lastRoundAt={lastRoundAt}
      />
    </>
  );
}

export default DealNegotiationTab;