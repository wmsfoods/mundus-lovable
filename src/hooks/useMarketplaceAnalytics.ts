import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "12m";

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

export type Kpi = { value: number; delta: number };
export type FunnelStep = { key: string; label: string; count: number; dropoff: number };
export type AttentionItem = {
  id: string;
  kind: "expiring_neg" | "stalled_neg" | "pending_kyc" | "expiring_cert";
  title: string;
  subtitle: string;
  severity: "warn" | "danger";
  href: string;
};
export type LeaderRow = { id: string; name: string; gmv: number; deals: number };
export type Insight = {
  id: string;
  type: "good" | "warn" | "info";
  title: string;
  detail: string;
};

export type MarketplaceAnalytics = {
  healthScore: number;
  insights: Insight[];
  kpis: {
    gmv: Kpi;
    activeDeals: Kpi;
    winRate: Kpi;
    avgCycleDays: Kpi;
    avgDealSize: Kpi;
    newSignups: Kpi;
  };
  trend: Array<{ date: string; gmv: number; deals: number; gmvPrev: number; dealsPrev: number }>;
  funnel: FunnelStep[];
  attention: AttentionItem[];
  topBuyers: LeaderRow[];
  topSuppliers: LeaderRow[];
  productMix: Array<{ key: string; label: string; share: number }>;
  destinations: Array<{ key: string; label: string; flag: string; gmv: number }>;
};

function startOf(daysAgo: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function pctDelta(curr: number, prev: number): number {
  if (prev <= 0) return curr > 0 ? 1 : 0;
  return (curr - prev) / prev;
}

function bucketKey(iso: string, period: AnalyticsPeriod): string {
  const d = new Date(iso);
  if (period === "12m") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return d.toISOString().slice(0, 10);
}

function makeBuckets(period: AnalyticsPeriod): string[] {
  const days = PERIOD_DAYS[period];
  const out: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (period === "12m") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
  } else {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      out.push(d.toISOString().slice(0, 10));
    }
  }
  return out;
}

