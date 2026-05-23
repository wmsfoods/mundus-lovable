export type BuyerNegotiationStatus =
  | 'action_required'
  | 'awaiting_supplier'
  | 'final_round'
  | 'accepted'
  | 'rejected'
  | 'expired';

export type BuyerNegotiationBid = {
  id: string;
  parentOfferId: string;
  supplierName: string;
  supplierInitials: string;
  supplierCountryCode: string;
  supplierContact?: string;
  externalRef?: string;
  round: number;
  maxRounds: number;
  yourBidUsd: number;
  supplierCounterUsd: number;
  originPort: string;
  originCountry: string;
  status: BuyerNegotiationStatus;
  updatedAt: string;
  expiresIn?: string;
};

export type BuyerParentOffer = {
  id: string;
  title: string;
  oppWmsRef?: string;
  bids: BuyerNegotiationBid[];
};

import { useRealNegotiationsList, toBuyerDetail } from "./useRealNegotiationsList";
import { useRealNegotiation, isUuid } from "./useRealNegotiation";

const MOCK_BUYER: BuyerParentOffer[] = [
  {
    id: 'bpo-02101',
    title: 'Ribeye 7-9lb — Q3 Imports',
    oppWmsRef: 'Opp_Wms #02101',
    bids: [
      { id: 'bb-01', parentOfferId: 'bpo-02101', supplierName: 'WMS Foods', supplierInitials: 'WF', supplierCountryCode: 'BR', supplierContact: 'Antonio Lima · ID 00231a', round: 2, maxRounds: 3, yourBidUsd: 124510, supplierCounterUsd: 126100, originPort: 'Santos', originCountry: 'Brazil', status: 'action_required', updatedAt: '2026-05-18', expiresIn: '9h 22m' },
      { id: 'bb-02', parentOfferId: 'bpo-02101', supplierName: 'Marfrig Global', supplierInitials: 'MG', supplierCountryCode: 'BR', supplierContact: 'Roberto Marfrig · ID 00231b', round: 1, maxRounds: 3, yourBidUsd: 119000, supplierCounterUsd: 126100, originPort: 'Paranaguá', originCountry: 'Brazil', status: 'awaiting_supplier', updatedAt: '2026-05-17' },
      { id: 'bb-03', parentOfferId: 'bpo-02101', supplierName: 'Pampa Beef', supplierInitials: 'PB', supplierCountryCode: 'UY', supplierContact: 'Lucia Mendez · ID 00231c', round: 1, maxRounds: 3, yourBidUsd: 114900, supplierCounterUsd: 124900, originPort: 'Montevideo', originCountry: 'Uruguay', status: 'action_required', updatedAt: '2026-05-16', expiresIn: '23h 12m' },
    ],
  },
  { id: 'bpo-02098', title: 'Pork Loin for Mexican market', oppWmsRef: 'Opp_Wms #02098', bids: [
    { id: 'bb-04', parentOfferId: 'bpo-02098', supplierName: 'Tyson Foods Brasil', supplierInitials: 'TF', supplierCountryCode: 'BR', round: 2, maxRounds: 3, yourBidUsd: 78200, supplierCounterUsd: 81600, originPort: 'Itajaí', originCountry: 'Brazil', status: 'action_required', updatedAt: '2026-05-15', expiresIn: '1d 4h' },
  ]},
  { id: 'bpo-02080', title: 'Chicken Wings for Singapore deli', oppWmsRef: 'Opp_Wms #02080', bids: [
    { id: 'bb-05', parentOfferId: 'bpo-02080', supplierName: 'Argentina Beef Co', supplierInitials: 'AB', supplierCountryCode: 'AR', round: 2, maxRounds: 3, yourBidUsd: 41250, supplierCounterUsd: 43200, originPort: 'Buenos Aires', originCountry: 'Argentina', status: 'awaiting_supplier', updatedAt: '2026-05-14' },
    { id: 'bb-06', parentOfferId: 'bpo-02080', supplierName: 'WMS Foods', supplierInitials: 'WF', supplierCountryCode: 'BR', round: 3, maxRounds: 3, yourBidUsd: 44820, supplierCounterUsd: 45900, originPort: 'Santos', originCountry: 'Brazil', status: 'final_round', updatedAt: '2026-05-14', expiresIn: '1d 8h' },
  ]},
  { id: 'bpo-02075', title: 'Beef Brisket Choice — Angola', oppWmsRef: 'Opp_Wms #02075', bids: [
    { id: 'bb-07', parentOfferId: 'bpo-02075', supplierName: 'Marfrig Global', supplierInitials: 'MG', supplierCountryCode: 'BR', round: 3, maxRounds: 3, yourBidUsd: 125550, supplierCounterUsd: 127440, originPort: 'Santos', originCountry: 'Brazil', status: 'accepted', updatedAt: '2026-05-12' },
  ]},
  { id: 'bpo-02060', title: 'Frozen Striploin — Japan reorder', oppWmsRef: 'Opp_Wms #02060', bids: [
    { id: 'bb-08', parentOfferId: 'bpo-02060', supplierName: 'Pampa Beef', supplierInitials: 'PB', supplierCountryCode: 'UY', round: 1, maxRounds: 3, yourBidUsd: 164700, supplierCounterUsd: 179550, originPort: 'Montevideo', originCountry: 'Uruguay', status: 'expired', updatedAt: '2026-04-30' },
    { id: 'bb-09', parentOfferId: 'bpo-02060', supplierName: 'WMS Foods', supplierInitials: 'WF', supplierCountryCode: 'BR', round: 1, maxRounds: 3, yourBidUsd: 162000, supplierCounterUsd: 176000, originPort: 'Santos', originCountry: 'Brazil', status: 'awaiting_supplier', updatedAt: '2026-05-10' },
  ]},
  { id: 'bpo-02045', title: 'Boneless Beef 100VL — Vietnam', oppWmsRef: 'Opp_Wms #02045', bids: [
    { id: 'bb-10', parentOfferId: 'bpo-02045', supplierName: 'Argentina Beef Co', supplierInitials: 'AB', supplierCountryCode: 'AR', round: 3, maxRounds: 3, yourBidUsd: 110700, supplierCounterUsd: 110700, originPort: 'Buenos Aires', originCountry: 'Argentina', status: 'rejected', updatedAt: '2026-05-09' },
    { id: 'bb-11', parentOfferId: 'bpo-02045', supplierName: 'Tyson Foods Brasil', supplierInitials: 'TF', supplierCountryCode: 'BR', round: 2, maxRounds: 3, yourBidUsd: 108900, supplierCounterUsd: 112400, originPort: 'Itajaí', originCountry: 'Brazil', status: 'action_required', updatedAt: '2026-05-11', expiresIn: '14h 05m' },
  ]},
];

