import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOffice } from "./useActiveOffice";
import { useCurrentCompany } from "./useCurrentCompany";
import { useSupplierScope } from "./useSupplierScope";
import { useRealtimeRefresh } from "./useRealtimeRefresh";
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
import { MAX_DISPLAY_ROUNDS } from "@/lib/negotiationEngine";
import { formatOfferNumber } from "@/lib/offerNumber";

export const MOCK_BUYER_COMPANY_ID = "00000000-0000-beef-0000-000000000001";
export const MOCK_SUPPLIER_ID = "0c543bae-647d-4f2e-980a-e35e70a94674";

type Role = "buyer" | "supplier";

/** Fetch ALL negotiations for a role and group them by parent offer. */
export function useRealNegotiationsList(role: Role) {
  const [buyerGroups, setBuyerGroups] = useState<BuyerParentOffer[]>([]);
  const [supplierGroups, setSupplierGroups] = useState<ParentOffer[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { activeOfficeId, isAllOffices } = useActiveOffice();
  const { company, loading: companyLoading } = useCurrentCompany();
  const { scopeIds, loading: scopeLoading } = useSupplierScope();
  const scopeKey = scopeIds.join(",");
  // Buyers always see all negotiations regardless of supplier office.
  const applyOfficeFilter = role === "supplier" && !isAllOffices && !!activeOfficeId;
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  useRealtimeRefresh({ table: "negotiations", onRefresh: bump, enabled: !!company?.id });
  useRealtimeRefresh({ table: "round_proposals", onRefresh: bump, enabled: !!company?.id });

  useEffect(() => {
    let cancelled = false;
    if (companyLoading || !company?.id || (role === "supplier" && scopeLoading)) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      let q = supabase
        .from("negotiations")
        .select(
          `
          id, offer_id, buyer_company_id, port_id, incoterm, status,
          fcl_count, freight_cost_per_kg, created_at, updated_at, expires_at,
          order_id,
          order:orders!negotiations_order_id_fkey ( id, order_number ),
          buyer:companies!negotiations_buyer_company_id_fkey ( id, name ),
          offer:offers!inner (
            id, offer_number, created_at, supplier_id, supplier_name, origin_country, origin_port,
            payment_terms, container_size, shipment_month, shipment_year, total_fcl,
            items:offer_items (
              id, amount, price, minimum_price,
              customer_product:customer_products ( id, name )
            )
          ),
          port:ports ( id, name, country:countries ( english_name, iso_code ) ),
          rounds:round_proposals!round_proposals_negotiation_id_fkey (
            id, round, created_at, created_by_user_id,
            cut_rounds ( id, offer_item_id, price_per_kg, quantity_kg )
          )
          `,
        )
        .order("updated_at", { ascending: false });

      if (role === "buyer") {
        q = q.eq("buyer_company_id", company!.id);
      } else {
        // Scope by the supplier's family/office focus. RLS still enforces
        // cross-family isolation at the DB layer.
        if (scopeIds.length === 0) {
          setSupplierGroups([]);
          setLoading(false);
          return;
        }
        q = q.in("offer.supplier_id", scopeIds);
      }

      if (applyOfficeFilter) {
        // Include negotiations explicitly assigned to this office AND
        // legacy/unassigned ones (office_id IS NULL) so suppliers don't
        // see an empty list after switching offices.
        q = q.or(`office_id.eq.${activeOfficeId},office_id.is.null`);
      }

      const { data, error: err } = await q;
      if (cancelled) return;
      console.log("[NegList]", role, "rows:", data?.length, "err:", err?.message);
      if (err) {
        setError(new Error(err.message));
        setLoading(false);
        return;
      }
      const rows = ((data ?? []) as unknown as RealNegotiationRow[]).filter((r) => r.offer);
      for (const r of rows) r.rounds?.sort((a, b) => a.round - b.round);

      if (role === "buyer") {
        const groups = groupForBuyer(rows);
        console.log("[NegList] buyer groups:", groups.length, "bids:", groups.reduce((s, g) => s + g.bids.length, 0));
        setBuyerGroups(groups);
      } else {
        const groups = groupForSupplier(rows);
        console.log("[NegList] supplier groups:", groups.length);
        setSupplierGroups(groups);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, applyOfficeFilter, activeOfficeId, company?.id, companyLoading, scopeLoading, scopeKey, refreshKey]);

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
  if (items.length === 1) return items[0].customer_product?.name ?? formatOfferNumber(o.offer_number, o.created_at);
  if (items.length > 1) return `Mixed Container — ${items.length} cuts`;
  return formatOfferNumber(o.offer_number, o.created_at);
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
  // No fallback: counter remains 0 when supplier hasn't sent one yet (UI shows "—")
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
        oppWmsRef: formatOfferNumber(o.offer_number, o.created_at),
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
      maxRounds: MAX_DISPLAY_ROUNDS,
      yourBidUsd: yourBid,
      supplierCounterUsd: counter,
      originPort: o.origin_port,
      originCountry: o.origin_country,
      status: mapStatusForBuyer(r.status),
      updatedAt: r.updated_at,
      orderId: r.order?.id ?? null,
      orderNumber: r.order?.order_number != null ? String(r.order.order_number).padStart(7, "0") : null,
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
        oppWmsRef: formatOfferNumber(o.offer_number, o.created_at),
        bids: [],
      });
    }
    const { yourBid, counter, displayRound } = lastTotals(r);
    const destCountry = r.port?.country?.english_name ?? "—";
    const destPort = r.port?.name ?? "—";
    const buyerName = r.buyer?.name ?? "Buyer";
    const bid: NegotiationBid = {
      id: r.id,
      parentOfferId: parentId,
      buyerName,
      buyerInitials: initialsOf(buyerName),
      buyerCountryCode: countryToCode(destCountry),
      buyerContact: undefined,
      round: displayRound,
      maxRounds: MAX_DISPLAY_ROUNDS,
      latestBidUsd: yourBid,
      yourCounterUsd: counter,
      destinationPort: destPort,
      destinationCountry: destCountry,
      status: mapStatusForSupplier(r.status),
      updatedAt: r.updated_at,
      orderId: r.order?.id ?? null,
      orderNumber: r.order?.order_number != null ? String(r.order.order_number).padStart(7, "0") : null,
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
      // it.amount is stored in kg in DB. Detail pages divide by LB_PER_KG
      // expecting lb here, so convert kg → lb before exposing.
      qtyLb: Number(it.amount) * 2.20462262185,
      askingUsdKg: Number(it.price),
      bidR1UsdKg: (m["bidR1UsdKg"] as number) ?? Number(it.price),
      counterR1UsdKg: (m["counterR1UsdKg"] as number) ?? Number(it.price),
      bidR2UsdKg: m["bidR2UsdKg"] as number | undefined,
      counterR2UsdKg: m["counterR2UsdKg"] as number | undefined,
      bidR3UsdKg: m["bidR3UsdKg"] as number | undefined,
      counterR3UsdKg: m["counterR3UsdKg"] as number | undefined,
      bidR4UsdKg: m["bidR4UsdKg"] as number | undefined,
      counterR4UsdKg: m["counterR4UsdKg"] as number | undefined,
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
    maxRounds: MAX_DISPLAY_ROUNDS,
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
    oppWmsRef: formatOfferNumber(o.offer_number, o.created_at),
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
  const buyerName = r.buyer?.name ?? "Buyer";
  return {
    id: buyer.id,
    parentOfferId: `po-${r.offer!.id}`,
    buyerName,
    buyerInitials: initialsOf(buyerName),
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
    rounds: buyer.rounds as unknown as NegotiationRound[],
    products: buyer.products as unknown as NegotiationProduct[],
  };
}