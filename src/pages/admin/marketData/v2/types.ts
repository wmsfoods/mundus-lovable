// New protein taxonomy (display in this exact order in the UI)
export type HsCategory =
  | "beef"
  | "beef_offals"
  | "pork"
  | "poultry"
  | "cured_meats"
  | "animal_fats"
  | "other_meats";

export const HS_CATEGORY_ORDER: HsCategory[] = [
  "beef",
  "beef_offals",
  "pork",
  "poultry",
  "cured_meats",
  "animal_fats",
  "other_meats",
];

export const HS_CATEGORY_LABELS: Record<HsCategory, string> = {
  beef: "Beef",
  beef_offals: "Beef Offals",
  pork: "Pork",
  poultry: "Poultry",
  cured_meats: "Cured Meats",
  animal_fats: "Animal Fats",
  other_meats: "Other Meats",
};

export type Temperature = "frozen" | "chilled";

export type PanelFilters = {
  from?: string; // YYYY-MM
  to?: string;   // YYYY-MM
  hs8?: string[];
  hsCategory?: string[]; // accepts HsCategory or legacy keys (backward compat)
  temperature?: Temperature[];
  productSearch?: string;
  productTypes?: string[]; // exact bl_description values
  destCountry?: string[];
  polPort?: string[];
  shipperName?: string;             // legacy single (still accepted)
  consigneeName?: string;           // legacy single (still accepted)
  shipperNames?: string[];
  consigneeNames?: string[];
  consigneeCountry?: string[];
  shipperState?: string[];
  realOwnerOnly?: boolean;
};

export type KpiPayload = {
  current: { volume: number; fob: number; avg_price_ton: number | null; shippers: number; consignees: number; dest_countries: number };
  previous: KpiPayload["current"] | null;
};

export type MonthlyRow = { month: string; volume: number; fob: number; avg_price_ton: number | null; shipments: number };

export type TopRow = {
  name: string;
  volume: number;
  fob: number;
  avg_price_ton: number | null;
  counterparts: number;
  shipments: number;
  share_pct: number;
};

export type MatrixPayload = {
  rows: string[];
  cols: string[];
  cells: Record<string, Record<string, number>>;
};