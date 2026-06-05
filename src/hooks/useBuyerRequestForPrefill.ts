import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CutRow } from "@/lib/cutRowTypes";
import { emptyCutRow } from "@/lib/cutRowTypes";
import type { OfferPrefill, PrefillDestination } from "@/hooks/useOfferForPrefill";

export type RequestPrefill = Partial<OfferPrefill> & {
  requestNumber?: number;
};

/**
 * Reads a buyer_request and shapes a partial V2 prefill state.
 * Only fields with a clear mapping from buyer_requests are filled in.
 */
export function useBuyerRequestForPrefill(requestId: string | null) {
  return useQuery({
    queryKey: ["buyerRequestPrefillV2", requestId],
    enabled: !!requestId,
    staleTime: 30_000,
    queryFn: async (): Promise<RequestPrefill> => {
      const { data: req, error } = await supabase
        .from("buyer_requests")
        .select(
          "id, request_number, product_name, category, specification, destination_country, destination_port, incoterm, container_size, container_count, quantity_kg, temperature, target_price_usd, shipment_date, cut_region",
        )
        .eq("id", requestId as string)
        .maybeSingle();
      if (error || !req) throw new Error(error?.message ?? "Request not found");

      // Resolve destination country / port → ids
      let destination: PrefillDestination | null = null;
      if (req.destination_country) {
        const { data: c } = await supabase
          .from("countries")
          .select("id, iso_code, english_name, flag_emoji")
          .ilike("english_name", (req.destination_country as string).trim())
          .maybeSingle();
        if (c) {
          let portIds: string[] = [];
          if (req.destination_port) {
            const { data: p } = await supabase
              .from("ports")
              .select("id")
              .eq("country_id", c.id as string)
              .ilike("name", (req.destination_port as string).trim())
              .maybeSingle();
            if (p?.id) portIds = [p.id as string];
          }
          destination = {
            countryId: c.id as string,
            iso: (c.iso_code as string | null) ?? "",
            name: c.english_name as string,
            flag: (c.flag_emoji as string | null) ?? "🏳️",
            selectedPortIds: portIds,
            freight: { mode: "same", same: "" },
            insurance: { mode: "same", same: "" },
          };
        }
      }

      // Cut prefill: best-effort match on product_name + category
      const cuts: CutRow[] = [];
      if (req.product_name) {
        const { data: cutRows } = await supabase
          .from("cuts")
          .select("id, name, category")
          .ilike("name", (req.product_name as string).trim())
          .limit(1);
        const match = (cutRows ?? [])[0];
        const row = emptyCutRow();
        cuts.push({
          ...row,
          cutId: match ? (match.id as string) : null,
          protein:
            (match?.category as string | undefined) ?? (req.category as string | null) ?? null,
          cutName: (req.product_name as string) ?? "",
          spec: (req.specification as string | null) ?? "",
          qty: Number(req.quantity_kg ?? 0),
          askPrice: req.target_price_usd ? Number(req.target_price_usd) : 0,
          floorPrice: req.target_price_usd
            ? Math.round(Number(req.target_price_usd) * 0.98 * 100) / 100
            : 0,
        });
      }

      // shipment_date in buyer_requests is text — try to parse YYYY-MM-DD or YYYY-MM
      let shipmentReady = "";
      const sd = (req.shipment_date as string | null) ?? "";
      const m = /^(\d{4})-(\d{2})/.exec(sd);
      if (m) shipmentReady = `${m[1]}-${m[2]}`;

      const incoterms: string[] = req.incoterm
        ? (req.incoterm as string)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      return {
        requestNumber: req.request_number as number,
        destinations: destination ? [destination] : [],
        containerSize: ((req.container_size as string) === "20ft" ? "20ft" : "40ft") as
          | "20ft"
          | "40ft",
        fclCount: Math.max(1, Number(req.container_count ?? 1)),
        temperature:
          (req.temperature as string) === "Chilled" ? ("Chilled" as const) : ("Frozen" as const),
        incoterms,
        shipmentReady,
        cuts,
        cutRegion: ((req.cut_region as string) === "us" ? "us" : "global") as "global" | "us",
      };
    },
  });
}