import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { computeFinalPrice } from "@/lib/freightMath";

type Row = {
  port_id: string;
  port_name: string;
  port_code: string | null;
  country: string | null;
  cost: number | null;
  insurance: number | null;
};

export type LogisticsOverviewProps = {
  offerId: string;
  basePricePerKg: number;
  totalKg: number;
  primaryPricingIncoterm: string | null;
  pricingIncludesFreight: boolean | null;
  selectedPortId?: string | null;
};

function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || isNaN(n as number)) return "—";
  return `$${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export default function LogisticsOverview({
  offerId,
  basePricePerKg,
  totalKg,
  primaryPricingIncoterm,
  pricingIncludesFreight,
  selectedPortId,
}: LogisticsOverviewProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!offerId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("freight_options")
        .select("port_id, cost, insurance, ports(id, name, code, country)")
        .eq("offer_id", offerId);
      if (cancelled) return;
      const out: Row[] = [];
      const seen = new Set<string>();
      (data ?? []).forEach((r: any) => {
        const p = r.ports;
        if (!p || seen.has(p.id)) return;
        seen.add(p.id);
        out.push({
          port_id: p.id,
          port_name: p.name,
          port_code: p.code,
          country: p.country ?? null,
          cost: r.cost,
          insurance: r.insurance,
        });
      });
      setRows(out);
    })();
    return () => { cancelled = true; };
  }, [offerId]);

  const computed = useMemo(() => {
    return rows.map((r) => {
      const cfr = computeFinalPrice(
        basePricePerKg, totalKg, r.cost, r.insurance,
        primaryPricingIncoterm, "CFR", pricingIncludesFreight,
      );
      const cif = computeFinalPrice(
        basePricePerKg, totalKg, r.cost, r.insurance,
        primaryPricingIncoterm, "CIF", pricingIncludesFreight,
      );
      return { ...r, cfrPerKg: cfr.final, cifPerKg: cif.final };
    });
  }, [rows, basePricePerKg, totalKg, primaryPricingIncoterm, pricingIncludesFreight]);

  if (!rows.length) return null;

  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10 }}>
        📋 {t("buyer.offerDetail.logisticsOverview.title")}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "6px 8px" }}>{t("buyer.offerDetail.logisticsOverview.port")}</th>
              <th style={{ padding: "6px 8px" }}>{t("buyer.offerDetail.logisticsOverview.country")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>{t("buyer.offerDetail.logisticsOverview.freight")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>{t("buyer.offerDetail.logisticsOverview.insurance")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>{t("buyer.offerDetail.logisticsOverview.cfrPerKg")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>{t("buyer.offerDetail.logisticsOverview.cifPerKg")}</th>
            </tr>
          </thead>
          <tbody>
            {computed.map((r) => {
              const isSel = selectedPortId === r.port_id;
              return (
                <tr
                  key={r.port_id}
                  style={{
                    background: isSel ? "#fef0f4" : undefined,
                    borderBottom: "1px solid #f3f4f6",
                    fontWeight: isSel ? 600 : 400,
                    color: "#374151",
                  }}
                >
                  <td style={{ padding: "6px 8px" }}>
                    {r.port_name}{r.port_code ? ` (${r.port_code})` : ""}
                  </td>
                  <td style={{ padding: "6px 8px" }}>{r.country ?? "—"}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(r.cost, 2)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(r.insurance, 2)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(r.cfrPerKg, 4)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(r.cifPerKg, 4)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}