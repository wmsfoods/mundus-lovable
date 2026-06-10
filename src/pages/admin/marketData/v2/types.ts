export type HsCategory = "all" | "bovina_fresca" | "bovina_congelada" | "suina" | "aves" | "miudezas" | "outros";

export const HS_CATEGORY_LABELS: Record<HsCategory, string> = {
  all: "Todas",
  bovina_fresca: "Bovina fresca",
  bovina_congelada: "Bovina congelada",
  miudezas: "Miudezas",
  suina: "Suína",
  aves: "Aves",
  outros: "Outros (cap. 02)",
};

export type PanelFilters = {
  from?: string; // YYYY-MM
  to?: string;   // YYYY-MM
  hs8?: string[];
  hsCategory?: HsCategory[];
  destCountry?: string[];
  polPort?: string[];
  shipperName?: string;
  consigneeName?: string;
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