import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { toast } from "sonner";

export type SocialCounts = {
  likes: number;
  favorites: number;
  shares: number;
  isLiked: boolean;
  isFavorited: boolean;
};

const EMPTY: SocialCounts = {
  likes: 0,
  favorites: 0,
  shares: 0,
  isLiked: false,
  isFavorited: false,
};

/**
 * Batched fetcher — for grids with many cards.
 * Returns a map of offerId -> SocialCounts.
 */
export function useOfferSocialBatch(offerIds: string[]) {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const [data, setData] = useState<Record<string, SocialCounts>>({});
  const [loading, setLoading] = useState(false);

  const ids = offerIds.slice().sort().join(",");

  useEffect(() => {
    if (!offerIds.length) {
      setData({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data: counts } = await (supabase as any).rpc(
          "get_offer_social_counts",
          { p_offer_ids: offerIds },
        );
        const map: Record<string, SocialCounts> = {};
        (counts ?? []).forEach((r: any) => {
          map[r.offer_id] = {
            likes: Number(r.likes ?? 0),
            favorites: Number(r.favorites ?? 0),
            shares: Number(r.shares ?? 0),
            isLiked: false,
            isFavorited: false,
          };
        });
        if (company?.id && user?.id) {
          const [{ data: liked }, { data: favs }] = await Promise.all([
            (supabase as any)
              .from("offer_likes")
              .select("offer_id")
              .eq("company_id", company.id)
              .in("offer_id", offerIds),
            (supabase as any)
              .from("offer_favorites")
              .select("offer_id")
              .eq("company_id", company.id)
              .in("offer_id", offerIds),
          ]);
          (liked ?? []).forEach((r: any) => {
            if (map[r.offer_id]) map[r.offer_id].isLiked = true;
          });
          (favs ?? []).forEach((r: any) => {
            if (map[r.offer_id]) map[r.offer_id].isFavorited = true;
          });
        }
        if (!cancelled) setData(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, company?.id, user?.id]);

  const toggleLike = useCallback(
    async (offerId: string) => {
      if (!user?.id || !company?.id) {
        toast.error("Please sign in to like offers");
        return;
      }
      const cur = data[offerId] ?? EMPTY;
      const next = !cur.isLiked;
      setData((d) => ({
        ...d,
        [offerId]: {
          ...(d[offerId] ?? EMPTY),
          isLiked: next,
          likes: Math.max(0, (d[offerId]?.likes ?? 0) + (next ? 1 : -1)),
        },
      }));
      if (next) {
        const { error } = await (supabase as any)
          .from("offer_likes")
          .insert({ offer_id: offerId, company_id: company.id, user_id: user.id });
        if (error) {
          setData((d) => ({
            ...d,
            [offerId]: {
              ...(d[offerId] ?? EMPTY),
              isLiked: false,
              likes: Math.max(0, (d[offerId]?.likes ?? 1) - 1),
            },
          }));
          toast.error(error.message);
        }
      } else {
        const { error } = await (supabase as any)
          .from("offer_likes")
          .delete()
          .eq("offer_id", offerId)
          .eq("company_id", company.id);
        if (error) toast.error(error.message);
      }
    },
    [data, user?.id, company?.id],
  );

  const toggleFavorite = useCallback(
    async (offerId: string) => {
      if (!user?.id || !company?.id) {
        toast.error("Please sign in to favorite offers");
        return;
      }
      const cur = data[offerId] ?? EMPTY;
      const next = !cur.isFavorited;
      setData((d) => ({
        ...d,
        [offerId]: {
          ...(d[offerId] ?? EMPTY),
          isFavorited: next,
          favorites: Math.max(0, (d[offerId]?.favorites ?? 0) + (next ? 1 : -1)),
        },
      }));
      if (next) {
        const { error } = await (supabase as any)
          .from("offer_favorites")
          .insert({ offer_id: offerId, company_id: company.id, user_id: user.id });
        if (error) {
          setData((d) => ({
            ...d,
            [offerId]: {
              ...(d[offerId] ?? EMPTY),
              isFavorited: false,
              favorites: Math.max(0, (d[offerId]?.favorites ?? 1) - 1),
            },
          }));
          toast.error(error.message);
        }
      } else {
        const { error } = await (supabase as any)
          .from("offer_favorites")
          .delete()
          .eq("offer_id", offerId)
          .eq("company_id", company.id);
        if (error) toast.error(error.message);
      }
    },
    [data, user?.id, company?.id],
  );

  const recordShare = useCallback(
    async (offerId: string, channel = "link") => {
      setData((d) => ({
        ...d,
        [offerId]: {
          ...(d[offerId] ?? EMPTY),
          shares: (d[offerId]?.shares ?? 0) + 1,
        },
      }));
      await (supabase as any).from("offer_shares").insert({
        offer_id: offerId,
        company_id: company?.id ?? null,
        user_id: user?.id ?? null,
        channel,
      });
    },
    [user?.id, company?.id],
  );

  const get = useCallback(
    (offerId: string): SocialCounts => data[offerId] ?? EMPTY,
    [data],
  );

  return { get, loading, toggleLike, toggleFavorite, recordShare };
}