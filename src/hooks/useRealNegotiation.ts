import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches a single negotiation from Supabase with offer, items, rounds, cut_rounds.
 * Returns a generic shape; transform helpers in `useRealNegotiationsList` shape it
 * into Buyer/Supplier detail types.
 */

export type RealNegotiationRow = {
  id: string;
  offer_id: string;
  buyer_company_id: string;
  port_id: string | null;
  incoterm: string;
  status: string;
  fcl_count: number;
  freight_cost_per_kg: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  agreed_items: unknown;
  settled_total_value: number | null;
  buyer_message: string | null;
  supplier_message: string | null;
  offer: {
    id: string;
    offer_number: number;
    supplier_id: string;
    supplier_name: string;
    origin_country: string;
    origin_port: string;
    payment_terms: string;
    container_size: string;
    shipment_month: number;
    shipment_year: number;
    total_fcl: number | null;
    items: {
      id: string;
      amount: number;
      price: number;
      minimum_price: number | null;
      customer_product: { id: string; name: string } | null;
    }[];
  } | null;
  port: { id: string; name: string; country: { english_name: string | null; iso_code: string | null } | null } | null;
  rounds: {
    id: string;
    round: number;
    created_at: string;
    created_by_user_id: string | null;
    cut_rounds: {
      id: string;
      offer_item_id: string;
      price_per_kg: number;
      quantity_kg: number;
    }[];
  }[];
};

export function useRealNegotiation(negotiationId: string | undefined | null) {
  const [data, setData] = useState<RealNegotiationRow | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!negotiationId || !isUuid(negotiationId)) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data: row, error: err } = await supabase
        .from("negotiations")
        .select(
          `
          id, offer_id, buyer_company_id, port_id, incoterm, status,
          fcl_count, freight_cost_per_kg, created_at, updated_at, expires_at,
          agreed_items, settled_total_value, buyer_message, supplier_message,
          offer:offers (
            id, offer_number, supplier_id, supplier_name, origin_country, origin_port,
            payment_terms, container_size, shipment_month, shipment_year, total_fcl,
            items:offer_items (
              id, amount, price, minimum_price,
              customer_product:customer_products ( id, name )
            )
          ),
          port:ports ( id, name, country:countries ( english_name, iso_code ) ),
          rounds:round_proposals (
            id, round, created_at, created_by_user_id,
            cut_rounds ( id, offer_item_id, price_per_kg, quantity_kg )
          )
          `,
        )
        .eq("id", negotiationId)
        .maybeSingle();
      if (cancelled) return;
      if (err) {
        setError(new Error(err.message));
        setData(null);
      } else {
        const r = row as unknown as RealNegotiationRow | null;
        if (r && r.rounds) r.rounds.sort((a, b) => a.round - b.round);
        setData(r);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [negotiationId, tick]);

  return { data, isLoading, error, refetch: () => setTick((n) => n + 1) };
}

export function isUuid(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/* ─── Country code helper (small map; matches BuyerOfferDetail) ─── */
const COUNTRY_CODE_MAP: Record<string, string> = {
  argentina: "AR", australia: "AU", brazil: "BR", canada: "CA", chile: "CL",
  china: "CN", egypt: "EG", france: "FR", germany: "DE", "hong kong": "HK",
  india: "IN", italy: "IT", japan: "JP", jordan: "JO", mexico: "MX",
  netherlands: "NL", paraguay: "PY", poland: "PL", "saudi arabia": "SA",
  "south africa": "ZA", "south korea": "KR", spain: "ES", turkey: "TR",
  "united arab emirates": "AE", uae: "AE", "united kingdom": "GB", uk: "GB",
  "united states": "US", "united states of america": "US", usa: "US", us: "US",
  uruguay: "UY", vietnam: "VN",
};
export function countryToCode(name: string | null | undefined): string {
  if (!name) return "";
  return COUNTRY_CODE_MAP[name.trim().toLowerCase()] ?? name.slice(0, 2).toUpperCase();
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/* ─── Map Supabase status → UI status (buyer / supplier perspective) ─── */
export function mapStatusForSupplier(s: string): "action_required" | "awaiting_buyer" | "accepted" | "rejected" | "expired" | "final_round" {
  switch (s) {
    case "awaiting_supplier": return "action_required";
    case "pending_buyer_review": return "awaiting_buyer";
    case "bid_accepted": return "accepted";
    case "offer_rejected": return "rejected";
    case "expired": return "expired";
    default: return "awaiting_buyer";
  }
}
export function mapStatusForBuyer(s: string): "action_required" | "awaiting_supplier" | "accepted" | "rejected" | "expired" | "final_round" {
  switch (s) {
    case "awaiting_supplier": return "awaiting_supplier";
    case "pending_buyer_review": return "action_required";
    case "bid_accepted": return "accepted";
    case "offer_rejected": return "rejected";
    case "expired": return "expired";
    default: return "awaiting_supplier";
  }
}

/**
 * Each round_proposal alternates: odd round = buyer bid, even round = supplier counter.
 * Display rounds (1..3) = Math.ceil(rawRound / 2).
 */
export function displayRoundFor(rawRound: number): number {
  return Math.ceil(rawRound / 2);
}
export function roundTypeFor(rawRound: number): "bid" | "counter" {
  return rawRound % 2 === 1 ? "bid" : "counter";
}