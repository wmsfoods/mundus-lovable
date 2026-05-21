import { useMemo } from "react";
import { useOffers, type OfferWithDetails } from "@/hooks/useOffers";
import { categoryToProtein, type ProteinKey } from "@/components/marketplace/ProteinFilter";

type ProteinNonAll = Exclude<ProteinKey, "all">;

function offerProtein(o: OfferWithDetails): ProteinNonAll | null {
  const cat = o.items?.[0]?.customer_product?.standard_product?.product_category?.name_en;
  return categoryToProtein(cat);
}

export function useMarketplaceProteins() {
  const { offers, loading } = useOffers();

  return useMemo(() => {
    const counts: Record<ProteinNonAll, number> = { beef: 0, pork: 0, poultry: 0, ovine: 0 };
    for (const o of offers) {
      const p = offerProtein(o);
      if (p) counts[p] += 1;
    }
    const available = (Object.keys(counts) as ProteinNonAll[]).filter((k) => counts[k] > 0);
    return { available, counts, loading };
  }, [offers, loading]);
}

export { offerProtein };