export type FreightBreakdown = {
  final: number;
  notes: string[];
  freightPerKg?: number;
  insurancePerKg?: number;
  parts?: { freight?: "add" | "subtract"; insurance?: "add" | "subtract" };
};

export function computeFinalPrice(
  basePrice: number,
  totalKg: number,
  freight: number | null | undefined,
  insurance: number | null | undefined,
  primary: string | null,
  chosen: string,
  includesFreight: boolean | null,
): FreightBreakdown {
  if (includesFreight === true) {
    return { final: basePrice, notes: ["priceIncludesFreight"] };
  }
  const isFreightInco = chosen === "CFR" || chosen === "CIF" || chosen === "CNF";
  if (isFreightInco && (freight == null || !totalKg)) {
    return { final: basePrice, notes: ["freightUnavailable"] };
  }
  const primaryEff = (primary || "CFR").toUpperCase();
  const ch = chosen.toUpperCase();
  const freightPerKg = freight != null && totalKg ? Number(freight) / totalKg : 0;
  const insurancePerKg = insurance != null && totalKg ? Number(insurance) / totalKg : 0;

  if (primaryEff === ch) {
    return { final: basePrice, notes: ["matchesPrimary"], freightPerKg, insurancePerKg };
  }

  if ((primaryEff === "FOB" || primaryEff === "EXW") && (ch === "CFR" || ch === "CNF" || ch === "CIF")) {
    let final = basePrice + freightPerKg;
    const parts: FreightBreakdown["parts"] = { freight: "add" };
    if (ch === "CIF") {
      final += insurancePerKg;
      parts.insurance = "add";
    }
    return { final, notes: [], freightPerKg, insurancePerKg, parts };
  }

  if ((primaryEff === "CFR" || primaryEff === "CNF" || primaryEff === "CIF") && (ch === "FOB" || ch === "EXW")) {
    let final = Math.max(0, basePrice - freightPerKg);
    const parts: FreightBreakdown["parts"] = { freight: "subtract" };
    if (primaryEff === "CIF") {
      final = Math.max(0, final - insurancePerKg);
      parts.insurance = "subtract";
    }
    return { final, notes: [], freightPerKg, insurancePerKg, parts };
  }

  if ((primaryEff === "CFR" || primaryEff === "CNF") && ch === "CIF") {
    return {
      final: basePrice + insurancePerKg,
      notes: [],
      freightPerKg,
      insurancePerKg,
      parts: { insurance: "add" },
    };
  }

  if (primaryEff === "CIF" && (ch === "CFR" || ch === "CNF")) {
    return {
      final: Math.max(0, basePrice - insurancePerKg),
      notes: [],
      freightPerKg,
      insurancePerKg,
      parts: { insurance: "subtract" },
    };
  }

  return { final: basePrice, notes: ["noConversion"], freightPerKg, insurancePerKg };
}