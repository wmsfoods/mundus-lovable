import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BuyerOrderStatus = string;

export type BuyerOrder = {
  id: string;
  orderNumber: string;
  status: BuyerOrderStatus;
  updatedAt?: string;
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

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type OrderRow = {
  id: string;
  order_number: number | null;
  status: string | null;
  fcl_count: number | null;
  incoterm: string | null;
  freight_cost: number | null;
  placed_at: string | null;
  created_at: string | null;
  updated_at?: string | null;
  offer: {
    supplier_name: string | null;
    origin_country: string | null;
    shipment_month: number | null;
    shipment_year: number | null;
    payment_terms: string | null;
    container_size: string | null;
    total_fcl: number | null;
    items: { amount: number | null; price: number | null; customer_product: { name: string | null } | null }[] | null;
  } | null;
  destination_port: { name: string | null; country: { english_name: string | null } | null } | null;
};

function mapRow(r: OrderRow): BuyerOrder {
  const offer = r.offer;
  const items = offer?.items ?? [];
  const totalKg = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const weightedPrice = totalKg > 0
    ? items.reduce((s, i) => s + (Number(i.amount) || 0) * (Number(i.price) || 0), 0) / totalKg
    : 0;
  const productName = items[0]?.customer_product?.name ?? "—";
  const shipmentMonth = offer?.shipment_month && offer?.shipment_year
    ? `${MONTHS[(offer.shipment_month - 1) % 12]} ${offer.shipment_year}`
    : "—";
  const fcls = r.fcl_count ?? offer?.total_fcl ?? 0;
  const fclSize: '20ft' | '40ft' = offer?.container_size === '20ft' ? '20ft' : '40ft';
  const incoterm = (['CFR','CIF','FOB'] as const).includes((r.incoterm as never)) ? (r.incoterm as 'CFR'|'CIF'|'FOB') : 'CFR';
  return {
    id: r.id,
    orderNumber: String(r.order_number ?? r.id.slice(0, 7)).padStart(7, '0'),
    status: r.status ?? 'pending_supplier',
    updatedAt: r.updated_at ?? r.placed_at ?? r.created_at ?? undefined,
    supplierName: offer?.supplier_name ?? '—',
    orderDate: r.placed_at ?? r.created_at ?? new Date().toISOString(),
    origin: offer?.origin_country ?? '—',
    destination: r.destination_port?.country?.english_name ?? r.destination_port?.name ?? '—',
    product: productName,
    quantityKg: totalKg,
    pricePerKg: weightedPrice,
    fcls,
    fclSize,
    oceanFreightUsd: Number(r.freight_cost) || 0,
    shipmentMonth,
    incoterm,
    paymentTerm: offer?.payment_terms ?? '—',
  };
}

const SELECT = `
  id, order_number, status, fcl_count, incoterm, freight_cost, placed_at, created_at,
  offer:offers (
    supplier_name, origin_country, shipment_month, shipment_year,
    payment_terms, container_size, total_fcl,
    items:offer_items ( amount, price, customer_product:customer_products ( name ) )
  ),
  destination_port:ports!destination_port_id ( name, country:countries ( english_name ) )
`;

export function useBuyerOrders() {
  const [data, setData] = useState<BuyerOrder[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rows, error: qErr } = await supabase
        .from('orders')
        .select(SELECT)
        .is('deleted_at', null)
        .order('placed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (qErr) {
        setError(new Error(qErr.message));
        setData([]);
      } else {
        setData(((rows ?? []) as unknown as OrderRow[]).map(mapRow));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { data, isLoading, error };
}

export function useBuyerOrder(id: string) {
  const [data, setData] = useState<BuyerOrder | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const isNum = /^\d+$/.test(id);
      let q = supabase.from('orders').select(SELECT).is('deleted_at', null);
      if (isUuid) q = q.eq('id', id);
      else if (isNum) q = q.eq('order_number', Number(id));
      else q = q.eq('id', '00000000-0000-0000-0000-000000000000');
      const { data: rows, error: qErr } = await q.limit(1);
      if (cancelled) return;
      if (qErr) { setError(new Error(qErr.message)); setData(null); }
      else {
        const list = ((rows ?? []) as unknown as OrderRow[]).map(mapRow);
        setData(list[0] ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  return { data, isLoading, error };
}