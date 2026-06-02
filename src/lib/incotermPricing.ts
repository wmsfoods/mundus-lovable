/**
 * Dynamic pricing helpers driven by the buyer's chosen incoterm.
 *
 * The supplier always quotes in FOB-equivalent ($/kg of product at port).
 * Depending on the incoterm the buyer picks, we add freight and/or insurance
 * on top of the base price so the displayed effective price reflects what the
 * buyer would actually pay per kg at destination terms.
 *
 *   FOB / EXW → effective = base                              (no add-on)
 *   CFR       → effective = base + freight/kg                 (ocean freight)
 *   CIF       → effective = base + freight/kg + insurance/kg  (freight + insurance)
 *
 * Use {@link stripIncotermAdjustment} to convert an effective price back to FOB
 * (e.g. when the supplier evaluates a buyer's CFR bid).
 */

export type Incoterm = "FOB" | "EXW" | "CFR" | "CIF" | string;

/**
 * Format an incoterm with the correct accompanying place per Incoterms rules:
 *  - FOB / EXW → named place is the ORIGIN port
 *  - CFR / CIF / CNF → named place is the DESTINATION port (or destination country if no port)
 * Returns just the incoterm code if no place is available.
 */
export function formatIncotermWithPlace(
  incoterm: string | null | undefined,
  opts: {
    originPort?: string | null;
    destinationPorts?: string[];
    destinationNames?: string[];
  },
): string {
  const ic = (incoterm ?? "").toString();
  if (!ic) return "—";
  const up = ic.toUpperCase();
  const { originPort, destinationPorts = [], destinationNames = [] } = opts;
  if (up === "FOB" || up === "EXW") {
    return originPort ? `${ic} ${originPort}` : ic;
  }
  if (up === "CFR" || up === "CIF" || up === "CNF" || up === "C&F") {
    const places = destinationPorts.length ? destinationPorts : destinationNames;
    if (!places.length) return ic;
    return places.length === 1
      ? `${ic} ${places[0]}`
      : `${ic} ${places[0]} +${places.length - 1}`;
  }
  return ic;
}

export function getIncotermAddOn(
  incoterm: string | null | undefined,
  freightPerKg: number,
  insurancePerKg: number,
): number {
  const ic = (incoterm ?? "").toUpperCase();
  switch (ic) {
    case "CFR":
    case "CNF":
    case "C&F":
      return freightPerKg;
    case "CIF":
      return freightPerKg + insurancePerKg;
    case "FOB":
    case "EXW":
    default:
      return 0;
  }
}

export function getEffectiveAskingPrice(
  basePrice: number,
  incoterm: string | null | undefined,
  freightPerKg: number,
  insurancePerKg: number,
): number {
  return basePrice + getIncotermAddOn(incoterm, freightPerKg, insurancePerKg);
}

/** Convert an incoterm-adjusted price back to FOB. */
export function stripIncotermAdjustment(
  effectivePrice: number,
  incoterm: string | null | undefined,
  freightPerKg: number,
  insurancePerKg: number,
): number {
  return Math.max(0, effectivePrice - getIncotermAddOn(incoterm, freightPerKg, insurancePerKg));
}

/** Short message describing what's included in the displayed prices. */
export function getIncotermBannerLabel(
  incoterm: string | null | undefined,
  freightPerKg: number,
  insurancePerKg: number,
  formatPrice: (v: number) => string,
): { tone: "info" | "warn"; text: string } {
  const ic = (incoterm ?? "").toUpperCase();
  if (ic === "FOB") {
    return { tone: "warn", text: `Prices shown are FOB — freight not included.` };
  }
  if (ic === "EXW") {
    return { tone: "warn", text: `Prices shown are EXW — buyer pays freight and inland transport.` };
  }
  if (ic === "CFR" || ic === "CNF" || ic === "C&F") {
    return { tone: "info", text: `Prices include freight of ${formatPrice(freightPerKg)} (${ic}).` };
  }
  if (ic === "CIF") {
    return {
      tone: "info",
      text: `Prices include freight ${formatPrice(freightPerKg)} + insurance ${formatPrice(insurancePerKg)} (CIF).`,
    };
  }
  return { tone: "info", text: `Incoterm: ${incoterm ?? "—"}` };
}
