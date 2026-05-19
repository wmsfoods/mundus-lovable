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
  const offerCount = MOCK.length;
  const bidCount = MOCK.reduce((s, p) => s + p.bids.length, 0);
  return { data: MOCK, offerCount, bidCount, isLoading: false, error: null as null | Error };
}

export type RoundEntry = {
  round: number;
  type: 'bid' | 'counter';
  amount: number;
  date: string;
  isCurrent?: boolean;
};

export type CutDetail = {
  product: string;
  pack: string;
  quantityLb: number;
  asking: number;
  perRound: { round: number; bid?: number; counter?: number }[];
};

export type NegotiationDetail = NegotiationBid & {
  parentTitle: string;
  oppWmsRef: string;
  incoterm: 'CFR' | 'CIF' | 'FOB';
  paymentTerm: string;
  fcls: number;
  weightKg: number;
  askingPrice: number;
  buyerBid: number;
  yourCounter: number;
  timeline: RoundEntry[];
  avgReplyTime: string;
  valuePerFcl: number;
  movement: number;
  cuts: CutDetail[];
};

const RICH_DETAILS: Record<string, Partial<NegotiationDetail>> = {
  'b-01': {
    parentTitle: 'Beef Premium Cuts — Mixed Container',
    oppWmsRef: 'Opp_Wms #01228',
    incoterm: 'CFR',
    paymentTerm: '30% Advance, Balance TT',
    fcls: 1,
    weightKg: 25000,
    askingPrice: 129400,
    buyerBid: 124510,
    yourCounter: 126100,
    timeline: [
      { round: 1, type: 'bid',     amount: 122550, date: '2026-05-12' },
      { round: 1, type: 'counter', amount: 126800, date: '2026-05-13' },
      { round: 2, type: 'bid',     amount: 124510, date: '2026-05-17' },
      { round: 2, type: 'counter', amount: 126100, date: '2026-05-18', isCurrent: true },
    ],
    avgReplyTime: '4d',
    valuePerFcl: 189500,
    movement: -4890,
    cuts: [
      { product: 'Ribeye, 7–9 lb',      pack: 'Vacuum 4×CTN', quantityLb: 13228, asking: 7.20, perRound: [{ round: 1, bid: 6.80, counter: 7.05 }, { round: 2, bid: 6.90, counter: 7.00 }] },
      { product: 'Striploin, 8–10 lb',  pack: 'Vacuum 2×CTN', quantityLb: 11023, asking: 6.80, perRound: [{ round: 1, bid: 6.45, counter: 6.65 }, { round: 2, bid: 6.55, counter: 6.62 }] },
      { product: 'Tenderloin, 4–6 lb',  pack: 'Vacuum 6×CTN', quantityLb: 6614,  asking: 8.40, perRound: [{ round: 1, bid: 8.00, counter: 8.25 }, { round: 2, bid: 8.12, counter: 8.20 }] },
      { product: 'Top Sirloin, 6–8 lb', pack: 'Vacuum 4×CTN', quantityLb: 11023, asking: 5.40, perRound: [{ round: 1, bid: 5.10, counter: 5.30 }, { round: 2, bid: 5.20, counter: 5.28 }] },
    ],
  },
};

function buildDefaultDetail(bid: NegotiationBid, parent: ParentOffer): NegotiationDetail {
  const buyerBid = bid.latestBidUsd;
  const yourCounter = bid.yourCounterUsd;
  const askingPrice = Math.round(buyerBid * 1.05);
  const tl: RoundEntry[] = [];
  for (let r = 1; r <= bid.round; r++) {
    const factor = 1 - (bid.round - r) * 0.02;
    if (r < bid.round) {
      tl.push({ round: r, type: 'bid',     amount: Math.round(buyerBid * (factor - 0.02)), date: bid.updatedAt });
      tl.push({ round: r, type: 'counter', amount: Math.round(yourCounter * factor),       date: bid.updatedAt });
    } else {
      tl.push({ round: r, type: 'bid',     amount: buyerBid,    date: bid.updatedAt });
      tl.push({ round: r, type: 'counter', amount: yourCounter, date: bid.updatedAt, isCurrent: true });
    }
  }
  const lbTotal = 27000 * 2.205;
  return {
    ...bid,
    parentTitle: parent.title,
    oppWmsRef: parent.oppWmsRef ?? `Opp_Wms #${parent.id.replace('po-', '')}`,
    incoterm: 'CFR',
    paymentTerm: '30% Advance, Balance TT',
    fcls: 1,
    weightKg: 27000,
    askingPrice,
    buyerBid,
    yourCounter,
    timeline: tl,
    avgReplyTime: '3d',
    valuePerFcl: Math.round(yourCounter * 1.5),
    movement: buyerBid - askingPrice,
    cuts: [
      {
        product: parent.title.split(' — ')[0] || parent.title,
        pack: 'Vacuum',
        quantityLb: Math.round(lbTotal),
        asking: askingPrice / lbTotal,
        perRound: [{ round: bid.round, bid: buyerBid / lbTotal, counter: yourCounter / lbTotal }],
      },
    ],
  };
}

export function useNegotiationDetail(bidId: string) {
  for (const parent of MOCK) {
    const bid = parent.bids.find((b) => b.id === bidId);
    if (bid) {
      const base = buildDefaultDetail(bid, parent);
      const overrides = RICH_DETAILS[bidId] ?? {};
      return { data: { ...base, ...overrides } as NegotiationDetail, isLoading: false, error: null as null | Error };
    }
  }
  return { data: null, isLoading: false, error: null as null | Error };
}