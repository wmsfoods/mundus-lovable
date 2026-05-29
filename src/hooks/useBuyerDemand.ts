import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rangeToDays, type BIDateRange } from "@/components/admin/bi/DateRangePills";

export type DemandTrendPoint = {
  bucket: string;
  requests: number;
  fulfilled: number;
};

export type DestinationRow = {
  country: string;
  requests: number;
  volumeKg: number;
  targetValueUsd: number;
  fulfilled: number;
  fulfillRate: number;
};

export type TopBuyerRow = {
  buyerId: string;
  buyerName: string;
  requests: number;
  fulfilled: number;
  volumeKg: number;
  targetValueUsd: number;
};

export type RequestedCutRow = {
  product: string;
  category: string | null;
  requests: number;
  volumeKg: number;
  avgTargetPrice: number;
};

export type BuyerDemandData = {
  rangeDays: number;
  totalRequests: number;
  totalVolumeKg: number;
  totalTargetValueUsd: number;
  avgTargetPrice: number;
  fulfilledRequests: number;
  fulfillRate: number;
  newBuyers: number;
  trend: DemandTrendPoint[];
  destinations: DestinationRow[];
  topBuyers: TopBuyerRow[];
  topCuts: RequestedCutRow[];
  statusMix: { status: string; count: number }[];
  prev: { totalRequests: number; totalVolumeKg: number; totalTargetValueUsd: number; fulfilledRequests: number };
};

