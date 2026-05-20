export type AnalyticsPeriod = "realtime" | "24h" | "7d" | "30d" | "90d";
export type AnalyticsMetric = "visitors" | "pageviews" | "viewsPerVisit" | "duration" | "bounceRate";

export type BreakdownDim = "source" | "page" | "country" | "device";

export interface BreakdownRow {
  key: string;
  label: string;
  visitors: number;
  flag?: string;
}

export interface AnalyticsFilter {
  dim: BreakdownDim;
  key: string;
  label: string;
}

export interface TrafficData {
  currentVisitors: number;
  kpis: {
    visitors: { value: number; delta: number };
    pageviews: { value: number; delta: number };
    viewsPerVisit: { value: number; delta: number };
    duration: { value: number; delta: number }; // seconds
    bounceRate: { value: number; delta: number }; // 0-1
  };
  trend: Array<{ date: string; visitors: number; pageviews: number; viewsPerVisit: number; duration: number; bounceRate: number }>;
  prevTrend: Array<{ date: string; visitors: number; pageviews: number; viewsPerVisit: number; duration: number; bounceRate: number }>;
  breakdowns: Record<BreakdownDim, BreakdownRow[]>;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  realtime: 1,
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const SOURCES = [
  { key: "direct", label: "Direct / None" },
  { key: "google", label: "google.com" },
  { key: "linkedin", label: "linkedin.com" },
  { key: "twitter", label: "x.com" },
  { key: "facebook", label: "facebook.com" },
  { key: "reddit", label: "reddit.com" },
  { key: "newsletter", label: "newsletter" },
  { key: "partner", label: "partner.mundus" },
  { key: "bing", label: "bing.com" },
  { key: "github", label: "github.com" },
  { key: "producthunt", label: "producthunt.com" },
  { key: "duckduckgo", label: "duckduckgo.com" },
];

const PAGES = [
  "/login", "/supplier/profile", "/supplier", "/supplier/offers/new",
  "/buyer/orders/0000050", "/buyer/requests/req-0021", "/buyer/chat/c-001",
  "/buyer/offers/1915283c-6bb4-4720-9679-05acecbebaaf",
  "/supplier/requests", "/buyer/orders/0000047", "/buyer", "/supplier/offers",
  "/admin/dashboard", "/admin/companies", "/admin/deals", "/buyer/negotiations",
  "/signup", "/signup/success", "/supplier/sales", "/supplier/negotiations",
];

const COUNTRIES = [
  { key: "US", label: "United States", flag: "🇺🇸" },
  { key: "BR", label: "Brazil", flag: "🇧🇷" },
  { key: "CN", label: "China", flag: "🇨🇳" },
  { key: "HK", label: "Hong Kong", flag: "🇭🇰" },
  { key: "KR", label: "South Korea", flag: "🇰🇷" },
  { key: "AR", label: "Argentina", flag: "🇦🇷" },
  { key: "UY", label: "Uruguay", flag: "🇺🇾" },
  { key: "AE", label: "UAE", flag: "🇦🇪" },
  { key: "SG", label: "Singapore", flag: "🇸🇬" },
  { key: "DE", label: "Germany", flag: "🇩🇪" },
  { key: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { key: "MX", label: "Mexico", flag: "🇲🇽" },
  { key: "GH", label: "Ghana", flag: "🇬🇭" },
  { key: "VN", label: "Vietnam", flag: "🇻🇳" },
];

const DEVICES = [
  { key: "mobile", label: "Mobile" },
  { key: "desktop", label: "Desktop" },
  { key: "tablet", label: "Tablet" },
];

function distribute(total: number, items: Array<{ key: string; label: string; flag?: string }>, seed: number, max = 12): BreakdownRow[] {
  const r = rng(seed);
  const weights = items.map(() => 0.1 + r() * 1);
  const sum = weights.reduce((a, b) => a + b, 0);
  return items
    .map((it, i) => ({ ...it, visitors: Math.max(1, Math.round((weights[i] / sum) * total)) }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, max);
}

function applyFilterScale(filters: AnalyticsFilter[]): number {
  if (filters.length === 0) return 1;
  // each filter cuts the data
  return Math.max(0.05, 1 / (filters.length + 1) - 0.1 + 0.3);
}

export function useAdminAnalyticsTraffic(
  period: AnalyticsPeriod,
  filters: AnalyticsFilter[] = []
): TrafficData {
  const days = PERIOD_DAYS[period];
  const seed = 1000 + days * 13 + filters.length * 7 + filters.reduce((a, f) => a + f.key.length, 0);
  const r = rng(seed);
  const scale = applyFilterScale(filters);

  const dailyVisitors = Math.round((80 + r() * 60) * scale);
  const totalVisitors = Math.round(dailyVisitors * days * (period === "24h" || period === "realtime" ? 1 : 0.85));
  const viewsPerVisit = 3 + r() * 4;
  const totalPageviews = Math.round(totalVisitors * viewsPerVisit);
  const duration = 60 + Math.round(r() * 900);
  const bounceRate = 0.15 + r() * 0.4;

  const buildSeries = (mult: number) => {
    const out: TrafficData["trend"] = [];
    const today = new Date();
    const points = period === "24h" || period === "realtime" ? 24 : days;
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(today);
      if (period === "24h" || period === "realtime") d.setHours(today.getHours() - i);
      else d.setDate(today.getDate() - i);
      const base = dailyVisitors * mult;
      const noise = (r() - 0.5) * base * 0.6;
      const v = Math.max(0, Math.round(base + noise));
      out.push({
        date: d.toISOString(),
        visitors: v,
        pageviews: Math.round(v * viewsPerVisit),
        viewsPerVisit: Math.round((viewsPerVisit + (r() - 0.5)) * 10) / 10,
        duration: Math.round(duration + (r() - 0.5) * 120),
        bounceRate: Math.max(0, Math.min(1, bounceRate + (r() - 0.5) * 0.1)),
      });
    }
    return out;
  };

  return {
    currentVisitors: period === "realtime" ? Math.round(r() * 8) : Math.round(r() * 4),
    kpis: {
      visitors: { value: totalVisitors, delta: (r() - 0.4) * 0.5 },
      pageviews: { value: totalPageviews, delta: (r() - 0.4) * 0.5 },
      viewsPerVisit: { value: Math.round(viewsPerVisit * 10) / 10, delta: (r() - 0.5) * 0.3 },
      duration: { value: duration, delta: (r() - 0.5) * 0.4 },
      bounceRate: { value: bounceRate, delta: (r() - 0.5) * 0.3 },
    },
    trend: buildSeries(1),
    prevTrend: buildSeries(0.85),
    breakdowns: {
      source: distribute(totalVisitors, SOURCES, seed + 1),
      page: distribute(totalVisitors, PAGES.map((p) => ({ key: p, label: p })), seed + 2),
      country: distribute(totalVisitors, COUNTRIES, seed + 3),
      device: distribute(totalVisitors, DEVICES, seed + 4, 3),
    },
  };
}
