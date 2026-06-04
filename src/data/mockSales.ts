/**
 * Mock data for Supplier Sales screens.
 * 25 sales (3 paginated pages of 10/10/5).
 * Type aligned with `orders` table schema so plug-in is trivial later.
 */

export type SaleStatus = string;

export type SaleCut = {
  name: string;
  weightKg: number;
  pricePerKgUsd: number;
};

export type ShipmentInfo = {
  shippingLine: string | null;
  vessel: string | null;
  etd: string | null;
  eta: string | null;
  booking: string | null;
  container: string | null;
};

export type Sale = {
  id: string;
  dealId: string;
  status: SaleStatus;
  buyer: string;
  buyerContact: string;
  orderDate: string;
  destination: string;
  product: string;
  supplierBrand: string;
  paymentTerms: string;
  advancePct: number;
  advanceUsd: number;
  balanceUsd: number;
  incoterm: string;
  originCountry: string;
  originPort: string;
  destinationPort: string;
  fclCount: number;
  fclSize: string;
  containerCapacityKg: number;
  totalWeightKg: number;
  oceanFreightUsd: number;
  shipment: string;
  valuePerFclUsd: number;
  totalValueUsd: number;
  cuts: SaleCut[];
  shipmentInfo: ShipmentInfo[];
  closedAtIso?: string;
  buyerUserName?: string;
};

const TBI: ShipmentInfo = {
  shippingLine: null, vessel: null, etd: null, eta: null, booking: null, container: null,
};

