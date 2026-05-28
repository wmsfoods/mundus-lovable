import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface OtherBidRow {
  id: string;
  buyerName: string;
  status: string;
  currentRound: number;
  latestBidTotal: number;
}

interface Props {
  currentNegotiationId: string;
  offerId: string;
  currentBuyerTotal: number;
  currentBuyerName: string;
  currentRound: number;
  currentStatus: string;
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
}: Props) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OtherBidRow[]>([]);
  const [loading, setLoading] = useState(true);

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
             cut_rounds ( price_per_kg, quantity_kg )
           )`,
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

  const allBids = [
    { id: currentNegotiationId, buyerName: currentBuyerName, latestBidTotal: currentBuyerTotal, status: currentStatus, currentRound, isCurrent: true },
    ...rows.map((r) => ({ ...r, isCurrent: false })),
  ];
  const sortedByValue = [...allBids].sort((a, b) => b.latestBidTotal - a.latestBidTotal);
  const bestId = sortedByValue[0]?.id;

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
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
        📊 Other bids on this offer ({allBids.length} total)
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#059669", marginBottom: 8 }}>
        Best bid: ${sortedByValue[0].latestBidTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} —{" "}
        {sortedByValue[0].buyerName}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {allBids.map((b) => {
          const isBest = b.id === bestId;
          const isCurrent = b.isCurrent;
          return (
            <div
              key={b.id}
              onClick={() => !isCurrent && navigate(`/supplier/negotiations/${b.id}`)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 8,
                background: isCurrent ? "#FDF2F8" : "white",
                border: isCurrent ? "1px solid #8B2252" : "1px solid #E5E7EB",
                cursor: isCurrent ? "default" : "pointer",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {b.buyerName}
                  {isCurrent && (
                    <span style={{ fontSize: 10, color: "#8B2252", marginLeft: 6 }}>
                      (this negotiation)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>
                  Round {b.currentRound} · {b.status.replace(/_/g, " ")}
                </div>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: isBest ? "#059669" : "#374151",
                  textAlign: "right",
                }}
              >
                ${b.latestBidTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                {isBest && (
                  <span style={{ fontSize: 10, color: "#059669", marginLeft: 4, fontWeight: 700 }}>
                    BEST
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}