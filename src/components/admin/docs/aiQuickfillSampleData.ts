/**
 * Shared mock data used by /dev/ai-quickfill-samples to generate
 * Markdown, XLSX and PDF samples for testing the AI Quick-fill parser.
 */

export const SAMPLE_SUPPLIER = "World Meat Supplier LLC";
export const SAMPLE_BRAND = "JBS";
export const SAMPLE_PLANTS = ["1234", "5678"];

export type SampleItem = {
  product: string;
  plant: string;
  spec: string;
  marbling: string;
  qtyKg: number;
  minQtyKg: number;
  maxQtyKg: number;
  priceUsdPerMt: number;
  floorUsdPerMt: number;
};

export const SAMPLE_ITEMS: SampleItem[] = [
  {
    product: "Beef Brisket",
    plant: "1234",
    spec: "Boneless",
    marbling: "High",
    qtyKg: 14000,
    minQtyKg: 13000,
    maxQtyKg: 14000,
    priceUsdPerMt: 4200,
    floorUsdPerMt: 4000,
  },
  {
    product: "Beef Chuck",
    plant: "5678",
    spec: "Bone-In",
    marbling: "—",
    qtyKg: 14000,
    minQtyKg: 13000,
    maxQtyKg: 14000,
    priceUsdPerMt: 3200,
    floorUsdPerMt: 3050,
  },
];

export type SampleDestination = {
  port: string;
  country: string;
  freightUsd: number;
  insuranceUsd: number;
};

export const SAMPLE_DESTINATIONS: SampleDestination[] = [
  { port: "Shanghai", country: "China", freightUsd: 5000, insuranceUsd: 500 },
  { port: "Hong Kong", country: "Hong Kong", freightUsd: 8000, insuranceUsd: 500 },
  { port: "Haiphong", country: "Vietnam", freightUsd: 7000, insuranceUsd: 1000 },
];

export const SAMPLE_CONTAINER = "2 x 40ft FCL";
export const SAMPLE_TEMPERATURE = "Frozen";
export const SAMPLE_CERTIFICATIONS = "Halal";
export const SAMPLE_ORIGIN_COUNTRY = "Brazil";
export const SAMPLE_ORIGIN_PORT = "Santos";
export const SAMPLE_SHIPMENT = "June 2026";
export const SAMPLE_PAYMENT =
  "30% advance TT, balance against finalized doc copies";
export const SAMPLE_INCOTERMS = "CFR, CIF, FOB";
export const SAMPLE_PRIMARY_PRICING = "CFR Hong Kong";
export const SAMPLE_DISTRIBUTION = "Publish to marketplace + All my customers";
export const SAMPLE_NOTES = "Halal certified, ready for Asian markets.";

const fmt = (n: number) => n.toLocaleString("en-US");

export function buildSampleMarkdown(): string {
  const itemBlocks = SAMPLE_ITEMS.map((it, i) => {
    const marb = it.marbling && it.marbling !== "—" ? `, Marbling ${it.marbling}` : "";
    return [
      `### ${i + 1}. ${it.product} — ${it.spec}${marb}`,
      `- Plant: ${it.plant}`,
      `- Qty: ${fmt(it.qtyKg)} kg (min ${fmt(it.minQtyKg)} — max ${fmt(it.maxQtyKg)})`,
      `- Price: USD ${fmt(it.priceUsdPerMt)}/mt (floor USD ${fmt(it.floorUsdPerMt)}/mt)`,
    ].join("\n");
  }).join("\n\n");

  const destRows = SAMPLE_DESTINATIONS.map(
    (d) => `| ${d.port} | ${d.country} | ${fmt(d.freightUsd)} | ${fmt(d.insuranceUsd)} |`,
  ).join("\n");

  return `# Offer Quote — ${SAMPLE_SUPPLIER}

**Supplier:** ${SAMPLE_SUPPLIER}
**Brand:** ${SAMPLE_BRAND}
**Plants available:** ${SAMPLE_PLANTS.join(", ")}

## Container & Origin
- ${SAMPLE_CONTAINER} (${SAMPLE_TEMPERATURE}, ${SAMPLE_CERTIFICATIONS} certified)
- Origin: ${SAMPLE_ORIGIN_COUNTRY} / ${SAMPLE_ORIGIN_PORT}

## Items

${itemBlocks}

## Terms
- **Incoterms accepted:** ${SAMPLE_INCOTERMS}
- **Primary pricing:** ${SAMPLE_PRIMARY_PRICING}
- **Payment:** ${SAMPLE_PAYMENT}
- **Shipment:** ${SAMPLE_SHIPMENT}

## Destinations
| Port | Country | Freight (USD) | Insurance (USD) |
|---|---|---|---|
${destRows}

## Distribution
${SAMPLE_DISTRIBUTION}

## Notes
${SAMPLE_NOTES}
`;
}