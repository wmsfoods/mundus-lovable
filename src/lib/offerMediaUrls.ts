import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/components/offer/OfferImageGallery";

const BUCKET = "offer-item-media";
const EXPIRES_IN = 60 * 60; // 1h
const STALE = 50 * 60 * 1000; // 50min

/**
 * Returns a signed URL for a path inside the private `offer-item-media`
 * bucket. If the path doesn't look like a path from that bucket
 * (e.g. legacy http(s) URL), it returns the original value unchanged.
 */
function isOfferMediaPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (/^https?:\/\//i.test(path)) return false;
  // expected shape: {supplierUuid}/{offerUuid}/{cutTempId}/{filename}
  const parts = path.split("/");
  return parts.length >= 3;
}

export function useSignedOfferMediaUrl(path: string | null | undefined) {
  const enabled = isOfferMediaPath(path);
  const q = useQuery({
    queryKey: ["offerMediaSignedUrl", path],
    enabled,
    staleTime: STALE,
    gcTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path as string, EXPIRES_IN);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
  // Pass-through for legacy public URLs.
  if (!enabled) return { url: path ?? null, isLoading: false };
  return { url: q.data ?? null, isLoading: q.isLoading };
}

export function useSignedOfferMediaUrls(paths: (string | null | undefined)[]) {
  const results = useQueries({
    queries: paths.map((p) => ({
      queryKey: ["offerMediaSignedUrl", p],
      enabled: isOfferMediaPath(p),
      staleTime: STALE,
      gcTime: STALE,
      queryFn: async () => {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(p as string, EXPIRES_IN);
        if (error) throw error;
        return data?.signedUrl ?? null;
      },
    })),
  });
  return paths.map((p, i) => {
    if (!isOfferMediaPath(p)) return { url: p ?? null, isLoading: false };
    return { url: (results[i].data as string | null | undefined) ?? null, isLoading: results[i].isLoading };
  });
}

type ItemLike = {
  id?: string;
  photo_url?: string | null;
  customer_product?: { name?: string | null } | null;
  name?: string | null;
} | null | undefined;

/**
 * Builds GalleryImage[] from offer_items.photo_url, resolving signed URLs
 * for paths in the private bucket and falling back to the raw value
 * otherwise (legacy public URLs).
 */
export function useOfferItemMediaImages(items: ItemLike[] | undefined): GalleryImage[] {
  const paths = (items ?? []).map((it) => it?.photo_url ?? null);
  const signed = useSignedOfferMediaUrls(paths);
  const out: GalleryImage[] = [];
  const seen = new Set<string>();
  (items ?? []).forEach((it, i) => {
    const url = signed[i]?.url;
    if (!url || seen.has(url)) return;
    seen.add(url);
    const label = (it?.customer_product?.name ?? it?.name ?? "Photo") as string;
    out.push({ id: it?.id ?? `media-${i}`, src: url, label });
  });
  return out;
}