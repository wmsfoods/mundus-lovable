import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useSupplierScope } from "@/hooks/useSupplierScope";
import type { Sale } from "@/data/mockSales";
import { normalizeStatus } from "@/lib/orderStatus";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

export function useSupplierSales() {
  const { company, loading: companyLoading } = useCurrentCompany();
  const { scopeIds, loading: scopeLoading } = useSupplierScope();
  const scopeKey = scopeIds.join(",");
  const [data, setData] = useState<Sale[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (companyLoading || scopeLoading) return;
    if (!company?.id) { setData([]); setLoading(false); return; }
    if (scopeIds.length === 0) { setData([]); setLoading(false); return; }
    let cancelled = false;
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      setLoading(true);
      const { data: offerRows } = await supabase
        .from("offers")
        .select("id")
        .in("supplier_id", scopeIds);
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
        buyer_id: string | null;
        buyer_user: { name: string | null; company: { name: string | null } | { name: string | null }[] | null } | { name: string | null; company: { name: string | null } | { name: string | null }[] | null }[] | null;
        offer: { supplier_id: string; origin_port: string | null; origin_country: string | null } | null;
        destination_port: { name: string | null; country: { english_name: string | null } | null } | null;
        items: { customer_product_name: string; settlement_amount: number; settlement_price: number }[] | null;
      };
      const one = <T,>(x: T | T[] | null | undefined): T | null =>
        Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
      const rawRows = ((rows ?? []) as unknown as Raw[]);
      const buyerIds = Array.from(
        new Set(rawRows.map((r) => r.buyer_id).filter((x): x is string => !!x)),
      );
      const buyerInfo = new Map<string, { name: string | null; company: string | null }>();
      if (buyerIds.length) {
        const { data: infoRows } = await (supabase as any).rpc("get_users_company_info", {
          _user_ids: buyerIds,
        });
        for (const u of (infoRows ?? []) as Array<{ user_id: string; user_name: string | null; company_name: string | null }>) {
          buyerInfo.set(u.user_id, { name: u.user_name, company: u.company_name });
        }
      }
      const list: Sale[] = rawRows.map((r) => {
        const bu = one(r.buyer_user);
        const bCo = one(bu?.company ?? null);
        const info = r.buyer_id ? buyerInfo.get(r.buyer_id) : null;
        const items = r.items ?? [];
        const totalKg = items.reduce((s, i) => s + Number(i.settlement_amount || 0), 0);
        const totalValue = items.reduce((s, i) => s + Number(i.settlement_amount || 0) * Number(i.settlement_price || 0), 0);
        const dealId = String(r.order_number).padStart(7, "0");
        const destCountry = r.destination_port?.country?.english_name ?? r.destination_port?.name ?? "—";
        return {
          id: r.id,
          dealId,
          status: normalizeStatus(r.status),
          buyer: info?.company ?? bCo?.name ?? info?.name ?? bu?.name ?? "—",
          buyerContact: info?.name ?? bu?.name ?? "—",
          buyerUserName: info?.name ?? bu?.name ?? undefined,
          orderDate: fmtDate(r.placed_at),
          closedAtIso: r.placed_at,
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
    };
    void load();
    const channel = supabase
      .channel(`supplier-sales-${company.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => { if (!cancelled) void load(); }, 400);
      })
      .subscribe();
    return () => {
      cancelled = true;
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(channel);
    };
  }, [company?.id, companyLoading, company?.name, scopeLoading, scopeKey]);

  return { data, isLoading };
}
