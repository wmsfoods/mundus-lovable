import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rangeToDays, type BIDateRange } from "@/components/admin/bi/DateRangePills";

export type PriceTrendPoint = {
  bucket: string; // ISO date (day or week start)
  protein: string;
  avgPrice: number;
  volume: number;
};

export type TopCutRow = {
  standardProductId: string;
  name: string;
  protein: string;
  totalVolumeKg: number;
  totalValueUsd: number;
  avgPrice: number;
  offers: number;
};

export type ProteinMixRow = {
  protein: string;
  volumeKg: number;
  valueUsd: number;
  share: number; // by volume
};

export type MarketIntelligence = {
  rangeDays: number;
  totalVolumeKg: number;
  totalValueUsd: number;
  avgPriceUsd: number;
  offersCount: number;
  priceTrend: PriceTrendPoint[];
  topCuts: TopCutRow[];
  proteinMix: ProteinMixRow[];
  availableProteins: string[];
  // previous period totals for deltas
  prev: { volumeKg: number; valueUsd: number; avgPrice: number; offersCount: number };
};

function bucketKey(d: Date, days: number): string {
  // weekly buckets for >=90d, daily otherwise
  if (days >= 90) {
    const tmp = new Date(d);
    const day = tmp.getUTCDay();
    tmp.setUTCDate(tmp.getUTCDate() - day);
    return tmp.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function useMarketIntelligence(range: BIDateRange) {
  return useQuery<MarketIntelligence>({
    queryKey: ["market-intel", range],
    queryFn: async () => {
      const days = rangeToDays(range);
      const now = new Date();
      const start = new Date(now.getTime() - days * 86_400_000);
      const prevStart = new Date(start.getTime() - days * 86_400_000);

      // Pull offers within the broader window (current + previous) for delta math.
      const { data: offers, error: offersErr } = await supabase
        .from("offers")
        .select("id, created_at, status, supplier_id")
        .gte("created_at", prevStart.toISOString())
        .is("deleted_at", null);
      if (offersErr) throw offersErr;
      const offerIds = (offers ?? []).map((o) => o.id);
      if (!offerIds.length) {
        return {
          rangeDays: days,
          totalVolumeKg: 0, totalValueUsd: 0, avgPriceUsd: 0, offersCount: 0,
          priceTrend: [], topCuts: [], proteinMix: [], availableProteins: [],
          prev: { volumeKg: 0, valueUsd: 0, avgPrice: 0, offersCount: 0 },
        };
      }

      // Items for these offers (chunk if needed; usually OK for <10k offers)
      const { data: items, error: itemsErr } = await supabase
        .from("offer_items")
        .select("id, offer_id, customer_product_id, amount, price")
        .in("offer_id", offerIds);
      if (itemsErr) throw itemsErr;

      const cpIds = Array.from(new Set((items ?? []).map((i: any) => String(i.customer_product_id))));
      const { data: cps, error: cpErr } = cpIds.length
        ? await supabase
            .from("customer_products")
            .select("id, name, standard_product_id")
            .in("id", cpIds)
        : { data: [], error: null } as any;
      if (cpErr) throw cpErr;

      const spIds = Array.from(new Set(((cps ?? []) as any[]).map((c) => c.standard_product_id).filter(Boolean))) as string[];
      const { data: sps } = spIds.length
        ? await supabase
            .from("standard_products")
            .select("id, description, product_category_id")
            .in("id", spIds)
        : { data: [] } as any;

      const pcIds = Array.from(new Set(((sps ?? []) as any[]).map((s) => s.product_category_id).filter(Boolean))) as string[];
      const { data: pcs } = pcIds.length
        ? await supabase
            .from("product_categories")
            .select("id, name_en, code")
            .in("id", pcIds)
        : { data: [] } as any;

      const offerById = new Map<string, any>(((offers ?? []) as any[]).map((o) => [o.id, o]));
      const cpById = new Map<string, any>(((cps ?? []) as any[]).map((c) => [c.id, c]));
      const spById = new Map<string, any>(((sps ?? []) as any[]).map((s) => [s.id, s]));
      const pcById = new Map<string, any>(((pcs ?? []) as any[]).map((p) => [p.id, p]));

      // Aggregations
      const trendMap = new Map<string, { sumPx: number; n: number; volume: number }>();
      const cutMap = new Map<string, TopCutRow>();
      const proteinMap = new Map<string, { vol: number; val: number }>();
      let curVol = 0, curVal = 0, curN = 0;
      const curOffers = new Set<string>();
      let prevVol = 0, prevVal = 0, prevN = 0;
      const prevOffers = new Set<string>();

      for (const it of items ?? []) {
        const offer = offerById.get(it.offer_id);
        if (!offer) continue;
        const created = new Date(offer.created_at as string);
        const isCurrent = created >= start;
        const cp = cpById.get(it.customer_product_id);
        const sp = cp ? spById.get(cp.standard_product_id) : null;
        const pc = sp ? pcById.get(sp.product_category_id) : null;
        const protein = pc?.name_en || "Other";
        const amount = Number(it.amount) || 0;
        const price = Number(it.price) || 0;
        const value = amount * price;

        if (isCurrent) {
          curVol += amount; curVal += value; if (price > 0) curN++;
          curOffers.add(it.offer_id);

          // trend
          const bk = `${bucketKey(created, days)}::${protein}`;
          const t = trendMap.get(bk) ?? { sumPx: 0, n: 0, volume: 0 };
          if (price > 0) { t.sumPx += price; t.n++; }
          t.volume += amount;
          trendMap.set(bk, t);

          // top cuts (by standard product)
          const spId = sp?.id || cp?.id || it.customer_product_id;
          const name = sp?.description || cp?.name || "—";
          const row = cutMap.get(spId) ?? {
            standardProductId: spId, name, protein,
            totalVolumeKg: 0, totalValueUsd: 0, avgPrice: 0, offers: 0,
          };
          row.totalVolumeKg += amount;
          row.totalValueUsd += value;
          row.offers += 1;
          cutMap.set(spId, row);

          // protein mix
          const pm = proteinMap.get(protein) ?? { vol: 0, val: 0 };
          pm.vol += amount; pm.val += value;
          proteinMap.set(protein, pm);
        } else {
          prevVol += amount; prevVal += value; if (price > 0) prevN++;
          prevOffers.add(it.offer_id);
        }
      }

      const priceTrend: PriceTrendPoint[] = Array.from(trendMap.entries())
        .map(([k, v]) => {
          const [bucket, protein] = k.split("::");
          return {
            bucket,
            protein,
            avgPrice: v.n > 0 ? v.sumPx / v.n : 0,
            volume: v.volume,
          };
        })
        .sort((a, b) => a.bucket.localeCompare(b.bucket));

      const topCuts = Array.from(cutMap.values())
        .map((r) => ({ ...r, avgPrice: r.totalVolumeKg > 0 ? r.totalValueUsd / r.totalVolumeKg : 0 }))
        .sort((a, b) => b.totalValueUsd - a.totalValueUsd)
        .slice(0, 10);

      const totalMixVol = Array.from(proteinMap.values()).reduce((s, p) => s + p.vol, 0) || 1;
      const proteinMix = Array.from(proteinMap.entries())
        .map(([protein, v]) => ({
          protein,
          volumeKg: v.vol,
          valueUsd: v.val,
          share: v.vol / totalMixVol,
        }))
        .sort((a, b) => b.volumeKg - a.volumeKg);

      const avgPriceUsd = curVol > 0 ? curVal / curVol : 0;
      const prevAvgPrice = prevVol > 0 ? prevVal / prevVol : 0;
      const availableProteins = Array.from(proteinMap.keys());

      return {
        rangeDays: days,
        totalVolumeKg: curVol,
        totalValueUsd: curVal,
        avgPriceUsd,
        offersCount: curOffers.size,
        priceTrend, topCuts, proteinMix, availableProteins,
        prev: { volumeKg: prevVol, valueUsd: prevVal, avgPrice: prevAvgPrice, offersCount: prevOffers.size },
      };
    },
    staleTime: 60_000,
  });
}

export function pctDelta(cur: number, prev: number): number {
  if (!prev) return 0;
  return (cur - prev) / prev;
}