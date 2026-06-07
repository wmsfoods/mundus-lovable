import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import { displayRoundFor, roundTypeFor } from "@/hooks/useRealNegotiation";
import { getRoundTotalUsd } from "@/lib/negotiationEngine";
import { TimelineMessageCard, type TimelineMessage } from "@/components/messageViaMundus/TimelineMessageCard";
import { useCurrentUserSide } from "@/hooks/useCurrentUserSide";

type ActivityEvent = {
  id: string;
  ts: string; // ISO
  kind: "bid" | "counter" | "message" | "system";
  actor: string;
  title: string;
  detail?: string;
};

function fmtEST(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso)) + " EST";
  } catch {
    return iso;
  }
}

function fmtUsd(v: number) {
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v)}`;
}

type Props = {
  negotiation: RealNegotiationRow;
  /** Display name to use for the buyer side (e.g. "Acme Foods"). */
  buyerLabel: string;
  /** Display name to use for the supplier side. */
  supplierLabel: string;
};

/**
 * Read-only chronological log of every event on a negotiation: rounds
 * (bids + counters), chat messages, status changes — for buyer, supplier
 * and admin views. Times shown in America/New_York (EST/EDT).
 */
export function NegotiationActivityTab({ negotiation, buyerLabel, supplierLabel }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { side: currentUserSide } = useCurrentUserSide(negotiation.id);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("negotiation_messages")
        .select("id, created_at, sender_user_id, sender_side, message_type, content, structured_data, emailed, emailed_at")
        .eq("negotiation_id", negotiation.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [negotiation.id]);

  const events: ActivityEvent[] = [];

  events.push({
    id: `created-${negotiation.id}`,
    ts: negotiation.created_at,
    kind: "system",
    actor: "System",
    title: "Negotiation started",
  });

  for (const rp of negotiation.rounds ?? []) {
    const type = roundTypeFor(rp.round);
    const disp = displayRoundFor(rp.round);
    const total = getRoundTotalUsd(rp);
    if (total == null) continue;
    events.push({
      id: `rp-${rp.id}`,
      ts: rp.created_at,
      kind: type,
      actor: type === "bid" ? `Buyer: ${buyerLabel}` : `Supplier: ${supplierLabel}`,
      title: type === "bid" ? `Bid R${disp} sent` : `Counter R${disp} sent`,
      detail: `Total ${fmtUsd(total)}`,
    });
  }

  for (const m of messages) {
    if (m.message_type === "via_mundus") {
      events.push({
        id: `m-${m.id}`,
        ts: m.created_at,
        kind: "message",
        actor: "",
        title: "__via_mundus__",
        detail: JSON.stringify(m),
      });
      continue;
    }
    events.push({
      id: `m-${m.id}`,
      ts: m.created_at,
      kind: "message",
      actor:
        m.sender_side === "buyer"
          ? `Buyer: ${buyerLabel}`
          : m.sender_side === "supplier"
            ? `Supplier: ${supplierLabel}`
            : "Mundus",
      title: "Message",
      detail: String(m.content ?? "").slice(0, 280),
    });
  }

  if (negotiation.status === "bid_accepted") {
    events.push({
      id: `accepted-${negotiation.id}`,
      ts: negotiation.updated_at,
      kind: "system",
      actor: "System",
      title: "Deal accepted",
    });
  }
  if (negotiation.status === "offer_rejected") {
    events.push({
      id: `rejected-${negotiation.id}`,
      ts: negotiation.updated_at,
      kind: "system",
      actor: "System",
      title: "Negotiation rejected",
    });
  }

  events.sort((a, b) => +new Date(a.ts) - +new Date(b.ts));

  const dotColor = (k: ActivityEvent["kind"]) =>
    k === "bid" ? "#2563EB" : k === "counter" ? "#8B2252" : k === "message" ? "#0EA5E9" : "#6B7280";

  return (
    <div className="nd-card" style={{ marginTop: 12 }}>
      <div className="nd-card-head" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>Activity Timeline</strong>
        <span style={{ fontSize: 11, color: "#6B7280" }}>· times in America/New_York (EST/EDT)</span>
      </div>
      {loading ? (
        <div style={{ padding: 12, color: "#6B7280", fontSize: 13 }}>Loading…</div>
      ) : events.length === 0 ? (
        <div style={{ padding: 12, color: "#6B7280", fontSize: 13 }}>No activity yet.</div>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {events.map((e, i) => {
            if (e.title === "__via_mundus__" && e.detail) {
              let m: TimelineMessage | null = null;
              try {
                m = JSON.parse(e.detail) as TimelineMessage;
              } catch {
                m = null;
              }
              if (m) {
                const senderLabel =
                  m.sender_side === "buyer"
                    ? buyerLabel
                    : m.sender_side === "supplier"
                      ? supplierLabel
                      : "Mundus Trade";
                return (
                  <li
                    key={e.id}
                    style={{
                      padding: "4px 12px",
                      borderTop: i === 0 ? "none" : "1px solid #F3F4F6",
                    }}
                  >
                    <TimelineMessageCard
                      message={m}
                      currentUserSide={currentUserSide}
                      senderLabel={senderLabel}
                    />
                  </li>
                );
              }
            }
            return (
            <li
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: "16px 1fr",
                gap: 12,
                padding: "10px 12px",
                borderTop: i === 0 ? "none" : "1px solid #F3F4F6",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: dotColor(e.kind),
                  marginTop: 6,
                }}
              />
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>
                    {e.title}
                  </span>
                  <span style={{ fontSize: 11, color: "#6B7280" }}>{fmtEST(e.ts)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#4B5563", marginTop: 2 }}>{e.actor}</div>
                {e.detail && (
                  <div style={{ fontSize: 12, color: "#374151", marginTop: 2 }}>{e.detail}</div>
                )}
              </div>
            </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default NegotiationActivityTab;