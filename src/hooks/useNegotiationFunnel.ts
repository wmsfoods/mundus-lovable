import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rangeToDays, type BIDateRange } from "@/components/admin/bi/DateRangePills";

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
};

export type StatusBreakdown = {
  status: string;
  count: number;
};

export type NegotiationTrendPoint = {
  bucket: string;
  started: number;
  accepted: number;
};

export type TopSupplierRow = {
  supplierId: string;
  supplierName: string;
  offers: number;
  negotiations: number;
  accepted: number;
  conversion: number; // accepted / negotiations
  gmvUsd: number;
};

export type NegotiationFunnelData = {
  rangeDays: number;
  offersPublished: number;
  negotiationsStarted: number;
  negotiationsAccepted: number;
  negotiationsRejected: number;
  negotiationsExpired: number;
  ordersCreated: number;
  totalSettledUsd: number;
  avgRounds: number;
  avgHoursToClose: number;
  funnel: FunnelStage[];
  statusBreakdown: StatusBreakdown[];
  trend: NegotiationTrendPoint[];
  topSuppliers: TopSupplierRow[];
  prev: {
    negotiationsStarted: number;
    negotiationsAccepted: number;
    totalSettledUsd: number;
    ordersCreated: number;
  };
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

export function useNegotiationFunnel(range: BIDateRange) {
  return useQuery<NegotiationFunnelData>({
    queryKey: ["negotiation-funnel", range],
    queryFn: async () => {
      const days = rangeToDays(range);
      const now = new Date();
      const start = new Date(now.getTime() - days * 86_400_000);
      const prevStart = new Date(start.getTime() - days * 86_400_000);
      const startISO = start.toISOString();
      const prevStartISO = prevStart.toISOString();

      const [offersRes, negsRes, prevNegsRes, ordersRes, prevOrdersRes] = await Promise.all([
        supabase
          .from("offers")
          .select("id, supplier_id, supplier_name, created_at, status")
          .is("deleted_at", null)
          .gte("created_at", startISO),
        supabase
          .from("negotiations")
          .select("id, offer_id, status, current_round, settled_total_value, created_at, updated_at, order_id")
          .is("deleted_at", null)
          .gte("created_at", startISO),
        supabase
          .from("negotiations")
          .select("id, status, settled_total_value, created_at, order_id")
          .is("deleted_at", null)
          .gte("created_at", prevStartISO)
          .lt("created_at", startISO),
        supabase
          .from("orders")
          .select("id, created_at")
          .gte("created_at", startISO),
        supabase
          .from("orders")
          .select("id, created_at")
          .gte("created_at", prevStartISO)
          .lt("created_at", startISO),
      ]);

      const offers = offersRes.data ?? [];
      const negs = negsRes.data ?? [];
      const prevNegs = prevNegsRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const prevOrders = prevOrdersRes.data ?? [];

      // Status tally
      const statusMap = new Map<string, number>();
      let accepted = 0, rejected = 0, expired = 0, settledUsd = 0;
      let roundsSum = 0, roundsCount = 0;
      let hoursSum = 0, hoursCount = 0;
      for (const n of negs) {
        statusMap.set(n.status, (statusMap.get(n.status) ?? 0) + 1);
        if (n.status === "bid_accepted") {
          accepted++;
          settledUsd += Number(n.settled_total_value ?? 0);
          const created = new Date(n.created_at as string).getTime();
          const updated = new Date(n.updated_at as string).getTime();
          if (updated > created) {
            hoursSum += (updated - created) / 3_600_000;
            hoursCount++;
          }
        }
        if (n.status === "offer_rejected") rejected++;
        if (n.status === "expired" || n.status === "offer_exhausted") expired++;
        if (typeof n.current_round === "number") {
          roundsSum += n.current_round;
          roundsCount++;
        }
      }

      const prevAccepted = prevNegs.filter((n) => n.status === "bid_accepted").length;
      const prevSettled = prevNegs.reduce(
        (s, n) => s + (n.status === "bid_accepted" ? Number(n.settled_total_value ?? 0) : 0),
        0,
      );

      // Trend buckets
      const trendMap = new Map<string, NegotiationTrendPoint>();
      const ensure = (k: string) => {
        let r = trendMap.get(k);
        if (!r) { r = { bucket: k, started: 0, accepted: 0 }; trendMap.set(k, r); }
        return r;
      };
      for (const n of negs) {
        const k = bucketKey(new Date(n.created_at as string), days);
        ensure(k).started++;
        if (n.status === "bid_accepted") ensure(k).accepted++;
      }
      const trend = Array.from(trendMap.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));

      // Top suppliers
      const negsByOffer = new Map<string, typeof negs>();
      for (const n of negs) {
        const arr = negsByOffer.get(n.offer_id) ?? [];
        arr.push(n);
        negsByOffer.set(n.offer_id, arr);
      }
      const supMap = new Map<string, TopSupplierRow>();
      for (const o of offers) {
        const k = o.supplier_id;
        let row = supMap.get(k);
        if (!row) {
          row = {
            supplierId: k,
            supplierName: o.supplier_name ?? "—",
            offers: 0, negotiations: 0, accepted: 0, conversion: 0, gmvUsd: 0,
          };
          supMap.set(k, row);
        }
        row.offers++;
        const ns = negsByOffer.get(o.id) ?? [];
        for (const n of ns) {
          row.negotiations++;
          if (n.status === "bid_accepted") {
            row.accepted++;
            row.gmvUsd += Number(n.settled_total_value ?? 0);
          }
        }
      }
      const topSuppliers = Array.from(supMap.values())
        .map((r) => ({ ...r, conversion: r.negotiations > 0 ? r.accepted / r.negotiations : 0 }))
        .sort((a, b) => b.gmvUsd - a.gmvUsd || b.negotiations - a.negotiations)
        .slice(0, 12);

      const funnel: FunnelStage[] = [
        { key: "offers",   label: "Offers published",     count: offers.length },
        { key: "neg",      label: "Negotiations started", count: negs.length },
        { key: "accepted", label: "Accepted",             count: accepted },
        { key: "orders",   label: "Orders created",       count: orders.length },
      ];
      const statusBreakdown: StatusBreakdown[] = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      return {
        rangeDays: days,
        offersPublished: offers.length,
        negotiationsStarted: negs.length,
        negotiationsAccepted: accepted,
        negotiationsRejected: rejected,
        negotiationsExpired: expired,
        ordersCreated: orders.length,
        totalSettledUsd: settledUsd,
        avgRounds: roundsCount > 0 ? roundsSum / roundsCount : 0,
        avgHoursToClose: hoursCount > 0 ? hoursSum / hoursCount : 0,
        funnel,
        statusBreakdown,
        trend,
        topSuppliers,
        prev: {
          negotiationsStarted: prevNegs.length,
          negotiationsAccepted: prevAccepted,
          totalSettledUsd: prevSettled,
          ordersCreated: prevOrders.length,
        },
      };
    },
    staleTime: 60_000,
  });
}