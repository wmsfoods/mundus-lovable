export type BuyerOrderStatus =
  | 'awaiting_supplier_acceptance'
  | 'awaiting_pre_payment'
  | 'pre_payment_confirmed'
  | 'in_production'
  | 'awaiting_balance_payment'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'rejected';

export type BuyerOrder = {
  id: string;
  orderNumber: string;
  status: BuyerOrderStatus;
  supplierName: string;
  orderDate: string;
  origin: string;
  destination: string;
  product: string;
  quantityKg: number;
  pricePerKg: number;
  fcls: number;
  fclSize: '20ft' | '40ft';
  oceanFreightUsd: number;
  shipmentMonth: string;
  incoterm: 'CFR' | 'CIF' | 'FOB';
  paymentTerm: string;
};

const MOCK_ORDERS: BuyerOrder[] = [
  { id:'ord-0050', orderNumber:'0000050', status:'awaiting_supplier_acceptance', supplierName:'Alpha Foods', orderDate:'2026-05-19', origin:'Brazil', destination:'Argentina', product:'Beef Brisket', quantityKg:27000, pricePerKg:4.35, fcls:1, fclSize:'40ft', oceanFreightUsd:324, shipmentMonth:'June 2026', incoterm:'CFR', paymentTerm:'30% advance, 70% after shipment' },
  { id:'ord-0049', orderNumber:'0000049', status:'awaiting_pre_payment', supplierName:'Beta Meats', orderDate:'2026-05-12', origin:'Brazil', destination:'China', product:'Beef Forequarter', quantityKg:27000, pricePerKg:6.20, fcls:1, fclSize:'40ft', oceanFreightUsd:4500, shipmentMonth:'July 2026', incoterm:'CIF', paymentTerm:'50% advance, balance TT' },
  { id:'ord-0048', orderNumber:'0000048', status:'in_production', supplierName:'Gamma Suppliers', orderDate:'2026-04-28', origin:'Brazil', destination:'Vietnam', product:'Chicken Wings', quantityKg:27000, pricePerKg:1.85, fcls:1, fclSize:'40ft', oceanFreightUsd:3800, shipmentMonth:'June 2026', incoterm:'CFR', paymentTerm:'30% advance, balance TT' },
  { id:'ord-0047', orderNumber:'0000047', status:'awaiting_balance_payment', supplierName:'Alpha Foods', orderDate:'2026-04-15', origin:'Brazil', destination:'United States', product:'Beef Sangria 90VL', quantityKg:54000, pricePerKg:5.80, fcls:2, fclSize:'40ft', oceanFreightUsd:9000, shipmentMonth:'May 2026', incoterm:'CIF', paymentTerm:'30% advance, 70% after shipment' },
  { id:'ord-0046', orderNumber:'0000046', status:'shipped', supplierName:'Delta Trading', orderDate:'2026-04-02', origin:'Brazil', destination:'Saudi Arabia', product:'Boneless Beef 90VL', quantityKg:27000, pricePerKg:6.10, fcls:1, fclSize:'40ft', oceanFreightUsd:4200, shipmentMonth:'May 2026', incoterm:'CFR', paymentTerm:'10% advance, balance TT' },
  { id:'ord-0045', orderNumber:'0000045', status:'delivered', supplierName:'Echo Foods', orderDate:'2026-03-18', origin:'Brazil', destination:'Argentina', product:'Beef Bones', quantityKg:13000, pricePerKg:2.65, fcls:1, fclSize:'20ft', oceanFreightUsd:2100, shipmentMonth:'April 2026', incoterm:'CFR', paymentTerm:'100% advance' },
  { id:'ord-0044', orderNumber:'0000044', status:'completed', supplierName:'Foxtrot Foods', orderDate:'2026-03-05', origin:'Brazil', destination:'Hong Kong', product:'Pork Belly', quantityKg:27000, pricePerKg:4.90, fcls:1, fclSize:'40ft', oceanFreightUsd:4100, shipmentMonth:'April 2026', incoterm:'CIF', paymentTerm:'30% advance, balance TT' },
  { id:'ord-0043', orderNumber:'0000043', status:'rejected', supplierName:'Alpha Foods', orderDate:'2026-02-22', origin:'Brazil', destination:'United Arab Emirates', product:'Beef Striploin', quantityKg:13000, pricePerKg:8.20, fcls:1, fclSize:'20ft', oceanFreightUsd:3400, shipmentMonth:'March 2026', incoterm:'CIF', paymentTerm:'50% advance, balance TT' },
  { id:'ord-0042', orderNumber:'0000042', status:'awaiting_supplier_acceptance', supplierName:'Gamma Suppliers', orderDate:'2026-02-14', origin:'Brazil', destination:'Singapore', product:'Chicken Leg Quarters', quantityKg:54000, pricePerKg:1.45, fcls:2, fclSize:'40ft', oceanFreightUsd:7600, shipmentMonth:'March 2026', incoterm:'CFR', paymentTerm:'30% advance, balance TT' },
  { id:'ord-0041', orderNumber:'0000041', status:'pre_payment_confirmed', supplierName:'Hotel Imports', orderDate:'2026-02-01', origin:'Brazil', destination:'Philippines', product:'Boneless Beef 90VL', quantityKg:27000, pricePerKg:6.05, fcls:1, fclSize:'40ft', oceanFreightUsd:4800, shipmentMonth:'March 2026', incoterm:'CIF', paymentTerm:'50% advance, balance TT' },
];

export function useBuyerOrders() {
  return { data: MOCK_ORDERS, isLoading: false, error: null as null | Error };
}

export function useBuyerOrder(id: string) {
  const order = MOCK_ORDERS.find(o => o.id === id || o.orderNumber === id) ?? null;
  return { data: order, isLoading: false, error: null as null | Error };
}