const PAGE_1: Sale[] = [
  { id:"s-0000045", dealId:"0000045", status:"AWAITING_SUPPLIER_ACCEPTANCE", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"05/04/2026", destination:"Argentina", product:"Beef Brisket", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:35235, balanceUsd:82215, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Buenos Aires", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:324, shipment:"FH June", valuePerFclUsd:117450, totalValueUsd:117450, cuts:[{name:"Beef Brisket", weightKg:27000, pricePerKgUsd:4.35}], shipmentInfo:[TBI] },
  { id:"s-0000044", dealId:"0000044", status:"AWAITING_PRE_PAYMENT", buyer:"WMS Foods", buyerContact:"Fernando N.", orderDate:"04/13/2026", destination:"China", product:"Beef Forequarter", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:51840, balanceUsd:120960, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Shanghai", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4500, shipment:"FH May", valuePerFclUsd:172800, totalValueUsd:172800, cuts:[{name:"Beef Forequarter", weightKg:27000, pricePerKgUsd:6.40}], shipmentInfo:[TBI] },
  { id:"s-0000043", dealId:"0000043", status:"AWAITING_PRE_PAYMENT", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"04/09/2026", destination:"China", product:"Beef Bones", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:23490, balanceUsd:54810, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Shanghai", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4500, shipment:"FH May", valuePerFclUsd:78300, totalValueUsd:78300, cuts:[{name:"Beef Bones", weightKg:27000, pricePerKgUsd:2.90}], shipmentInfo:[TBI] },
  { id:"s-0000042", dealId:"0000042", status:"AWAITING_PRE_PAYMENT", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"04/01/2026", destination:"United States", product:"Beef Sangria 90 VL", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:45360, balanceUsd:105840, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Houston", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:3800, shipment:"FH May", valuePerFclUsd:151200, totalValueUsd:151200, cuts:[{name:"Beef Sangria 90 VL", weightKg:27000, pricePerKgUsd:5.60}], shipmentInfo:[TBI] },
  { id:"s-0000041", dealId:"0000041", status:"AWAITING_SUPPLIER_ACCEPTANCE", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"04/01/2026", destination:"Viet Nam", product:"Frozen Striploin", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:74520, balanceUsd:173880, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Ho Chi Minh", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:5100, shipment:"FH June", valuePerFclUsd:248400, totalValueUsd:248400, cuts:[{name:"Frozen Striploin", weightKg:27000, pricePerKgUsd:9.20}], shipmentInfo:[TBI] },
  { id:"s-0000040", dealId:"0000040", status:"AWAITING_PRE_PAYMENT", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"03/27/2026", destination:"Hong Kong", product:"Beef Hindquarter", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:59940, balanceUsd:139860, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Hong Kong", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:3600, shipment:"FH May", valuePerFclUsd:199800, totalValueUsd:199800, cuts:[{name:"Beef Hindquarter", weightKg:27000, pricePerKgUsd:7.40}], shipmentInfo:[TBI] },
  { id:"s-0000039", dealId:"0000039", status:"AWAITING_PRE_PAYMENT", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"03/26/2026", destination:"United Arab Emirates", product:"Frozen Chicken Wings", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:18630, balanceUsd:43470, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Jebel Ali", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4200, shipment:"FH May", valuePerFclUsd:62100, totalValueUsd:62100, cuts:[{name:"Frozen Chicken Wings", weightKg:27000, pricePerKgUsd:2.30}], shipmentInfo:[TBI] },
  { id:"s-0000038", dealId:"0000038", status:"AWAITING_PRE_PAYMENT", buyer:"Gamma Buyers", buyerContact:"Greta B.", orderDate:"03/12/2026", destination:"China", product:"Beef Knuckle", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:56700, balanceUsd:132300, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Shanghai", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4500, shipment:"FH May", valuePerFclUsd:189000, totalValueUsd:189000, cuts:[{name:"Beef Knuckle", weightKg:27000, pricePerKgUsd:7.00}], shipmentInfo:[TBI] },
  { id:"s-0000037", dealId:"0000037", status:"AWAITING_SUPPLIER_ACCEPTANCE", buyer:"Gamma Buyers", buyerContact:"Greta B.", orderDate:"03/10/2026", destination:"China", product:"Beef Brisket", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:40905, balanceUsd:95445, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Tianjin", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4500, shipment:"FH April", valuePerFclUsd:136350, totalValueUsd:136350, cuts:[{name:"Beef Brisket", weightKg:27000, pricePerKgUsd:5.05}], shipmentInfo:[TBI] },
  { id:"s-0000036", dealId:"0000036", status:"AWAITING_PRE_PAYMENT", buyer:"Gamma Buyers", buyerContact:"Greta B.", orderDate:"03/10/2026", destination:"China", product:"Beef Bones", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:11115, balanceUsd:25935, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Shanghai", fclCount:1, fclSize:"20ft", containerCapacityKg:13000, totalWeightKg:13000, oceanFreightUsd:2200, shipment:"FH April", valuePerFclUsd:37050, totalValueUsd:37050, cuts:[{name:"Beef Bones", weightKg:13000, pricePerKgUsd:2.85}], shipmentInfo:[TBI] },
];

const PAGE_2_3: Sale[] = [
  { id:"s-0000035", dealId:"0000035", status:"AWAITING_PRE_PAYMENT", buyer:"WMS Foods", buyerContact:"Fernando N.", orderDate:"02/12/2026", destination:"China", product:"Pork Loin", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:30780, balanceUsd:71820, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Ningbo", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4500, shipment:"FH March", valuePerFclUsd:102600, totalValueUsd:102600, cuts:[{name:"Pork Loin", weightKg:27000, pricePerKgUsd:3.80}], shipmentInfo:[TBI] },
  { id:"s-0000034", dealId:"0000034", status:"AWAITING_SUPPLIER_ACCEPTANCE", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"02/10/2026", destination:"Egypt", product:"Beef Forequarter", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:47790, balanceUsd:111510, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Alexandria", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:3900, shipment:"FH March", valuePerFclUsd:159300, totalValueUsd:159300, cuts:[{name:"Beef Forequarter", weightKg:27000, pricePerKgUsd:5.90}], shipmentInfo:[TBI] },
  { id:"s-0000033", dealId:"0000033", status:"AWAITING_PRE_PAYMENT", buyer:"Atrides Mt", buyerContact:"Alex T.", orderDate:"02/08/2026", destination:"United Arab Emirates", product:"Frozen Whole Chicken", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:21060, balanceUsd:49140, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Jebel Ali", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4200, shipment:"FH March", valuePerFclUsd:70200, totalValueUsd:70200, cuts:[{name:"Frozen Whole Chicken", weightKg:27000, pricePerKgUsd:2.60}], shipmentInfo:[TBI] },
  { id:"s-0000032", dealId:"0000032", status:"AWAITING_PRE_PAYMENT", buyer:"Gamma Buyers", buyerContact:"Greta B.", orderDate:"02/05/2026", destination:"Hong Kong", product:"Beef Hindquarter", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:59130, balanceUsd:137970, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Hong Kong", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:3600, shipment:"FH March", valuePerFclUsd:197100, totalValueUsd:197100, cuts:[{name:"Beef Hindquarter", weightKg:27000, pricePerKgUsd:7.30}], shipmentInfo:[TBI] },
  { id:"s-0000031", dealId:"0000031", status:"AWAITING_SUPPLIER_ACCEPTANCE", buyer:"WMS Foods", buyerContact:"Fernando N.", orderDate:"02/03/2026", destination:"Saudi Arabia", product:"Lamb Carcass", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:32760, balanceUsd:76440, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Jeddah", fclCount:1, fclSize:"20ft", containerCapacityKg:13000, totalWeightKg:13000, oceanFreightUsd:3200, shipment:"FH March", valuePerFclUsd:109200, totalValueUsd:109200, cuts:[{name:"Lamb Carcass", weightKg:13000, pricePerKgUsd:8.40}], shipmentInfo:[TBI] },
  { id:"s-0000030", dealId:"0000030", status:"AWAITING_PRE_PAYMENT", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"02/01/2026", destination:"Mexico", product:"Beef Bones", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:10530, balanceUsd:24570, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Veracruz", fclCount:1, fclSize:"20ft", containerCapacityKg:13000, totalWeightKg:13000, oceanFreightUsd:2800, shipment:"FH March", valuePerFclUsd:35100, totalValueUsd:35100, cuts:[{name:"Beef Bones", weightKg:13000, pricePerKgUsd:2.70}], shipmentInfo:[TBI] },
  { id:"s-0000029", dealId:"0000029", status:"AWAITING_PRE_PAYMENT", buyer:"Atrides Mt", buyerContact:"Alex T.", orderDate:"01/28/2026", destination:"Brazil", product:"Beef Brisket", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:38880, balanceUsd:90720, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Santos", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:500, shipment:"FH February", valuePerFclUsd:129600, totalValueUsd:129600, cuts:[{name:"Beef Brisket", weightKg:27000, pricePerKgUsd:4.80}], shipmentInfo:[TBI] },
  { id:"s-0000028", dealId:"0000028", status:"AWAITING_PRE_PAYMENT", buyer:"Gamma Buyers", buyerContact:"Greta B.", orderDate:"01/25/2026", destination:"China", product:"Frozen Chicken Wings", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:18225, balanceUsd:42525, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Shanghai", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4500, shipment:"FH February", valuePerFclUsd:60750, totalValueUsd:60750, cuts:[{name:"Frozen Chicken Wings", weightKg:27000, pricePerKgUsd:2.25}], shipmentInfo:[TBI] },
  { id:"s-0000027", dealId:"0000027", status:"AWAITING_PRE_PAYMENT", buyer:"WMS Foods", buyerContact:"Fernando N.", orderDate:"01/22/2026", destination:"Hong Kong", product:"Pork Belly", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:34020, balanceUsd:79380, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Hong Kong", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:3600, shipment:"FH February", valuePerFclUsd:113400, totalValueUsd:113400, cuts:[{name:"Pork Belly", weightKg:27000, pricePerKgUsd:4.20}], shipmentInfo:[TBI] },
  { id:"s-0000026", dealId:"0000026", status:"AWAITING_SUPPLIER_ACCEPTANCE", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"01/20/2026", destination:"United Arab Emirates", product:"Beef Forequarter", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:48600, balanceUsd:113400, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Jebel Ali", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4200, shipment:"FH February", valuePerFclUsd:162000, totalValueUsd:162000, cuts:[{name:"Beef Forequarter", weightKg:27000, pricePerKgUsd:6.00}], shipmentInfo:[TBI] },
  { id:"s-0000025", dealId:"0000025", status:"AWAITING_PRE_PAYMENT", buyer:"Atrides LPX", buyerContact:"Lewis A.", orderDate:"01/18/2026", destination:"Argentina", product:"Beef Bones", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:10140, balanceUsd:23660, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Buenos Aires", fclCount:1, fclSize:"20ft", containerCapacityKg:13000, totalWeightKg:13000, oceanFreightUsd:1100, shipment:"FH February", valuePerFclUsd:33800, totalValueUsd:33800, cuts:[{name:"Beef Bones", weightKg:13000, pricePerKgUsd:2.60}], shipmentInfo:[TBI] },
  { id:"s-0000024", dealId:"0000024", status:"AWAITING_PRE_PAYMENT", buyer:"Gamma Buyers", buyerContact:"Greta B.", orderDate:"01/15/2026", destination:"China", product:"Beef Knuckle", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:55890, balanceUsd:130410, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Dalian", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:4500, shipment:"FH February", valuePerFclUsd:186300, totalValueUsd:186300, cuts:[{name:"Beef Knuckle", weightKg:27000, pricePerKgUsd:6.90}], shipmentInfo:[TBI] },
  { id:"s-0000023", dealId:"0000023", status:"AWAITING_PRE_PAYMENT", buyer:"WMS Foods", buyerContact:"Fernando N.", orderDate:"01/12/2026", destination:"Hong Kong", product:"Frozen Chicken Livers", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:16200, balanceUsd:37800, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Hong Kong", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:3600, shipment:"FH February", valuePerFclUsd:54000, totalValueUsd:54000, cuts:[{name:"Frozen Chicken Livers", weightKg:27000, pricePerKgUsd:2.00}], shipmentInfo:[TBI] },
  { id:"s-0000022", dealId:"0000022", status:"AWAITING_PRE_PAYMENT", buyer:"Delta Imports", buyerContact:"David Buyer", orderDate:"01/10/2026", destination:"Egypt", product:"Beef Brisket", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:37665, balanceUsd:87885, incoterm:"CIF", originCountry:"Brazil", originPort:"Santos", destinationPort:"Alexandria", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:3900, shipment:"FH February", valuePerFclUsd:125550, totalValueUsd:125550, cuts:[{name:"Beef Brisket", weightKg:27000, pricePerKgUsd:4.65}], shipmentInfo:[TBI] },
  { id:"s-0000021", dealId:"0000021", status:"AWAITING_SUPPLIER_ACCEPTANCE", buyer:"Atrides Mt", buyerContact:"Alex T.", orderDate:"01/08/2026", destination:"Brazil", product:"Beef Hindquarter", supplierBrand:"Alpha Foods", paymentTerms:"30% advance, 70% after shipment", advancePct:0.30, advanceUsd:58320, balanceUsd:136080, incoterm:"CFR", originCountry:"Brazil", originPort:"Santos", destinationPort:"Santos", fclCount:1, fclSize:"40ft", containerCapacityKg:27000, totalWeightKg:27000, oceanFreightUsd:500, shipment:"FH February", valuePerFclUsd:194400, totalValueUsd:194400, cuts:[{name:"Beef Hindquarter", weightKg:27000, pricePerKgUsd:7.20}], shipmentInfo:[TBI] },
];

export const MOCK_SALES: Sale[] = [...PAGE_1, ...PAGE_2_3];
