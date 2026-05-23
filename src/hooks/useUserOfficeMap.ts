import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserOfficeAssignment = {
  officeId: string;
  officeName: string;
  city: string;
  country: string;
  isHQ: boolean;
};

export type UserOfficeMap = Record<string, UserOfficeAssignment[]>;

/**
 * Builds a map: userId -> list of office assignments.
 * NOTE: user_offices.user_id references public.users(id). The userIds passed
 * in may come from company_users rows; users not in public.users will simply
 * have no entry in the map (callers should treat as "no assignment").
 */
export function useUserOfficeMap(userIds: string[]) {
  const [map, setMap] = useState<UserOfficeMap>({});
  const [loading, setLoading] = useState(false);
  const key = userIds.slice().sort().join(",");

  useEffect(() => {
    let cancelled = false;
    if (userIds.length === 0) {
      setMap({});
      return;
    }
    (async () => {
      setLoading(true);
      const { data: uo } = await supabase
        .from("user_offices")
        .select("user_id, company_id, role, is_primary")
        .in("user_id", userIds);
      const officeIds = Array.from(new Set((uo || []).map((r) => r.company_id)));
      const { data: offices } = officeIds.length
        ? await supabase
            .from("companies")
            .select("id, office_name, office_country, city, country, parent_company_id")
            .in("id", officeIds)
        : { data: [] as any[] };
      if (cancelled) return;
      const next: UserOfficeMap = {};
      (uo || []).forEach((m: any) => {
        const office = (offices || []).find((o: any) => o.id === m.company_id);
        if (!next[m.user_id]) next[m.user_id] = [];
        next[m.user_id].push({
          officeId: m.company_id,
          officeName: office?.parent_company_id
            ? office?.office_name || office?.office_country || "Office"
            : "HQ",
          city: office?.city || "",
          country: office?.office_country || office?.country || "",
          isHQ: !office?.parent_company_id,
        });
      });
      setMap(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { map, loading };
}