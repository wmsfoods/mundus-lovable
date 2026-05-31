import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

function emptyTrend(): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), value: 0 });
  }
  return out;
}

function emptyPipeline(): AdminAnalytics["pipeline"] {
  return [
    { stage: "Offers live", key: "offers", count: 0 },
    { stage: "Negotiating", key: "negotiating", count: 0 },
    { stage: "Ordered", key: "ordered", count: 0 },
    { stage: "Shipped", key: "shipped", count: 0 },
    { stage: "Delivered", key: "delivered", count: 0 },
  ];
}

function getEmpty(): AdminAnalytics {
  return {
    kpis: { gmv: 0, gmvDelta: 0, activeDeals: 0, activeDealsDelta: 0, verifications: 0, winRate: 0, winRateDelta: 0, newSignups: 0, newSignupsDelta: 0, avgCycle: 0, avgCycleDelta: 0, avgDealSize: 0, avgDealSizeDelta: 0, liquidity: 0 },
    gmvTrend: emptyTrend(),
    pipeline: emptyPipeline(),
    topBuyers: [],
    topSuppliers: [],
    productsMix: { beef: 0, pork: 0, poultry: 0, lamb: 0 },
    destinations: [],
    negotiationRounds: { r1: 0, r2: 0, r3: 0 },
    originPorts: [],
    activity: [],
    sla: { onTime: 0, atRisk: 0, overdue: 0 },
    timeToAcceptance: { lt3: 0, d3to7: 0, d8to14: 0, gte15: 0 },
    avgByProduct: { beef: 0, pork: 0, poultry: 0, lamb: 0 },
    opsQueue: [],
  };
}

function warnAdminQuery(name: string, error: unknown) {
  if (error) console.warn(`[admin-analytics] ${name} query failed`, error);
}

async function safeQuery<T = any>(fn: () => any): Promise<{ data: T[]; error: any; count?: number }> {
  try {
    const res = await fn();
    return { data: (res?.data ?? []) as T[], error: res?.error ?? null, count: res?.count };
  } catch (error) {
    return { data: [], error };
  }
}

function getRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function useAdminAnalytics(): AdminAnalytics & { loading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics-live"],
    queryFn: async (): Promise<AdminAnalytics> => {
      try {
        const [
          offersRes, negsRes, ordersRes, companiesRes,
          negRoundsRes, recentNegsRes, offerItemsRes, buyerReqsRes, marketsRes, usersRes,
        ] = await Promise.all([
          safeQuery(() => supabase.from("offers").select("id, status, supplier_id, created_at, deleted_at").is("deleted_at", null)),
          safeQuery(() => supabase.from("negotiations").select("id, status, offer_id, buyer_company_id, settled_total_value, created_at, updated_at, deleted_at").is("deleted_at", null)),
          safeQuery(() => supabase.from("orders").select("id, status, created_at, deleted_at").is("deleted_at", null)),
          safeQuery(() => supabase.from("companies").select("id, name, country, is_supplier, is_buyer, created_at, deleted_at").is("deleted_at", null)),
          safeQuery(() => supabase.from("round_proposals").select("id, negotiation_id, round")),
          safeQuery(() => supabase.from("negotiations").select("id, status, updated_at, buyer_company_id, offer_id").is("deleted_at", null).order("updated_at", { ascending: false }).limit(10)),
          safeQuery(() => supabase.from("offer_items").select("id, offer_id, category, quantity_kg, price_per_kg")),
          safeQuery(() => supabase.from("buyer_requests").select("id, destination_country, created_at, status").is("deleted_at", null)),
          safeQuery(() => supabase.from("offer_markets").select("offer_id, country_name")),
          safeQuery(() => supabase.from("users").select("id, created_at, deleted_at").is("deleted_at", null)),
        ]);

      warnAdminQuery("offers", offersRes.error);
      warnAdminQuery("negotiations", negsRes.error);
      warnAdminQuery("orders", ordersRes.error);
      warnAdminQuery("companies", companiesRes.error);
      warnAdminQuery("round_proposals", negRoundsRes.error);
      warnAdminQuery("recent_negotiations", recentNegsRes.error);
      warnAdminQuery("offer_items", offerItemsRes.error);
      warnAdminQuery("buyer_requests", buyerReqsRes.error);
      warnAdminQuery("offer_markets", marketsRes.error);

      const offers = (offersRes.data ?? []) as any[];
      const negs = (negsRes.data ?? []) as any[];
      const orders = (ordersRes.data ?? []) as any[];
      const companies = (companiesRes.data ?? []) as any[];
      const rounds = (negRoundsRes.data ?? []) as any[];
      const recentNegs = (recentNegsRes.data ?? []) as any[];
      const items = (offerItemsRes.data ?? []) as any[];
      const requests = (buyerReqsRes.data ?? []) as any[];
      const offerMarkets = (marketsRes.data ?? []) as any[];
      const users = (usersRes.data ?? []) as any[];

      const closedDeals = negs.filter(n => n.status === "bid_accepted");
      const gmv = closedDeals.reduce((s, n) => s + Number(n.settled_total_value ?? 0), 0);
      const inactiveStatuses = ["bid_accepted", "bid_rejected", "expired", "offer_withdrawn"];
      const activeDeals = negs.filter(n => !inactiveStatuses.includes(n.status ?? "")).length;
      const totalNegs = negs.length;
      const winRate = totalNegs > 0 ? closedDeals.length / totalNegs : 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      // Count real platform user signups (not admin-created company records)
      const newSignups = users.filter(u => u.created_at && u.created_at >= thirtyDaysAgo).length;
      const avgDealSize = closedDeals.length > 0 ? gmv / closedDeals.length : 0;

      const cycles = closedDeals.map(n => {
        const created = new Date(n.created_at).getTime();
        const updated = new Date(n.updated_at).getTime();
        return (updated - created) / 86400000;
      }).filter(d => d > 0);
      const avgCycle = cycles.length > 0 ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0;

      const activeOffers = offers.filter(o => o.status === "active").length;
      const negotiating = activeDeals;
      const ordered = orders.filter(o => !["delivered", "cancelled"].includes(o.status ?? "")).length;
      const shipped = orders.filter(o => o.status === "shipped").length;
      const delivered = orders.filter(o => o.status === "delivered").length;

      const buyerGmv: Record<string, number> = {};
      for (const n of closedDeals) {
        if (n.buyer_company_id) {
          buyerGmv[n.buyer_company_id] = (buyerGmv[n.buyer_company_id] ?? 0) + Number(n.settled_total_value ?? 0);
        }
      }
      const topBuyers = Object.entries(buyerGmv)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, g]) => {
          const co = companies.find(c => c.id === id);
          const name = co?.name ?? "Unknown";
          return { name, initials: name.slice(0, 2).toUpperCase(), country: co?.country ?? "", gmv: g };
        });

      const supplierGmv: Record<string, number> = {};
      for (const n of closedDeals) {
        const offer = offers.find(o => o.id === n.offer_id);
        if (offer?.supplier_id) {
          supplierGmv[offer.supplier_id] = (supplierGmv[offer.supplier_id] ?? 0) + Number(n.settled_total_value ?? 0);
        }
      }
      const topSuppliers = Object.entries(supplierGmv)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, g]) => {
          const co = companies.find(c => c.id === id);
          const name = co?.name ?? "Unknown";
          return { name, initials: name.slice(0, 2).toUpperCase(), country: co?.country ?? "", gmv: g };
        });

      const catCounts: Record<string, number> = { beef: 0, pork: 0, poultry: 0, lamb: 0 };
      for (const item of items) {
        const cat = (item.category ?? "").toLowerCase();
        if (cat in catCounts) catCounts[cat] += Number(item.quantity_kg ?? 0);
      }
      const totalCatKg = Object.values(catCounts).reduce((a, b) => a + b, 0) || 1;
      const productsMix = {
        beef: Math.round((catCounts.beef / totalCatKg) * 100),
        pork: Math.round((catCounts.pork / totalCatKg) * 100),
        poultry: Math.round((catCounts.poultry / totalCatKg) * 100),
        lamb: Math.round((catCounts.lamb / totalCatKg) * 100),
      };

      const destGmv: Record<string, number> = {};
      for (const n of closedDeals) {
        const mks = offerMarkets.filter(m => m.offer_id === n.offer_id);
        const val = Number(n.settled_total_value ?? 0);
        for (const m of mks) {
          if (m.country_name) {
            destGmv[m.country_name] = (destGmv[m.country_name] ?? 0) + (val / Math.max(mks.length, 1));
          }
        }
      }
      for (const r of requests) {
        if (r.destination_country && !(r.destination_country in destGmv)) {
          destGmv[r.destination_country] = 0;
        }
      }
      const destinations = Object.entries(destGmv)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, g]) => ({ name, flag: "", gmv: g }));

      const maxRounds: Record<string, number> = {};
      for (const r of rounds) {
        const rn = Number(r.round_number ?? r.round ?? 0);
        if (!maxRounds[r.negotiation_id] || rn > maxRounds[r.negotiation_id]) {
          maxRounds[r.negotiation_id] = rn;
        }
      }
      const roundCounts = Object.values(maxRounds);
      const r1 = roundCounts.filter(r => r === 1).length;
      const r2 = roundCounts.filter(r => r === 2).length;
      const r3 = roundCounts.filter(r => r >= 3).length;

      const gmvTrend: Array<{ date: string; value: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayGmv = closedDeals
          .filter(n => n.updated_at && n.updated_at.slice(0, 10) === dateStr)
          .reduce((s, n) => s + Number(n.settled_total_value ?? 0), 0);
        gmvTrend.push({ date: dateStr, value: dayGmv });
      }

      const activity: AdminAnalytics["activity"] = [];
      for (const n of recentNegs.slice(0, 8)) {
        const buyerCo = companies.find(c => c.id === n.buyer_company_id);
        const typeMap: Record<string, "success" | "warning" | "info" | "danger"> = {
          bid_accepted: "success",
          counter_pending: "warning",
          awaiting_supplier: "info",
          bid_rejected: "danger",
          expired: "danger",
        };
        const type = typeMap[n.status ?? ""] ?? "info";
        const statusLabel = (n.status ?? "").replace(/_/g, " ");
        activity.push({
          id: n.id,
          type,
          body: `${buyerCo?.name ?? "Buyer"} — ${statusLabel}`,
          refId: n.id.slice(0, 8),
          when: getRelativeTime(n.updated_at),
        });
      }

      const sla = { onTime: ordered, atRisk: 0, overdue: 0 };
      const timeToAcceptance = {
        lt3: cycles.filter(d => d < 3).length,
        d3to7: cycles.filter(d => d >= 3 && d < 8).length,
        d8to14: cycles.filter(d => d >= 8 && d < 15).length,
        gte15: cycles.filter(d => d >= 15).length,
      };

      const catValues: Record<string, number[]> = { beef: [], pork: [], poultry: [], lamb: [] };
      for (const n of closedDeals) {
        const offerItems = items.filter(i => i.offer_id === n.offer_id);
        for (const item of offerItems) {
          const cat = (item.category ?? "").toLowerCase();
          if (cat in catValues) {
            catValues[cat].push(Number(item.quantity_kg ?? 0) * Number(item.price_per_kg ?? 0));
          }
        }
      }
      const avgByProduct = {
        beef: catValues.beef.length ? Math.round(catValues.beef.reduce((a, b) => a + b, 0) / catValues.beef.length) : 0,
        pork: catValues.pork.length ? Math.round(catValues.pork.reduce((a, b) => a + b, 0) / catValues.pork.length) : 0,
        poultry: catValues.poultry.length ? Math.round(catValues.poultry.reduce((a, b) => a + b, 0) / catValues.poultry.length) : 0,
        lamb: catValues.lamb.length ? Math.round(catValues.lamb.reduce((a, b) => a + b, 0) / catValues.lamb.length) : 0,
      };

      return {
        kpis: {
          gmv, gmvDelta: 0,
          activeDeals, activeDealsDelta: 0,
          verifications: 0,
          winRate, winRateDelta: 0,
          newSignups, newSignupsDelta: 0,
          avgCycle, avgCycleDelta: 0,
          avgDealSize, avgDealSizeDelta: 0,
          liquidity: totalNegs > 0 ? +(activeOffers / Math.max(totalNegs, 1)).toFixed(1) : 0,
        },
        gmvTrend,
        pipeline: [
          { stage: "Offers live", key: "offers", count: activeOffers },
          { stage: "Negotiating", key: "negotiating", count: negotiating },
          { stage: "Ordered", key: "ordered", count: ordered },
          { stage: "Shipped", key: "shipped", count: shipped },
          { stage: "Delivered", key: "delivered", count: delivered },
        ],
        topBuyers,
        topSuppliers,
        productsMix,
        destinations,
        negotiationRounds: { r1, r2, r3 },
        originPorts: [],
        activity,
        sla,
        timeToAcceptance,
        avgByProduct,
        opsQueue: [],
      };
      } catch (error) {
        console.warn("[admin-analytics] failed to load dashboard data", error);
        return getEmpty();
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
    throwOnError: false,
  });

  return { ...(data ?? getEmpty()), loading: isLoading };
}