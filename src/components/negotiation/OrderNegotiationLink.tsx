import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Banner shown on Order/Sale detail screens linking back to the
 * negotiation that produced the order (if any).
 */
export function OrderNegotiationLink({
  orderId,
  role,
}: {
  orderId: string;
  role: "buyer" | "supplier";
}) {
  const [negId, setNegId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("negotiation_id")
        .eq("id", orderId)
        .maybeSingle();
      if (cancelled) return;
      setNegId((data?.negotiation_id as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  if (!negId) return null;
  const href = role === "buyer"
    ? `/buyer/negotiations/${negId}`
    : `/supplier/negotiations/${negId}`;
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        background: "#fdf2f8",
        border: "1px solid #f9a8d4",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#8B2252" }}>
          🤝 Originated from Negotiation
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          View the full negotiation history and price evolution.
        </div>
      </div>
      <Link
        to={href}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid #8B2252",
          color: "#8B2252",
          fontSize: 12,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        View Negotiation →
      </Link>
    </div>
  );
}

export default OrderNegotiationLink;