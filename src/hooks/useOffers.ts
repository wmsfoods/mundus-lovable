import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OfferItem = {
  id: string;
  amount: number;
  price: number;
  minimum_price: number;
  condition: string;
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
  items: OfferItem[];
  markets: OfferMarket[];
  incoterms: { incoterm_type: string }[];
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: qErr } = await supabase
        .from("offers")
        .select(
          `
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
          shipment_year,
          payment_terms,
          container_size,
          total_fcl,
          is_halal,
          is_kosher,
          created_at,
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
        `
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (qErr) {
        setError(qErr.message);
        setOffers([]);
      } else {
        setOffers((data ?? []) as unknown as OfferWithDetails[]);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { offers, loading, error };
}
