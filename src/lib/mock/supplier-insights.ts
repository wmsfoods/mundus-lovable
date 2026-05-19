export type HistogramBucket = { price: number; count: number; highlighted?: boolean };
export type RankingRow = {
  rank: number;
  supplier: string;
  price: number;
  lead: number;
  views: number;
  chats: number;
  isYou?: boolean;
};
export type Recommendation = {
  id: string;
  icon: "TrendingDown" | "Timer" | "Award" | "Zap";
  title: string;
  body: string;
  impact: string;
};

export const priceBenchmarkMock = {
  cut: "Beef tenderloin",
  origin: "Brazil",
  condition: "Frozen",
  yourPrice: 17.4,
  yourPercentile: 68,
  marketMedian: 16.08,
  marketLow: 14.2,
  marketHigh: 19.8,
  avgLeadTime: 18,
  yourLeadTime: 21,
  avgMinOrder: 22,
  yourMinOrder: 24,
  totalCompetingOffers: 47,
  p25: 15.4,
  p75: 16.9,
  histogramBuckets: [
    { price: 14.2, count: 1 },
    { price: 14.6, count: 2 },
    { price: 15.0, count: 4 },
    { price: 15.4, count: 7 },
    { price: 15.8, count: 10 },
    { price: 16.2, count: 8 },
    { price: 16.6, count: 6 },
    { price: 17.0, count: 4 },
    { price: 17.4, count: 3, highlighted: true },
    { price: 17.8, count: 2 },
    { price: 18.2, count: 1 },
    { price: 18.6, count: 1 },
    { price: 19.0, count: 1 },
    { price: 19.4, count: 1 },
  ] as HistogramBucket[],
  ranking: [
    { rank: 1, supplier: "Supplier A1", price: 15.4, lead: 16, views: 1842, chats: 48 },
    { rank: 2, supplier: "Supplier A2", price: 15.8, lead: 17, views: 1210, chats: 32 },
    { rank: 3, supplier: "Supplier A3", price: 16.1, lead: 19, views: 988, chats: 26 },
    { rank: 4, supplier: "Supplier A4", price: 16.4, lead: 18, views: 742, chats: 21 },
    { rank: 5, supplier: "Supplier A5", price: 16.9, lead: 18, views: 612, chats: 18 },
    { rank: 12, supplier: "You", price: 17.4, lead: 21, views: 284, chats: 9, isYou: true },
    { rank: 13, supplier: "Supplier A13", price: 17.6, lead: 20, views: 268, chats: 8 },
    { rank: 14, supplier: "Supplier A14", price: 17.8, lead: 22, views: 241, chats: 7 },
  ] as RankingRow[],
  recommendations: [
    {
      id: "drop-price",
      icon: "TrendingDown",
      title: "Drop to $16.60/kg to hit P50",
      body: "Offers at or below median get 2.4× more views and 3.1× more chats on average. Your margin hit would be ~3% per kg.",
      impact: "+$ 142k GMV/month est",
    },
    {
      id: "lead-time",
      icon: "Timer",
      title: "Cut lead time from 21d to 18d",
      body: "Market median is 18d. Being 3 days slower costs you an estimated 18% of chat initiations.",
      impact: "+11% chats est",
    },
    {
      id: "certs",
      icon: "Award",
      title: "Add HALAL + Grass-fed certs",
      body: "47% of buyers viewing this cut filter by HALAL. 22% by grass-fed. Your current listing has neither.",
      impact: "+340 views/mo est",
    },
    {
      id: "post-time",
      icon: "Zap",
      title: "Post on Tuesdays 10:00 UTC",
      body: "Buyer activity heatmap peaks Tue 10–11 UTC. Your last 6 offers were posted off-peak.",
      impact: "+28% first-48h views",
    },
  ] as Recommendation[],
};

function buildGmvTrend() {
  const points: { date: string; gmv: number }[] = [];
  const start = new Date("2025-10-21");
  let val = 30;
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const trend = 30 + (i / 29) * 50;
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 6;
    val = Math.max(15, Math.round(trend + noise));
    points.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      gmv: val,
    });
  }
  return points;
}

export const supplierAnalyticsMock = {
  period: "30d" as const,
  kpis: [
    { label: "Offers published", value: "48", delta: "+22%", deltaLabel: "vs. prev. 30d", trend: "up" as const },
    { label: "Views → Negotiations", value: "8.4%", delta: "+1.2pp", deltaLabel: "funnel conversion", trend: "up" as const },
    { label: "Orders closed", value: "23", delta: "+15%", deltaLabel: "GMV $1.42M", trend: "up" as const },
    { label: "Avg. time to close", value: "4.2 days", delta: "-0.8d", deltaLabel: "faster than before", trend: "good" as const },
  ],
  funnel: [
    { stage: "Views", count: 8412, conversion: null as number | null },
    { stage: "Product view", count: 6218, conversion: 74 },
    { stage: "Started chat", count: 2692, conversion: 43 },
    { stage: "Negotiation", count: 1262, conversion: 47 },
    { stage: "Order placed", count: 50, conversion: 40 },
  ],
  topProducts: [
    { rank: 1, name: "Beef tenderloin · Brazil", orders: 12, tons: 84, revenue: "$412k" },
    { rank: 2, name: "Chicken breast IQF", orders: 9, tons: 56, revenue: "$268k" },
    { rank: 3, name: "Pork ribs", orders: 6, tons: 41, revenue: "$194k" },
    { rank: 4, name: "Lamb shoulder", orders: 4, tons: 22, revenue: "$112k" },
    { rank: 5, name: "Beef shank", orders: 3, tons: 18, revenue: "$78k" },
  ],
  buyerGeography: [
    { country: "UAE", count: 8 },
    { country: "China", count: 6 },
    { country: "Saudi Arabia", count: 4 },
    { country: "Egypt", count: 3 },
    { country: "Hong Kong", count: 2 },
  ],
  gmvTrend: buildGmvTrend(),
};