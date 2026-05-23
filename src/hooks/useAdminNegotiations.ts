import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NegotiationStatus =
  | "awaiting_supplier"
  | "pending_buyer_review"
  | "bid_accepted"
  | "offer_rejected"
  | "offer_exhausted"
  | "expired";

export interface AdminNegotiationRow {
  id: string;
  status: NegotiationStatus;
  incoterm: string | null;
  fcl_count: number | null;
  freight_cost_per_kg: number | null;
  settled_total_value: number | null;
  created_at: string;
  updated_at: string;
  // offer
  offer_id: string;
  offer_number: number | null;
  offer_created_at: string | null;
  supplier_name: string | null;
  origin_port: string | null;
  // buyer
  buyer_company_id: string;
  buyer_name: string | null;
  // destination
  destination_port: string | null;
  // product (first item)
  product_name: string | null;
  product_amount: number | null;
  product_condition: string | null;
  // value
  original_value: number;
  // rounds
  current_round: number;
  // bids
  latest_buyer_bid: number | null;
  latest_supplier_counter: number | null;
}

const ACTIVE_STATUSES: NegotiationStatus[] = ["awaiting_supplier", "pending_buyer_review"];

export function useAdminNegotiations() {
  const [rows, setRows] = useState<AdminNegotiationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: negotiations, error: negErr } = await supabase
        .from("negotiations")
        .select("id, status, incoterm, fcl_count, freight_cost_per_kg, settled_total_value, created_at, updated_at, offer_id, buyer_company_id, port_id")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (negErr) throw negErr;
      const negs = negotiations ?? [];

      if (negs.length === 0) {
        setRows([]);
        return;
      }

      const offerIds = [...new Set(negs.map((n) => n.offer_id).filter(Boolean))];
      const buyerIds = [...new Set(negs.map((n) => n.buyer_company_id).filter(Boolean))];
      const portIds = [...new Set(negs.map((n) => n.port_id).filter(Boolean))];
      const negIds = negs.map((n) => n.id);

      const [offersRes, buyersRes, portsRes, itemsRes, roundsRes] = await Promise.all([
        supabase.from("offers").select("id, offer_number, created_at, supplier_name, origin_port").in("id", offerIds),
        supabase.from("companies").select("id, name").in("id", buyerIds),
        portIds.length
          ? supabase.from("ports").select("id, name").in("id", portIds as string[])
          : Promise.resolve({ data: [], error: null }),
        supabase.from("offer_items").select("id, offer_id, customer_product_id, amount, price, condition").in("offer_id", offerIds),
        supabase.from("round_proposals").select("id, negotiation_id, round").in("negotiation_id", negIds),
      ]);

      const items = itemsRes.data ?? [];
      const productIds = [...new Set(items.map((i) => i.customer_product_id).filter(Boolean))];
      const productsRes = productIds.length
        ? await supabase.from("customer_products").select("id, name").in("id", productIds as string[])
        : { data: [], error: null };

      const roundIds = (roundsRes.data ?? []).map((r) => r.id);
      const cutsRes = roundIds.length
        ? await supabase.from("cut_rounds").select("id, round_proposal_id").in("round_proposal_id", roundIds)
        : { data: [], error: null };
      const cutIds = (cutsRes.data ?? []).map((c) => c.id);
      const cpRes = cutIds.length
        ? await supabase.from("counter_proposals").select("id, cut_round_id, price_per_kg, source, created_at").in("cut_round_id", cutIds)
        : { data: [], error: null };

      const offersMap = new Map((offersRes.data ?? []).map((o) => [o.id, o]));
      const buyersMap = new Map((buyersRes.data ?? []).map((b) => [b.id, b]));
      const portsMap = new Map((portsRes.data ?? []).map((p) => [p.id, p]));
      const productsMap = new Map((productsRes.data ?? []).map((p) => [p.id, p]));
      const itemsByOffer = new Map<string, typeof items>();
      items.forEach((it) => {
        const arr = itemsByOffer.get(it.offer_id) ?? [];
        arr.push(it);
        itemsByOffer.set(it.offer_id, arr);
      });
      const cutToRound = new Map((cutsRes.data ?? []).map((c) => [c.id, c.round_proposal_id]));
      const roundToNeg = new Map((roundsRes.data ?? []).map((r) => [r.id, r.negotiation_id]));
      const roundNumber = new Map((roundsRes.data ?? []).map((r) => [r.id, r.round]));

      const maxRoundByNeg = new Map<string, number>();
      (roundsRes.data ?? []).forEach((r) => {
        const cur = maxRoundByNeg.get(r.negotiation_id) ?? 0;
        if (r.round > cur) maxRoundByNeg.set(r.negotiation_id, r.round);
      });

      // latest buyer bid & supplier counter per negotiation
      const latestBuyer = new Map<string, { price: number; at: string }>();
      const latestSupplier = new Map<string, { price: number; at: string }>();
      (cpRes.data ?? []).forEach((cp) => {
        const roundId = cutToRound.get(cp.cut_round_id);
        if (!roundId) return;
        const negId = roundToNeg.get(roundId);
        if (!negId) return;
        const entry = { price: Number(cp.price_per_kg), at: cp.created_at };
        if (cp.source === "buyer") {
          const prev = latestBuyer.get(negId);
          if (!prev || prev.at < entry.at) latestBuyer.set(negId, entry);
        } else {
          const prev = latestSupplier.get(negId);
          if (!prev || prev.at < entry.at) latestSupplier.set(negId, entry);
        }
      });

      const out: AdminNegotiationRow[] = negs.map((n) => {
        const offer = offersMap.get(n.offer_id);
        const buyer = buyersMap.get(n.buyer_company_id);
        const port = n.port_id ? portsMap.get(n.port_id) : null;
        const offerItems = itemsByOffer.get(n.offer_id) ?? [];
        const firstItem = offerItems[0];
        const product = firstItem?.customer_product_id ? productsMap.get(firstItem.customer_product_id) : null;
        const original_value = offerItems.reduce((s, it) => s + Number(it.price ?? 0) * Number(it.amount ?? 0), 0);
        return {
          id: n.id,
          status: n.status as NegotiationStatus,
          incoterm: n.incoterm,
          fcl_count: n.fcl_count,
          freight_cost_per_kg: n.freight_cost_per_kg ? Number(n.freight_cost_per_kg) : null,
          settled_total_value: n.settled_total_value ? Number(n.settled_total_value) : null,
          created_at: n.created_at,
          updated_at: n.updated_at,
          offer_id: n.offer_id,
          offer_number: offer?.offer_number ?? null,
          offer_created_at: (offer as { created_at?: string | null } | undefined)?.created_at ?? null,
          supplier_name: offer?.supplier_name ?? null,
          origin_port: offer?.origin_port ?? null,
          buyer_company_id: n.buyer_company_id,
          buyer_name: buyer?.name ?? null,
          destination_port: port?.name ?? null,
          product_name: product?.name ?? null,
          product_amount: firstItem?.amount ? Number(firstItem.amount) : null,
          product_condition: firstItem?.condition ?? null,
          original_value,
          current_round: maxRoundByNeg.get(n.id) ?? 0,
          latest_buyer_bid: latestBuyer.get(n.id)?.price ?? null,
          latest_supplier_counter: latestSupplier.get(n.id)?.price ?? null,
        };
      });

      setRows(out);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load negotiations");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { rows, loading, error, refresh: fetchAll, ACTIVE_STATUSES };
}