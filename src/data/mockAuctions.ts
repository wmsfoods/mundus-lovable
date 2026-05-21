export type AuctionStatus = "scheduled" | "open" | "closed" | "awarded" | "cancelled";
export type AuctionProtein = "Beef" | "Pork" | "Poultry" | "Ovine";

export type MockAuction = {
  id: string;
  oppNumber: string;
  title: string;
  supplier: string;
  protein: AuctionProtein;
  emoji: string;
  temperature: "Frozen" | "Chilled";
  containerSize: "20ft" | "40ft";
  containerCount: number;
  incoterm: string;
  originCountry: string;
  originCode: string;
  destCountry: string;
  destCode: string;
  shipmentPeriod: string;
  status: AuctionStatus;
  bidsCount: number;
  /** Hours until close from "now" — used to compute a stable closesAt at module load. */
  closesInHours?: number;
  /** Hours of total window (for progress bar). */
  windowHours?: number;
};

const NOW = Date.now();

function makeClosesAt(hours: number | undefined): number | null {
  if (hours === undefined) return null;
  return NOW + hours * 3600_000;
}

const RAW: MockAuction[] = [
  {
    id: "a-1",
    oppNumber: "MDS-A#00001",
    title: "2x40' Chicken Whole - JBS - Iraq",
    supplier: "JBS Foods",
    protein: "Poultry", emoji: "🐓",
    temperature: "Frozen", containerSize: "40ft", containerCount: 2,
    incoterm: "CFR",
    originCountry: "Brazil", originCode: "BR",
    destCountry: "Iraq", destCode: "IQ",
    shipmentPeriod: "Dec 15 - Jan 25, 2026",
    status: "awarded", bidsCount: 8,
  },
  {
    id: "a-2",
    oppNumber: "MDS-A#00002",
    title: "1x40' Beef Striploin - Pampa - Korea",
    supplier: "Pampa SA",
    protein: "Beef", emoji: "🥩",
    temperature: "Chilled", containerSize: "40ft", containerCount: 1,
    incoterm: "CIF",
    originCountry: "Argentina", originCode: "AR",
    destCountry: "South Korea", destCode: "KR",
    shipmentPeriod: "Dec 20 - Jan 30, 2026",
    status: "awarded", bidsCount: 5,
  },
  {
    id: "a-3",
    oppNumber: "MDS-A#00003",
    title: "2x40' Beef Hindquarter - Verdi BR - Egypt",
    supplier: "Verdi Foods BR",
    protein: "Beef", emoji: "🥩",
    temperature: "Frozen", containerSize: "40ft", containerCount: 2,
    incoterm: "CIF",
    originCountry: "Brazil", originCode: "BR",
    destCountry: "Egypt", destCode: "EG",
    shipmentPeriod: "Jan 5 - Feb 15, 2026",
    status: "closed", bidsCount: 6,
  },
  {
    id: "a-4",
    oppNumber: "MDS-A#00004",
    title: "1x40' Lamb Cuts - Sydney - UAE",
    supplier: "Aussie Meats Co",
    protein: "Ovine", emoji: "🐑",
    temperature: "Frozen", containerSize: "40ft", containerCount: 1,
    incoterm: "CIF",
    originCountry: "Australia", originCode: "AU",
    destCountry: "United Arab Emirates", destCode: "AE",
    shipmentPeriod: "Jan 10 - Feb 25, 2026",
    status: "closed", bidsCount: 3,
  },
  {
    id: "a-5",
    oppNumber: "MDS-A#00005",
    title: "1x40' Beef FFQ 6 Cuts - Verdi BR - UAE",
    supplier: "Verdi Foods BR",
    protein: "Beef", emoji: "🥩",
    temperature: "Frozen", containerSize: "40ft", containerCount: 1,
    incoterm: "CIF",
    originCountry: "Brazil", originCode: "BR",
    destCountry: "United Arab Emirates", destCode: "AE",
    shipmentPeriod: "Jan 15 - Feb 28, 2026",
    status: "open", bidsCount: 6,
    closesInHours: 12, windowHours: 72,
  },
  {
    id: "a-6",
    oppNumber: "MDS-A#00006",
    title: "3x40' Beef Trimmings 90CL - Buenos Aires - China",
    supplier: "Pampa SA",
    protein: "Beef", emoji: "🥩",
    temperature: "Frozen", containerSize: "40ft", containerCount: 3,
    incoterm: "FOB",
    originCountry: "Argentina", originCode: "AR",
    destCountry: "China", destCode: "CN",
    shipmentPeriod: "Mar 1 - Apr 15, 2026",
    status: "open", bidsCount: 2,
    closesInHours: 36, windowHours: 96,
  },
];

export const MOCK_SUPPLIER_AUCTIONS = RAW;

/** Auctions shown to buyers (open marketplace). */
export const MOCK_BUYER_AUCTIONS: MockAuction[] = [
  {
    id: "ba-1",
    oppNumber: "MDS-A#00005",
    title: "1x40' Beef FFQ 6 Cuts - BR - UAE",
    supplier: "Verdi Foods BR",
    protein: "Beef", emoji: "🥩",
    temperature: "Frozen", containerSize: "40ft", containerCount: 1,
    incoterm: "CIF",
    originCountry: "Brazil", originCode: "BR",
    destCountry: "United Arab Emirates", destCode: "AE",
    shipmentPeriod: "Jan 15 - Feb 28, 2026",
    status: "open", bidsCount: 6,
    closesInHours: 2, windowHours: 72,
  },
  {
    id: "ba-2",
    oppNumber: "MDS-A#00006",
    title: "3x40' Beef Trimmings 90CL - AR - China",
    supplier: "Pampa SA",
    protein: "Beef", emoji: "🥩",
    temperature: "Frozen", containerSize: "40ft", containerCount: 3,
    incoterm: "FOB",
    originCountry: "Argentina", originCode: "AR",
    destCountry: "China", destCode: "CN",
    shipmentPeriod: "Mar 1 - Apr 15, 2026",
    status: "open", bidsCount: 2,
    closesInHours: 36, windowHours: 96,
  },
  {
    id: "ba-3",
    oppNumber: "MDS-A#00003",
    title: "2x40' Beef Hindquarter - BR - Egypt",
    supplier: "Verdi Foods BR",
    protein: "Beef", emoji: "🥩",
    temperature: "Frozen", containerSize: "40ft", containerCount: 2,
    incoterm: "CIF",
    originCountry: "Brazil", originCode: "BR",
    destCountry: "Egypt", destCode: "EG",
    shipmentPeriod: "Jan 5 - Feb 15, 2026",
    status: "closed", bidsCount: 8,
  },
];

/** Helper: returns a stable closesAt timestamp (ms) for a mock auction. */
export function auctionClosesAt(a: MockAuction): number | null {
  return makeClosesAt(a.closesInHours);
}

/** Helper: returns the auction window start (ms), derived from window/close. */
export function auctionOpenedAt(a: MockAuction): number | null {
  const closes = auctionClosesAt(a);
  if (closes === null || !a.windowHours) return null;
  return closes - a.windowHours * 3600_000;
}