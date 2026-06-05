import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { computeFinalPrice, type FreightBreakdown } from "@/lib/freightMath";

type Port = { id: string; name: string; code: string | null };
type FreightRow = { port_id: string; cost: number | null; insurance: number | null };

export type FreightCalculatorProps = {
  offerId: string;
  primaryPricingIncoterm: string | null;
  pricingIncludesFreight: boolean | null;
  acceptedIncoterms: string[];
  basePricePerKg: number;
  totalKg: number;
  /** Average FOB ask price across items (weighted by amount), null when no item has FOB pricing. */
  fobAvgPricePerKg?: number | null;
  /** Notify parent (OfferDetail) when selection changes so other widgets can re-render. */
  onSelectionChange?: (sel: { portId: string | null; incoterm: string | null }) => void;
};

type Breakdown = FreightBreakdown;

function fmt(n: number, digits = 2): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export default function FreightCalculator({
  offerId,
  primaryPricingIncoterm,
  pricingIncludesFreight,
  acceptedIncoterms,
  basePricePerKg,
  totalKg,
  fobAvgPricePerKg = null,
  onSelectionChange,
}: FreightCalculatorProps) {
  const { t } = useTranslation();
  const [ports, setPorts] = useState<Port[]>([]);
  const [freight, setFreight] = useState<FreightRow[]>([]);
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

  const selectedFreight = useMemo(
    () => freight.find((f) => f.port_id === selectedPortId) ?? null,
    [freight, selectedPortId],
  );

  const isFob = selectedIncoterm === "FOB";
  const fobUnavailable = isFob && (fobAvgPricePerKg == null || !(fobAvgPricePerKg > 0));

  const breakdown = useMemo<Breakdown | null>(() => {
    if (!selectedIncoterm) return null;
    if (isFob) return null; // FOB is fixed at origin, no freight math
    return computeFinalPrice(
      basePricePerKg,
      totalKg,
      selectedFreight?.cost ?? null,
      selectedFreight?.insurance ?? null,
      primaryPricingIncoterm,
      selectedIncoterm,
      pricingIncludesFreight,
    );
  }, [
    basePricePerKg,
    totalKg,
    selectedFreight,
    primaryPricingIncoterm,
    selectedIncoterm,
    pricingIncludesFreight,
    isFob,
  ]);

  if (!acceptedIncoterms.length) return null;

  const primaryEff = (primaryPricingIncoterm || "CFR").toUpperCase();
  const includesFreight = pricingIncludesFreight === true;
  const noFreightDataForPort =
    !!selectedPortId && !includesFreight && (selectedFreight?.cost == null);
  const isFreightInco =
    selectedIncoterm === "CFR" || selectedIncoterm === "CIF" || selectedIncoterm === "CNF";

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
            const isFobBtn = inc === "FOB";
            const fobBtnDisabled = isFobBtn && (fobAvgPricePerKg == null || !(fobAvgPricePerKg > 0));
            return (
              <button
                key={inc}
                type="button"
                onClick={() => !fobBtnDisabled && setSelectedIncoterm(inc)}
                disabled={fobBtnDisabled}
                title={fobBtnDisabled ? t("buyer.offerDetail.freightCalc.fobUnavailable") as string : undefined}
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: active ? "1px solid #8B2252" : "1px solid #d1d5db",
                  background: active ? "#8B2252" : "white",
                  color: active ? "white" : "#374151",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: fobBtnDisabled ? "not-allowed" : "pointer",
                  opacity: fobBtnDisabled ? 0.5 : 1,
                }}
              >
                {inc}
              </button>
            );
          })}
        </div>
      </div>

      {/* FOB-specific display */}
      {isFob && (
        <div
          style={{
            display: "grid",
            gap: 4,
            fontSize: 13,
            color: "#374151",
            background: "white",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          {fobUnavailable ? (
            <div style={{ fontSize: 12, color: "#92400e" }}>
              ⚠️ {t("buyer.offerDetail.freightCalc.fobUnavailable")}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#111827" }}>
                <span>{t("buyer.offerDetail.freightCalc.final", { incoterm: "FOB" })}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmt(fobAvgPricePerKg ?? 0, 4)}/kg
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                {t("buyer.offerDetail.freightCalc.fobNote")}
              </div>
            </>
          )}
        </div>
      )}

      {/* Warnings */}
      {!isFob && noFreightDataForPort && isFreightInco && !includesFreight && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fef3c7",
            color: "#92400e",
            fontSize: 12,
            marginBottom: 10,
            border: "1px solid #fde68a",
          }}
        >
          ⚠️ {t("buyer.offerDetail.freightCalc.contactSupplier")}
        </div>
      )}

      {/* Breakdown */}
      {breakdown && selectedIncoterm && (
        <div
          style={{
            display: "grid",
            gap: 4,
            fontSize: 13,
            color: "#374151",
            background: "white",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {t("buyer.offerDetail.freightCalc.basePrice", { incoterm: primaryEff })}
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(basePricePerKg, 4)}/kg
            </span>
          </div>

          {breakdown.parts?.freight && breakdown.freightPerKg ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: breakdown.parts.freight === "add" ? "#15803d" : "#b91c1c",
              }}
            >
              <span>
                {breakdown.parts.freight === "add" ? "+ " : "− "}
                {t("buyer.offerDetail.freightCalc.freight")} ({fmt(selectedFreight?.cost ?? 0, 2)} /{" "}
                {totalKg.toLocaleString()}kg)
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {breakdown.parts.freight === "add" ? "+" : "−"}
                {fmt(breakdown.freightPerKg, 4)}/kg
              </span>
            </div>
          ) : null}

          {breakdown.parts?.insurance && breakdown.insurancePerKg ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: breakdown.parts.insurance === "add" ? "#15803d" : "#b91c1c",
              }}
            >
              <span>
                {breakdown.parts.insurance === "add" ? "+ " : "− "}
                {t("buyer.offerDetail.freightCalc.insurance")} ({fmt(selectedFreight?.insurance ?? 0, 2)} /{" "}
                {totalKg.toLocaleString()}kg)
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {breakdown.parts.insurance === "add" ? "+" : "−"}
                {fmt(breakdown.insurancePerKg, 4)}/kg
              </span>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid #e5e7eb",
              paddingTop: 6,
              marginTop: 4,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            <span>
              {t("buyer.offerDetail.freightCalc.final", { incoterm: selectedIncoterm })}
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(breakdown.final, 4)}/kg
            </span>
          </div>

          {breakdown.notes.includes("matchesPrimary") && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              {t("buyer.offerDetail.freightCalc.matchesPrimary")}
            </div>
          )}
          {breakdown.notes.includes("freightUnavailable") && (
            <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>
              {t("buyer.offerDetail.freightCalc.freightUnavailable")}
            </div>
          )}
          {(breakdown.notes.includes("noConversion") ||
            (!includesFreight && !breakdown.parts && !breakdown.notes.includes("matchesPrimary"))) && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              {t("buyer.offerDetail.freightCalc.estimatedNote")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}