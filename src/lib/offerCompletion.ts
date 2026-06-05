import type { CutRow } from "@/lib/cutRowTypes";

type LogisticsLike = {
  originCountryId?: string | null;
  originPortIds: string[];
  destinations: { selectedPortIds: string[]; freight: { mode: "same"; same: string } | { mode: "perPort"; perPort: Record<string, string> } }[];
  incoterms: string[];
  sameFreightGlobal: boolean;
  globalFreight: string;
  primaryPricingIncoterm?: "CFR" | "FOB" | null;
  shipmentReady?: string;
};

type DistributionLike = {
  marketplace: boolean;
  allCustomers: boolean;
  specificCustomerIds: string[];
};

export type CompletionInput = {
  logistics: LogisticsLike;
  cuts: CutRow[];
  hasPlants: boolean;
  paymentTerms: string;
  distribution: DistributionLike;
};

export type SectionKey =
  | "origin"
  | "destinations"
  | "incoterm"
  | "freight"
  | "shipment"
  | "cuts"
  | "payment"
  | "distribution";

export type SectionGroup = "logistics" | "cuts" | "payment" | "distribution";

export type SectionStatus = {
  key: SectionKey;
  group: SectionGroup;
  labelKey: string; // i18n key, e.g. "completion.section.origin"
  ok: boolean;
  started: boolean; // true if user filled at least one field in this section
  missingFields: string[]; // i18n keys, e.g. "completion.field.originCountry"
};

export type CompletionBreakdown = {
  // New rich format
  percentage: number; // 0-100
  sections: SectionStatus[];
  // Backward compat
  logistics: number;
  cuts: number;
  payment: number;
  distribution: number;
  total: number;
  reasons: string[];
};

const SECTION = 25;

function f(field: string): string {
  return `completion.field.${field}`;
}

function originSection(l: LogisticsLike): SectionStatus {
  const missing: string[] = [];
  const started = !!l.originCountryId || (l.originPortIds?.length ?? 0) > 0;
  if (!l.originCountryId) missing.push(f("originCountry"));
  if (!l.originPortIds || l.originPortIds.length === 0) missing.push(f("originPort"));
  const singleOriginRequired = l.incoterms.includes("FOB") || l.incoterms.includes("EXW");
  if (singleOriginRequired && l.originPortIds.length > 1) missing.push(f("originSinglePort"));
  return { key: "origin", group: "logistics", labelKey: "completion.section.origin", ok: missing.length === 0, started, missingFields: missing };
}

function destinationsSection(l: LogisticsLike): SectionStatus {
  const missing: string[] = [];
  const started = l.destinations.length > 0;
  if (l.destinations.length === 0) missing.push(f("destinationCountry"));
  const totalPorts = l.destinations.reduce((a, d) => a + d.selectedPortIds.length, 0);
  if (l.destinations.length > 0 && totalPorts === 0) missing.push(f("destinationPort"));
  return { key: "destinations", group: "logistics", labelKey: "completion.section.destinations", ok: missing.length === 0, started, missingFields: missing };
}

function incotermSection(l: LogisticsLike): SectionStatus {
  const missing: string[] = [];
  const started = l.incoterms.length > 0;
  if (l.incoterms.length === 0) missing.push(f("incoterm"));
  const singleOriginRequired = l.incoterms.includes("FOB") || l.incoterms.includes("EXW");
  if (singleOriginRequired && !l.primaryPricingIncoterm) missing.push(f("primaryPricingIncoterm"));
  return { key: "incoterm", group: "logistics", labelKey: "completion.section.incoterm", ok: missing.length === 0, started, missingFields: missing };
}

function freightSection(l: LogisticsLike): SectionStatus {
  const missing: string[] = [];
  let started = false;
  if (l.sameFreightGlobal) {
    started = !!l.globalFreight;
    if (!(parseFloat(l.globalFreight) > 0)) missing.push(f("globalFreight"));
  } else {
    for (const d of l.destinations) {
      if (d.freight.mode === "same") {
        if (d.freight.same) started = true;
        if (!(parseFloat(d.freight.same) > 0)) {
          missing.push(f("destinationFreight"));
          break;
        }
      } else {
        for (const pid of d.selectedPortIds) {
          if (d.freight.perPort[pid]) started = true;
          if (!(parseFloat(d.freight.perPort[pid] ?? "") > 0)) {
            missing.push(f("portFreight"));
            break;
          }
        }
        if (missing.length > 0) break;
      }
    }
    // If no destinations yet, freight cannot be set — surface as missing only if dests exist
    if (l.destinations.length === 0 && missing.length === 0) missing.push(f("freightAwaitingDestinations"));
  }
  return { key: "freight", group: "logistics", labelKey: "completion.section.freight", ok: missing.length === 0, started, missingFields: missing };
}

