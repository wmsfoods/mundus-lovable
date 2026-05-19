import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CurrentCompany = {
  id: string;
  name: string;
  is_buyer: boolean;
  is_supplier: boolean;
};

type State = {
  company: CurrentCompany | null;
  loading: boolean;
  error: string | null;
};

/**
 * Returns the current user's active company along with role flags.
 *
 * Resolution: auth.users.id → public.users.id
 * Then prefers `active_company_id` (override) over `company_id` (default).
 * Joins `companies` to read `is_buyer` / `is_supplier`.
 */
export function useCurrentCompany(): State {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<State>({
    company: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ company: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      // 1) Resolve the user's company_id (prefer active_company_id when set)
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("company_id, active_company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (userErr) {
        setState({ company: null, loading: false, error: userErr.message });
        return;
      }
      if (!userRow) {
        setState({ company: null, loading: false, error: "user row not found" });
        return;
      }

      const companyId = userRow.active_company_id ?? userRow.company_id;
      if (!companyId) {
        setState({ company: null, loading: false, error: "no company linked" });
        return;
      }

      // 2) Load the company with role flags
      const { data: companyRow, error: companyErr } = await supabase
        .from("companies")
        .select("id, name, is_buyer, is_supplier")
        .eq("id", companyId)
        .maybeSingle();

      if (cancelled) return;
      if (companyErr) {
        setState({ company: null, loading: false, error: companyErr.message });
        return;
      }
      if (!companyRow) {
        setState({ company: null, loading: false, error: "company not found" });
        return;
      }

      setState({
        company: {
          id: companyRow.id,
          name: companyRow.name,
          is_buyer: Boolean(companyRow.is_buyer),
          is_supplier: Boolean(companyRow.is_supplier),
        },
        loading: false,
        error: null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return state;
}