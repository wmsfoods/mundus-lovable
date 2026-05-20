export type BuyerRequestStatus =
  | "draft"
  | "active"
  | "closed_won"
  | "closed_no_winner"
  | "expired";

export type Species = "beef" | "pork" | "poultry" | "ovine";

export type ReceivedOffer = {
  id: string;
  supplierName: string;
  supplierInitials: string;
  supplierCountryCode: string;
  originPort: string;
  totalUsd: number;
  pricePerKgUsd: number;
  leadTimeDays: number;
  receivedAt: string;
  status: "pending" | "accepted" | "declined";
  incoterm: "CFR" | "CIF" | "FOB";
};

export type BuyerRequest = {
  id: string;
  title: string;
  species: Species;
  description: string;
  targetPricePerKgUsd: number;
  targetVolumeKg: number;
  fclCount: number;
  destinationPort: string;
  destinationCountry: string;
  destinationCountryCode: string;
  shipmentMonth: string;
  incotermPreferred: "CFR" | "CIF" | "FOB";
  paymentTermsPreferred: string;
  cuts: string[];
  status: BuyerRequestStatus;
  publishedAt?: string;
  deadlineAt?: string;
  createdAt: string;
  updatedAt: string;
  offers: ReceivedOffer[];
};

function mkOffer(
  id: string,
  supplierName: string,
  countryCode: string,
  originPort: string,
  pricePerKgUsd: number,
  volumeKg: number,
  leadTimeDays: number,
  receivedAt: string,
  status: ReceivedOffer["status"] = "pending",
  incoterm: ReceivedOffer["incoterm"] = "CFR"
): ReceivedOffer {
  const initials = supplierName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return {
    id,
    supplierName,
    supplierInitials: initials,
    supplierCountryCode: countryCode,
    originPort,
    pricePerKgUsd,
    totalUsd: +(pricePerKgUsd * volumeKg).toFixed(2),
    leadTimeDays,
    receivedAt,
    status,
    incoterm,
  };
}

