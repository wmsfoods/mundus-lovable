import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* =========================================================================
 * Shape returned by useOffer (richer than useOffers - per-item description,
 * marbling, min/max amounts, observation, etc.)
 * ========================================================================= */
export type OfferDetailItem = {
  id: string;
  amount: number;
  price: number;
  minimum_price: number;
  minimum_amount: number;
  maximum_amount: number;
  condition: string;
  meat_specification: number | null;
  aging_method: string | null;
  packaging: string | null;
  customer_product: {
    id: string;
    name: string;
    description: string | null;
    beef_marbling: number | null;
    standard_product: {
      product_category: {
        id: string;
        code: string | null;
        name_en: string | null;
      } | null;
    } | null;
  } | null;
};

export type OfferDetailed = {
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
  is_halal: boolean | null;
  is_kosher: boolean | null;
  observation: string | null;
  exw_pickup_location: string | null;
  primary_pricing_incoterm: string | null;
  pricing_includes_freight: boolean | null;
  created_at: string | null;
  items: OfferDetailItem[];
  markets: { market: { id: string; country: { english_name: string | null } | null } | null }[];
  incoterms: { incoterm_type: string }[];
};

export type UseOfferResult = {
  offer: OfferDetailed | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
};

export function useOffer(id: string | undefined): UseOfferResult {
  const [offer, setOffer] = useState<OfferDetailed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

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
          observation,
          exw_pickup_location,
          primary_pricing_incoterm,
          pricing_includes_freight,
          created_at,
          items:offer_items (
            id,
            amount,
            price,
            minimum_price,
            minimum_amount,
            maximum_amount,
            condition,
            meat_specification,
            aging_method,
            packaging,
            photo_url,
            files_urls,
            customer_product:customer_products (
              id,
              name,
              description,
              beef_marbling,
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
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (cancelled) return;

      if (qErr) {
        setError(qErr.message);
        setOffer(null);
      } else if (!data) {
        setNotFound(true);
        setOffer(null);
      } else {
        setOffer(data as unknown as OfferDetailed);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { offer, loading, error, notFound };
}
