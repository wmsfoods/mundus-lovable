/**
 * Mock data for Supplier My Offers (list + detail).
 * Shape simplified vs OfferWithDetails (which is buyer-side, joins-heavy).
 * Will be replaced by a real Supabase hook later.
 */

export type SupplierOfferStatus = "active" | "new" | "negotiating" | "closed" | "inactive" | "sold_out";

export type SupplierOfferItem = {
  name: string;
  marbling: string;
  qtyKg: number;
  pricePerKgUsd: number;
};

export type SupplierOffer = {
  id: string;
  status: SupplierOfferStatus;
  createdAt?: string;
  offerNumber?: number | null;
  category: "Beef" | "Pork" | "Poultry" | "Lamb";
  condition: "Frozen" | "Chilled";
  title: string;
  mixed: boolean;
  cutsLabel: string;
  originCountry: string;
  originCountryCode: string;
  originPort: string;
  destinations: { name: string; code: string }[];
  incoterms: string[];
  shipmentLabel: string;
  totalKg: number;
  containerSize: string;
  fclCount: number;
  pricePerFclUsd: number;
  askingPrice: number;
  floorPrice: number;
  paymentTerms: string;
  observation: string | null;
  items: SupplierOfferItem[];
  active: boolean;
  exwPickupLocation?: string | null;
};

