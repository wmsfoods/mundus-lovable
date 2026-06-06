import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

type Port = { id: string; name: string; code: string | null };
type FreightRow = { port_id: string; cost: number | null; insurance: number | null };

export type FreightCalculatorProps = {
  offerId: string;
  primaryPricingIncoterm: string | null;
  pricingIncludesFreight: boolean | null;
  acceptedIncoterms: string[];
  basePricePerKg: number;
  totalKg: number;
  /** Notify parent (OfferDetail) when selection changes so other widgets can re-render. */
  onSelectionChange?: (sel: { portId: string | null; incoterm: string | null }) => void;
};

export default function FreightCalculator({
  offerId,
  pricingIncludesFreight,
  acceptedIncoterms,
  onSelectionChange,
}: FreightCalculatorProps) {
  const { t } = useTranslation();
  const [ports, setPorts] = useState<Port[]>([]);
  const [, setFreight] = useState<FreightRow[]>([]);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [selectedIncoterm, setSelectedIncoterm] = useState<string | null>(
    acceptedIncoterms[0] ?? null,
  );

  useEffect(() => {
    onSelectionChange?.({ portId: selectedPortId, incoterm: selectedIncoterm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPortId, selectedIncoterm]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("freight_options")
        .select("port_id, cost, insurance, ports(id, name, code)")
        .eq("offer_id", offerId);
      if (cancelled) return;
      const portList: Port[] = [];
      const freightList: FreightRow[] = [];
      const seen = new Set<string>();
      (data ?? []).forEach((row: any) => {
        const p = row.ports;
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          portList.push({ id: p.id, name: p.name, code: p.code });
        }
        freightList.push({
          port_id: row.port_id,
          cost: row.cost,
          insurance: row.insurance,
        });
      });
      setPorts(portList);
      setFreight(freightList);
      setSelectedPortId((cur) => cur ?? portList[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  const isFob = selectedIncoterm === "FOB";

  if (!acceptedIncoterms.length) return null;

  const includesFreight = pricingIncludesFreight === true;

  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#fafafa",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10 }}>
        🧮 {t("buyer.offerDetail.freightCalc.title")}
      </div>

      {includesFreight && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#dbeafe",
            color: "#1e40af",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 10,
            display: "inline-block",
          }}
        >
          ✓ {t("buyer.offerDetail.freightCalc.priceIncludesFreight")}
        </div>
      )}

      {/* Port picker */}
      {ports.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
            {t("buyer.offerDetail.freightCalc.selectPort")}
          </label>
          <select
            value={selectedPortId ?? ""}
            disabled={isFob}
            onChange={(e) => setSelectedPortId(e.target.value || null)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              fontSize: 13,
              background: isFob ? "#f3f4f6" : "white",
              color: isFob ? "#9ca3af" : undefined,
              cursor: isFob ? "not-allowed" : undefined,
              maxWidth: 320,
            }}
          >
            {ports.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.code ? ` (${p.code})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Incoterm picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
          {t("buyer.offerDetail.freightCalc.selectIncoterm")}
        </label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {acceptedIncoterms.map((inc) => {
            const active = selectedIncoterm === inc;
            return (
              <button
                key={inc}
                type="button"
                onClick={() => setSelectedIncoterm(inc)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: active ? "1px solid #8B2252" : "1px solid #d1d5db",
                  background: active ? "#8B2252" : "white",
                  color: active ? "white" : "#374151",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {inc}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#6b7280" }}>
        {t("buyer.offerDetail.freightCalc.derivedNote", {
          defaultValue: "Prices update per row above based on your selection.",
        })}
      </div>
    </div>
  );
}