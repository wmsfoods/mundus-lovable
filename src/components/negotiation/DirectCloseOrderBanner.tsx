import { useState } from "react";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import { confirmNegotiation } from "@/components/supplier/CounterOfferActions";
import { countryFlag } from "@/lib/countryFlags";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, weightLabel } from "@/lib/units";

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
  const { unit } = useWeightUnit();
  const acceptedTotal =
    Number((negotiation as any).accepted_total_value ?? 0) ||
    Number((negotiation as any).settled_total_value ?? 0) ||
    0;
  const fmtUsd = (n: number, d = 0) =>
    `US$ ${n.toLocaleString(undefined, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })}`;

  const offer = negotiation.offer;
  const items = offer?.items ?? [];
  const buyerName = negotiation.buyer?.name ?? "Buyer";
  const offerNumber = offer?.offer_number ? `M-${offer.offer_number}` : "—";
  const destCountry =
    negotiation.port?.country?.english_name ??
    offer?.offer_markets?.[0]?.market?.country?.english_name ??
    "—";
  const originCountry = offer?.origin_country ?? "—";
  const totalQtyKg = items.reduce((s, it) => s + Number(it.amount || 0), 0);

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
        background: "white",
        border: "1px solid #16A34A",
        boxShadow: "0 2px 12px rgba(22,163,74,0.12)",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: "1px solid #DCFCE7",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              color: "#14532D",
              fontSize: 16,
              marginBottom: 4,
            }}
          >
            🎉 New order received
          </div>
          <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.5 }}>
            <strong>{buyerName}</strong> accepted your full asking price.
            Review and accept to create the order, or reject if you can't
            fulfill it.
          </div>
        </div>
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 11, color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>
            Order total
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#14532D" }}>
            {fmtUsd(acceptedTotal)}
          </div>
        </div>
      </div>

      {/* Order meta */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <Meta label="Order ref" value={offerNumber} />
        <Meta label="Buyer" value={buyerName} />
        <Meta label="Incoterm" value={(negotiation as any).incoterm ?? "FOB"} />
        <Meta
          label="Payment"
          value={offer?.payment_terms ?? "—"}
        />
        <Meta
          label="Origin"
          value={`${countryFlag(originCountry)} ${originCountry}`}
        />
        <Meta
          label="Destination"
          value={`${countryFlag(destCountry)} ${destCountry}`}
        />
        <Meta label="FCLs" value={String(negotiation.fcl_count ?? 1)} />
        <Meta
          label="Total weight"
          value={`${fmtWeight(totalQtyKg, unit)} ${weightLabel(unit)}`}
        />
      </div>

      {/* Cuts table */}
      {items.length > 0 && (
        <div
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 8,
              padding: "8px 12px",
              background: "#F9FAFB",
              fontSize: 11,
              fontWeight: 700,
              color: "#4B5563",
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            <div>Cut</div>
            <div style={{ textAlign: "right" }}>Qty</div>
            <div style={{ textAlign: "right" }}>Price/kg</div>
            <div style={{ textAlign: "right" }}>Subtotal</div>
          </div>
          {items.map((it) => {
            const qty = Number(it.amount || 0);
            const price = Number(it.price || 0);
            return (
              <div
                key={it.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  gap: 8,
                  padding: "10px 12px",
                  borderTop: "1px solid #F3F4F6",
                  fontSize: 13,
                  color: "#111827",
                }}
              >
                <div>{it.customer_product?.name ?? "Item"}</div>
                <div style={{ textAlign: "right" }}>
                  {fmtWeight(qty, unit)} {weightLabel(unit)}
                </div>
                <div style={{ textAlign: "right" }}>{fmtUsd(price, 2)}</div>
                <div style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtUsd(qty * price, 2)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          style={{
            background: "white",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 18px",
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#6B7280",
          textTransform: "uppercase",
          letterSpacing: 0.3,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ color: "#111827", fontWeight: 500 }}>{value}</div>
    </div>
  );
}