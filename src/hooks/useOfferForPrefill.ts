import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CutRow } from "@/lib/cutRowTypes";
import { emptyCutRow } from "@/lib/cutRowTypes";

/** Status values that count as an "active" negotiation (warning trigger). */
export const ACTIVE_NEGOTIATION_STATUSES = [
  "awaiting_supplier",
  "pending_buyer_review",
  "pending_confirmation",
] as const;

type PortFreightShape =
  | { mode: "same"; same: string }
  | { mode: "perPort"; perPort: Record<string, string> };

export type PrefillDestination = {
  countryId: string;
  iso: string;
  name: string;
  flag: string;
  selectedPortIds: string[];
  freight: PortFreightShape;
  insurance: PortFreightShape;
};

export type OfferPrefill = {
  // Bookkeeping
  offerNumber: number;
  status: string;
  // Logistics
  originCountryId: string | null;
  originPortIds: string[];
  destinations: PrefillDestination[];
  containerSize: "20ft" | "40ft";
  fclCount: number;
  temperature: "Frozen" | "Chilled";
  incoterms: string[];
  certifications: string[];
  shipmentReady: string;
  sameFreightGlobal: boolean;
  globalFreight: string;
  globalInsurance: string;
  exwPickupLocation: string;
  primaryPricingIncoterm: "CFR" | "FOB" | null;
  // Cuts
  cuts: CutRow[];
  cutRegion: "global" | "us";
  // Payment + distribution
  paymentTerms: string;
  distribution: {
    marketplace: boolean;
    allCustomers: boolean;
    specificCustomerIds: string[];
  };
  // Engine
  negotiationMode: "manual" | "auto";
  negotiationDial: "protect_margin" | "balanced" | "win_deal";
};

function freightShape(values: number[]): PortFreightShape {
  // If all values equal, expose as "same"; otherwise per-port.
  const allEqual = values.length > 0 && values.every((v) => v === values[0]);
  return allEqual
    ? { mode: "same", same: values[0] > 0 ? String(values[0]) : "" }
    : { mode: "perPort", perPort: {} };
}

/**
 * Reads a full offer + children and shapes it into V2 page state.
 * Used for both Edit (?id=) and Clone (?clone=) modes.
 */
