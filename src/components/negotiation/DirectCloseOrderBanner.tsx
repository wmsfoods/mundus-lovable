import { useState } from "react";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import { confirmNegotiation } from "@/components/supplier/CounterOfferActions";

/**
 * Supplier-only banner shown when a buyer used "Close Deal" at the full
 * asking price. The negotiation lands in `pending_confirmation` with
 * `origin='direct_close'`, and the supplier only sees Accept / Reject —
 * there is no counter (the buyer accepted the supplier's own price).
 */
export function DirectCloseOrderBanner({
  negotiation,
  onConfirmed,
  onReject,
}: {
  negotiation: RealNegotiationRow;
  onConfirmed?: () => void;
  onReject: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const acceptedTotal =
    Number((negotiation as any).accepted_total_value ?? 0) ||
    Number((negotiation as any).settled_total_value ?? 0) ||
    0;
  const fmt = (n: number) =>
    `US$ ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const handleAccept = async () => {
    setBusy(true);
    try {
      const ok = await confirmNegotiation(negotiation);
      if (ok) onConfirmed?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#DCFCE7,#BBF7D0)",
        border: "1px solid #16A34A",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: "#14532D", fontSize: 14, marginBottom: 4 }}>
          🎉 New order received
        </div>
        <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.5 }}>
          The buyer accepted your full asking price of{" "}
          <strong>{fmt(acceptedTotal)}</strong>. Review and accept to create the
          order, or reject if you can't fulfill it.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          style={{
            background: "white",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 16px",
            fontWeight: 600,
            fontSize: 14,
            cursor: busy ? "wait" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Reject order
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={busy}
          style={{
            background: "#15803d",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: 14,
            cursor: busy ? "wait" : "pointer",
            boxShadow: "0 2px 6px rgba(21,128,61,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          {busy ? "Accepting…" : "Accept order →"}
        </button>
      </div>
    </div>
  );
}