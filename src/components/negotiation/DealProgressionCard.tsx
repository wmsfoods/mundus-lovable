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
};

function fmtUsd(v: number, fractionDigits = 2) {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(v)}`;
}
function fmtSignedUsd(v: number) {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(v))}`;
}
function fmtPct(v: number) {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(1)}%`;
}

/**
 * DealProgressionCard
 * Round-by-round timeline pairing Buyer Bid vs Supplier Counter, with the
 * gap delta (absolute + %) between them so users can see how the negotiation
 * is converging.
 */
export function DealProgressionCard({ rounds, currentRound, maxRounds, perspective }: Props) {
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

      <div className="dp-rounds">
        {orderedRounds.map((rn) => {
          const slot = byRound.get(rn) ?? {};
          const bid = slot.bid;
          const counter = slot.counter;
          const gapAbs =
            bid && counter ? counter.totalUsd - bid.totalUsd : undefined;
          const gapPct =
            bid && counter && bid.totalUsd ? (gapAbs! / bid.totalUsd) * 100 : undefined;
          const isCurrent = !!(bid?.isCurrent || counter?.isCurrent);
          return (
            <div
              key={rn}
              className="dp-round"
              style={{
                border: `1px solid ${isCurrent ? "#8B2252" : "#e5e7eb"}`,
                background: isCurrent ? "rgba(139,34,82,0.04)" : "#fff",
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <strong style={{ fontSize: 13 }}>
                  {t("negotiation.progression.round", {
                    defaultValue: "Round {{n}}",
                    n: rn,
                  })}
                </strong>
                {isCurrent && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#8B2252",
                      color: "#fff",
                    }}
                  >
                    {t("negotiation.progression.current", "CURRENT")}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                    {bidLabel}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                    {bid ? fmtUsd(bid.totalUsd) : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  {gapAbs != null ? (
                    <>
                      <div
                        style={{
                          fontSize: 11,
                          color: gapAbs > 0 ? "#b45309" : gapAbs < 0 ? "#15803d" : "#6b7280",
                          fontWeight: 600,
                        }}
                      >
                        {fmtSignedUsd(gapAbs)}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#6b7280",
                        }}
                      >
                        {fmtPct(gapPct!)}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>—</span>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                    {counterLabel}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
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