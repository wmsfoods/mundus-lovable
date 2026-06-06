import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useSupplierScope } from "@/hooks/useSupplierScope";
import { formatOfferNumber } from "@/lib/offerNumber";
import { useRealtimeRefresh } from "./useRealtimeRefresh";
import { countryToCode } from "@/lib/countryCodes";

const code = (n: string | null | undefined) => countryToCode(n);

const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function useRealSupplierOffers() {
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company, loading: companyLoading } = useCurrentCompany();
  const { scopeIds, loading: scopeLoading } = useSupplierScope();
  const scopeKey = scopeIds.join(",");
  const supplierId = company?.id ?? null;
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  const hasLoadedRef = useRef(false);
  useRealtimeRefresh({ table: "offers", onRefresh: bump, enabled: !!supplierId });
  useRealtimeRefresh({ table: "negotiations", onRefresh: bump, enabled: !!supplierId });

  useEffect(() => {
    let cancelled = false;
    if (companyLoading || scopeLoading) {
      // Wait for the real company to resolve so we don't briefly query a
      // different (mock) supplier's offers and then replace them with an
      // empty list once the real id arrives.
      if (!hasLoadedRef.current) setLoading(true);
      return;
    }
    if (!supplierId || scopeIds.length === 0) {
      setOffers([]);
      hasLoadedRef.current = true;
      setLoading(false);
      return;
    }
    (async () => {
      if (!hasLoadedRef.current) setLoading(true);
      setError(null);
      const query = supabase
        .from("offers")
        .select(`
          id, offer_number, status, origin_country, origin_port, view_count,
          shipment_month, shipment_year, payment_terms, container_size,
          total_fcl, created_at, office_id, exw_pickup_location,
          items:offer_items ( id, amount, price, minimum_price, condition, packaging, photo_url, files_urls,
            customer_product:customer_products (
              id, name,
              standard_product:standard_products (
                product_category:product_categories ( code, name_en )
              )
            ) ),
          markets:offer_markets ( market:markets ( country:countries ( english_name ) ) ),
          incoterms:offer_allowed_incoterms ( incoterm_type ),
          negotiations ( id )
        `)
        .in("supplier_id", scopeIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      // Scope by active office focus: a single office returns only that
      // office's offers; "All Offices" returns the whole family. RLS at the
      // DB layer remains the hard guarantee for cross-family isolation.
      const { data, error: err } = await query;
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setOffers([]);
        hasLoadedRef.current = true;
        setLoading(false);
        return;
      }
      const mapped: SupplierOffer[] = (data ?? []).map((o: any) => {
        const items = (o.items ?? []) as Array<any>;
        const incotermsList = ((o.incoterms ?? []) as any[]).map((i) => i.incoterm_type);
        const hasFob = incotermsList.includes("FOB");
        const dests = ((o.markets ?? []) as any[])
          .map((m) => m?.market?.country?.english_name)
          .filter(Boolean)
          .map((n: string) => ({ name: n, code: code(n) }));
        const incoterms = incotermsList;
        const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);
        const askingPrice = items.reduce((s, it) => s + Number(it.price ?? 0) * Number(it.amount ?? 0), 0);
        const floorPrice = items.reduce((s, it) => s + Number(it.minimum_price ?? it.price ?? 0) * Number(it.amount ?? 0), 0);
        const fclCount = Number(o.total_fcl ?? 1) || 1;
        // `askingPrice` is already the value of ONE container (mix qty × price).
        // total_fcl is the number of identical containers available — it must
        // NOT divide the per-FCL value.
        const pricePerFclUsd = askingPrice;
        const firstName = items[0]?.customer_product?.name ?? null;
        const firstCategory =
          items[0]?.customer_product?.standard_product?.product_category?.name_en
          ?? "—";
        const formattedNumber = formatOfferNumber(o.offer_number, o.created_at);
        const title =
          items.length === 0 ? formattedNumber :
          items.length === 1 ? (firstName ?? formattedNumber) :
          `Mixed Container — ${items.length} cuts`;
        const cutsLabel = items.map((it) => it.customer_product?.name).filter(Boolean).join(", ") || "—";
        const condition = (items[0]?.condition === "Chilled" ? "Chilled" : "Frozen") as SupplierOffer["condition"];
        const m = Math.min(12, Math.max(1, Number(o.shipment_month ?? 1)));
        const shipmentLabel = `${MONTH[m - 1]} ${o.shipment_year ?? new Date().getFullYear()}`;
        const status: SupplierOffer["status"] =
          o.status === "active" ? "active" :
          o.status === "draft" ? "draft" :
          o.status === "sold_out" ? "sold_out" :
        o.status === "negotiating" ? "negotiating" :
          o.status === "archived" ? "closed" : "inactive";
        return {
          id: o.id,
          status,
        createdAt: o.created_at,
          offerNumber: o.offer_number,
          category: firstCategory,
          condition,
          title,
          mixed: items.length > 1,
          cutsLabel,
          originCountry: o.origin_country ?? "",
          originCountryCode: code(o.origin_country),
          originPort: o.origin_port ?? "",
          destinations: dests,
          incoterms,
          shipmentLabel,
          totalKg,
          containerSize: o.container_size ?? "40ft",
          fclCount,
          pricePerFclUsd,
          askingPrice,
          floorPrice,
          paymentTerms: o.payment_terms ?? "",
          observation: null,
          exwPickupLocation: o.exw_pickup_location ?? null,
          items: items.map((it) => ({
            name: it.customer_product?.name ?? "Item",
            marbling: "\n",
            packaging: it.packaging ?? null,
            qtyKg: Number(it.amount ?? 0),
            pricePerKgUsd: Number(it.price ?? 0),
          })),
          active: o.status === "active",
          viewCount: Number(o.view_count ?? 0),
          proposalCount: Array.isArray(o.negotiations) ? o.negotiations.length : 0,
          hasFob,
        };
      });
      setOffers(mapped);
      hasLoadedRef.current = true;
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supplierId, companyLoading, scopeLoading, scopeKey, refreshKey]);

  return { offers, loading, error };
}