function shipmentSection(l: LogisticsLike): SectionStatus {
  const missing: string[] = [];
  const started = !!l.shipmentReady;
  if (!l.shipmentReady) missing.push(f("shipmentMonth"));
  return { key: "shipment", group: "logistics", labelKey: "completion.section.shipment", ok: missing.length === 0, started, missingFields: missing };
}

function cutsSection(cuts: CutRow[], hasPlants: boolean): SectionStatus {
  const missing: string[] = [];
  const started = cuts.length > 0 && cuts.some((c) => c.cutName || c.qty > 0 || c.askPrice > 0);
  if (cuts.length === 0) {
    missing.push(f("cutAtLeastOne"));
    return { key: "cuts", group: "cuts", labelKey: "completion.section.cuts", ok: false, started, missingFields: missing };
  }
  let needCut = false, needQty = false, needPrice = false, badFloor = false, needPlant = false;
  for (const c of cuts) {
    if (!c.cutId) needCut = true;
    if (!(c.qty > 0)) needQty = true;
    if (!(c.askPrice > 0)) needPrice = true;
    if (c.floorPrice > 0 && c.floorPrice > c.askPrice) badFloor = true;
    if (hasPlants && !c.plantId) needPlant = true;
  }
  if (needCut) missing.push(f("cutSelection"));
  if (needQty) missing.push(f("cutQty"));
  if (needPrice) missing.push(f("cutPrice"));
  if (badFloor) missing.push(f("cutFloorAboveAsk"));
  if (needPlant) missing.push(f("cutPlant"));
  return { key: "cuts", group: "cuts", labelKey: "completion.section.cuts", ok: missing.length === 0, started, missingFields: missing };
}

function paymentSection(pt: string): SectionStatus {
  const missing: string[] = [];
  const started = !!pt;
  if (!pt) missing.push(f("paymentTerm"));
  return { key: "payment", group: "payment", labelKey: "completion.section.payment", ok: missing.length === 0, started, missingFields: missing };
}

function distributionSection(d: DistributionLike): SectionStatus {
  const missing: string[] = [];
  const started = d.marketplace || d.allCustomers || d.specificCustomerIds.length > 0;
  if (!started) missing.push(f("distributionChannel"));
  return { key: "distribution", group: "distribution", labelKey: "completion.section.distribution", ok: missing.length === 0, started, missingFields: missing };
}

export function computeCompletion(input: CompletionInput): CompletionBreakdown {
  const sections: SectionStatus[] = [
    originSection(input.logistics),
    destinationsSection(input.logistics),
    incotermSection(input.logistics),
    freightSection(input.logistics),
    shipmentSection(input.logistics),
    cutsSection(input.cuts, input.hasPlants),
    paymentSection(input.paymentTerms),
    distributionSection(input.distribution),
  ];

  // Logistics group OK = all logistics subsections OK
  const logisticsOk = sections.filter((s) => s.group === "logistics").every((s) => s.ok);
  const cutsOk = sections.find((s) => s.key === "cuts")!.ok;
  const paymentOk = sections.find((s) => s.key === "payment")!.ok;
  const distOk = sections.find((s) => s.key === "distribution")!.ok;

  const reasons: string[] = [];
  if (!logisticsOk) reasons.push("reasonLogistics");
  if (!cutsOk) reasons.push("reasonCuts");
  if (!paymentOk) reasons.push("reasonPayment");
  if (!distOk) reasons.push("reasonDistribution");

  const logistics = logisticsOk ? SECTION : 0;
  const cuts = cutsOk ? SECTION : 0;
  const payment = paymentOk ? SECTION : 0;
  const distribution = distOk ? SECTION : 0;
  const total = logistics + cuts + payment + distribution;

  return {
    percentage: total,
    sections,
    logistics,
    cuts,
    payment,
    distribution,
    total,
    reasons,
  };
}

/** Helpers for UI */
export function sectionStatus(s: SectionStatus): "ok" | "partial" | "empty" {
  if (s.ok) return "ok";
  if (s.started) return "partial";
  return "empty";
}

export function missingSections(report: CompletionBreakdown): SectionStatus[] {
  return report.sections.filter((s) => !s.ok);
}