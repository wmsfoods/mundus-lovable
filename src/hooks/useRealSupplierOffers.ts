import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { useActiveOffice } from "@/hooks/useActiveOffice";

const MOCK_SUPPLIER_ID = "0c543bae-647d-4f2e-980a-e35e70a94674";

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
  const { activeOfficeId, isAllOffices } = useActiveOffice();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      let query = supabase
        .from("offers")
        .select(`
          id, offer_number, status, origin_country, origin_port,
          shipment_month, shipment_year, payment_terms, container_size,
          total_fcl, created_at, office_id,
          items:offer_items ( id, amount, price, minimum_price, condition,
            customer_product:customer_products ( id, name ) ),
          markets:offer_markets ( market:markets ( country:countries ( english_name ) ) ),
          incoterms:offer_allowed_incoterms ( incoterm_type )
        `)
        .eq("supplier_id", MOCK_SUPPLIER_ID)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!isAllOffices && activeOfficeId) {
        // Include offers explicitly tied to this office OR offers with no office
        // assigned (treated as visible across the company).
        query = query.or(`office_id.eq.${activeOfficeId},office_id.is.null`);
      }
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
        const title =
          items.length === 0 ? `Offer #${o.offer_number}` :
          items.length === 1 ? (firstName ?? `Offer #${o.offer_number}`) :
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
  }, [activeOfficeId, isAllOffices]);

  return { offers, loading, error };
}