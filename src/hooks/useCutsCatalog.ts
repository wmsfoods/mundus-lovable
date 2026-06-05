import { useQuery } from "@tanstack/react-query";
import { loadCutsByRegionAndCategory, type CutItem } from "@/data/cutsData";

export type { CutItem };

/**
 * Catalog hook for the V2 Create Offer page.
 * Cached per (category, region). Reuses `loadCutsByRegionAndCategory`
 * so the source of truth is identical to the legacy wizard.
 */
export function useCutsCatalog(category: string | null, region: "global" | "us") {
  const query = useQuery({
    queryKey: ["cuts-catalog", category, region],
    queryFn: async (): Promise<CutItem[]> => {
      if (!category) return [];
      return loadCutsByRegionAndCategory(category, region);
    },
    enabled: !!category,
    staleTime: 5 * 60_000,
  });
  return {
    cuts: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}