import { useTranslation } from "react-i18next";
import { SparkleIcon } from "@/components/icons";

export type ProgressionRound = {
  type: "bid" | "counter";
  round: number;
  totalUsd: number;
  date?: string;
  isCurrent?: boolean;
};

type Props = {
  rounds: ProgressionRound[];
  currentRound: number;
  maxRounds: number;
  /** "buyer" -> the counterparty label is "Supplier"; "supplier" -> "Buyer" */
  perspective: "buyer" | "supplier";
  /** Original asking total (USD per FCL) — shown as the "start" row */
  askingTotalUsd?: number;
};

function fmtUsd(v: number, fractionDigits = 0) {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(v)}`;
}

/**
 * DealProgressionCard
 * Round-by-round timeline pairing Buyer Bid vs Supplier Counter, with the
 * gap delta (absolute + %) between them so users can see how the negotiation
 * is converging.
 */
export function DealProgressionCard({ rounds, currentRound, maxRounds, perspective, askingTotalUsd }: Props) {
  const { t } = useTranslation();

  // Group rounds by round number
  const byRound = new Map<number, { bid?: ProgressionRound; counter?: ProgressionRound }>();
  for (const r of rounds) {
    const slot = byRound.get(r.round) ?? {};
    slot[r.type] = r;
    byRound.set(r.round, slot);
  }
  // Render every round 1..max(seen, currentRound) so PENDING rounds show
  // explicitly as "—" instead of being hidden. This makes it obvious when
  // the buyer's next bid or the supplier's next counter hasn't been sent.
  const maxSeen = Array.from(byRound.keys()).reduce((m, n) => Math.max(m, n), 0);
  const upTo = Math.max(maxSeen, currentRound, 1);
  const orderedRounds = Array.from({ length: upTo }, (_, i) => i + 1);

  const bidLabel =
    perspective === "buyer"
      ? t("negotiation.progression.yourBid", "Your bid")
      : t("negotiation.progression.buyerBid", "Buyer bid");
  const counterLabel =
    perspective === "buyer"
      ? t("negotiation.progression.supplierCounter", "Supplier counter")
      : t("negotiation.progression.yourCounter", "Your counter");

  return (
    <div className="nd-card">
      <div className="nd-timeline-head">
        <span className="tl-head-title">
          <SparkleIcon size={14} />
          {t("negotiation.progression.title", "Deal progression")}
        </span>
        <span className="tl-head-meta">
          {t("negotiation.progression.roundOf", {
            defaultValue: "Round {{round}} of {{max}}",
            round: currentRound,
            max: maxRounds,
          })}
        </span>
      </div>

      {askingTotalUsd != null && (
        <div className="dp-asking">
          <span className="dp-asking__label">
            {t("negotiation.progression.askingStart", "Asking (start)")}
          </span>
          <span className="dp-asking__value">{fmtUsd(askingTotalUsd)}</span>
        </div>
      )}

      <div className="dp-rounds">
        {orderedRounds.map((rn) => {
          const slot = byRound.get(rn) ?? {};
          const bid = slot.bid;
          const counter = slot.counter;
          const gapAbs =
            bid && counter ? Math.abs(counter.totalUsd - bid.totalUsd) : undefined;
          const isCurrent = !!(bid?.isCurrent || counter?.isCurrent);
          return (
            <div
              key={rn}
              className={`dp-round${isCurrent ? " is-current" : ""}`}
            >
              <div className="dp-round__head">
                <strong className="dp-round__title">
                  {t("negotiation.progression.round", {
                    defaultValue: "Round {{n}}",
                    n: rn,
                  })}
                </strong>
                {gapAbs != null && (
                  <span className="dp-gap-pill">
                    {t("negotiation.progression.gap", {
                      defaultValue: "gap {{value}}",
                      value: fmtUsd(gapAbs),
                    })}
                  </span>
                )}
              </div>

              <div className="dp-round__row">
                <div className="dp-round__col">
                  <div className="dp-round__label">{bidLabel}</div>
                  <div className="dp-round__value dp-round__value--bid">
                    {bid ? fmtUsd(bid.totalUsd) : "—"}
                  </div>
                </div>
                <div className="dp-round__arrow" aria-hidden>
                  →
                </div>
                <div className="dp-round__col">
                  <div className="dp-round__label">{counterLabel}</div>
                  <div className="dp-round__value dp-round__value--counter">
                    {counter ? fmtUsd(counter.totalUsd) : "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DealProgressionCard;