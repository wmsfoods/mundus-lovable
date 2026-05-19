/**
 * Mock data for Supplier Home dashboard.
 * KPIs, attention alerts, recent offers, recent sales.
 */

export type SupplierKpi = {
  key: "activeOffers" | "totalOffers" | "closedDeals" | "inNegotiation" | "avgClosing";
  value: string;
  delta: number;
  deltaUnit?: string;
  isDark?: boolean;
};

export type AttentionAlert = {
  id: string;
  tone: "warning" | "info" | "purple";
  title: string;
  subtitle: string;
  ctaKey: string;
  ctaPath: string;
};

export type SupplierOfferCard = {
  id: string;
  category: "Beef" | "Pork" | "Poultry" | "Lamb";
  condition: "Frozen" | "Chilled";
  cutCount: number;
  status: "Available" | "New";
  title: string;
  cuts: string[];
  destination: string;
  destinationFlag: string;
  incoterm: string;
  shipment: string;
  volumeMt: number;
  views: number;
  proposals: number;
  daysLeft: number;
  qtyMt: number;
};

export type SupplierSaleCard = {
  id: string;
  category: "Beef" | "Pork" | "Poultry" | "Lamb";
  condition: "Frozen" | "Chilled";
  status: "AwaitingPrePayment" | "PrePaidLoading" | "InTransit" | "BalanceDue";
  title: string;
  orderNumber: string;
  orderDate: string;
  buyer: string;
  destination: string;
  destinationFlag: string;
  incoterm: string;
  shipment: string;
  qtyKg: number;
  ctaKey: "sendInvoiceDraft" | "viewSale" | "issueBalanceInvoice";
};

export const SUPPLIER_KPIS: SupplierKpi[] = [
  { key: "activeOffers",  value: "12",  delta: 2,    deltaUnit: "vsLastWeek" },
  { key: "totalOffers",   value: "47",  delta: 5,    deltaUnit: "vsLastWeek" },
  { key: "closedDeals",   value: "28",  delta: 3,    deltaUnit: "vsLastWeek" },
  { key: "inNegotiation", value: "6",   delta: -1,   deltaUnit: "vsLastWeek" },
  { key: "avgClosing",    value: "4.2", delta: -0.6, deltaUnit: "vsLastWeek", isDark: true },
];

export const SUPPLIER_ATTENTION: AttentionAlert[] = [
  { id: "att-1", tone: "warning", title: "attention.proposalsWaiting.title", subtitle: "attention.proposalsWaiting.subtitle", ctaKey: "attention.proposalsWaiting.cta", ctaPath: "/supplier/negotiations" },
  { id: "att-2", tone: "info",    title: "attention.offerExpiring.title",   subtitle: "attention.offerExpiring.subtitle",   ctaKey: "attention.offerExpiring.cta",   ctaPath: "/supplier/offers" },
  { id: "att-3", tone: "purple",  title: "attention.salesAction.title",     subtitle: "attention.salesAction.subtitle",     ctaKey: "attention.salesAction.cta",     ctaPath: "/supplier/sales" },
];

export const SUPPLIER_RECENT_OFFERS: SupplierOfferCard[] = [
  { id:"so-1", category:"Beef", condition:"Frozen", cutCount:4, status:"Available", title:"Beef Premium Cuts — Mixed Container", cuts:["Ribeye","Striploin","Tenderloin"], destination:"Bermuda", destinationFlag:"🇧🇲", incoterm:"CFR", shipment:"End June 2026", volumeMt:25, views:184, proposals:4, daysLeft:22, qtyMt:25 },
  { id:"so-2", category:"Beef", condition:"Frozen", cutCount:9, status:"Available", title:"Beef Mixed Container — 9 cuts", cuts:["Ribeye","Striploin","Tenderloin"], destination:"Hong Kong", destinationFlag:"🇭🇰", incoterm:"CFR", shipment:"Prompt", volumeMt:53, views:161, proposals:7, daysLeft:18, qtyMt:53 },
  { id:"so-3", category:"Beef", condition:"Frozen", cutCount:1, status:"New", title:"Boneless Beef RFQ 90vl", cuts:[], destination:"Philippines", destinationFlag:"🇵🇭", incoterm:"CFR", shipment:"June 2026", volumeMt:216, views:138, proposals:2, daysLeft:11, qtyMt:216 },
  { id:"so-4", category:"Beef", condition:"Frozen", cutCount:1, status:"Available", title:"Beef Sangria 90VL", cuts:[], destination:"United States", destinationFlag:"🇺🇸", incoterm:"CIF", shipment:"July 2026", volumeMt:162, views:115, proposals:5, daysLeft:6, qtyMt:162 },
  { id:"so-5", category:"Poultry", condition:"Frozen", cutCount:1, status:"Available", title:"Chicken Breast Skinless", cuts:[], destination:"Ghana", destinationFlag:"🇬🇭", incoterm:"CFR", shipment:"May 2026", volumeMt:108, views:92, proposals:1, daysLeft:3, qtyMt:108 },
];

export const SUPPLIER_RECENT_SALES: SupplierSaleCard[] = [
  { id:"ss-1", category:"Beef", condition:"Frozen", status:"AwaitingPrePayment", title:"Boneless Beef 90VL", orderNumber:"#S-2026-014", orderDate:"May 12, 2026", buyer:"Atrides Mt", destination:"Saudi Arabia", destinationFlag:"🇸🇦", incoterm:"CFR", shipment:"End June 2026", qtyKg:27000, ctaKey:"sendInvoiceDraft" },
  { id:"ss-2", category:"Beef", condition:"Frozen", status:"PrePaidLoading", title:"Beef Mixed Container — 9 cuts", orderNumber:"#S-2026-013", orderDate:"May 8, 2026", buyer:"Hong Kong Foods Co.", destination:"Hong Kong", destinationFlag:"🇭🇰", incoterm:"CFR", shipment:"Prompt", qtyKg:53000, ctaKey:"viewSale" },
  { id:"ss-3", category:"Beef", condition:"Frozen", status:"InTransit", title:"Boneless Beef RFQ 90vl", orderNumber:"#S-2026-012", orderDate:"May 2, 2026", buyer:"Manila Trading Co.", destination:"Philippines", destinationFlag:"🇵🇭", incoterm:"CFR", shipment:"June 2026", qtyKg:216000, ctaKey:"viewSale" },
  { id:"ss-4", category:"Poultry", condition:"Frozen", status:"BalanceDue", title:"Chicken Breast Skinless", orderNumber:"#S-2026-011", orderDate:"Apr 28, 2026", buyer:"Tema Frozen Imports", destination:"Ghana", destinationFlag:"🇬🇭", incoterm:"CFR", shipment:"May 2026", qtyKg:108000, ctaKey:"issueBalanceInvoice" },
];
