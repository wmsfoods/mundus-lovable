export type NegotiationStatus =
  | 'action_required'
  | 'awaiting_buyer'
  | 'final_round'
  | 'accepted'
  | 'rejected'
  | 'expired';

export type NegotiationBid = {
  id: string;
  parentOfferId: string;
  buyerName: string;
  buyerInitials: string;
  buyerCountryCode: string;
  buyerContact?: string;
  externalRef?: string;
  round: number;
  maxRounds: number;
  latestBidUsd: number;
  yourCounterUsd: number;
  destinationPort: string;
  destinationCountry: string;
  status: NegotiationStatus;
  updatedAt: string;
  expiresIn?: string;
};

export type ParentOffer = {
  id: string;
  title: string;
  oppWmsRef?: string;
  bids: NegotiationBid[];
};

import { useRealNegotiationsList, toSupplierDetail } from "./useRealNegotiationsList";
import { useRealNegotiation, isUuid } from "./useRealNegotiation";

const MOCK: ParentOffer[] = [
  {
    id: 'po-01228',
    title: 'Beef Premium Cuts — Mixed Container',
    bids: [
      { id:'b-01', parentOfferId:'po-01228', buyerName:'Seoul Wagyu Co.', buyerInitials:'SW', buyerCountryCode:'KR', buyerContact:'Min-Jun Park · ID 00091c', round:2, maxRounds:3, latestBidUsd:124510, yourCounterUsd:126100, destinationPort:'Busan', destinationCountry:'South Korea', status:'action_required', updatedAt:'2026-05-18', expiresIn:'9h 22m' },
      { id:'b-02', parentOfferId:'po-01228', buyerName:'Tokyo Premium Meats', buyerInitials:'TP', buyerCountryCode:'JP', buyerContact:'Hiroshi Tanaka · ID 00091b', round:1, maxRounds:3, latestBidUsd:119000, yourCounterUsd:126100, destinationPort:'Tokyo', destinationCountry:'Japan', status:'awaiting_buyer', updatedAt:'2026-05-17' },
      { id:'b-03', parentOfferId:'po-01228', buyerName:'Hong Kong Foods Co.', buyerInitials:'HK', buyerCountryCode:'HK', buyerContact:'Mei Wong · ID 00091', round:1, maxRounds:3, latestBidUsd:114900, yourCounterUsd:124900, destinationPort:'Kwai Tsing', destinationCountry:'Hong Kong', status:'action_required', updatedAt:'2026-05-16', expiresIn:'23h 12m' },
    ],
  },
  { id:'po-01224', title:'Boneless Beef RFQ 90VL', oppWmsRef:'Opp_Wms #01224', bids:[
    { id:'b-04', parentOfferId:'po-01224', buyerName:'Al-Madina Trading', buyerInitials:'AT', buyerCountryCode:'SA', round:2, maxRounds:3, latestBidUsd:151200, yourCounterUsd:156600, destinationPort:'Jeddah', destinationCountry:'Saudi Arabia', status:'action_required', updatedAt:'2026-05-15', expiresIn:'1d 4h' },
  ]},
  { id:'po-01198', title:'Beef Mixed — 19 cuts', oppWmsRef:'Opp_Wms #01198', bids:[
    { id:'b-05', parentOfferId:'po-01198', buyerName:'HK Premium Foods', buyerInitials:'HP', buyerCountryCode:'HK', round:2, maxRounds:3, latestBidUsd:14250, yourCounterUsd:16200, destinationPort:'Kwai Tsing', destinationCountry:'Hong Kong', status:'rejected', updatedAt:'2026-05-15' },
  ]},
  { id:'po-01214', title:'Beef Mixed Container — 9 cuts', oppWmsRef:'Opp_Wms #01214', bids:[
    { id:'b-06', parentOfferId:'po-01214', buyerName:'Sunrise Imports', buyerInitials:'SI', buyerCountryCode:'HK', round:1, maxRounds:3, latestBidUsd:157050, yourCounterUsd:172950, destinationPort:'Tsuen Wan', destinationCountry:'Hong Kong', status:'action_required', updatedAt:'2026-05-14', expiresIn:'2d 18h' },
  ]},
  { id:'po-01197', title:'Chicken Wings', oppWmsRef:'Opp_Wms #01197', bids:[
    { id:'b-07', parentOfferId:'po-01197', buyerName:'Singapore Foods Pte.', buyerInitials:'SF', buyerCountryCode:'SG', round:3, maxRounds:3, latestBidUsd:44820, yourCounterUsd:45900, destinationPort:'Singapore', destinationCountry:'Singapore', status:'final_round', updatedAt:'2026-05-14', expiresIn:'1d 8h' },
  ]},
  { id:'po-01210', title:'Beef Sangria 90VL', oppWmsRef:'Opp_Wms #01210', bids:[
    { id:'b-08', parentOfferId:'po-01210', buyerName:'Heritage Meats USA', buyerInitials:'HM', buyerCountryCode:'US', round:2, maxRounds:3, latestBidUsd:143100, yourCounterUsd:148500, destinationPort:'Houston', destinationCountry:'United States', status:'awaiting_buyer', updatedAt:'2026-05-13' },
  ]},
  { id:'po-01196', title:'Beef Brisket Choice', oppWmsRef:'Opp_Wms #01196', bids:[
    { id:'b-09', parentOfferId:'po-01196', buyerName:'Luanda Cold Chain', buyerInitials:'LC', buyerCountryCode:'AO', round:3, maxRounds:3, latestBidUsd:125550, yourCounterUsd:127440, destinationPort:'Luanda', destinationCountry:'Angola', status:'final_round', updatedAt:'2026-05-12', expiresIn:'11h 40m' },
  ]},
  { id:'po-01203', title:'Chicken Breast Skinless', oppWmsRef:'Opp_Wms #01203', bids:[
    { id:'b-10', parentOfferId:'po-01203', buyerName:'Tema Frozen Imports', buyerInitials:'TF', buyerCountryCode:'GH', round:1, maxRounds:3, latestBidUsd:105300, yourCounterUsd:118800, destinationPort:'Tema', destinationCountry:'Ghana', status:'awaiting_buyer', updatedAt:'2026-05-11' },
  ]},
  { id:'po-01199', title:'Pork Loin Boneless', oppWmsRef:'Opp_Wms #01199', bids:[
    { id:'b-11', parentOfferId:'po-01199', buyerName:'Veracruz Trading', buyerInitials:'VT', buyerCountryCode:'MX', round:3, maxRounds:3, latestBidUsd:72000, yourCounterUsd:72900, destinationPort:'Veracruz', destinationCountry:'Mexico', status:'rejected', updatedAt:'2026-05-09' },
  ]},
  { id:'po-01206', title:'Boneless Beef Eyeround 100VL', oppWmsRef:'Opp_Wms #01206', bids:[
    { id:'b-12', parentOfferId:'po-01206', buyerName:'Saigon Frozen Co.', buyerInitials:'SF', buyerCountryCode:'VN', round:2, maxRounds:3, latestBidUsd:110700, yourCounterUsd:110700, destinationPort:'Ho Chi Minh', destinationCountry:'Vietnam', status:'accepted', updatedAt:'2026-05-05' },
  ]},
  { id:'po-01200', title:'Frozen Striploin', oppWmsRef:'Opp_Wms #01200', bids:[
    { id:'b-13', parentOfferId:'po-01200', buyerName:'Tokyo Premium Meats', buyerInitials:'TP', buyerCountryCode:'JP', round:1, maxRounds:3, latestBidUsd:164700, yourCounterUsd:179550, destinationPort:'Tokyo', destinationCountry:'Japan', status:'expired', updatedAt:'2026-04-30' },
  ]},
  { id:'po-01207', title:'Boneless Beef Flat 97VL', oppWmsRef:'Opp_Wms #01207', bids:[
    { id:'b-14', parentOfferId:'po-01207', buyerName:'Tel Aviv Meat Imports', buyerInitials:'TA', buyerCountryCode:'IL', round:3, maxRounds:3, latestBidUsd:105300, yourCounterUsd:105300, destinationPort:'Ashdod', destinationCountry:'Israel', status:'accepted', updatedAt:'2026-04-28' },
  ]},
];

