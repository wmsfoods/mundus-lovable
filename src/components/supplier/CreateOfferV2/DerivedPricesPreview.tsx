import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CutRow } from "@/lib/cutRowTypes";

type PortFreightShape =
  | { mode: "same"; same: string }
  | { mode: "perPort"; perPort: Record<string, string> };

type DestinationLike = {
  countryId: string;
  selectedPortIds: string[];
  freight: PortFreightShape;
  insurance: PortFreightShape;
};

type LogisticsLike = {
  destinations: DestinationLike[];
  sameFreightGlobal: boolean;
  globalFreight: string;
  globalInsurance: string;
  incoterms: string[];
  pricingReferencePortId: string | null;
};

type PortInfo = { id: string; name: string };

type Props = {
  cuts: CutRow[];
  logistics: LogisticsLike;
  originPortName: string;
  destinationPorts: PortInfo[]; // all destination ports across all countries
  totalKgPerOffer: number;
};

function freightForPort(l: LogisticsLike, portId: string): { cost: number; ins: number } {
  if (l.sameFreightGlobal) {
    return {
      cost: parseFloat(l.globalFreight) || 0,
      ins: parseFloat(l.globalInsurance) || 0,
    };
  }
  for (const d of l.destinations) {
    if (!d.selectedPortIds.includes(portId)) continue;
    const cost =
      d.freight.mode === "same"
        ? parseFloat(d.freight.same) || 0
        : parseFloat(d.freight.perPort[portId] ?? "") || 0;
    const ins =
      d.insurance.mode === "same"
        ? parseFloat(d.insurance.same) || 0
        : parseFloat(d.insurance.perPort[portId] ?? "") || 0;
    return { cost, ins };
  }
  return { cost: 0, ins: 0 };
}

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

export function DerivedPricesPreview({
  cuts,
  logistics,
  originPortName,
  destinationPorts,
  totalKgPerOffer,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.${k}`, { defaultValue: fb }) as string;

  const anchorId = logistics.pricingReferencePortId;
  const cifEnabled = logistics.incoterms.includes("CIF");

  const rows = useMemo(() => {
    return cuts
      .filter((c) => c.askPrice > 0 && c.cutName)
      .map((c) => {
        // Convert ASK (always per-kg) into FOB per kg.
        // Note: freight values are USD-per-FCL, not per-kg. We need to use
        // totalKgPerOffer (per FCL) as the denominator.
        const perKg = (totalUsd: number) =>
          totalKgPerOffer > 0 ? totalUsd / totalKgPerOffer : 0;

        let fobPerKg: number;
        if (!anchorId) {
          fobPerKg = c.askPrice;
        } else {
          const fr = freightForPort(logistics, anchorId);
          fobPerKg = c.askPrice - perKg(fr.cost);
        }

        const ports = destinationPorts.map((p) => {
          const fr = freightForPort(logistics, p.id);
          const cfr = fobPerKg + perKg(fr.cost);
          const cif = cifEnabled ? cfr + perKg(fr.ins) : null;
          return { ...p, cfr, cif, isAnchor: p.id === anchorId };
        });

        return { cutName: c.cutName, fobPerKg, ports };
      });
  }, [cuts, logistics, destinationPorts, anchorId, cifEnabled, totalKgPerOffer]);

  if (cuts.length === 0 || destinationPorts.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-foreground">
          💡 {tk("derivedPreview.title", "Derived prices preview — what buyers will see")}
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {tk("derivedPreview.empty", "Add a cut with ASK price to preview derived prices.")}
            </p>
          )}
          {rows.map((r, i) => (
            <div key={i} className="text-xs">
              <div className="mb-1 font-semibold text-foreground">{r.cutName}</div>
              <div className="ml-3 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                <div>
                  FOB {originPortName || "origin"}: {fmt(r.fobPerKg)}/kg
                </div>
                {r.ports.map((p) => (
                  <div key={p.id}>
                    CFR {p.name}: <span className="text-foreground">{fmt(p.cfr)}/kg</span>
                    {p.cif != null && <> · CIF {fmt(p.cif)}</>}
                    {p.isAnchor && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        ← {tk("derivedPreview.anchor", "anchor")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}