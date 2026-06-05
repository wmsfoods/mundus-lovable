import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CompanyPlant = {
  id: string;
  plant_number: string | null;
  name: string | null;
  city: string | null;
  country: string | null;
};

export function useCompanyPlants(companyId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["company-plants", companyId],
    queryFn: async (): Promise<CompanyPlant[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_plants")
        .select("id, plant_number, name, city, country, is_active, sort_order")
        .eq("company_id", companyId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[])
        .filter((p) => p.is_active !== false)
        .map((p) => ({
          id: p.id,
          plant_number: p.plant_number ?? null,
          name: p.name ?? null,
          city: p.city ?? null,
          country: p.country ?? null,
        }));
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
  return {
    plants: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}