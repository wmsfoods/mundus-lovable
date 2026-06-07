import { formatShipmentReadyDisplay } from "@/lib/shipmentReady";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { formatOfferNumber as _fmt } from "@/lib/offerNumber";
import { countryToCode } from "@/lib/countryCodes";

void _fmt;

const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const code = (n: string | null | undefined) => countryToCode(n);

/**
 * Single-offer fetcher that returns the same SupplierOffer shape used by
 * useRealSupplierOffers — but scoped to a specific offer id (no company
 * scope filter). Admin-aware: relies on RLS to allow admins to read any
 * offer. Also returns supplier_id so the caller can branch on owner.
 */
export function useSupplierOfferById(id: string | null) {
  const [offer, setOffer] = useState<(SupplierOffer & { supplierId: string }) | null>(null);
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!id) { setLoading(false); setNotFound(true); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const { data: o, error: err } = await supabase
        .from("offers")
        .select(`
          id, offer_number, status, supplier_id, supplier_name, origin_country, origin_port, view_count,
          shipment_month, shipment_year, shipment_ready_raw, payment_terms, container_size,
          total_fcl, created_at, office_id, exw_pickup_location, observation,
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
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (cancelled) return;
      if (err) { setError(err.message); setLoading(false); return; }
      if (!o) { setNotFound(true); setLoading(false); return; }
      const items = ((o as any).items ?? []) as Array<any>;
      const incotermsList = (((o as any).incoterms ?? []) as any[]).map((i) => i.incoterm_type);
      const hasFob = incotermsList.includes("FOB");
      const dests = (((o as any).markets ?? []) as any[])
        .map((m) => m?.market?.country?.english_name).filter(Boolean)
        .map((n: string) => ({ name: n, code: code(n) }));
      const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);
      const askingPrice = items.reduce((s, it) => s + Number(it.price ?? 0) * Number(it.amount ?? 0), 0);
      const floorPrice = items.reduce((s, it) => s + Number(it.minimum_price ?? it.price ?? 0) * Number(it.amount ?? 0), 0);
      const fclCount = Number((o as any).total_fcl ?? 1) || 1;
      const firstName = items[0]?.customer_product?.name ?? null;
      const firstCategory = items[0]?.customer_product?.standard_product?.product_category?.name_en ?? "—";
      const formattedNumber = _fmt((o as any).offer_number, (o as any).created_at);
      const title = items.length === 0 ? formattedNumber : items.length === 1 ? (firstName ?? formattedNumber) : `Mixed Container — ${items.length} cuts`;
      const cutsLabel = items.map((it) => it.customer_product?.name).filter(Boolean).join(", ") || "—";
      const condition = (items[0]?.condition === "Chilled" ? "Chilled" : "Frozen") as SupplierOffer["condition"];
      const shipmentLabel = formatShipmentReadyDisplay({ raw: (o as any).shipment_ready_raw, month: (o as any).shipment_month, year: (o as any).shipment_year });
      const status: SupplierOffer["status"] =
        (o as any).status === "active" ? "active" :
        (o as any).status === "draft" ? "draft" :
        (o as any).status === "sold_out" ? "sold_out" :
        (o as any).status === "negotiating" ? "negotiating" :
        (o as any).status === "archived" ? "closed" : "inactive";
      const mapped: SupplierOffer & { supplierId: string } = {
        id: (o as any).id,
        status,
        createdAt: (o as any).created_at,
        offerNumber: (o as any).offer_number,
        category: firstCategory,
        condition,
        title,
        mixed: items.length > 1,
        cutsLabel,
        originCountry: (o as any).origin_country ?? "",
        originCountryCode: code((o as any).origin_country),
        originPort: (o as any).origin_port ?? "",
        destinations: dests,
        incoterms: incotermsList,
        shipmentLabel,
        totalKg,
        containerSize: (o as any).container_size ?? "40ft",
        fclCount,
        pricePerFclUsd: askingPrice,
        askingPrice,
        floorPrice,
        paymentTerms: (o as any).payment_terms ?? "",
        observation: (o as any).observation ?? null,
        exwPickupLocation: (o as any).exw_pickup_location ?? null,
        items: items.map((it) => ({
          name: it.customer_product?.name ?? "Item",
          marbling: "\n",
          packaging: it.packaging ?? null,
          qtyKg: Number(it.amount ?? 0),
          pricePerKgUsd: Number(it.price ?? 0),
        })),
        active: (o as any).status === "active",
        viewCount: Number((o as any).view_count ?? 0),
        proposalCount: Array.isArray((o as any).negotiations) ? (o as any).negotiations.length : 0,
        hasFob,
        supplierId: (o as any).supplier_id as string,
      };
      setOffer(mapped);
      setSupplierName(((o as any).supplier_name as string) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  return { offer, supplierName, loading, notFound, error, refresh };
}