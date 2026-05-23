import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/components/offer/OfferImageGallery";

type ItemLike =
  | { id: string; customer_product?: { name: string | null } | null; name?: string | null }
  | { id?: string; name: string | null }
  | null
  | undefined;

/**
 * Builds a deduped gallery image list for an offer's items by matching the
 * customer product name to the global `cuts` table image_url.
 */
export function useOfferImages(items: ItemLike[] | undefined): GalleryImage[] {
  const { data: cuts } = useQuery({
    queryKey: ["cuts-images"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cuts")
        .select("name, image_url")
        .eq("is_active", true)
        .not("image_url", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!items || items.length === 0 || !cuts) return [];

  const byName = new Map<string, string>();
  for (const c of cuts) {
    if (c.name && c.image_url) byName.set(c.name.trim().toLowerCase(), c.image_url);
  }

  const seen = new Set<string>();
  const images: GalleryImage[] = [];
  for (const it of items) {
    if (!it) continue;
    const anyIt = it as { customer_product?: { name?: string | null } | null; name?: string | null; id?: string };
    const name = (anyIt.customer_product?.name ?? anyIt.name ?? "").trim();
    if (!name) continue;
    const url = byName.get(name.toLowerCase());
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push({ id: anyIt.id ?? name, src: url, label: name });
  }
  return images;
}