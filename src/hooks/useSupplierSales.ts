import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import type { Sale } from "@/data/mockSales";
import { normalizeStatus } from "@/lib/orderStatus";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

export function useSupplierSales() {
  const { company, loading: companyLoading } = useCurrentCompany();
  const [data, setData] = useState<Sale[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (companyLoading) return;
    if (!company?.id) { setData([]); setLoading(false); return; }
    let cancelled = false;
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => { void load(); }, 300);
    };
    const load = async () => {
    (async () => {
      setLoading(true);
      const { data: offerRows } = await supabase
        .from("offers")
        .select("id")
        .eq("supplier_id", company.id);
      const offerIds = (offerRows ?? []).map((o: { id: string }) => o.id);
      if (offerIds.length === 0) { setData([]); setLoading(false); return; }
      const { data: rows, error: qErr } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, placed_at, incoterm, fcl_count, buyer_id,
          buyer_user:users!orders_buyer_id_fkey(name, company:companies!users_company_id_fkey(name)),
          offer:offers(supplier_id, origin_port, origin_country),
          destination_port:ports!destination_port_id(name, country:countries(english_name)),
          items:order_items(customer_product_name, settlement_amount, settlement_price)
        `)
        .in("offer_id", offerIds)
        .is("deleted_at", null)
        .order("placed_at", { ascending: false });
      if (qErr) { console.error("useSupplierSales", qErr); setData([]); setLoading(false); return; }
      if (cancelled) return;
      type Raw = {
        id: string; order_number: number; status: string | null; placed_at: string;
        incoterm: string | null; fcl_count: number | null;
        buyer_user: { name: string | null; company: { name: string | null } | { name: string | null }[] | null } | { name: string | null; company: { name: string | null } | { name: string | null }[] | null }[] | null;
        offer: { supplier_id: string; origin_port: string | null; origin_country: string | null } | null;
        destination_port: { name: string | null; country: { english_name: string | null } | null } | null;
        items: { customer_product_name: string; settlement_amount: number; settlement_price: number }[] | null;
      };
      const one = <T,>(x: T | T[] | null | undefined): T | null =>
        Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
      const list: Sale[] = ((rows ?? []) as unknown as Raw[]).map((r) => {
        const bu = one(r.buyer_user);
        const bCo = one(bu?.company ?? null);
        const items = r.items ?? [];
        const totalKg = items.reduce((s, i) => s + Number(i.settlement_amount || 0), 0);
        const totalValue = items.reduce((s, i) => s + Number(i.settlement_amount || 0) * Number(i.settlement_price || 0), 0);
        const dealId = String(r.order_number).padStart(7, "0");
        const destCountry = r.destination_port?.country?.english_name ?? r.destination_port?.name ?? "—";
        return {
          id: r.id,
          dealId,
          status: normalizeStatus(r.status),
          buyer: bCo?.name ?? bu?.name ?? "—",
          buyerContact: "—",
          orderDate: fmtDate(r.placed_at),
          destination: destCountry,
          product: items[0]?.customer_product_name ?? "—",
          supplierBrand: company.name ?? "",
          paymentTerms: "—",
          advancePct: 0.3,
          advanceUsd: totalValue * 0.3,
          balanceUsd: totalValue * 0.7,
          incoterm: r.incoterm ?? "CFR",
          originCountry: r.offer?.origin_country ?? "—",
          originPort: r.offer?.origin_port ?? "—",
          destinationPort: r.destination_port?.name ?? "—",
          fclCount: r.fcl_count ?? 1,
          fclSize: "40ft",
          containerCapacityKg: 27000,
          totalWeightKg: totalKg,
          oceanFreightUsd: 0,
          shipment: "—",
          valuePerFclUsd: totalValue,
          totalValueUsd: totalValue,
          cuts: items.map((i) => ({
            name: i.customer_product_name,
            weightKg: Number(i.settlement_amount || 0),
            pricePerKgUsd: Number(i.settlement_price || 0),
          })),
          shipmentInfo: [{ shippingLine: null, vessel: null, etd: null, eta: null, booking: null, container: null }],
        };
      });
      setData(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [company?.id, companyLoading, company?.name]);

  return { data, isLoading };
}
