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
  rejection_cooldown_until: string | null;
  current_round: number | null;
  chat_enabled: boolean | null;
  order_id: string | null;
  origin?: string | null;
  negotiation_mode?: string | null;
  negotiation_dial?: string | null;
  order: { id: string; order_number: number | null } | null;
  buyer: { id: string; name: string | null } | null;
  offer: {
    id: string;
    offer_number: number;
    created_at?: string | null;
    supplier_id: string;
    supplier_name: string;
    status?: string | null;
    origin_country: string;
    origin_port: string;
    payment_terms: string;
    container_size: string;
    shipment_month: number;
    shipment_year: number;
    total_fcl: number | null;
    allow_quantity_negotiation?: boolean | null;
    items: {
      id: string;
      amount: number;
      price: number;
      plant_number: string | null;
      customer_product: { id: string; name: string } | null;
    }[];
    offer_markets?: {
      market: { id: string; country: { english_name: string | null; iso_code: string | null } | null } | null;
    }[] | null;
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
      counter_proposals?: {
        id: string;
        price_per_kg: number;
        rule: string | null;
        is_final: boolean | null;
      }[] | null;
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
    // Set up realtime channel BEFORE any async work so .on() runs before .subscribe()
    const channel = supabase
      .channel(`neg-row-${negotiationId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "negotiations", filter: `id=eq.${negotiationId}` },
        () => setTick((n) => n + 1),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_proposals", filter: `negotiation_id=eq.${negotiationId}` },
        () => setTick((n) => n + 1),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "negotiation_messages", filter: `negotiation_id=eq.${negotiationId}` },
        () => setTick((n) => n + 1),
      )
      .subscribe();
    (async () => {
      const { data: row, error: err } = await supabase
        .from("negotiations")
        .select(
          `
          id, offer_id, buyer_company_id, port_id, incoterm, status,
          fcl_count, freight_cost_per_kg, created_at, updated_at, expires_at,
          agreed_items, settled_total_value, buyer_message, supplier_message,
          accepted_by, accepted_by_user_id, accepted_at, accepted_total_value,
          rejection_cooldown_until, current_round, chat_enabled,
          order_id, origin, negotiation_mode, negotiation_dial,
          order:orders!negotiations_order_id_fkey ( id, order_number ),
          buyer:companies!negotiations_buyer_company_id_fkey ( id, name ),
          offer:offers (
            id, offer_number, created_at, supplier_id, supplier_name, status, origin_country, origin_port, allow_quantity_negotiation,
            payment_terms, container_size, shipment_month, shipment_year, total_fcl,
            items:offer_items (
              id, amount, price, plant_number,
              customer_product:customer_products ( id, name )
            ),
            offer_markets ( market:markets ( id, country:countries ( english_name, iso_code ) ) )
          ),
          port:ports ( id, name, country:countries ( english_name, iso_code ) ),
          rounds:round_proposals!round_proposals_negotiation_id_fkey (
            id, round, created_at, created_by_user_id,
            cut_rounds (
              id, offer_item_id, price_per_kg, quantity_kg,
              counter_proposals ( id, price_per_kg, rule, is_final )
            )
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
      supabase.removeChannel(channel);
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