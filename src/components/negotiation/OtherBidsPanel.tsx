import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OtherBidRow {
  id: string;
  buyerName: string;
  status: string;
  currentRound: number;
  latestBidTotal: number;
  destinationCountry?: string;
  hasMessages?: boolean;
  itemsSignature?: string;
  isCurrent?: boolean;
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
 * Lists every active bid on the same offer (including the one currently
 * being viewed). Highlights the best bid, detects ties, and flags when
 * tied bids share the exact same per-item amounts.
 *
 * Rule: bids that have never been placed (total = 0) are hidden.
 * Rule: buyer label is always "Buyer: <Name>" — no avatar/initials.
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
           rounds:round_proposals!round_proposals_negotiation_id_fkey (
             id, round,
             cut_rounds ( offer_item_id, price_per_kg, quantity_kg )
           ),
           messages:negotiation_messages ( id )`,
        )
        .eq("offer_id", offerId);
      if (cancelled || !negs) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      // Suppliers can't SELECT buyer companies directly via RLS — hydrate
      // names through the security-definer RPC.
      const buyerIds = Array.from(new Set(
        (negs as any[])
          .map((n) => n.buyer_company_id as string | null)
          .filter((x): x is string => !!x),
      ));
      const nameMap = new Map<string, string>();
      if (buyerIds.length) {
        const { data: namesData } = await supabase.rpc("get_company_names", { _ids: buyerIds });
        for (const n of (namesData ?? []) as Array<{ id: string; name: string }>) {
          nameMap.set(n.id, n.name);
        }
      }
      const out: OtherBidRow[] = [];
      for (const n of negs as any[]) {
        const buyerRounds = (n.rounds ?? []).filter((r: any) => r.round % 2 === 1);
        const last = buyerRounds.sort((a: any, b: any) => b.round - a.round)[0];
        const total = (last?.cut_rounds ?? []).reduce(
          (s: number, c: any) => s + Number(c.price_per_kg) * Number(c.quantity_kg),
          0,
        );
        const sig = [...(last?.cut_rounds ?? [])]
          .map((c: any) => `${c.offer_item_id}:${Number(c.price_per_kg).toFixed(4)}@${Number(c.quantity_kg).toFixed(2)}`)
          .sort()
          .join("|");
        out.push({
          id: n.id,
          buyerName: n.buyer?.name ?? (n.buyer_company_id ? nameMap.get(n.buyer_company_id) : undefined) ?? "Buyer",
          status: String(n.status ?? ""),
          currentRound: Number(n.current_round ?? Math.ceil((last?.round ?? 1) / 2)),
          latestBidTotal: total,
          hasMessages: Array.isArray(n.messages) && n.messages.length > 0,
          itemsSignature: sig,
          isCurrent: n.id === currentNegotiationId,
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
  // Always render a row for the current negotiation even if data is stale.
  const merged: OtherBidRow[] = rows.length
    ? rows
    : [{
        id: currentNegotiationId,
        buyerName: currentBuyerName,
        status: currentStatus,
        currentRound,
        latestBidTotal: currentBuyerTotal,
        destinationCountry: currentDestinationCountry,
        isCurrent: true,
      }];
  const placed = merged.filter((b) => b.latestBidTotal > 0);
  if (placed.length === 0) return null;

  const sortedByValue = [...placed].sort((a, b) => b.latestBidTotal - a.latestBidTotal);
  const bestId = sortedByValue[0]?.id;
  const bestTotal = sortedByValue[0]?.latestBidTotal ?? 0;
  const tieGroup = sortedByValue.filter((b) => b.latestBidTotal === bestTotal);
  const bestSig = tieGroup[0]?.itemsSignature;
  const sameAmounts =
    tieGroup.length > 1 && !!bestSig && tieGroup.every((b) => b.itemsSignature === bestSig);
  const rankById = new Map(sortedByValue.map((b, i) => [b.id, i + 1]));

  const currentRank = rankById.get(currentNegotiationId) ?? 1;
  const visibleCount = 3;
  const hidden = Math.max(0, sortedByValue.length - visibleCount);
  let visible = expanded ? sortedByValue : sortedByValue.slice(0, visibleCount);
  if (!expanded && currentRank > visibleCount && sortedByValue[currentRank - 1]) {
    visible = [...visible, sortedByValue[currentRank - 1]];
  }
  // Dedupe by id to avoid duplicate React keys when the current row is
  // already in the top slice.
  visible = Array.from(new Map(visible.map((b) => [b.id, b])).values());

  const flag = (cc?: string) => {
    if (!cc || cc.length !== 2) return null;
    const code = cc.toUpperCase();
    const emoji = String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
    return <span style={{ fontSize: 16 }} aria-hidden>{emoji}</span>;
  };

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
          {placed.length} bid{placed.length === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ fontWeight: 600, fontSize: 13, color: "#059669", marginBottom: 10 }}>
        Best bid: ${bestTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} —{" "}
        {tieGroup.length > 1
          ? tieGroup.map((b) => `Buyer: ${b.buyerName}`).join(" and ")
          : `Buyer: ${sortedByValue[0].buyerName}`}
        {tieGroup.length > 1 && (
          <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", marginTop: 2 }}>
            {tieGroup.length} buyers tied at the same total
            {sameAmounts ? " · same amounts per item" : " · different per-item amounts"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visible.map((b) => {
          const rank = rankById.get(b.id) ?? 0;
          const isBest = b.id === bestId;
          const isCurrent = !!b.isCurrent;
          const isTied = tieGroup.length > 1 && b.latestBidTotal === bestTotal;
          const isTiedSame = isTied && sameAmounts;
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
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
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
                  {isTiedSame && (
                    <span
                      title="Tied at the same total with the same per-item amounts"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#065F46",
                        background: "rgba(5,150,105,0.12)",
                        padding: "1px 6px",
                        borderRadius: 999,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                      }}
                    >
                      Tied · same amounts
                    </span>
                  )}
                  {isTied && !isTiedSame && (
                    <span
                      title="Tied at the same total but different per-item amounts"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#92400E",
                        background: "rgba(217,119,6,0.12)",
                        padding: "1px 6px",
                        borderRadius: 999,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                      }}
                    >
                      Tied
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
                  {isBest ? (tieGroup.length > 1 ? "TIED BEST" : "BEST") : "total bid"}
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