import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AllowedPlant = {
  id: string;
  plant_number: string | null;
  name: string;
  country: string | null;
  country_code: string | null;
  origin_port_id: string | null;
};

/**
 * Phase 3 — Office-scoped access helpers.
 *
 * `useOfficeAllowedPlants(officeId)` returns the plants this office may
 * offer. If `office_plants` has no rows configured for the office, falls
 * back to ALL plants in the supplier family (HQ + child offices) so the
 * wizard isn't blocked before admins configure grants.
 */
export function useOfficeAllowedPlants(officeId: string | null | undefined) {
  const [plants, setPlants] = useState<AllowedPlant[]>([]);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!officeId) {
      setPlants([]);
      setFallback(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Resolve family root (HQ) for this office
        const { data: self } = await (supabase as any)
          .from("companies")
          .select("id, parent_company_id")
          .eq("id", officeId)
          .maybeSingle();
        const rootId = (self?.parent_company_id as string | null) ?? officeId;

        // 1) Try office-scoped plants
        const { data: granted } = await (supabase as any)
          .from("office_plants")
          .select("plant_id")
          .eq("office_id", officeId);
        const grantedIds = ((granted as any[]) || []).map((r) => r.plant_id as string);

        let plantRows: any[] = [];
        if (grantedIds.length > 0) {
          const { data } = await (supabase as any)
            .from("company_plants")
            .select("id, plant_number, name, country, country_code, origin_port_id")
            .in("id", grantedIds)
            .eq("is_active", true);
          plantRows = (data as any[]) || [];
          if (!cancelled) setFallback(false);
        } else {
          // 2) Fallback: every plant in the family
          const { data: family } = await (supabase as any)
            .from("companies")
            .select("id")
            .or(`id.eq.${rootId},parent_company_id.eq.${rootId}`);
          const famIds = ((family as any[]) || []).map((c) => c.id as string);
          if (famIds.length > 0) {
            const { data } = await (supabase as any)
              .from("company_plants")
              .select("id, plant_number, name, country, country_code, origin_port_id")
              .in("company_id", famIds)
              .eq("is_active", true);
            plantRows = (data as any[]) || [];
          }
          if (!cancelled) setFallback(true);
        }

        if (!cancelled) {
          plantRows.sort((a, b) =>
            String(a.plant_number || "").localeCompare(String(b.plant_number || "")),
          );
          setPlants(plantRows as AllowedPlant[]);
        }
      } catch {
        if (!cancelled) {
          setPlants([]);
          setFallback(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [officeId]);

  return { plants, fallback, loading };
}

/**
 * `useOfficeAllowedMarkets(officeId)` returns the set of country_ids this
 * office may sell to. `null` means unrestricted (no `office_markets`
 * configured — fallback / pre-Phase-3 behavior).
 */
export function useOfficeAllowedMarkets(officeId: string | null | undefined) {
  const [allowedCountryIds, setAllowedCountryIds] = useState<Set<string> | null>(null);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!officeId) {
      setAllowedCountryIds(null);
      setFallback(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: granted } = await (supabase as any)
          .from("office_markets")
          .select("market_id")
          .eq("office_id", officeId);
        const marketIds = ((granted as any[]) || []).map((r) => r.market_id as string);
        if (marketIds.length === 0) {
          if (!cancelled) {
            setAllowedCountryIds(null);
            setFallback(true);
          }
          return;
        }
        const { data: mk } = await (supabase as any)
          .from("markets")
          .select("country_id")
          .in("id", marketIds);
        if (!cancelled) {
          setAllowedCountryIds(
            new Set(((mk as any[]) || []).map((r) => r.country_id as string)),
          );
          setFallback(false);
        }
      } catch {
        if (!cancelled) {
          setAllowedCountryIds(null);
          setFallback(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [officeId]);

  return { allowedCountryIds, fallback, loading };
}