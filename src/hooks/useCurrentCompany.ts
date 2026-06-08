import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CurrentCompany = {
  id: string;
  name: string;
  is_buyer: boolean;
  is_supplier: boolean;
  country: string | null;
};

type State = {
  company: CurrentCompany | null;
  loading: boolean;
  error: string | null;
};

let cachedUserId: string | null = null;
let cachedState: State | null = null;

export function useCurrentCompany(): State {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<State>(() => {
    if (cachedState && cachedUserId === userId) return cachedState;
    return { company: null, loading: true, error: null };
  });

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      const next = { company: null, loading: false, error: null };
      cachedUserId = null;
      cachedState = next;
      setState(next);
      return;
    }

    let cancelled = false;
    const hasCached = cachedState && cachedUserId === userId && !cachedState.loading;
    if (hasCached) setState(cachedState);
    else setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      let companyId: string | null = null;
      let usersRowHadCompany = false;

      // Strategy 1: users table
      const { data: userRow } = await supabase
        .from("users")
        .select("company_id, active_company_id")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (userRow) {
        const preferredCompanyId = userRow.active_company_id ?? userRow.company_id ?? null;
        usersRowHadCompany = Boolean(userRow.company_id);
        if (preferredCompanyId) {
          const { data: activeMembership } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", userId)
            .eq("company_id", preferredCompanyId)
            .eq("status", "active")
            .maybeSingle();
          if (cancelled) return;
          if (activeMembership?.company_id) companyId = activeMembership.company_id;
        }
      }

      // Strategy 2: company_users fallback
      if (!companyId) {
        const { data: cuRow } = await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (cuRow?.company_id) companyId = cuRow.company_id;
      }

      if (!companyId) {
        const next = { company: null, loading: false, error: "no_company_linked" };
        cachedUserId = userId;
        cachedState = next;
        setState(next);
        return;
      }

      const { data: companyRow, error: companyErr } = await supabase
        .from("companies")
        .select("id, name, is_buyer, is_supplier, country")
        .eq("id", companyId)
        .maybeSingle();

      if (cancelled) return;
      if (companyErr) {
        const next = { company: null, loading: false, error: companyErr.message };
        cachedUserId = userId;
        cachedState = next;
        setState(next);
        return;
      }
      if (!companyRow) {
        const next = { company: null, loading: false, error: "company_not_found" };
        cachedUserId = userId;
        cachedState = next;
        setState(next);
        return;
      }

      // Backfill users.company_id silently if missing
      if (!usersRowHadCompany) {
        supabase
          .from("users")
          .upsert({ id: userId, company_id: companyId } as any, { onConflict: "id" })
          .then(() => {});
      }

      const next = {
        company: {
          id: companyRow.id,
          name: companyRow.name,
          is_buyer: Boolean(companyRow.is_buyer),
          is_supplier: Boolean(companyRow.is_supplier),
          country: (companyRow as any).country ?? null,
        },
        loading: false,
        error: null,
      };
      cachedUserId = userId;
      cachedState = next;
      setState(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  return state;
}