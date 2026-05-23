import { useMemo } from "react";
import { useRealSupplierOffers } from "@/hooks/useRealSupplierOffers";
import { categoryToProtein, type ProteinKey } from "@/components/marketplace/ProteinFilter";

type ProteinNonAll = Exclude<ProteinKey, "all">;

/**
 * Returns the protein categories a supplier currently offers,
 * derived from their offers (real DB + mocks). Counts include all
 * offers visible in the list (matches what the page renders).
 */
export function useSupplierProteins() {
  const { offers: real } = useRealSupplierOffers();

  return useMemo(() => {
    const counts: Record<ProteinNonAll, number> = { beef: 0, pork: 0, poultry: 0, ovine: 0 };
    const all = real;
    for (const o of all) {
      const p = categoryToProtein(o.category);
      if (p) counts[p] += 1;
    }
    const available = (Object.keys(counts) as ProteinNonAll[]).filter((k) => counts[k] > 0);
    return { available, counts };
  }, [real]);
}