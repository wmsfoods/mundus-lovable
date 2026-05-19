export interface AdminAnalytics {
  kpis: {
    gmv: number;
    gmvDelta: number;
    activeDeals: number;
    activeDealsDelta: number;
    verifications: number;
    winRate: number;
    winRateDelta: number;
    newSignups: number;
    newSignupsDelta: number;
    avgCycle: number;
    avgCycleDelta: number;
    avgDealSize: number;
    avgDealSizeDelta: number;
    liquidity: number;
  };
  gmvTrend: Array<{ date: string; value: number }>;
  pipeline: Array<{ stage: string; key: string; count: number }>;
  topBuyers: Array<{ name: string; initials: string; country: string; gmv: number }>;
  topSuppliers: Array<{ name: string; initials: string; country: string; gmv: number }>;
  productsMix: { beef: number; pork: number; poultry: number; lamb: number };
  destinations: Array<{ name: string; flag: string; gmv: number }>;
  negotiationRounds: { r1: number; r2: number; r3: number };
  originPorts: Array<{ name: string; country: string; tons: number; share: number }>;
  activity: Array<{ id: string; type: "success" | "warning" | "info" | "danger" | "secondary"; body: string; refId?: string; when: string }>;
  sla: { onTime: number; atRisk: number; overdue: number };
  timeToAcceptance: { lt3: number; d3to7: number; d8to14: number; gte15: number };
  avgByProduct: { beef: number; pork: number; poultry: number; lamb: number };
  opsQueue: Array<{
    initials: string; name: string; country: string; code: string;
    role: "buyer" | "supplier"; issue: string;
    issueLevel: "warn" | "danger" | "ok";
    age?: string; owner?: string;
  }>;
}

// Seeded PRNG (mulberry32) for determinism
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGmvTrend(): Array<{ date: string; value: number }> {
  const r = rng(42);
  const out: Array<{ date: string; value: number }> = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const trend = 60000 + ((29 - i) / 29) * 35000; // 60k -> 95k
    const noise = (r() - 0.5) * 22000;
    const value = Math.max(55000, Math.min(115000, Math.round(trend + noise)));
    out.push({ date: d.toISOString().slice(0, 10), value });
  }
  return out;
}

const DATA: AdminAnalytics = {
  kpis: {
    gmv: 2_420_000, gmvDelta: 0.18,
    activeDeals: 142, activeDealsDelta: 12,
    verifications: 8,
    winRate: 0.34, winRateDelta: 0.03,
    newSignups: 17, newSignupsDelta: 5,
    avgCycle: 18, avgCycleDelta: -2,
    avgDealSize: 128_000, avgDealSizeDelta: 0.04,
    liquidity: 2.4,
  },
  gmvTrend: buildGmvTrend(),
  pipeline: [
    { stage: "Offers live", key: "offers", count: 312 },
    { stage: "Negotiating", key: "negotiating", count: 204 },
    { stage: "Ordered", key: "ordered", count: 98 },
    { stage: "Shipped", key: "shipped", count: 56 },
    { stage: "Delivered", key: "delivered", count: 28 },
  ],
  topBuyers: [
    { name: "Delta Imports", initials: "DI", country: "CN", gmv: 612_000 },
    { name: "Gamma Buyers", initials: "GB", country: "HK", gmv: 487_000 },
    { name: "Seoul Wagyu Co.", initials: "SW", country: "KR", gmv: 342_000 },
    { name: "Atrides Mt", initials: "AM", country: "BR", gmv: 298_000 },
    { name: "Tema Frozen", initials: "TF", country: "GH", gmv: 234_000 },
  ],
  topSuppliers: [
    { name: "WMS Foods", initials: "WF", country: "BR", gmv: 891_000 },
    { name: "Marfrig Global", initials: "MG", country: "BR", gmv: 654_000 },
    { name: "Pampa Beef", initials: "PB", country: "UY", gmv: 423_000 },
    { name: "Argentina Beef Co", initials: "AB", country: "AR", gmv: 356_000 },
    { name: "Tyson Brasil", initials: "TB", country: "BR", gmv: 287_000 },
  ],
  productsMix: { beef: 62, pork: 18, poultry: 14, lamb: 6 },
  destinations: [
    { name: "China", flag: "🇨🇳", gmv: 1_120_000 },
    { name: "Hong Kong", flag: "🇭🇰", gmv: 342_000 },
    { name: "Singapore", flag: "🇸🇬", gmv: 234_000 },
    { name: "Korea, Republic of", flag: "🇰🇷", gmv: 198_000 },
    { name: "UAE", flag: "🇦🇪", gmv: 156_000 },
    { name: "Argentina", flag: "🇦🇷", gmv: 98_000 },
  ],
  negotiationRounds: { r1: 42, r2: 38, r3: 20 },
  originPorts: [
    { name: "Santos", country: "BR", tons: 42_000, share: 38 },
    { name: "Itajaí", country: "BR", tons: 28_000, share: 25 },
    { name: "Buenos Aires", country: "AR", tons: 18_000, share: 16 },
    { name: "Montevideo", country: "UY", tons: 14_000, share: 13 },
    { name: "Veracruz", country: "MX", tons: 9_000, share: 8 },
  ],
  activity: [
    { id: "a1", type: "success", body: "WMS Foods accepted bid $124,510", refId: "#bb-01", when: "2m" },
    { id: "a2", type: "warning", body: "Delta Imports submitted KYC", when: "14m" },
    { id: "a3", type: "info", body: "New offer published", refId: "#0066", when: "37m" },
    { id: "a4", type: "danger", body: "Dispute opened Tyson ↔ Seoul Wagyu", when: "1h" },
    { id: "a5", type: "success", body: "Order shipped from Santos", refId: "#0000045", when: "2h" },
    { id: "a6", type: "secondary", body: "Marfrig published 3 new offers", when: "4h" },
    { id: "a7", type: "danger", body: "Pampa Beef cert expired", refId: "#00112", when: "6h" },
    { id: "a8", type: "info", body: "New buyer signup: Hanoi Premium Foods", when: "8h" },
  ],
  sla: { onTime: 4, atRisk: 2, overdue: 2 },
  timeToAcceptance: { lt3: 34, d3to7: 41, d8to14: 18, gte15: 7 },
  avgByProduct: { beef: 142_000, pork: 98_000, poultry: 86_000, lamb: 124_000 },
  opsQueue: [
    { initials: "DI", name: "Delta Imports", country: "CN", code: "#00091", role: "buyer", issue: "issueKyc", issueLevel: "warn", age: "2d 4h", owner: "FN" },
    { initials: "PB", name: "Pampa Beef", country: "UY", code: "#00112", role: "supplier", issue: "issueCert", issueLevel: "danger", age: "1d 8h" },
    { initials: "SW", name: "Seoul Wagyu Co.", country: "KR", code: "#00043", role: "buyer", issue: "issuePayment", issueLevel: "warn", age: "22h", owner: "MS" },
    { initials: "TF", name: "Tema Frozen", country: "GH", code: "#00078", role: "buyer", issue: "issueDocs", issueLevel: "warn", age: "16h", owner: "FN" },
    { initials: "AB", name: "Argentina Beef Co", country: "AR", code: "#00134", role: "supplier", issue: "issueOnboarding", issueLevel: "ok" },
  ],
};

export function useAdminAnalytics(): AdminAnalytics {
  return DATA;
}