import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  countryToCode,
  initialsOf,
  mapStatusForBuyer,
  mapStatusForSupplier,
  displayRoundFor,
  roundTypeFor,
  type RealNegotiationRow,
} from "./useRealNegotiation";
import type { ParentOffer, NegotiationBid, NegotiationDetail, NegotiationProduct, NegotiationRound } from "./useNegotiations";
import type { BuyerParentOffer, BuyerNegotiationBid, BuyerNegotiationDetail, BuyerNegotiationProduct, BuyerNegotiationRound } from "./useBuyerNegotiations";

export const MOCK_BUYER_COMPANY_ID = "00000000-0000-beef-0000-000000000001";
export const MOCK_SUPPLIER_ID = "0c543bae-647d-4f2e-980a-e35e70a94674";

type Role = "buyer" | "supplier";

/** Fetch ALL negotiations for a role and group them by parent offer. */
export function useRealNegotiationsList(role: Role) {
  const [buyerGroups, setBuyerGroups] = useState<BuyerParentOffer[]>([]);
  const [supplierGroups, setSupplierGroups] = useState<ParentOffer[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      let q = supabase
        .from("negotiations")
        .select(
          `
          id, offer_id, buyer_company_id, port_id, incoterm, status,
          fcl_count, freight_cost_per_kg, created_at, updated_at, expires_at,
          offer:offers!inner (
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
        .order("updated_at", { ascending: false });

      q = role === "buyer"
        ? q.eq("buyer_company_id", MOCK_BUYER_COMPANY_ID)
        : q.eq("offer.supplier_id", MOCK_SUPPLIER_ID);

      const { data, error: err } = await q;
      if (cancelled) return;
      if (err) {
        setError(new Error(err.message));
        setLoading(false);
        return;
      }
      const rows = ((data ?? []) as unknown as RealNegotiationRow[]).filter((r) => r.offer);
      for (const r of rows) r.rounds?.sort((a, b) => a.round - b.round);

      if (role === "buyer") setBuyerGroups(groupForBuyer(rows));
      else setSupplierGroups(groupForSupplier(rows));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  if (role === "buyer") {
    const offerCount = buyerGroups.length;
    const bidCount = buyerGroups.reduce((s, g) => s + g.bids.length, 0);
    return { data: buyerGroups as BuyerParentOffer[], offerCount, bidCount, isLoading, error };
  }
  const offerCount = supplierGroups.length;
  const bidCount = supplierGroups.reduce((s, g) => s + g.bids.length, 0);
  return { data: supplierGroups as ParentOffer[], offerCount, bidCount, isLoading, error };
}

/* ─── Transformers ─── */

function offerTitle(r: RealNegotiationRow): string {
  const o = r.offer!;
  const items = o.items ?? [];
  if (items.length === 1) return items[0].customer_product?.name ?? `Offer #${o.offer_number}`;
  if (items.length > 1) return `Mixed Container — ${items.length} cuts`;
  return `Offer #${o.offer_number}`;
}

function lastTotals(r: RealNegotiationRow) {
  // Round 1 (and any odd round) = buyer bid; Round 2 (and any even) = supplier counter.
  let yourBid = 0;
  let counter = 0;
  let maxRoundDisplay = 1;
  for (const rp of r.rounds ?? []) {
    const total = (rp.cut_rounds ?? []).reduce((s, c) => s + Number(c.price_per_kg) * Number(c.quantity_kg), 0);
    if (roundTypeFor(rp.round) === "bid") yourBid = total;
    else counter = total;
    maxRoundDisplay = Math.max(maxRoundDisplay, displayRoundFor(rp.round));
  }
  if (counter === 0) counter = yourBid; // pre-counter UI fallback
  return { yourBid, counter, displayRound: maxRoundDisplay };
}

function groupForBuyer(rows: RealNegotiationRow[]): BuyerParentOffer[] {
  const groups = new Map<string, BuyerParentOffer>();
  for (const r of rows) {
    const o = r.offer!;
    const parentId = `bpo-${o.id}`;
    if (!groups.has(parentId)) {
      groups.set(parentId, {
        id: parentId,
        title: offerTitle(r),
        oppWmsRef: `Offer #${o.offer_number}`,
        bids: [],
      });
    }
    const { yourBid, counter, displayRound } = lastTotals(r);
    const bid: BuyerNegotiationBid = {
      id: r.id,
      parentOfferId: parentId,
      supplierName: o.supplier_name,
      supplierInitials: initialsOf(o.supplier_name),
      supplierCountryCode: countryToCode(o.origin_country),
      supplierContact: undefined,
      round: displayRound,
      maxRounds: 3,
      yourBidUsd: yourBid,
      supplierCounterUsd: counter,
      originPort: o.origin_port,
      originCountry: o.origin_country,
      status: mapStatusForBuyer(r.status),
      updatedAt: r.updated_at,
    };
    groups.get(parentId)!.bids.push(bid);
  }
  return Array.from(groups.values());
}

function groupForSupplier(rows: RealNegotiationRow[]): ParentOffer[] {
  const groups = new Map<string, ParentOffer>();
  for (const r of rows) {
    const o = r.offer!;
    const parentId = `po-${o.id}`;
    if (!groups.has(parentId)) {
      groups.set(parentId, {
        id: parentId,
        title: offerTitle(r),
        oppWmsRef: `Offer #${o.offer_number}`,
        bids: [],
      });
    }
    const { yourBid, counter, displayRound } = lastTotals(r);
    const destCountry = r.port?.country?.english_name ?? "—";
    const destPort = r.port?.name ?? "—";
    const bid: NegotiationBid = {
      id: r.id,
      parentOfferId: parentId,
      buyerName: "Buyer", // No company name yet — could fetch later
      buyerInitials: "BR",
      buyerCountryCode: countryToCode(destCountry),
      buyerContact: undefined,
      round: displayRound,
      maxRounds: 3,
      latestBidUsd: yourBid,
      yourCounterUsd: counter,
      destinationPort: destPort,
      destinationCountry: destCountry,
      status: mapStatusForSupplier(r.status),
      updatedAt: r.updated_at,
    };
    groups.get(parentId)!.bids.push(bid);
  }
  return Array.from(groups.values());
}

/* ─── Detail transformers ─── */

function buildRoundsList(r: RealNegotiationRow): { rounds: BuyerNegotiationRound[]; perItem: Map<string, Record<string, number>> } {
  const rounds: BuyerNegotiationRound[] = [];
  const perItem = new Map<string, Record<string, number>>();
  const rps = r.rounds ?? [];
  rps.forEach((rp, idx) => {
    const type = roundTypeFor(rp.round);
    const disp = displayRoundFor(rp.round);
    let total = 0;
    for (const c of rp.cut_rounds ?? []) {
      const key = `${type}R${disp}UsdKg`;
      const m = perItem.get(c.offer_item_id) ?? {};
      m[key] = Number(c.price_per_kg);
      perItem.set(c.offer_item_id, m);
      total += Number(c.price_per_kg) * Number(c.quantity_kg);
    }
    rounds.push({
      type,
      round: disp,
      totalUsd: total,
      date: rp.created_at,
      isCurrent: idx === rps.length - 1,
    });
  });
  return { rounds, perItem };
}

export function toBuyerDetail(r: RealNegotiationRow): BuyerNegotiationDetail {
  const o = r.offer!;
  const { rounds, perItem } = buildRoundsList(r);
  const totalWeightKg = (o.items ?? []).reduce((s, it) => s + Number(it.amount), 0);
  const askingTotal = (o.items ?? []).reduce((s, it) => s + Number(it.amount) * Number(it.price), 0);
  const yourBid = rounds.filter((x) => x.type === "bid").slice(-1)[0]?.totalUsd ?? askingTotal;
  const counter = rounds.filter((x) => x.type === "counter").slice(-1)[0]?.totalUsd ?? yourBid;
  const displayRound = Math.max(...rounds.map((x) => x.round), 1);

  const products: BuyerNegotiationProduct[] = (o.items ?? []).map((it) => {
    const m = perItem.get(it.id) ?? {};
    return {
      name: it.customer_product?.name ?? "—",
      pack: "—",
      qtyLb: Number(it.amount),
      askingUsdKg: Number(it.price),
      bidR1UsdKg: (m["bidR1UsdKg"] as number) ?? Number(it.price),
      counterR1UsdKg: (m["counterR1UsdKg"] as number) ?? Number(it.price),
      bidR2UsdKg: m["bidR2UsdKg"] as number | undefined,
      counterR2UsdKg: m["counterR2UsdKg"] as number | undefined,
      bidR3UsdKg: m["bidR3UsdKg"] as number | undefined,
      counterR3UsdKg: m["counterR3UsdKg"] as number | undefined,
    };
  });

  return {
    id: r.id,
    parentOfferId: `bpo-${o.id}`,
    supplierName: o.supplier_name,
    supplierInitials: initialsOf(o.supplier_name),
    supplierCountryCode: countryToCode(o.origin_country),
    supplierContact: undefined,
    round: displayRound,
    maxRounds: 3,
    yourBidUsd: yourBid,
    supplierCounterUsd: counter,
    originPort: o.origin_port,
    originCountry: o.origin_country,
    status: mapStatusForBuyer(r.status),
    updatedAt: r.updated_at,
    parentTitle: offerTitle(r),
    incoterm: (r.incoterm as BuyerNegotiationDetail["incoterm"]) ?? "CFR",
    paymentTerms: o.payment_terms,
    fclCount: r.fcl_count,
    totalWeightKg,
    oppWmsRef: `Offer #${o.offer_number}`,
    supplierInternalId: o.supplier_id.slice(0, 6),
    askingPriceUsd: askingTotal,
    avgReplyDays: 2,
    valuePerFclUsd: counter,
    movementVsAskingUsd: yourBid - askingTotal,
    rounds,
    products,
  };
}

export function toSupplierDetail(r: RealNegotiationRow): NegotiationDetail {
  const buyer = toBuyerDetail(r);
  const destCountry = r.port?.country?.english_name ?? "—";
  const destPort = r.port?.name ?? "—";
  return {
    id: buyer.id,
    parentOfferId: `po-${r.offer!.id}`,
    buyerName: "Buyer",
    buyerInitials: "BR",
    buyerCountryCode: countryToCode(destCountry),
    buyerContact: undefined,
    round: buyer.round,
    maxRounds: buyer.maxRounds,
    latestBidUsd: buyer.yourBidUsd,
    yourCounterUsd: buyer.supplierCounterUsd,
    destinationPort: destPort,
    destinationCountry: destCountry,
    status: mapStatusForSupplier(r.status),
    updatedAt: buyer.updatedAt,
    parentTitle: buyer.parentTitle,
    incoterm: buyer.incoterm as NegotiationDetail["incoterm"],
    paymentTerms: buyer.paymentTerms,
    fclCount: buyer.fclCount,
    totalWeightKg: buyer.totalWeightKg,
    oppWmsRef: buyer.oppWmsRef,
    buyerInternalId: "00000",
    askingPriceUsd: buyer.askingPriceUsd,
    avgReplyDays: buyer.avgReplyDays,
    valuePerFclUsd: buyer.valuePerFclUsd,
    movementVsAskingUsd: buyer.movementVsAskingUsd,
    rounds: buyer.rounds as NegotiationProduct extends never ? never : NegotiationRound[],
    products: buyer.products as unknown as NegotiationProduct[],
  };
}