import { useState } from "react";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import { confirmNegotiation } from "@/components/supplier/CounterOfferActions";

/**
 * Banner shown while a negotiation is in `pending_confirmation` status.
 * The counterparty (the side that did NOT accept) sees the "Confirm Deal"
 * action that finalizes the deal and creates the order.
 * Mundus admins managing the counterparty can also confirm on-behalf.
 */
export function PendingConfirmationBanner({
  negotiation,
  perspective,
  canConfirm,
  onConfirmed,
}: {
  negotiation: RealNegotiationRow;
  perspective: "buyer" | "supplier";
  canConfirm: boolean;
  onConfirmed?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const acceptedBy = (negotiation as any).accepted_by as "buyer" | "supplier" | null;
  const acceptedTotal =
    Number((negotiation as any).accepted_total_value ?? 0) ||
    Number((negotiation as any).settled_total_value ?? 0) ||
    0;
  const fmt = (n: number) =>
    `US$ ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const acceptedSide = acceptedBy === "buyer" ? "Buyer" : "Supplier";
  const youAreCounterparty = canConfirm;

  const handleConfirm = async () => {
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
        background: "linear-gradient(135deg,#FEF3C7,#FDE68A)",
        border: "1px solid #F59E0B",
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
        <div style={{ fontWeight: 700, color: "#92400E", fontSize: 14, marginBottom: 4 }}>
          ⏳ Awaiting final confirmation
        </div>
        <div style={{ fontSize: 13, color: "#78350F", lineHeight: 1.5 }}>
          {youAreCounterparty ? (
            <>
              <strong>{acceptedSide}</strong> accepted at <strong>{fmt(acceptedTotal)}</strong>.
              {" "}Review and click <strong>Confirm Deal</strong> to close it and create the order.
            </>
          ) : (
            <>
              You accepted at <strong>{fmt(acceptedTotal)}</strong>. Waiting for the{" "}
              <strong>{perspective === "buyer" ? "supplier" : "buyer"}</strong> to confirm.
            </>
          )}
        </div>
      </div>
      {youAreCounterparty && (
        <button
          type="button"
          onClick={handleConfirm}
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
          {busy ? "Confirming…" : "Confirm Deal →"}
        </button>
      )}
    </div>
  );
}