import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "./useRealtimeRefresh";
import { useCurrentCompany } from "./useCurrentCompany";

export type OfferItem = {
  id: string;
  amount: number;
  price: number;
  minimum_price: number;
  condition: string;
  aging_method: string | null;
  us_grade: string | null;
  customer_product: {
    id: string;
    name: string;
    standard_product: {
      product_category: {
        id: string;
        code: string | null;
        name_en: string | null;
      } | null;
    } | null;
  } | null;
};

export type OfferMarket = {
  market: {
    id: string;
    country: {
      english_name: string | null;
    } | null;
  } | null;
};

export type OfferWithDetails = {
  id: string;
  offer_number: number;
  supplier_id: string;
  supplier_name: string;
  supplier_rating: number | null;
  status: string | null;
  origin_country: string;
  origin_city: string | null;
  origin_port: string;
  shipment_month: number;
  shipment_year: number;
  payment_terms: string;
  container_size: string;
  total_fcl: number | null;
  remaining_fcl: number;
  sold_fcl: number;
  is_halal: boolean | null;
  is_kosher: boolean | null;
  created_at: string | null;
  specific_buyer_company_ids: string[] | null;
  all_customers: boolean | null;
  items: OfferItem[];
  markets: OfferMarket[];
  incoterms: { incoterm_type: string }[];
  has_fob: boolean;
};

export type UseOffersResult = {
  offers: OfferWithDetails[];
  loading: boolean;
  error: string | null;
};

export function useOffers(): UseOffersResult {
  const [offers, setOffers] = useState<OfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedRef = useRef(false);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  useRealtimeRefresh({ table: "offers", onRefresh: bump });
  useRealtimeRefresh({ table: "negotiations", onRefresh: bump });
  const { company } = useCurrentCompany();
  const buyerCompanyId = company?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasLoadedRef.current) setLoading(true);
      setError(null);

      const selectCols = `
          id,
          offer_number,
          supplier_id,
          supplier_name,
          supplier_rating,
          status,
          origin_country,
          origin_city,
          origin_port,
          shipment_month,
          shipment_year, shipment_ready_raw,
          payment_terms,
          container_size,
          total_fcl,
          is_halal,
          is_kosher,
          created_at,
          specific_buyer_company_ids,
          all_customers,
          items:offer_items (
            id,
            amount,
            price,
            minimum_price,
            condition,
            customer_product:customer_products (
              id,
              name,
              standard_product:standard_products (
                product_category:product_categories (
                  id,
                  code,
                  name_en
                )
              )
            )
          ),
          markets:offer_markets (
            market:markets (
              id,
              country:countries (
                english_name
              )
            )
          ),
          incoterms:offer_allowed_incoterms (
            incoterm_type
          )
        `;
      // Targeted-offer visibility (Batch 3.5/5):
      // - When a buyer company is known, defer the 3-branch visibility logic
      //   (marketplace default / specific list / all-my-customers) to the
      //   SQL RPC `get_offers_visible_to_buyer`. Filters/sort/select chain on
      //   top of the RPC's SETOF offers result via PostgREST.
      // - When no buyer company (admin / supplier viewing own / anon flows),
      //   keep the legacy direct query — preserving original behavior.
      let query: any;
      if (buyerCompanyId) {
        query = (supabase.rpc as any)("get_offers_visible_to_buyer", {
          p_buyer_company_id: buyerCompanyId,
        })
          .select(selectCols)
          .is("deleted_at", null)
          .eq("status", "active")
          .order("created_at", { ascending: false });
      } else {
        query = supabase
          .from("offers")
          .select(selectCols)
          .is("deleted_at", null)
          .eq("status", "active")
          .order("created_at", { ascending: false });
      }
      const { data, error: qErr } = await query;

      if (cancelled) return;

      if (qErr) {
        setError(qErr.message);
        setOffers([]);
      } else {
        const rows = (data ?? []) as unknown as OfferWithDetails[];
        // Fetch accepted FCL counts per offer to compute remaining capacity
        const ids = rows.map((o) => o.id);
        const soldMap: Record<string, number> = {};
        if (ids.length > 0) {
          const { data: accepted } = await supabase
            .from("negotiations")
            .select("offer_id, fcl_count")
            .in("offer_id", ids)
            .eq("status", "bid_accepted")
            .is("deleted_at", null);
          for (const n of accepted ?? []) {
            soldMap[n.offer_id as string] = (soldMap[n.offer_id as string] || 0) + Number(n.fcl_count ?? 1);
          }
        }
        const enriched = rows
          .map((o) => {
            const total = o.total_fcl ?? 1;
            const sold = soldMap[o.id] || 0;
            const has_fob = (o.incoterms ?? []).some((i) => i.incoterm_type === "FOB");
            return { ...o, sold_fcl: sold, remaining_fcl: Math.max(total - sold, 0), has_fob };
          })
          .filter((o) => o.remaining_fcl > 0);
        if (cancelled) return;
        setOffers(enriched);
      }
      hasLoadedRef.current = true;
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, buyerCompanyId]);

  return { offers, loading, error };
}
