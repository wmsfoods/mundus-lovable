// Static option lists for Create Offer V2 (R2 layout shell).
// Region mapping is client-side because countries table has no region column.

export const REGIONS = [
  "All",
  "Americas",
  "Asia",
  "Europe",
  "Middle East",
  "Africa",
  "Oceania",
] as const;
export type Region = (typeof REGIONS)[number];

export const INCOTERMS = ["FOB", "CFR", "CIF", "EXW", "DDP", "DAP"] as const;
export type Incoterm = (typeof INCOTERMS)[number];

export const CERTIFICATIONS = [
  "USDA",
  "Halal",
  "Kosher",
  "HACCP",
  "BRC",
  "Organic",
  "None",
] as const;
export type Certification = (typeof CERTIFICATIONS)[number];

export const CONTAINER_SIZES = ["20ft", "40ft"] as const;
export type ContainerSize = (typeof CONTAINER_SIZES)[number];

export const TEMPERATURES = ["Frozen", "Chilled"] as const;
export type Temperature = (typeof TEMPERATURES)[number];

// ISO-2 → region. Covers every iso_code currently in public.countries plus common extras.
export const COUNTRY_REGION: Record<string, Exclude<Region, "All">> = {
  // Americas
  AG: "Americas", AR: "Americas", AW: "Americas", BB: "Americas", BM: "Americas",
  BR: "Americas", BS: "Americas", BZ: "Americas", CA: "Americas", CL: "Americas",
  CO: "Americas", CR: "Americas", CU: "Americas", CW: "Americas", DM: "Americas",
  DO: "Americas", EC: "Americas", GD: "Americas", GL: "Americas", GT: "Americas",
  GY: "Americas", HN: "Americas", HT: "Americas", JM: "Americas", KN: "Americas",
  LC: "Americas", MX: "Americas", NI: "Americas", PA: "Americas", PE: "Americas",
  PR: "Americas", PY: "Americas", SR: "Americas", SV: "Americas", SX: "Americas",
  TT: "Americas", US: "Americas", UY: "Americas", VC: "Americas", VE: "Americas",
  VG: "Americas",
  // Asia
  BD: "Asia", BN: "Asia", CN: "Asia", HK: "Asia", ID: "Asia", IN: "Asia",
  JP: "Asia", KH: "Asia", KR: "Asia", LK: "Asia", MM: "Asia", MO: "Asia",
  MV: "Asia", MY: "Asia", PH: "Asia", PK: "Asia", SG: "Asia", TH: "Asia",
  TL: "Asia", TW: "Asia", VN: "Asia",
  // Europe
  AL: "Europe", BE: "Europe", BG: "Europe", CH: "Europe", CY: "Europe",
  DE: "Europe", DK: "Europe", EE: "Europe", ES: "Europe", FI: "Europe",
  FO: "Europe", FR: "Europe", GB: "Europe", GE: "Europe", GI: "Europe",
  GR: "Europe", HR: "Europe", IE: "Europe", IS: "Europe", IT: "Europe",
  LT: "Europe", LV: "Europe", MD: "Europe", ME: "Europe", MT: "Europe",
  NL: "Europe", NO: "Europe", PL: "Europe", PT: "Europe", RO: "Europe",
  RU: "Europe", SE: "Europe", SI: "Europe", TR: "Europe", UA: "Europe",
  // Middle East
  AE: "Middle East", BH: "Middle East", IL: "Middle East", IQ: "Middle East",
  IR: "Middle East", JO: "Middle East", KW: "Middle East", LB: "Middle East",
  OM: "Middle East", PS: "Middle East", QA: "Middle East", SA: "Middle East",
  SY: "Middle East", YE: "Middle East",
  // Africa
  AO: "Africa", BJ: "Africa", CD: "Africa", CG: "Africa", CI: "Africa",
  CM: "Africa", CV: "Africa", DJ: "Africa", DZ: "Africa", EG: "Africa",
  ER: "Africa", GA: "Africa", GH: "Africa", GM: "Africa", GN: "Africa",
  GQ: "Africa", GW: "Africa", KE: "Africa", KM: "Africa", LR: "Africa",
  LY: "Africa", MA: "Africa", MG: "Africa", MR: "Africa", MU: "Africa",
  MZ: "Africa", NA: "Africa", NG: "Africa", SC: "Africa", SD: "Africa",
  SL: "Africa", SN: "Africa", SO: "Africa", ST: "Africa", TG: "Africa",
  TN: "Africa", TZ: "Africa", ZA: "Africa",
  // Oceania
  AS: "Oceania", AU: "Oceania", FJ: "Oceania", FM: "Oceania", GU: "Oceania",
  KI: "Oceania", MH: "Oceania", MP: "Oceania", NC: "Oceania", NR: "Oceania",
  NZ: "Oceania", PF: "Oceania", PG: "Oceania", PW: "Oceania", SB: "Oceania",
  TO: "Oceania", TV: "Oceania", VU: "Oceania", WS: "Oceania",
};

export function regionOfIso(iso: string | null | undefined): Exclude<Region, "All"> | null {
  if (!iso) return null;
  return COUNTRY_REGION[iso.toUpperCase()] ?? null;
}
