import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OtherBidRow {
  id: string;
  buyerName: string;
  contactName?: string;
  status: string;
  currentRound: number;
  latestBidTotal: number;
  destinationCountry?: string;
  hasMessages?: boolean;
}

interface Props {
  currentNegotiationId: string;
  offerId: string;
  currentBuyerTotal: number;
  currentBuyerName: string;
  currentRound: number;
  currentStatus: string;
  currentDestinationCountry?: string;
  onSelect?: (negotiationId: string) => void;
}

/**
 * Sidebar panel shown to the supplier on a negotiation detail page.
 * Lists every OTHER active negotiation on the same offer, with the buyer's
 * latest bid total. Highlights the best offer and the one currently open.
 */
export function OtherBidsPanel({
  currentNegotiationId,
  offerId,
  currentBuyerTotal,
  currentBuyerName,
  currentRound,
  currentStatus,
  currentDestinationCountry,
  onSelect,
}: Props) {
  const [rows, setRows] = useState<OtherBidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: negs } = await supabase
        .from("negotiations")
        .select(
          `id, status, current_round, buyer_company_id,
           buyer:companies!negotiations_buyer_company_id_fkey ( id, name ),
           offer:offers!negotiations_offer_id_fkey ( destination_country, destination_country_code ),
           rounds:round_proposals!round_proposals_negotiation_id_fkey (
             id, round,
             cut_rounds ( price_per_kg, quantity_kg )
           ),
           messages:negotiation_messages ( id )`,
        )
        .eq("offer_id", offerId)
        .neq("id", currentNegotiationId);
      if (cancelled || !negs) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      const out: OtherBidRow[] = [];
      for (const n of negs as any[]) {
        // latest BUYER round = highest odd round
        const buyerRounds = (n.rounds ?? []).filter((r: any) => r.round % 2 === 1);
        const last = buyerRounds.sort((a: any, b: any) => b.round - a.round)[0];
        const total = (last?.cut_rounds ?? []).reduce(
          (s: number, c: any) => s + Number(c.price_per_kg) * Number(c.quantity_kg),
          0,
        );
        out.push({
          id: n.id,
          buyerName: n.buyer?.name ?? "Buyer",
          status: String(n.status ?? ""),
          currentRound: Number(n.current_round ?? Math.ceil((last?.round ?? 1) / 2)),
          latestBidTotal: total,
          destinationCountry: n.offer?.destination_country_code ?? n.offer?.destination_country ?? undefined,
          hasMessages: Array.isArray(n.messages) && n.messages.length > 0,
        });
      }
      setRows(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId, currentNegotiationId]);

  if (loading) return null;
  if (rows.length === 0) return null;

  type Row = {
    id: string;
    buyerName: string;
    latestBidTotal: number;
    status: string;
    currentRound: number;
    destinationCountry?: string;
    hasMessages?: boolean;
    isCurrent: boolean;
  };
  const allBids: Row[] = [
    {
      id: currentNegotiationId,
      buyerName: currentBuyerName,
      latestBidTotal: currentBuyerTotal,
      status: currentStatus,
      currentRound,
      destinationCountry: currentDestinationCountry,
      isCurrent: true,
    },
    ...rows.map((r) => ({ ...r, isCurrent: false })),
  ];
  const sortedByValue: Row[] = [...allBids].sort((a, b) => b.latestBidTotal - a.latestBidTotal);
  const bestId = sortedByValue[0]?.id;
  const rankById = new Map(sortedByValue.map((b, i) => [b.id, i + 1]));

  const currentRank = rankById.get(currentNegotiationId) ?? 1;
  const visibleCount = 3;
  const hidden = Math.max(0, sortedByValue.length - visibleCount);
  let visible: Row[] = expanded ? sortedByValue : sortedByValue.slice(0, visibleCount);
  if (!expanded && currentRank > visibleCount) {
    visible = [...visible, sortedByValue[currentRank - 1]];
  }

  const flag = (cc?: string) => {
    if (!cc || cc.length !== 2) return null;
    const code = cc.toUpperCase();
    const emoji = String.fromCodePoint(
      ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
    );
    return <span style={{ fontSize: 16 }} aria-hidden>{emoji}</span>;
  };

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const handleSelect = (negId: string, isCurrent: boolean) => {
    if (isCurrent) return;
    onSelect?.(negId);
  };

  return (
    <div
      style={{
        padding: 16,
        background: "#F9FAFB",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }} aria-hidden>📊</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Bids on this offer</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 999,
            background: "#EEF2FF",
            color: "#4338CA",
          }}
        >
          {allBids.length} bid{allBids.length === 1 ? "" : "s"}
        </span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#059669", marginBottom: 10 }}>
        Best bid: ${sortedByValue[0].latestBidTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} —{" "}
        {sortedByValue[0].buyerName}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visible.map((b) => {
          const rank = rankById.get(b.id) ?? 0;
          const isBest = b.id === bestId;
          const isCurrent = b.isCurrent;
          const borderColor = isCurrent ? (isBest ? "#8B2252" : "#2563EB") : "#E5E7EB";
          const bg = isCurrent ? "#FDF2F8" : "#fff";
          return (
            <div
              key={b.id}
              role={isCurrent ? undefined : "button"}
              tabIndex={isCurrent ? -1 : 0}
              onClick={() => handleSelect(b.id, isCurrent)}
              onKeyDown={(e) => {
                if (!isCurrent && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleSelect(b.id, isCurrent);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: bg,
                border: `1px solid ${borderColor}`,
                cursor: isCurrent ? "default" : "pointer",
                transition: "border-color 120ms, background 120ms",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isCurrent ? "#8B2252" : "#E5E7EB",
                  color: isCurrent ? "#fff" : "#4B5563",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {rank}
              </span>
              <span
                aria-hidden
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: "#F3F4F6",
                  color: "#374151",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials(b.buyerName)}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Buyer: {b.buyerName}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#8B2252",
                        background: "rgba(139,34,82,0.12)",
                        padding: "1px 6px",
                        borderRadius: 999,
                      }}
                    >
                      viewing
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                  Round {b.currentRound} of 4 · {b.status.replace(/_/g, " ")}
                </div>
              </div>
              {flag(b.destinationCountry)}
              {b.hasMessages && (
                <span
                  aria-hidden
                  title="Has chat messages"
                  style={{
                    fontSize: 11,
                    color: "#4B5563",
                    background: "#F3F4F6",
                    padding: "2px 6px",
                    borderRadius: 999,
                  }}
                >
                  💬
                </span>
              )}
              <div style={{ textAlign: "right", minWidth: 88 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: isBest ? "#059669" : "#374151",
                    lineHeight: 1.1,
                  }}
                >
                  ${b.latestBidTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isBest ? "#059669" : "#9CA3AF",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {isBest ? "BEST" : "total bid"}
                </div>
              </div>
              <span aria-hidden style={{ color: "#9CA3AF", fontSize: 14 }}>›</span>
            </div>
          );
        })}
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 10,
            background: "transparent",
            border: "none",
            color: "#8B2252",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {expanded ? "Show fewer ⌃" : `Show ${hidden} more bid${hidden === 1 ? "" : "s"} ⌄`}
        </button>
      )}
    </div>
  );
}