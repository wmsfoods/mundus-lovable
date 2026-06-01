export type RepEligibility = "both" | "supplier";
export type LeadType = "buyer" | "supplier" | "buyer_supplier";

export interface MundusRep {
  name: string;
  eligibility: RepEligibility;
}

export const MUNDUS_REPS: MundusRep[] = [
  { name: "Fernando Nascimento", eligibility: "both" },
  { name: "Gustavo Agostinho", eligibility: "both" },
  { name: "Monica Barro", eligibility: "supplier" },
  { name: "Debora Pereira", eligibility: "both" },
  { name: "Reginaldo Ferri", eligibility: "both" },
  { name: "Tomas Moschen", eligibility: "both" },
];

export function repsFor(leadType: LeadType): MundusRep[] {
  if (leadType === "supplier" || leadType === "buyer_supplier") return MUNDUS_REPS;
  return MUNDUS_REPS.filter((r) => r.eligibility !== "supplier");
}