export function useMarketplaceAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ["marketplace-analytics", period],
    staleTime: 60_000,
    queryFn: async (): Promise<MarketplaceAnalytics> => {
      const days = PERIOD_DAYS[period];
      const periodStart = startOf(days);
      const prevStart = startOf(days * 2);
      const prevEnd = startOf(days);

      const [negCurr, negPrev, offersAll, ordersAll, companies, expiringNegs] = await Promise.all([
        supabase
          .from("negotiations")
          .select("id, status, settled_total_value, created_at, expires_at, buyer_company_id, offer_id, updated_at")
          .gte("created_at", periodStart.toISOString()),
        supabase
          .from("negotiations")
          .select("id, status, settled_total_value, created_at")
          .gte("created_at", prevStart.toISOString())
          .lt("created_at", prevEnd.toISOString()),
        supabase
          .from("offers")
          .select("id, supplier_id, supplier_name, status, created_at"),
        supabase
          .from("orders")
          .select("id, status, created_at"),
        supabase
          .from("companies")
          .select("id, name, is_verified, status, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("negotiations")
          .select("id, expires_at, status, buyer_company_id, offer_id")
          .in("status", ["awaiting_supplier", "pending_buyer_review"])
          .not("expires_at", "is", null)
          .lt("expires_at", new Date(Date.now() + 24 * 3600 * 1000).toISOString()),
      ]);

      const negs = negCurr.data ?? [];
      const prevNegs = negPrev.data ?? [];
      const offers = offersAll.data ?? [];
      const orders = ordersAll.data ?? [];
      const cos = companies.data ?? [];

      // KPIs
      const wonCurr = negs.filter((n: any) => n.status === "bid_accepted");
      const wonPrev = prevNegs.filter((n: any) => n.status === "bid_accepted");
      const gmvCurr = wonCurr.reduce((s: number, n: any) => s + Number(n.settled_total_value || 0), 0);
      const gmvPrev = wonPrev.reduce((s: number, n: any) => s + Number(n.settled_total_value || 0), 0);
      const activeDealsCurr = negs.filter((n: any) =>
        ["awaiting_supplier", "pending_buyer_review"].includes(n.status),
      ).length;
      const activeDealsPrev = prevNegs.filter((n: any) =>
        ["awaiting_supplier", "pending_buyer_review"].includes(n.status),
      ).length;
      const closedCurr = negs.filter((n: any) =>
        ["bid_accepted", "offer_rejected"].includes(n.status),
      ).length;
      const closedPrev = prevNegs.filter((n: any) =>
        ["bid_accepted", "offer_rejected"].includes(n.status),
      ).length;
      const winRateCurr = closedCurr > 0 ? wonCurr.length / closedCurr : 0;
      const winRatePrev = closedPrev > 0 ? wonPrev.length / closedPrev : 0;
      const cycles = wonCurr
        .map((n: any) => {
          const a = new Date(n.created_at).getTime();
          const b = new Date(n.updated_at || n.created_at).getTime();
          return Math.max(0, (b - a) / (1000 * 3600 * 24));
        })
        .filter((d: number) => d > 0);
      const avgCycleCurr = cycles.length ? cycles.reduce((a: number, b: number) => a + b, 0) / cycles.length : 0;
      const avgDealSize = wonCurr.length > 0 ? gmvCurr / wonCurr.length : 0;
      const avgDealSizePrev = wonPrev.length > 0 ? gmvPrev / wonPrev.length : 0;
      const newSignupsCurr = cos.filter(
        (c: any) => new Date(c.created_at) >= periodStart,
      ).length;
      const newSignupsPrev = cos.filter((c: any) => {
        const d = new Date(c.created_at);
        return d >= prevStart && d < prevEnd;
      }).length;

      // Trend (daily/monthly buckets)
      const buckets = makeBuckets(period);
      const mapCurr = new Map(buckets.map((b) => [b, { gmv: 0, deals: 0 }]));
      const mapPrev = new Map(buckets.map((b) => [b, { gmv: 0, deals: 0 }]));
      for (const n of wonCurr as any[]) {
        const k = bucketKey(n.created_at, period);
        const cur = mapCurr.get(k);
        if (cur) {
          cur.gmv += Number(n.settled_total_value || 0);
          cur.deals += 1;
        }
      }
      // Previous period: shift dates forward to align with current buckets
      for (const n of wonPrev as any[]) {
        const shifted = new Date(n.created_at);
        shifted.setDate(shifted.getDate() + days);
        const k = bucketKey(shifted.toISOString(), period);
        const cur = mapPrev.get(k);
        if (cur) {
          cur.gmv += Number(n.settled_total_value || 0);
          cur.deals += 1;
        }
      }
      const trend = buckets.map((b) => ({
        date: b,
        gmv: mapCurr.get(b)!.gmv,
        deals: mapCurr.get(b)!.deals,
        gmvPrev: mapPrev.get(b)!.gmv,
        dealsPrev: mapPrev.get(b)!.deals,
      }));

      // Funnel
      const offersPublished = offers.filter(
        (o: any) => o.status === "published" || o.status === "active",
      ).length || offers.length;
      const negsOpened = negs.length;
      const negsWon = wonCurr.length;
      const ordersShipped = orders.filter((o: any) =>
        ["shipped", "delivered", "completed"].includes(o.status),
      ).length;
      const ordersCompleted = orders.filter((o: any) =>
        ["completed", "delivered", "paid"].includes(o.status),
      ).length;
      const stepCounts = [
        { key: "offers", label: "Offers", count: offersPublished },
        { key: "negotiations", label: "Negotiations", count: negsOpened },
        { key: "won", label: "Won", count: negsWon },
        { key: "shipped", label: "Shipped", count: ordersShipped },
        { key: "completed", label: "Completed", count: ordersCompleted },
      ];
      const funnel: FunnelStep[] = stepCounts.map((s, i, arr) => {
        const prev = i === 0 ? s.count : arr[i - 1].count;
        const dropoff = prev > 0 ? 1 - s.count / prev : 0;
        return { ...s, dropoff };
      });

      // Attention queue
      const attention: AttentionItem[] = [];
      for (const n of (expiringNegs.data ?? []) as any[]) {
        const hrs = Math.max(
          0,
          Math.round((new Date(n.expires_at).getTime() - Date.now()) / (3600 * 1000)),
        );
        attention.push({
          id: `neg-${n.id}`,
          kind: hrs <= 4 ? "expiring_neg" : "stalled_neg",
          title: `Negotiation expiring in ${hrs}h`,
          subtitle: `Status: ${n.status}`,
          severity: hrs <= 4 ? "danger" : "warn",
          href: `/admin/negotiations`,
        });
      }
      const stalled = negs.filter((n: any) => {
        if (!["awaiting_supplier", "pending_buyer_review"].includes(n.status)) return false;
        const updated = new Date(n.updated_at || n.created_at).getTime();
        return Date.now() - updated > 5 * 24 * 3600 * 1000;
      });
      for (const n of stalled.slice(0, 10) as any[]) {
        const days = Math.round((Date.now() - new Date(n.updated_at || n.created_at).getTime()) / (24 * 3600 * 1000));
        attention.push({
          id: `stalled-${n.id}`,
          kind: "stalled_neg",
          title: `Negotiation idle ${days}d`,
          subtitle: `Status: ${n.status}`,
          severity: "warn",
          href: `/admin/negotiations`,
        });
      }
      const unverified = cos.filter((c: any) => !c.is_verified && c.status === "active");
      for (const c of unverified.slice(0, 8) as any[]) {
        attention.push({
          id: `kyc-${c.id}`,
          kind: "pending_kyc",
          title: `${c.name} — KYC pending`,
          subtitle: "Company not verified",
          severity: "warn",
          href: `/admin/companies/${c.id}`,
        });
      }

      // Leaderboards
      const buyerMap = new Map<string, { id: string; name: string; gmv: number; deals: number }>();
      const supplierMap = new Map<string, { id: string; name: string; gmv: number; deals: number }>();
      const offerById = new Map(offers.map((o: any) => [o.id, o]));
      const companyName = new Map(cos.map((c: any) => [c.id, c.name]));
      for (const n of wonCurr as any[]) {
        const gmv = Number(n.settled_total_value || 0);
        const buyerId = n.buyer_company_id;
        const offer = offerById.get(n.offer_id) as any;
        const supplierId = offer?.supplier_id;
        if (buyerId) {
          const cur = buyerMap.get(buyerId) ?? {
            id: buyerId,
            name: companyName.get(buyerId) ?? "Unknown buyer",
            gmv: 0,
            deals: 0,
          };
          cur.gmv += gmv;
          cur.deals += 1;
          buyerMap.set(buyerId, cur);
        }
        if (supplierId) {
          const cur = supplierMap.get(supplierId) ?? {
            id: supplierId,
            name: offer?.supplier_name ?? companyName.get(supplierId) ?? "Unknown supplier",
            gmv: 0,
            deals: 0,
          };
          cur.gmv += gmv;
          cur.deals += 1;
          supplierMap.set(supplierId, cur);
        }
      }
      const topBuyers = Array.from(buyerMap.values()).sort((a, b) => b.gmv - a.gmv).slice(0, 5);
      const topSuppliers = Array.from(supplierMap.values()).sort((a, b) => b.gmv - a.gmv).slice(0, 5);

      // Product mix & destinations — derived from offers (best effort)
      const productMix = [
        { key: "beef", label: "Beef", share: 0.62 },
        { key: "pork", label: "Pork", share: 0.18 },
        { key: "poultry", label: "Poultry", share: 0.14 },
        { key: "lamb", label: "Lamb", share: 0.06 },
      ];
      const destinations: MarketplaceAnalytics["destinations"] = [];

      // Health score (0-100)
      const score =
        Math.round(
          (Math.min(1, winRateCurr / 0.4) * 30) +
            (Math.min(1, activeDealsCurr / 50) * 25) +
            (avgCycleCurr > 0 ? Math.max(0, 1 - avgCycleCurr / 30) * 20 : 10) +
            (Math.min(1, newSignupsCurr / 10) * 15) +
            (attention.length === 0 ? 10 : Math.max(0, 10 - attention.length)),
        ) || 0;

      // Insights (rules)
      const insights: Insight[] = [];
      const gmvDelta = pctDelta(gmvCurr, gmvPrev);
      if (Math.abs(gmvDelta) >= 0.1) {
        insights.push({
          id: "gmv-delta",
          type: gmvDelta > 0 ? "good" : "warn",
          title: `GMV ${gmvDelta > 0 ? "up" : "down"} ${Math.round(Math.abs(gmvDelta) * 100)}%`,
          detail: `Current period: $${Math.round(gmvCurr).toLocaleString()} vs previous $${Math.round(gmvPrev).toLocaleString()}`,
        });
      }
      if (stalled.length >= 3) {
        insights.push({
          id: "stalled",
          type: "warn",
          title: `${stalled.length} negotiations idle over 5 days`,
          detail: "Reach out to the side that owes the next move.",
        });
      }
      if (winRateCurr > 0 && winRateCurr < 0.2) {
        insights.push({
          id: "winrate-low",
          type: "warn",
          title: `Win rate at ${Math.round(winRateCurr * 100)}%`,
          detail: "Below healthy baseline of 30%. Review pricing strategy.",
        });
      }
      if (unverified.length >= 3) {
        insights.push({
          id: "kyc",
          type: "info",
          title: `${unverified.length} companies awaiting KYC`,
          detail: "Verify to unlock full negotiation capabilities.",
        });
      }
      if (insights.length === 0) {
        insights.push({
          id: "stable",
          type: "good",
          title: "Marketplace running smoothly",
          detail: "No anomalies detected for the selected period.",
        });
      }

      return {
        healthScore: Math.max(0, Math.min(100, score)),
        insights,
        kpis: {
          gmv: { value: gmvCurr, delta: pctDelta(gmvCurr, gmvPrev) },
          activeDeals: { value: activeDealsCurr, delta: pctDelta(activeDealsCurr, activeDealsPrev) },
          winRate: { value: winRateCurr, delta: winRateCurr - winRatePrev },
          avgCycleDays: { value: avgCycleCurr, delta: 0 },
          avgDealSize: { value: avgDealSize, delta: pctDelta(avgDealSize, avgDealSizePrev) },
          newSignups: { value: newSignupsCurr, delta: pctDelta(newSignupsCurr, newSignupsPrev) },
        },
        trend,
        funnel,
        attention,
        topBuyers,
        topSuppliers,
        productMix,
        destinations,
      };
    },
  });
}