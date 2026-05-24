import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ORDER_STATUSES = [
  { value: "pending_supplier",     label: "Awaiting Supplier Acceptance", color: "#f59e0b", bg: "#fef3c7", icon: "⏳" },
  { value: "supplier_accepted",    label: "Supplier Accepted",            color: "#8B2252", bg: "#fdf2f8", icon: "✓" },
  { value: "awaiting_pre_payment", label: "Awaiting Pre-Payment",         color: "#3b82f6", bg: "#dbeafe", icon: "💳" },
  { value: "pre_payment_received", label: "Pre-Payment Received",         color: "#8b5cf6", bg: "#ede9fe", icon: "✅" },
  { value: "in_production",        label: "In Production",                color: "#f97316", bg: "#fff7ed", icon: "🏭" },
  { value: "ready_to_ship",        label: "Ready to Ship",                color: "#06b6d4", bg: "#ecfeff", icon: "📦" },
  { value: "booked",               label: "Vessel Booked",                color: "#0ea5e9", bg: "#e0f2fe", icon: "🚢" },
  { value: "stuffed",              label: "Container Stuffed",            color: "#6366f1", bg: "#eef2ff", icon: "📦" },
  { value: "shipped",              label: "Shipped",                      color: "#8B2252", bg: "#fdf2f8", icon: "⚓" },
  { value: "in_transit",           label: "In Transit",                   color: "#0d9488", bg: "#ccfbf1", icon: "🌊" },
  { value: "arrived",              label: "Arrived at Port",              color: "#059669", bg: "#d1fae5", icon: "🏁" },
  { value: "customs_clearance",    label: "Customs Clearance",            color: "#d97706", bg: "#fef3c7", icon: "📋" },
  { value: "delivered",            label: "Delivered",                    color: "#16a34a", bg: "#dcfce7", icon: "🚛" },
  { value: "awaiting_balance",     label: "Awaiting Balance Payment",     color: "#7c3aed", bg: "#ede9fe", icon: "💰" },
  { value: "completed",            label: "Completed",                    color: "#15803d", bg: "#dcfce7", icon: "🎉" },
  { value: "cancelled",            label: "Cancelled",                    color: "#dc2626", bg: "#fee2e2", icon: "✕" },
  { value: "on_hold",              label: "On Hold",                      color: "#6b7280", bg: "#f3f4f6", icon: "⏸" },
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number]["value"];

// Legacy / alias mapping so older DB values still display.
const LEGACY_ALIASES: Record<string, OrderStatus> = {
  accepted: "supplier_accepted",
  awaiting_payment: "awaiting_pre_payment",
  awaiting_supplier_acceptance: "pending_supplier",
  pre_payment_confirmed: "pre_payment_received",
  awaiting_balance_payment: "awaiting_balance",
  rejected: "cancelled",
};

export function normalizeStatus(status: string | null | undefined): OrderStatus {
  const s = (status ?? "").trim();
  if (!s) return "pending_supplier";
  if (ORDER_STATUSES.some((x) => x.value === s)) return s as OrderStatus;
  if (LEGACY_ALIASES[s]) return LEGACY_ALIASES[s];
  return "pending_supplier";
}

export function getStatusConfig(status: string | null | undefined) {
  const norm = normalizeStatus(status);
  return ORDER_STATUSES.find((s) => s.value === norm) ?? ORDER_STATUSES[0];
}

export function getStatusLabel(status: string | null | undefined) {
  return getStatusConfig(status).label;
}

export function StatusBadge({
  status,
  size = "md",
  style,
}: {
  status: string | null | undefined;
  size?: "sm" | "md";
  style?: CSSProperties;
}) {
  const cfg = getStatusConfig(status);
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  const fs = size === "sm" ? 10 : 11;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: pad,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
        ...style,
      }}
    >
      <span aria-hidden>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

/* ----- Shipping stepper ----- */

export const SHIPPING_STATUSES: OrderStatus[] = [
  "in_production",
  "ready_to_ship",
  "booked",
  "stuffed",
  "shipped",
  "in_transit",
  "arrived",
  "customs_clearance",
  "delivered",
];

export function ShippingStatusTracker({
  currentStatus,
  label,
}: {
  currentStatus: string | null | undefined;
  label?: string;
}) {
  const norm = normalizeStatus(currentStatus);
  const currentIdx = SHIPPING_STATUSES.indexOf(norm as OrderStatus);

  return (
    <div
      style={{
        padding: "16px 20px",
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#111827" }}>
        📦 {label ?? "Order Status"}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0,
          overflowX: "auto",
          paddingBottom: 4,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {SHIPPING_STATUSES.map((s, i) => {
          const cfg = getStatusConfig(s);
          const isComplete = currentIdx >= 0 && currentIdx >= i;
          const isCurrent = s === norm;
          return (
            <div key={s} style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 72,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    background: isComplete ? "#8B2252" : "#f3f4f6",
                    color: isComplete ? "white" : "#9ca3af",
                    border: isCurrent ? "2px solid #8B2252" : "2px solid transparent",
                    boxShadow: isCurrent ? "0 0 0 3px rgba(139,34,82,0.2)" : "none",
                  }}
                >
                  {isComplete ? "✓" : i + 1}
                </div>
                <span
                  style={{
                    fontSize: 9,
                    marginTop: 6,
                    textAlign: "center",
                    color: isComplete ? "#8B2252" : "#9ca3af",
                    fontWeight: isCurrent ? 700 : 500,
                    maxWidth: 68,
                    lineHeight: 1.2,
                  }}
                >
                  {cfg.label}
                </span>
              </div>
              {i < SHIPPING_STATUSES.length - 1 && (
                <div
                  style={{
                    width: 20,
                    height: 2,
                    flexShrink: 0,
                    background: currentIdx > i ? "#8B2252" : "#e5e7eb",
                    marginTop: 13,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders order status. If the order has more than one container (FCL),
 * shows one tracker per container labeled FCL 1, FCL 2 ... using the
 * per-container `status`. Otherwise shows a single tracker with the
 * order-level status.
 */
export function OrderShippingStatus({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: string | null | undefined;
}) {
  const [containers, setContainers] = useState<
    Array<{ id: string; position: number | null; container_number: string | null; status: string | null }>
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("shipment_containers")
        .select("id, position, container_number, status")
        .eq("order_id", orderId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (cancel) return;
      setContainers((data ?? []) as never);
      setLoaded(true);
    })();
    return () => {
      cancel = true;
    };
  }, [orderId]);

  if (!loaded || containers.length <= 1) {
    return <ShippingStatusTracker currentStatus={orderStatus} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {containers.map((c, i) => (
        <ShippingStatusTracker
          key={c.id}
          currentStatus={c.status ?? orderStatus}
          label={`FCL ${i + 1}${c.container_number ? ` · ${c.container_number}` : ""}`}
        />
      ))}
    </div>
  );
}