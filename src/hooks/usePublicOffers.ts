import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PublicOfferItem = {
  id: string;
  amount: number;
  price: number;
  condition: string;
  product_name: string | null;
  category_code: string | null;
  category_name: string | null;
  aging_method: string | null;
  us_grade: string | null;
};

export type PublicOffer = {
  id: string;
  offer_number: number;
  origin_country: string | null;
  origin_port: string | null;
  shipment_month: number;
  shipment_year: number;
  shipment_ready_raw?: string | null;
  payment_terms: string;
  container_size: string;
  total_fcl: number;
  sold_fcl: number;
  remaining_fcl: number;
  is_halal: boolean | null;
  is_kosher: boolean | null;
  created_at: string;
  incoterms: string[];
  markets: { country: string | null }[];
  items: PublicOfferItem[];
};

export function usePublicOffers() {
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_public_offers");
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setOffers([]);
      } else {
        setOffers((data ?? []) as PublicOffer[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { offers, loading, error };
}