export const MOCK_SUPPLIER_OFFERS: SupplierOffer[] = [
  { id:"so-0001", status:"new", category:"Beef", condition:"Frozen", title:"Beef Forequarter", mixed:false, cutsLabel:"Beef Forequarter", originCountry:"Brazil", originCountryCode:"BR", originPort:"Santos", destinations:[{name:"Hong Kong", code:"HK"}], incoterms:["CFR"], shipmentLabel:"june 2026", totalKg:27000, containerSize:"40ft", fclCount:1, pricePerFclUsd:175500, askingPrice:184275, floorPrice:157950, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Beef Forequarter", marbling:"High", qtyKg:27000, pricePerKgUsd:6.50}], active:true },
  { id:"so-0002", status:"active", category:"Beef", condition:"Frozen", title:"Mix FCL", mixed:true, cutsLabel:"Beef Bones, Beef Brisket", originCountry:"Brazil", originCountryCode:"BR", originPort:"Itajai", destinations:[{name:"Afghanistan", code:"AF"}], incoterms:["CFR"], shipmentLabel:"abril", totalKg:13000, containerSize:"20ft", fclCount:1, pricePerFclUsd:37000, askingPrice:38850, floorPrice:33300, paymentTerms:"10% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Beef Bones", marbling:"High", qtyKg:11000, pricePerKgUsd:3.00},{name:"Beef Brisket", marbling:"High", qtyKg:2000, pricePerKgUsd:2.00}], active:true },
  { id:"so-0003", status:"active", category:"Beef", condition:"Frozen", title:"Mix FCL", mixed:true, cutsLabel:"Beef Bones, Beef Brisket", originCountry:"Brazil", originCountryCode:"BR", originPort:"Santos", destinations:[{name:"Argentina", code:"AR"}], incoterms:["CIF"], shipmentLabel:"June 2025", totalKg:27000, containerSize:"40ft", fclCount:1, pricePerFclUsd:95200, askingPrice:99960, floorPrice:85680, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Beef Bones", marbling:"Medium", qtyKg:14000, pricePerKgUsd:3.20},{name:"Beef Brisket", marbling:"Medium", qtyKg:13000, pricePerKgUsd:3.85}], active:true },
  { id:"so-0004", status:"active", category:"Beef", condition:"Frozen", title:"Mix FCL", mixed:true, cutsLabel:"Beef Bones, Beef Brisket", originCountry:"Brazil", originCountryCode:"BR", originPort:"Santos", destinations:[{name:"Argentina", code:"AR"}], incoterms:["CIF"], shipmentLabel:"June 2025", totalKg:27000, containerSize:"40ft", fclCount:1, pricePerFclUsd:95200, askingPrice:99960, floorPrice:85680, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Beef Bones", marbling:"Medium", qtyKg:14000, pricePerKgUsd:3.20},{name:"Beef Brisket", marbling:"Medium", qtyKg:13000, pricePerKgUsd:3.85}], active:true },
  { id:"so-0005", status:"active", category:"Beef", condition:"Frozen", title:"Beef Bones", mixed:false, cutsLabel:"Beef Bones", originCountry:"Brazil", originCountryCode:"BR", originPort:"Santos", destinations:[{name:"Brazil", code:"BR"}], incoterms:["CFR"], shipmentLabel:"first week of June", totalKg:13000, containerSize:"20ft", fclCount:1, pricePerFclUsd:52000, askingPrice:54600, floorPrice:46800, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Beef Bones", marbling:"Not Classified", qtyKg:13000, pricePerKgUsd:4.00}], active:true },
  { id:"so-0006", status:"active", category:"Beef", condition:"Frozen", title:"Beef Loin, Strip Loin", mixed:true, cutsLabel:"Beef Loin, Strip Loin", originCountry:"Brazil", originCountryCode:"BR", originPort:"Santos", destinations:[{name:"China", code:"CN"}], incoterms:["FOB","CFR"], shipmentLabel:"Shipment Ma...", totalKg:27000, containerSize:"40ft", fclCount:1, pricePerFclUsd:229500, askingPrice:240975, floorPrice:206550, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Beef Loin", marbling:"High", qtyKg:13000, pricePerKgUsd:8.50},{name:"Strip Loin", marbling:"High", qtyKg:14000, pricePerKgUsd:8.50}], active:true },
  { id:"so-0007", status:"active", category:"Beef", condition:"Frozen", title:"Mix FCL", mixed:true, cutsLabel:"Beef Bones, Beef Braising Steak, Swiss", originCountry:"Brazil", originCountryCode:"BR", originPort:"Santos", destinations:[{name:"Argentina", code:"AR"},{name:"Uruguay", code:"UY"}], incoterms:["CIF"], shipmentLabel:"June 2025", totalKg:27000, containerSize:"40ft", fclCount:1, pricePerFclUsd:95200, askingPrice:99960, floorPrice:85680, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Beef Bones", marbling:"Medium", qtyKg:9000, pricePerKgUsd:3.20},{name:"Beef Braising Steak", marbling:"Medium", qtyKg:9000, pricePerKgUsd:3.85},{name:"Swiss", marbling:"Medium", qtyKg:9000, pricePerKgUsd:3.50}], active:true },
  { id:"so-0008", status:"active", category:"Beef", condition:"Frozen", title:"Mix FCL", mixed:true, cutsLabel:"Beef Brisket, Beef Bones", originCountry:"Brazil", originCountryCode:"BR", originPort:"Santos", destinations:[{name:"Argentina", code:"AR"},{name:"Paraguay", code:"PY"},{name:"Chile", code:"CL"}], incoterms:["CIF"], shipmentLabel:"June 2025", totalKg:27000, containerSize:"40ft", fclCount:1, pricePerFclUsd:95200, askingPrice:99960, floorPrice:85680, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Beef Brisket", marbling:"Medium", qtyKg:14000, pricePerKgUsd:3.85},{name:"Beef Bones", marbling:"Medium", qtyKg:13000, pricePerKgUsd:3.20}], active:true },
  { id:"so-0009", status:"active", category:"Beef", condition:"Frozen", title:"Beef Brisket", mixed:false, cutsLabel:"Beef Brisket", originCountry:"Brazil", originCountryCode:"BR", originPort:"Santos", destinations:[{name:"Argentina", code:"AR"}], incoterms:["CFR"], shipmentLabel:"July", totalKg:27000, containerSize:"40ft", fclCount:1, pricePerFclUsd:43200, askingPrice:45360, floorPrice:38880, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Beef Brisket", marbling:"Medium", qtyKg:27000, pricePerKgUsd:1.60}], active:true },
  { id:"so-0010", status:"closed", category:"Pork", condition:"Frozen", title:"Pork Loin", mixed:false, cutsLabel:"Pork Loin", originCountry:"Brazil", originCountryCode:"BR", originPort:"Itajai", destinations:[{name:"China", code:"CN"}], incoterms:["CIF"], shipmentLabel:"March 2026", totalKg:27000, containerSize:"40ft", fclCount:1, pricePerFclUsd:102600, askingPrice:107730, floorPrice:92340, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Pork Loin", marbling:"Not Classified", qtyKg:27000, pricePerKgUsd:3.80}], active:false },
  { id:"so-0011", status:"negotiating", category:"Poultry", condition:"Frozen", title:"Chicken Breast Skinless", mixed:false, cutsLabel:"Chicken Breast Skinless", originCountry:"Brazil", originCountryCode:"BR", originPort:"Itajai", destinations:[{name:"Ghana", code:"GH"}], incoterms:["CFR"], shipmentLabel:"May 2026", totalKg:27000, containerSize:"40ft", fclCount:1, pricePerFclUsd:62100, askingPrice:65205, floorPrice:55890, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Chicken Breast Skinless", marbling:"Not Classified", qtyKg:27000, pricePerKgUsd:2.30}], active:true },
  { id:"so-0012", status:"active", category:"Lamb", condition:"Chilled", title:"Lamb Carcass", mixed:false, cutsLabel:"Lamb Carcass", originCountry:"Brazil", originCountryCode:"BR", originPort:"Santos", destinations:[{name:"Saudi Arabia", code:"SA"}], incoterms:["CIF"], shipmentLabel:"April 2026", totalKg:13000, containerSize:"20ft", fclCount:1, pricePerFclUsd:109200, askingPrice:114660, floorPrice:98280, paymentTerms:"30% Advance, Balance TT - Against finalized doc copies", observation:null, items:[{name:"Lamb Carcass", marbling:"Not Classified", qtyKg:13000, pricePerKgUsd:8.40}], active:true },
];

export const PAGE_SIZE = 9;