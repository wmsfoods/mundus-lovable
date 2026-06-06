import { formatShipmentReadyDisplay } from "@/lib/shipmentReady";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { DealDetailView } from "@/components/mundus/DealDetailView";
import { buyerOrderToDeal } from "@/lib/dealDetailAdapters";
import type { BuyerOrder } from "@/hooks/useBuyerOrders";
import { OrderNegotiationLink } from "@/components/negotiation/OrderNegotiationLink";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const SELECT = `
  id, order_number, status, fcl_count, incoterm, freight_cost, placed_at, created_at, negotiation_id,
  offer:offers (
    supplier_name, origin_country, shipment_month, shipment_year, shipment_ready_raw,
    payment_terms, container_size, total_fcl,
    items:offer_items ( amount, price, customer_product:customer_products ( name ) )
  ),
  destination_port:ports!destination_port_id ( name, country:countries ( english_name ) )
`;

type Row = {
  id: string; order_number: number | null; status: string | null;
  fcl_count: number | null; incoterm: string | null; freight_cost: number | null;
  placed_at: string | null; created_at: string | null; negotiation_id: string | null;
  offer: {
    supplier_name: string | null; origin_country: string | null;
    shipment_month: number | null; shipment_year: number | null;
    payment_terms: string | null; container_size: string | null; total_fcl: number | null;
    items: { amount: number | null; price: number | null; customer_product: { name: string | null } | null }[] | null;
  } | null;
  destination_port: { name: string | null; country: { english_name: string | null } | null } | null;
};

function mapRow(r: Row): BuyerOrder {
  const offer = r.offer;
  const items = offer?.items ?? [];
  const totalKg = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const weightedPrice = totalKg > 0
    ? items.reduce((s, i) => s + (Number(i.amount) || 0) * (Number(i.price) || 0), 0) / totalKg
    : 0;
  const productName = items[0]?.customer_product?.name ?? "—";
  const shipmentMonth = formatShipmentReadyDisplay({ raw: (offer as any)?.shipment_ready_raw, month: offer?.shipment_month, year: offer?.shipment_year }) || "—";
  const fcls = r.fcl_count ?? offer?.total_fcl ?? 0;
  const fclSize: '20ft' | '40ft' = offer?.container_size === '20ft' ? '20ft' : '40ft';
  const incoterm = (['CFR','CIF','FOB'] as const).includes((r.incoterm as never))
    ? (r.incoterm as 'CFR'|'CIF'|'FOB') : 'CFR';
  return {
    id: r.id,
    orderNumber: String(r.order_number ?? r.id.slice(0, 7)).padStart(7, '0'),
    status: r.status ?? 'pending_supplier',
    updatedAt: r.placed_at ?? r.created_at ?? undefined,
    negotiationId: r.negotiation_id ?? null,
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

export default function AdminOrderDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [loading, setLoading] = useState(true);

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
      const { data: rows } = await q.limit(1);
      if (cancelled) return;
      const list = ((rows ?? []) as unknown as Row[]).map(mapRow);
      setOrder(list[0] ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="adm-body"><div className="adm-panel" style={{ padding: 16 }}>Loading…</div></div>;
  if (!order) {
    return (
      <div className="adm-body">
        <div className="adm-panel" style={{ padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Order not found</h1>
          <Link to="/admin/deals" className="btn-tb is-primary">Back to deals</Link>
        </div>
      </div>
    );
  }

  const data = buyerOrderToDeal(order, (k, fb) => t(k, { defaultValue: fb }) as string);
  // Override for admin: editable shipment/docs + admin back link
  data.shipmentReadOnly = false;
  data.backHref = "/admin/deals";

  return (
    <div className="adm-body">
      <OrderNegotiationLink orderId={order.id} role="buyer" />
      <DealDetailView data={data} />
    </div>
  );
}