export function useBuyerNegotiations() {
  const real = useRealNegotiationsList("buyer");
  const realData = (real.data as BuyerParentOffer[]) ?? [];
  const data = realData;
  const offerCount = data.length;
  const bidCount = data.reduce((s, p) => s + p.bids.length, 0);
  return { data, offerCount, bidCount, isLoading: real.isLoading, error: real.error };
}

export type BuyerNegotiationProduct = {
  name: string;
  pack: string;
  qtyLb: number;
  askingUsdKg: number;
  bidR1UsdKg: number;
  counterR1UsdKg: number;
  bidR2UsdKg?: number;
  counterR2UsdKg?: number;
  bidR3UsdKg?: number;
  counterR3UsdKg?: number;
};

export type BuyerNegotiationRound = {
  type: 'bid' | 'counter';
  round: number;
  totalUsd: number;
  date: string;
  isCurrent?: boolean;
};

export type BuyerNegotiationDetail = BuyerNegotiationBid & {
  parentTitle: string;
  incoterm: 'CFR' | 'CIF' | 'FOB' | 'EXW' | 'DAP' | 'DDP';
  paymentTerms: string;
  fclCount: number;
  totalWeightKg: number;
  oppWmsRef: string;
  supplierInternalId: string;
  askingPriceUsd: number;
  avgReplyDays: number;
  valuePerFclUsd: number;
  movementVsAskingUsd: number;
  rounds: BuyerNegotiationRound[];
  products: BuyerNegotiationProduct[];
};

function makeDefaultDetail(bid: BuyerNegotiationBid, parent: BuyerParentOffer): BuyerNegotiationDetail {
  const askingPriceUsd = Math.round(bid.supplierCounterUsd * 1.05);
  const rounds: BuyerNegotiationRound[] = [];
  for (let r = 1; r <= bid.round; r++) {
    const factor = 1 - (bid.round - r) * 0.02;
    if (r < bid.round) {
      rounds.push({ type: 'bid',     round: r, totalUsd: Math.round(bid.yourBidUsd * (factor - 0.02)), date: bid.updatedAt });
      rounds.push({ type: 'counter', round: r, totalUsd: Math.round(bid.supplierCounterUsd * factor),  date: bid.updatedAt });
    } else {
      rounds.push({ type: 'bid',     round: r, totalUsd: bid.yourBidUsd,           date: bid.updatedAt });
      rounds.push({ type: 'counter', round: r, totalUsd: bid.supplierCounterUsd,   date: bid.updatedAt, isCurrent: true });
    }
  }
  const productName = parent.title.split(' — ')[0] || parent.title;
  const product: BuyerNegotiationProduct = {
    name: productName,
    pack: 'Vacuum 4×CTN',
    qtyLb: 27000,
    askingUsdKg: 5.40,
    bidR1UsdKg: 5.10,
    counterR1UsdKg: 5.30,
  };
  if (bid.round >= 2) { product.bidR2UsdKg = 5.20; product.counterR2UsdKg = 5.28; }
  if (bid.round >= 3) { product.bidR3UsdKg = 5.25; product.counterR3UsdKg = 5.27; }

  return {
    ...bid,
    parentTitle: parent.title,
    incoterm: 'CFR',
    paymentTerms: '30% Advance, Balance TT',
    fclCount: 1,
    totalWeightKg: 27000,
    oppWmsRef: parent.oppWmsRef ?? `Opp_Wms #${parent.id.replace('bpo-', '')}`,
    supplierInternalId: bid.id.replace('bb-', '000'),
    askingPriceUsd,
    avgReplyDays: 3,
    valuePerFclUsd: bid.supplierCounterUsd,
    movementVsAskingUsd: bid.yourBidUsd - askingPriceUsd,
    rounds,
    products: [product],
  };
}

