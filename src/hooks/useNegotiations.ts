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