const MOCK: BuyerRequest[] = [
  {
    id: "req-0021",
    title: "Ribeye 7-9 lb for Q3 Imports",
    species: "beef",
    description:
      "Premium grain-fed ribeye, 7-9 lb, vacuum-packed 4×CTN. Requesting offers for Q3 delivery to Busan. Looking for SIF-certified Brazilian plants with Korea export approval.",
    targetPricePerKgUsd: 7.10,
    targetVolumeKg: 25000,
    fclCount: 1,
    destinationPort: "Busan",
    destinationCountry: "South Korea",
    destinationCountryCode: "KR",
    shipmentMonth: "2026-09",
    incotermPreferred: "CFR",
    paymentTermsPreferred: "30% Advance, Balance TT",
    cuts: ["Ribeye 7-9 lb"],
    status: "active",
    publishedAt: "2026-05-10T10:00:00Z",
    deadlineAt: "2026-05-25T23:59:59Z",
    createdAt: "2026-05-08T09:00:00Z",
    updatedAt: "2026-05-18T14:20:00Z",
    offers: [
      mkOffer("o-1", "WMS Foods", "BR", "Santos", 7.05, 25000, 38, "2026-05-12T10:00:00Z"),
      mkOffer("o-2", "Marfrig Global", "BR", "Itajaí", 7.20, 25000, 42, "2026-05-13T11:00:00Z"),
      mkOffer("o-3", "Pampa Beef", "UY", "Montevideo", 7.15, 25000, 45, "2026-05-14T09:30:00Z"),
      mkOffer("o-4", "Argentina Beef Co", "AR", "Buenos Aires", 7.08, 25000, 50, "2026-05-15T16:00:00Z"),
    ],
  },
  {
    id: "req-0019",
    title: "Pork Loin Boneless — Mexico",
    species: "pork",
    description:
      "Boneless pork loin, frozen, vacuum-packed. Need consistent supply for Veracruz distribution.",
    targetPricePerKgUsd: 4.20,
    targetVolumeKg: 27000,
    fclCount: 1,
    destinationPort: "Veracruz",
    destinationCountry: "Mexico",
    destinationCountryCode: "MX",
    shipmentMonth: "2026-08",
    incotermPreferred: "CFR",
    paymentTermsPreferred: "Sight LC",
    cuts: ["Pork Loin Boneless"],
    status: "active",
    publishedAt: "2026-05-05T10:00:00Z",
    deadlineAt: "2026-05-22T23:59:59Z",
    createdAt: "2026-05-04T09:00:00Z",
    updatedAt: "2026-05-17T11:00:00Z",
    offers: [
      mkOffer("o-1", "Tyson Foods Brasil", "BR", "Itajaí", 4.18, 27000, 35, "2026-05-08T10:00:00Z"),
      mkOffer("o-2", "WMS Foods", "BR", "Santos", 4.22, 27000, 38, "2026-05-09T11:00:00Z"),
      mkOffer("o-3", "Marfrig Global", "BR", "Itajaí", 4.25, 27000, 40, "2026-05-10T12:00:00Z"),
      mkOffer("o-4", "Pampa Beef", "UY", "Montevideo", 4.30, 27000, 44, "2026-05-11T09:00:00Z"),
      mkOffer("o-5", "Argentina Beef Co", "AR", "Buenos Aires", 4.15, 27000, 48, "2026-05-12T15:00:00Z"),
    ],
  },
  {
    id: "req-0018",
    title: "Chicken Wings — Singapore Reorder",
    species: "poultry",
    description: "Frozen chicken wings, mid-joint, IQF, 10kg cartons. Reorder for Singapore client.",
    targetPricePerKgUsd: 3.40,
    targetVolumeKg: 26500,
    fclCount: 1,
    destinationPort: "Singapore",
    destinationCountry: "Singapore",
    destinationCountryCode: "SG",
    shipmentMonth: "2026-07",
    incotermPreferred: "CFR",
    paymentTermsPreferred: "30% Advance, Balance TT",
    cuts: ["Chicken Wings Mid-Joint"],
    status: "closed_won",
    publishedAt: "2026-04-15T10:00:00Z",
    deadlineAt: "2026-04-30T23:59:59Z",
    createdAt: "2026-04-14T09:00:00Z",
    updatedAt: "2026-05-02T11:00:00Z",
    offers: [
      mkOffer("o-1", "Tyson Foods Brasil", "BR", "Itajaí", 3.35, 26500, 32, "2026-04-18T10:00:00Z", "accepted"),
      mkOffer("o-2", "WMS Foods", "BR", "Santos", 3.42, 26500, 35, "2026-04-19T11:00:00Z", "declined"),
      mkOffer("o-3", "Marfrig Global", "BR", "Itajaí", 3.45, 26500, 38, "2026-04-20T12:00:00Z", "declined"),
      mkOffer("o-4", "Pampa Beef", "UY", "Montevideo", 3.50, 26500, 42, "2026-04-21T09:00:00Z", "declined"),
      mkOffer("o-5", "Argentina Beef Co", "AR", "Buenos Aires", 3.55, 26500, 46, "2026-04-22T15:00:00Z", "declined"),
      mkOffer("o-6", "Pampa Beef", "UY", "Montevideo", 3.48, 26500, 40, "2026-04-23T10:00:00Z", "declined"),
    ],
  },
  {
    id: "req-0017",
    title: "Beef Brisket Choice — Angola",
    species: "beef",
    description: "USDA Choice brisket, frozen, vacuum-packed. New buyer in Luanda — first order.",
    targetPricePerKgUsd: 5.80,
    targetVolumeKg: 26000,
    fclCount: 1,
    destinationPort: "Luanda",
    destinationCountry: "Angola",
    destinationCountryCode: "AO",
    shipmentMonth: "2026-09",
    incotermPreferred: "CIF",
    paymentTermsPreferred: "Cash Against Documents",
    cuts: ["Beef Brisket Choice"],
    status: "active",
    publishedAt: "2026-05-12T10:00:00Z",
    deadlineAt: "2026-05-28T23:59:59Z",
    createdAt: "2026-05-11T09:00:00Z",
    updatedAt: "2026-05-15T11:00:00Z",
    offers: [
      mkOffer("o-1", "Marfrig Global", "BR", "Itajaí", 5.85, 26000, 40, "2026-05-15T10:00:00Z", "pending", "CIF"),
    ],
  },
  {
    id: "req-0016",
    title: "Frozen Striploin — Japan Reorder",
    species: "beef",
    description: "Grass-fed striploin 8-10 lb, vacuum-packed 2×CTN, frozen. Repeat order for Tokyo.",
    targetPricePerKgUsd: 8.20,
    targetVolumeKg: 25500,
    fclCount: 1,
    destinationPort: "Tokyo",
    destinationCountry: "Japan",
    destinationCountryCode: "JP",
    shipmentMonth: "2026-06",
    incotermPreferred: "CFR",
    paymentTermsPreferred: "Sight LC",
    cuts: ["Striploin 8-10 lb"],
    status: "expired",
    publishedAt: "2026-04-01T10:00:00Z",
    deadlineAt: "2026-04-15T23:59:59Z",
    createdAt: "2026-03-30T09:00:00Z",
    updatedAt: "2026-04-16T11:00:00Z",
    offers: [
      mkOffer("o-1", "WMS Foods", "BR", "Santos", 8.40, 25500, 42, "2026-04-05T10:00:00Z", "declined"),
      mkOffer("o-2", "Pampa Beef", "UY", "Montevideo", 8.55, 25500, 48, "2026-04-07T11:00:00Z", "declined"),
      mkOffer("o-3", "Argentina Beef Co", "AR", "Buenos Aires", 8.30, 25500, 52, "2026-04-09T09:00:00Z", "declined"),
    ],
  },
  {
    id: "req-0015",
    title: "Lamb Chops — Saudi Arabia",
    species: "ovine",
    description: "Halal-certified lamb chops, frozen. Drafting requirements for Jeddah delivery.",
    targetPricePerKgUsd: 11.50,
    targetVolumeKg: 18000,
    fclCount: 1,
    destinationPort: "Jeddah",
    destinationCountry: "Saudi Arabia",
    destinationCountryCode: "SA",
    shipmentMonth: "2026-10",
    incotermPreferred: "CFR",
    paymentTermsPreferred: "Sight LC",
    cuts: ["Lamb Chops"],
    status: "draft",
    createdAt: "2026-05-16T09:00:00Z",
    updatedAt: "2026-05-18T10:00:00Z",
    offers: [],
  },
  {
    id: "req-0014",
    title: "Pork Tenderloin — Mexico",
    species: "pork",
    description: "Frozen pork tenderloin, IQF, 10kg cartons. Regular supply for Veracruz.",
    targetPricePerKgUsd: 6.10,
    targetVolumeKg: 26000,
    fclCount: 1,
    destinationPort: "Veracruz",
    destinationCountry: "Mexico",
    destinationCountryCode: "MX",
    shipmentMonth: "2026-08",
    incotermPreferred: "CFR",
    paymentTermsPreferred: "Sight LC",
    cuts: ["Pork Tenderloin"],
    status: "active",
    publishedAt: "2026-05-08T10:00:00Z",
    deadlineAt: "2026-05-24T23:59:59Z",
    createdAt: "2026-05-07T09:00:00Z",
    updatedAt: "2026-05-18T11:00:00Z",
    offers: [
      mkOffer("o-1", "Tyson Foods Brasil", "BR", "Itajaí", 6.05, 26000, 36, "2026-05-10T10:00:00Z"),
      mkOffer("o-2", "WMS Foods", "BR", "Santos", 6.15, 26000, 38, "2026-05-11T11:00:00Z"),
      mkOffer("o-3", "Marfrig Global", "BR", "Itajaí", 6.18, 26000, 40, "2026-05-12T12:00:00Z"),
      mkOffer("o-4", "Pampa Beef", "UY", "Montevideo", 6.25, 26000, 44, "2026-05-13T09:00:00Z"),
      mkOffer("o-5", "Argentina Beef Co", "AR", "Buenos Aires", 6.08, 26000, 48, "2026-05-14T15:00:00Z"),
    ],
  },
  {
    id: "req-0013",
    title: "Beef Trimmings 80VL — Vietnam",
    species: "beef",
    description: "Frozen beef trimmings 80VL, vacuum-packed. For Ho Chi Minh processor.",
    targetPricePerKgUsd: 4.90,
    targetVolumeKg: 27000,
    fclCount: 1,
    destinationPort: "Ho Chi Minh",
    destinationCountry: "Vietnam",
    destinationCountryCode: "VN",
    shipmentMonth: "2026-07",
    incotermPreferred: "CFR",
    paymentTermsPreferred: "Sight LC",
    cuts: ["Beef Trimmings 80VL"],
    status: "closed_no_winner",
    publishedAt: "2026-04-10T10:00:00Z",
    deadlineAt: "2026-04-25T23:59:59Z",
    createdAt: "2026-04-09T09:00:00Z",
    updatedAt: "2026-04-26T11:00:00Z",
    offers: [
      mkOffer("o-1", "Marfrig Global", "BR", "Itajaí", 5.20, 27000, 42, "2026-04-15T10:00:00Z", "declined"),
      mkOffer("o-2", "Pampa Beef", "UY", "Montevideo", 5.30, 27000, 48, "2026-04-17T11:00:00Z", "declined"),
    ],
  },
];

export function useBuyerRequests() {
  const counts = {
    all: MOCK.length,
    draft: MOCK.filter((r) => r.status === "draft").length,
    active: MOCK.filter((r) => r.status === "active").length,
    closed_won: MOCK.filter((r) => r.status === "closed_won").length,
    closed_no_winner: MOCK.filter((r) => r.status === "closed_no_winner").length,
    expired: MOCK.filter((r) => r.status === "expired").length,
  };
  return { data: MOCK, counts, isLoading: false as const, error: null };
}

export function useBuyerRequest(id: string) {
  return { data: MOCK.find((r) => r.id === id), isLoading: false as const, error: null };
}