const RICH_OVERRIDES: Record<string, Partial<BuyerNegotiationDetail>> = {
  'bb-01': {
    incoterm: 'CFR',
    paymentTerms: '30% Advance, Balance TT',
    fclCount: 1,
    totalWeightKg: 25000,
    oppWmsRef: 'Opp_Wms #02101',
    supplierInternalId: '00231a',
    askingPriceUsd: 129400,
    avgReplyDays: 4,
    valuePerFclUsd: 189500,
    movementVsAskingUsd: -4890,
    rounds: [
      { type: 'bid',     round: 1, totalUsd: 122550, date: '2026-05-15' },
      { type: 'counter', round: 1, totalUsd: 126800, date: '2026-05-16' },
      { type: 'bid',     round: 2, totalUsd: 124510, date: '2026-05-17' },
      { type: 'counter', round: 2, totalUsd: 126100, date: '2026-05-18', isCurrent: true },
    ],
    products: [
      { name: 'Ribeye, 7-9 lb',      pack: 'Vacuum 4×CTN', qtyLb: 13228, askingUsdKg: 7.20, bidR1UsdKg: 6.80, counterR1UsdKg: 7.05, bidR2UsdKg: 6.90, counterR2UsdKg: 7.00 },
      { name: 'Striploin, 8-10 lb',  pack: 'Vacuum 2×CTN', qtyLb: 11023, askingUsdKg: 6.80, bidR1UsdKg: 6.45, counterR1UsdKg: 6.65, bidR2UsdKg: 6.55, counterR2UsdKg: 6.62 },
      { name: 'Tenderloin, 4-6 lb',  pack: 'Vacuum 6×CTN', qtyLb:  6614, askingUsdKg: 8.40, bidR1UsdKg: 8.00, counterR1UsdKg: 8.25, bidR2UsdKg: 8.12, counterR2UsdKg: 8.20 },
      { name: 'Top Sirloin, 6-8 lb', pack: 'Vacuum 4×CTN', qtyLb: 11023, askingUsdKg: 5.40, bidR1UsdKg: 5.10, counterR1UsdKg: 5.30, bidR2UsdKg: 5.20, counterR2UsdKg: 5.28 },
    ],
  },
  'bb-04': {
    products: [
      { name: 'Pork Loin Boneless', pack: 'Vacuum 4×CTN', qtyLb: 18000, askingUsdKg: 4.30, bidR1UsdKg: 4.00, counterR1UsdKg: 4.20, bidR2UsdKg: 4.10, counterR2UsdKg: 4.18 },
      { name: 'Pork Tenderloin',    pack: 'Vacuum 6×CTN', qtyLb:  9000, askingUsdKg: 5.20, bidR1UsdKg: 4.85, counterR1UsdKg: 5.05, bidR2UsdKg: 4.95, counterR2UsdKg: 5.02 },
    ],
  },
};

const MOCK_BUYER_DETAILS: Record<string, BuyerNegotiationDetail> = (() => {
  const out: Record<string, BuyerNegotiationDetail> = {};
  for (const parent of MOCK_BUYER) {
    for (const bid of parent.bids) {
      const base = makeDefaultDetail(bid, parent);
      out[bid.id] = { ...base, ...(RICH_OVERRIDES[bid.id] ?? {}) };
    }
  }
  return out;
})();

export function useBuyerNegotiation(bidId: string) {
  const isReal = isUuid(bidId);
  const real = useRealNegotiation(isReal ? bidId : undefined);
  if (isReal) {
    const detail = real.data ? toBuyerDetail(real.data) : null;
    return { data: detail, isLoading: real.isLoading, error: real.error };
  }
  return { data: MOCK_BUYER_DETAILS[bidId] ?? null, isLoading: false, error: null as null | Error };
}
