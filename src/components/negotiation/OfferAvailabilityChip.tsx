import { useRemainingFcl } from "@/hooks/useRemainingFcl";

type Props = {
  offerId: string | null | undefined;
  totalFcl: number | null | undefined;
  /** Highlight this negotiation's reserved FCLs (so each side sees "yours" included). */
  thisNegotiationFcl?: number | null;
};

/**
 * Inline chip showing how many containers (FCL) are still available on the parent offer.
 * Visible to buyer, supplier and admin during a negotiation so all sides know the
 * remaining capacity in real time.
 */
export function OfferAvailabilityChip({ offerId, totalFcl, thisNegotiationFcl }: Props) {
  const { total, sold, inNegotiation, available, loading } = useRemainingFcl(offerId, totalFcl);
  if (!offerId || loading) return null;

  const tone =
    available <= 0 ? "danger" : available <= Math.max(1, Math.floor(total * 0.25)) ? "warn" : "ok";

  const bg = tone === "danger" ? "#fee2e2" : tone === "warn" ? "#fef3c7" : "#dcfce7";
  const fg = tone === "danger" ? "#991b1b" : tone === "warn" ? "#92400e" : "#065f46";
  const border = tone === "danger" ? "#fecaca" : tone === "warn" ? "#fde68a" : "#bbf7d0";

  const tooltip =
    `Total: ${total} FCL\n` +
    `Sold: ${sold} FCL\n` +
    `In negotiation: ${inNegotiation} FCL` +
    (thisNegotiationFcl ? ` (incl. ${thisNegotiationFcl} on this deal)` : "") +
    `\nAvailable: ${available} FCL`;

  return (
    <span
      className="chip"
      title={tooltip}
      style={{ background: bg, color: fg, borderColor: border, fontWeight: 600 }}
    >
      <span className="chip-label" style={{ color: fg, opacity: 0.85 }}>
        Available:
      </span>
      <span className="chip-value">
        {available} / {total} FCL
      </span>
    </span>
  );
}
