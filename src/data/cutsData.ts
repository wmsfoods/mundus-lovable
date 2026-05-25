import { supabase } from "@/integrations/supabase/client";

export interface CutItem {
  id: string;
  displayName: string;
  image_url: string | null;
  bone_spec: string;
  unit_weight: string;
  region?: string;
  imps_number?: string;
}

/**
 * Load cuts filtered by region. When region is "us", US cuts are returned
 * together with global offals (so offals show in both lists).
 */
export async function loadCutsByRegionAndCategory(
  category: string,
  region: "global" | "us"
): Promise<CutItem[]> {
  let query = supabase
    .from("cuts")
    .select("id, name, image_url, bone_spec, unit_weight, region, imps_number")
    .eq("category", category)
    .eq("is_active", true);

  if (region === "us") {
    query = query.or(`region.eq.us,and(region.eq.global,bone_spec.eq.Offals)`);
  } else {
    query = query.eq("region", "global");
  }

  const { data } = await query.order("name");
  return (data || []).map((c: any) => ({
    id: c.id,
    displayName:
      c.imps_number && c.region === "us" ? `IMPS ${c.imps_number} — ${c.name}` : c.name,
    image_url: c.image_url,
    bone_spec: c.bone_spec,
    unit_weight: c.unit_weight,
    region: c.region,
    imps_number: c.imps_number,
  }));
}