function bucketKey(d: Date, days: number): string {
  if (days >= 90) {
    const tmp = new Date(d);
    const day = tmp.getUTCDay();
    tmp.setUTCDate(tmp.getUTCDate() - day);
    return tmp.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function pctDelta(curr: number, prev: number): number | null {
  if (!prev || !isFinite(prev) || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export function useBuyerDemand(range: BIDateRange) {
  return useQuery<BuyerDemandData>({
    queryKey: ["buyer-demand", range],
    queryFn: async () => {
      const days = rangeToDays(range);
      const now = new Date();
      const start = new Date(now.getTime() - days * 86_400_000);
      const prevStart = new Date(start.getTime() - days * 86_400_000);
      const startISO = start.toISOString();
      const prevStartISO = prevStart.toISOString();

      const [curRes, prevRes, offersRes] = await Promise.all([
        supabase
          .from("buyer_requests")
          .select("id, buyer_company_id, product_name, category, destination_country, quantity_kg, target_price_usd, status, created_at")
          .is("deleted_at", null)
          .gte("created_at", startISO),
        supabase
          .from("buyer_requests")
          .select("id, quantity_kg, target_price_usd, status, created_at")
          .is("deleted_at", null)
          .gte("created_at", prevStartISO)
          .lt("created_at", startISO),
        supabase
          .from("offers")
          .select("id, request_id")
          .is("deleted_at", null)
          .not("request_id", "is", null)
          .gte("created_at", startISO),
      ]);

      const requests = curRes.data ?? [];
      const prevRequests = prevRes.data ?? [];
      const linkedOffers = offersRes.data ?? [];

      // Buyer companies lookup
      const buyerIds = Array.from(new Set(requests.map((r) => r.buyer_company_id).filter(Boolean)));
      const buyerMap = new Map<string, string>();
      if (buyerIds.length > 0) {
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", buyerIds);
        for (const c of companies ?? []) buyerMap.set(c.id, c.name ?? "—");
      }

      // Fulfilled = request has at least one offer in window OR status indicates fulfilled
      const fulfilledIds = new Set(linkedOffers.map((o) => o.request_id as string));
      const isFulfilled = (r: typeof requests[number]) =>
        fulfilledIds.has(r.id) || ["fulfilled", "closed", "matched"].includes(String(r.status ?? "").toLowerCase());

      const totalRequests = requests.length;
      const totalVolumeKg = requests.reduce((s, r) => s + Number(r.quantity_kg ?? 0), 0);
      const totalTargetValueUsd = requests.reduce(
        (s, r) => s + Number(r.quantity_kg ?? 0) * Number(r.target_price_usd ?? 0),
        0,
      );
      const fulfilledRequests = requests.filter(isFulfilled).length;

      // weighted avg target price
      let priceSum = 0, priceWeight = 0;
      for (const r of requests) {
        const p = Number(r.target_price_usd ?? 0);
        const q = Number(r.quantity_kg ?? 0);
        if (p > 0 && q > 0) { priceSum += p * q; priceWeight += q; }
      }
      const avgTargetPrice = priceWeight > 0 ? priceSum / priceWeight : 0;

      // Trend
      const trendMap = new Map<string, DemandTrendPoint>();
      const ensure = (k: string) => {
        let r = trendMap.get(k);
        if (!r) { r = { bucket: k, requests: 0, fulfilled: 0 }; trendMap.set(k, r); }
        return r;
      };
      for (const r of requests) {
        const k = bucketKey(new Date(r.created_at as string), days);
        ensure(k).requests++;
        if (isFulfilled(r)) ensure(k).fulfilled++;
      }
      const trend = Array.from(trendMap.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));

      // Destinations
      const destMap = new Map<string, DestinationRow>();
      for (const r of requests) {
        const k = r.destination_country || "—";
        let row = destMap.get(k);
        if (!row) {
          row = { country: k, requests: 0, volumeKg: 0, targetValueUsd: 0, fulfilled: 0, fulfillRate: 0 };
          destMap.set(k, row);
        }
        row.requests++;
        row.volumeKg += Number(r.quantity_kg ?? 0);
        row.targetValueUsd += Number(r.quantity_kg ?? 0) * Number(r.target_price_usd ?? 0);
        if (isFulfilled(r)) row.fulfilled++;
      }
      const destinations = Array.from(destMap.values())
        .map((d) => ({ ...d, fulfillRate: d.requests > 0 ? d.fulfilled / d.requests : 0 }))
        .sort((a, b) => b.volumeKg - a.volumeKg)
        .slice(0, 12);

      // Top buyers
      const buyerStats = new Map<string, TopBuyerRow>();
      for (const r of requests) {
        const k = r.buyer_company_id;
        if (!k) continue;
        let row = buyerStats.get(k);
        if (!row) {
          row = {
            buyerId: k, buyerName: buyerMap.get(k) ?? "—",
            requests: 0, fulfilled: 0, volumeKg: 0, targetValueUsd: 0,
          };
          buyerStats.set(k, row);
        }
        row.requests++;
        row.volumeKg += Number(r.quantity_kg ?? 0);
        row.targetValueUsd += Number(r.quantity_kg ?? 0) * Number(r.target_price_usd ?? 0);
        if (isFulfilled(r)) row.fulfilled++;
      }
      const topBuyers = Array.from(buyerStats.values())
        .sort((a, b) => b.volumeKg - a.volumeKg || b.requests - a.requests)
        .slice(0, 12);

      // Top cuts requested
      const cutMap = new Map<string, RequestedCutRow & { _priceSum: number; _priceW: number }>();
      for (const r of requests) {
        const k = (r.product_name || "—").trim();
        let row = cutMap.get(k);
        if (!row) {
          row = {
            product: k, category: r.category ?? null,
            requests: 0, volumeKg: 0, avgTargetPrice: 0,
            _priceSum: 0, _priceW: 0,
          };
          cutMap.set(k, row);
        }
        row.requests++;
        const q = Number(r.quantity_kg ?? 0);
        const p = Number(r.target_price_usd ?? 0);
        row.volumeKg += q;
        if (p > 0 && q > 0) { row._priceSum += p * q; row._priceW += q; }
      }
      const topCuts: RequestedCutRow[] = Array.from(cutMap.values())
        .map((r) => ({
          product: r.product, category: r.category, requests: r.requests, volumeKg: r.volumeKg,
          avgTargetPrice: r._priceW > 0 ? r._priceSum / r._priceW : 0,
        }))
        .sort((a, b) => b.volumeKg - a.volumeKg)
        .slice(0, 10);

      // Status mix
      const statusTally = new Map<string, number>();
      for (const r of requests) {
        const k = String(r.status ?? "new");
        statusTally.set(k, (statusTally.get(k) ?? 0) + 1);
      }
      const statusMix = Array.from(statusTally.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      const newBuyers = buyerStats.size;

      return {
        rangeDays: days,
        totalRequests,
        totalVolumeKg,
        totalTargetValueUsd,
        avgTargetPrice,
        fulfilledRequests,
        fulfillRate: totalRequests > 0 ? fulfilledRequests / totalRequests : 0,
        newBuyers,
        trend,
        destinations,
        topBuyers,
        topCuts,
        statusMix,
        prev: {
          totalRequests: prevRequests.length,
          totalVolumeKg: prevRequests.reduce((s, r) => s + Number(r.quantity_kg ?? 0), 0),
          totalTargetValueUsd: prevRequests.reduce(
            (s, r) => s + Number(r.quantity_kg ?? 0) * Number(r.target_price_usd ?? 0), 0,
          ),
          fulfilledRequests: prevRequests.filter(
            (r) => ["fulfilled", "closed", "matched"].includes(String(r.status ?? "").toLowerCase()),
          ).length,
        },
      };
    },
    staleTime: 60_000,
  });
}