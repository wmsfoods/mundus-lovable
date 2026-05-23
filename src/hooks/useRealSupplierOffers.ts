import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { formatOfferNumber } from "@/lib/offerNumber";

const COUNTRY_CODE: Record<string, string> = {
  argentina: "AR", brazil: "BR", canada: "CA", chile: "CL", china: "CN",
  egypt: "EG", "hong kong": "HK", indonesia: "ID", jordan: "JO", mexico: "MX",
  paraguay: "PY", russia: "RU", "saudi arabia": "SA", "south korea": "KR",
  taiwan: "TW", thailand: "TH", "united arab emirates": "AE", uae: "AE",
  "united states": "US", usa: "US", uruguay: "UY", vietnam: "VN",
};
const code = (n: string | null | undefined) =>
  !n ? "" : COUNTRY_CODE[n.trim().toLowerCase()] ?? n.slice(0, 2).toUpperCase();

const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function useRealSupplierOffers() {
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company, loading: companyLoading } = useCurrentCompany();
  const supplierId = company?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    if (companyLoading) {
      // Wait for the real company to resolve so we don't briefly query a
      // different (mock) supplier's offers and then replace them with an
      // empty list once the real id arrives.
      setLoading(true);
      return;
    }
    if (!supplierId) {
      setOffers([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      const query = supabase
        .from("offers")
        .select(`
          id, offer_number, status, origin_country, origin_port,
          shipment_month, shipment_year, payment_terms, container_size,
          total_fcl, created_at, office_id, exw_pickup_location,
          items:offer_items ( id, amount, price, minimum_price, condition,
            customer_product:customer_products ( id, name ) ),
          markets:offer_markets ( market:markets ( country:countries ( english_name ) ) ),
          incoterms:offer_allowed_incoterms ( incoterm_type )
        `)
        .eq("supplier_id", supplierId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      // Always return ALL offers belonging to the supplier company. The active
      // office filter is intentionally not applied here so the "My Offers"
      // listing surfaces every offer the supplier owns, including offers tied
      // to legacy/external office_ids or offers without an office assigned.
      const { data, error: err } = await query;
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setOffers([]);
        setLoading(false);
        return;
      }
      const mapped: SupplierOffer[] = (data ?? []).map((o: any) => {
        const items = (o.items ?? []) as Array<any>;
        const dests = ((o.markets ?? []) as any[])
          .map((m) => m?.market?.country?.english_name)
          .filter(Boolean)
          .map((n: string) => ({ name: n, code: code(n) }));
        const incoterms = ((o.incoterms ?? []) as any[]).map((i) => i.incoterm_type);
        const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);
        const askingPrice = items.reduce((s, it) => s + Number(it.price ?? 0) * Number(it.amount ?? 0), 0);
        const floorPrice = items.reduce((s, it) => s + Number(it.minimum_price ?? it.price ?? 0) * Number(it.amount ?? 0), 0);
        const fclCount = Number(o.total_fcl ?? 1) || 1;
        const pricePerFclUsd = fclCount > 0 ? askingPrice / fclCount : askingPrice;
        const firstName = items[0]?.customer_product?.name ?? null;
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
          o.status === "draft" ? "new" :
        o.status === "negotiating" ? "negotiating" :
          o.status === "archived" ? "closed" : "inactive";
        return {
          id: o.id,
          status,
        createdAt: o.created_at,
          offerNumber: o.offer_number,
          category: "Beef",
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
            marbling: "Not Classified",
            qtyKg: Number(it.amount ?? 0),
            pricePerKgUsd: Number(it.price ?? 0),
          })),
          active: o.status === "active",
        };
      });
      setOffers(mapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supplierId, companyLoading]);

  return { offers, loading, error };
}