export function useOfferForPrefill(
  offerId: string | null,
  mode: "edit" | "clone" | null,
) {
  return useQuery({
    queryKey: ["offerPrefillV2", offerId, mode],
    enabled: !!offerId && !!mode,
    staleTime: 30_000,
    queryFn: async (): Promise<{
      prefill: OfferPrefill;
      activeNegotiations: number;
    }> => {
      // 1. Offer + nested rows
      const { data: offer, error } = await supabase
        .from("offers")
        .select(`
          id, offer_number, status, origin_port_id, container_size, total_fcl,
          payment_terms, is_halal, is_kosher, shipment_month, shipment_year,
          exw_pickup_location, cut_region, negotiation_mode, negotiation_dial,
          all_customers, specific_buyer_company_ids,
          primary_pricing_incoterm,
          items:offer_items (
            id, amount, price, minimum_price, condition, packaging,
            plant_id, brand_id, notes, photo_url, files_urls,
            fob_ask_price, fob_floor_price,
            customer_product:customer_products (
              id, name,
              standard_product:standard_products (
                product_number,
                product_category:product_categories ( code )
              )
            )
          ),
          markets:offer_markets ( market:markets ( country_id ) ),
          incoterms:offer_allowed_incoterms ( incoterm_type ),
          freight:freight_options ( port_id, cost, insurance ),
          originPorts:offer_origin_ports ( port_id )
        `)
        .eq("id", offerId as string)
        .maybeSingle();
      if (error || !offer) throw new Error(error?.message ?? "Offer not found");

      // 2. Active negotiations count (warning trigger; not used in Clone)
      let activeNegotiations = 0;
      if (mode === "edit") {
        const { count } = await supabase
          .from("negotiations")
          .select("id", { count: "exact", head: true })
          .eq("offer_id", offerId as string)
          .in("status", ACTIVE_NEGOTIATION_STATUSES as unknown as string[]);
        activeNegotiations = count ?? 0;
      }

      // 3. Resolve ports → countries
      const freightRows = (offer.freight ?? []) as Array<{
        port_id: string;
        cost: number;
        insurance: number;
      }>;
      const originPortRows = (offer.originPorts ?? []) as Array<{ port_id: string }>;
      const originPortIds: string[] =
        originPortRows.length > 0
          ? Array.from(new Set(originPortRows.map((r) => r.port_id).filter(Boolean)))
          : offer.origin_port_id
            ? [offer.origin_port_id as string]
            : [];
      const allPortIds = Array.from(
        new Set(
          [offer.origin_port_id, ...originPortIds, ...freightRows.map((f) => f.port_id)].filter(
            (x): x is string => !!x,
          ),
        ),
      );
      const portInfo = new Map<string, { country_id: string; name: string; code: string | null }>();
      if (allPortIds.length > 0) {
        const { data: ports } = await supabase
          .from("ports")
          .select("id, country_id, name, code")
          .in("id", allPortIds);
        (ports ?? []).forEach((p) =>
          portInfo.set(p.id as string, {
            country_id: p.country_id as string,
            name: p.name as string,
            code: (p.code as string | null) ?? null,
          }),
        );
      }

      // 4. Resolve countries (origin + destinations + market countries)
      const countryIdsFromMarkets = ((offer.markets ?? []) as Array<{
        market?: { country_id?: string | null } | null;
      }>)
        .map((m) => m.market?.country_id)
        .filter((x): x is string => !!x);
      const countryIdsFromPorts = Array.from(portInfo.values()).map((p) => p.country_id);
      const allCountryIds = Array.from(
        new Set([...countryIdsFromMarkets, ...countryIdsFromPorts]),
      );
      const countryInfo = new Map<
        string,
        { iso_code: string | null; english_name: string; flag_emoji: string | null }
      >();
      if (allCountryIds.length > 0) {
        const { data: countries } = await supabase
          .from("countries")
          .select("id, iso_code, english_name, flag_emoji")
          .in("id", allCountryIds);
        (countries ?? []).forEach((c) =>
          countryInfo.set(c.id as string, {
            iso_code: (c.iso_code as string | null) ?? null,
            english_name: c.english_name as string,
            flag_emoji: (c.flag_emoji as string | null) ?? null,
          }),
        );
      }

      // 5. Build destinations: union of market countries + countries that have a freight port
      const destCountryIds = Array.from(
        new Set([...countryIdsFromMarkets, ...countryIdsFromPorts]),
      );
      const originCountryId = offer.origin_port_id
        ? portInfo.get(offer.origin_port_id as string)?.country_id ?? null
        : null;
      // Origin country shouldn't appear in destinations.
      const destinations: PrefillDestination[] = destCountryIds
        .filter((cid) => cid !== originCountryId)
        .map((cid) => {
          const c = countryInfo.get(cid);
          const portsForCountry = Array.from(portInfo.entries())
            .filter(([, p]) => p.country_id === cid)
            .map(([pid]) => pid);
          const freightForCountry = freightRows.filter((f) =>
            portsForCountry.includes(f.port_id),
          );
          const costs = freightForCountry.map((f) => Number(f.cost ?? 0));
          const insurances = freightForCountry.map((f) => Number(f.insurance ?? 0));
          const freight =
            costs.length > 0 && costs.every((v) => v === costs[0])
              ? ({ mode: "same", same: costs[0] > 0 ? String(costs[0]) : "" } as const)
              : ({
                  mode: "perPort",
                  perPort: Object.fromEntries(
                    freightForCountry.map((f) => [f.port_id, String(f.cost ?? "")]),
                  ),
                } as const);
          const insurance =
            insurances.length > 0 && insurances.every((v) => v === insurances[0])
              ? ({ mode: "same", same: insurances[0] > 0 ? String(insurances[0]) : "" } as const)
              : ({
                  mode: "perPort",
                  perPort: Object.fromEntries(
                    freightForCountry.map((f) => [f.port_id, String(f.insurance ?? "")]),
                  ),
                } as const);
          return {
            countryId: cid,
            iso: c?.iso_code ?? "",
            name: c?.english_name ?? "—",
            flag: c?.flag_emoji ?? "🏳️",
            selectedPortIds: portsForCountry,
            freight,
            insurance,
          };
        });

      // 6. Detect "same freight global": every port across every destination has the same cost.
      const allCosts = freightRows.map((f) => Number(f.cost ?? 0));
      const sameFreightGlobal =
        allCosts.length > 1 && allCosts.every((v) => v === allCosts[0]);
      const globalFreight = sameFreightGlobal && allCosts[0] > 0 ? String(allCosts[0]) : "";
      const allIns = freightRows.map((f) => Number(f.insurance ?? 0));
      const globalInsurance =
        sameFreightGlobal && allIns.every((v) => v === allIns[0]) && allIns[0] > 0
          ? String(allIns[0])
          : "";

      // 7. Resolve cuts: match customer_product → cuts (by name + category)
      const items = (offer.items ?? []) as Array<{
        id: string;
        amount: number;
        price: number;
        minimum_price: number;
        packaging: string | null;
        plant_id: string | null;
        brand_id: string | null;
        notes: string | null;
        photo_url: string | null;
        files_urls: string[] | null;
        fob_ask_price: number | null;
        fob_floor_price: number | null;
        customer_product?: {
          id?: string;
          name?: string | null;
          standard_product?: {
            product_number?: number | null;
            product_category?: { code?: string | null } | null;
          } | null;
        } | null;
      }>;

      const names = items
        .map((it) => it.customer_product?.name?.trim())
        .filter((n): n is string => !!n);
      let cutsMap = new Map<string, { id: string; category: string }>();
      if (names.length > 0) {
        const { data: cutRows } = await supabase
          .from("cuts")
          .select("id, name, category")
          .in("name", names);
        (cutRows ?? []).forEach((c) => {
          // Last-write wins for duplicates — Edit/Clone is best-effort.
          cutsMap.set((c.name as string).trim().toLowerCase(), {
            id: c.id as string,
            category: (c.category as string) ?? "Beef",
          });
        });
      }

      // brand names (best-effort: only if rows have brand_id)
      const brandIds = Array.from(new Set(items.map((it) => it.brand_id).filter((x): x is string => !!x)));
      const brandNames = new Map<string, string>();
      if (brandIds.length > 0) {
        const { data: br } = await supabase
          .from("supplier_brands")
          .select("id, name")
          .in("id", brandIds);
        (br ?? []).forEach((b) => brandNames.set(b.id as string, b.name as string));
      }

      const cuts: CutRow[] = items.map((it) => {
        const cpName = (it.customer_product?.name ?? "").trim();
        const match = cpName ? cutsMap.get(cpName.toLowerCase()) : null;
        const protein =
          it.customer_product?.standard_product?.product_category?.code ??
          match?.category ??
          null;
        const base = emptyCutRow();
        return {
          ...base,
          cutId: match?.id ?? null,
          protein: protein ?? null,
          cutName: cpName,
          brandId: it.brand_id ?? null,
          brandName: it.brand_id ? brandNames.get(it.brand_id) ?? "" : "",
          spec: "",
          packing: it.packaging ?? "",
          plantId: it.plant_id ?? null,
          plantNumber: "",
          notes: it.notes ?? "",
          qty: Number(it.amount ?? 0),
          askPrice: Number(it.price ?? 0),
          floorPrice: Number(it.minimum_price ?? it.price ?? 0),
          fobAskPrice: it.fob_ask_price != null ? Number(it.fob_ask_price) : null,
          fobFloorPrice: it.fob_floor_price != null ? Number(it.fob_floor_price) : null,
          photoFile: null,
          photoPreviewUrl: null, // signed URL will be resolved lazily by media hook
          files: [],
          existingPhotoPath: it.photo_url ?? null,
          existingFilesPaths: it.files_urls ?? [],
        };
      });

      // 8. Shipment month → "YYYY-MM"
      const shipmentReady =
        offer.shipment_year && offer.shipment_month
          ? `${offer.shipment_year}-${String(offer.shipment_month).padStart(2, "0")}`
          : "";

      // 9. Certifications from booleans
      const certifications: string[] = [];
      if (offer.is_halal) certifications.push("Halal");
      if (offer.is_kosher) certifications.push("Kosher");

      // 10. Distribution
      const specificIds = (offer.specific_buyer_company_ids ?? []) as string[];
      const distribution = {
        marketplace: !offer.all_customers && specificIds.length === 0,
        allCustomers: !!offer.all_customers,
        specificCustomerIds: specificIds,
      };

      const incoterms = ((offer.incoterms ?? []) as Array<{ incoterm_type: string }>).map(
        (i) => i.incoterm_type,
      );

      const prefill: OfferPrefill = {
        offerNumber: offer.offer_number as number,
        status: (offer.status as string) ?? "draft",
        originCountryId,
        originPortIds,
        destinations,
        containerSize: ((offer.container_size as string) === "20ft" ? "20ft" : "40ft") as
          | "20ft"
          | "40ft",
        fclCount: Math.max(1, Number(offer.total_fcl ?? 1)),
        temperature:
          ((items[0]?.customer_product as unknown) && false) || true
            ? ((items[0] as unknown as { condition?: string })?.condition === "Chilled"
                ? "Chilled"
                : "Frozen")
            : "Frozen",
        incoterms,
        certifications,
        shipmentReady,
        sameFreightGlobal,
        globalFreight,
        globalInsurance,
        exwPickupLocation: (offer.exw_pickup_location as string | null) ?? "",
        primaryPricingIncoterm:
          ((offer.primary_pricing_incoterm as string | null) === "CFR"
            ? "CFR"
            : (offer.primary_pricing_incoterm as string | null) === "FOB"
              ? "FOB"
              : null) as "CFR" | "FOB" | null,
        cuts,
        cutRegion: ((offer.cut_region as string) === "us" ? "us" : "global") as "global" | "us",
        paymentTerms: (offer.payment_terms as string | null) ?? "",
        distribution,
        negotiationMode:
          ((offer.negotiation_mode as string) === "auto" ? "auto" : "manual") as
            | "manual"
            | "auto",
        negotiationDial:
          ((offer.negotiation_dial as string) === "protect_margin"
            ? "protect_margin"
            : (offer.negotiation_dial as string) === "win_deal"
              ? "win_deal"
              : "balanced") as "protect_margin" | "balanced" | "win_deal",
      };

      return { prefill, activeNegotiations };
    },
  });
}