export function useNegotiations() {
  const real = useRealNegotiationsList("supplier");
  const realData = (real.data as ParentOffer[]) ?? [];
  const data = [...realData, ...MOCK];
  const offerCount = data.length;
  const bidCount = data.reduce((s, p) => s + p.bids.length, 0);
  return { data, offerCount, bidCount, isLoading: real.isLoading, error: real.error };
}

export type NegotiationProduct = {
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

export type NegotiationRound = {
  type: 'bid' | 'counter';
  round: number;
  totalUsd: number;
  date: string;
  isCurrent?: boolean;
};

export type NegotiationDetail = NegotiationBid & {
  parentTitle: string;
  incoterm: 'CFR' | 'CIF' | 'FOB' | 'EXW' | 'DAP' | 'DDP';
  paymentTerms: string;
  fclCount: number;
  totalWeightKg: number;
  oppWmsRef: string;
  buyerInternalId: string;
  askingPriceUsd: number;
  avgReplyDays: number;
  valuePerFclUsd: number;
  movementVsAskingUsd: number;
  rounds: NegotiationRound[];
  products: NegotiationProduct[];
};

function makeDefaultDetail(bid: NegotiationBid, parent: ParentOffer): NegotiationDetail {
  const askingPriceUsd = Math.round(bid.latestBidUsd * 1.05);
  const rounds: NegotiationRound[] = [];
  for (let r = 1; r <= bid.round; r++) {
    const factor = 1 - (bid.round - r) * 0.02;
    if (r < bid.round) {
      rounds.push({ type: 'bid',     round: r, totalUsd: Math.round(bid.latestBidUsd * (factor - 0.02)), date: bid.updatedAt });
      rounds.push({ type: 'counter', round: r, totalUsd: Math.round(bid.yourCounterUsd * factor),         date: bid.updatedAt });
    } else {
      rounds.push({ type: 'bid',     round: r, totalUsd: bid.latestBidUsd,    date: bid.updatedAt });
      rounds.push({ type: 'counter', round: r, totalUsd: bid.yourCounterUsd, date: bid.updatedAt, isCurrent: true });
    }
  }
  const productName = parent.title.split(' — ')[0] || parent.title;
  const product: NegotiationProduct = {
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
    oppWmsRef: parent.oppWmsRef ?? `Opp_Wms #${parent.id.replace('po-', '')}`,
    buyerInternalId: bid.id.replace('b-', '000'),
    askingPriceUsd,
    avgReplyDays: 3,
    valuePerFclUsd: bid.yourCounterUsd,
    movementVsAskingUsd: bid.latestBidUsd - askingPriceUsd,
    rounds,
    products: [product],
  };
}

const RICH_OVERRIDES: Record<string, Partial<NegotiationDetail>> = {
  'b-01': {
    incoterm: 'CFR',
    paymentTerms: '30% Advance, Balance TT',
    fclCount: 1,
    totalWeightKg: 25000,
    oppWmsRef: 'Opp_Wms #01228',
    buyerInternalId: '00091c',
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
};

const MOCK_DETAILS: Record<string, NegotiationDetail> = (() => {
  const out: Record<string, NegotiationDetail> = {};
  for (const parent of MOCK) {
    for (const bid of parent.bids) {
      const base = makeDefaultDetail(bid, parent);
      out[bid.id] = { ...base, ...(RICH_OVERRIDES[bid.id] ?? {}) };
    }
  }
  return out;
})();

export function useNegotiation(bidId: string) {
  const isReal = isUuid(bidId);
  const real = useRealNegotiation(isReal ? bidId : undefined);
  if (isReal) {
    const detail = real.data ? toSupplierDetail(real.data) : null;
    return { data: detail, isLoading: real.isLoading, error: real.error };
  }
  return { data: MOCK_DETAILS[bidId] ?? null, isLoading: false, error: null as null | Error };
}