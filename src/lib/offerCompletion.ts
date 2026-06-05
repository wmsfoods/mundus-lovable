import type { CutRow } from "@/lib/cutRowTypes";

type LogisticsLike = {
  originPortId: string | null;
  destinations: { selectedPortIds: string[]; freight: { mode: "same"; same: string } | { mode: "perPort"; perPort: Record<string, string> } }[];
  incoterms: string[];
  sameFreightGlobal: boolean;
  globalFreight: string;
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

export type CompletionBreakdown = {
  logistics: number;
  cuts: number;
  payment: number;
  distribution: number;
  total: number;
  reasons: string[];
};

const SECTION = 25;

function logisticsOk(l: LogisticsLike): boolean {
  if (!l.originPortId) return false;
  if (l.destinations.length === 0) return false;
  const totalPorts = l.destinations.reduce((a, d) => a + d.selectedPortIds.length, 0);
  if (totalPorts === 0) return false;
  if (l.incoterms.length === 0) return false;
  if (l.sameFreightGlobal) {
    if (!(parseFloat(l.globalFreight) > 0)) return false;
  } else {
    for (const d of l.destinations) {
      if (d.freight.mode === "same") {
        if (!(parseFloat(d.freight.same) > 0)) return false;
      } else {
        for (const pid of d.selectedPortIds) {
          if (!(parseFloat(d.freight.perPort[pid] ?? "") > 0)) return false;
        }
      }
    }
  }
  return true;
}

function cutsOk(cuts: CutRow[], hasPlants: boolean): boolean {
  if (cuts.length === 0) return false;
  for (const c of cuts) {
    if (!c.cutId) return false;
    if (!(c.qty > 0)) return false;
    if (!(c.askPrice > 0)) return false;
    if (c.floorPrice > 0 && c.floorPrice > c.askPrice) return false;
    if (hasPlants && !c.plantId) return false;
  }
  return true;
}

function distOk(d: DistributionLike): boolean {
  return d.marketplace || d.allCustomers || d.specificCustomerIds.length > 0;
}

export function computeCompletion(input: CompletionInput): CompletionBreakdown {
  const reasons: string[] = [];
  const lOk = logisticsOk(input.logistics);
  const cOk = cutsOk(input.cuts, input.hasPlants);
  const pOk = !!input.paymentTerms;
  const dOk = distOk(input.distribution);

  if (!lOk) reasons.push("reasonLogistics");
  if (!cOk) reasons.push("reasonCuts");
  if (!pOk) reasons.push("reasonPayment");
  if (!dOk) reasons.push("reasonDistribution");

  const logistics = lOk ? SECTION : 0;
  const cuts = cOk ? SECTION : 0;
  const payment = pOk ? SECTION : 0;
  const distribution = dOk ? SECTION : 0;
  return { logistics, cuts, payment, distribution, total: logistics + cuts + payment + distribution, reasons };
}