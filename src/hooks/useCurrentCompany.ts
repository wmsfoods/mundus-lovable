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

export function useCurrentCompany(): State {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<State>({
    company: null,
    loading: true,
    error: null,
  });
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setState({ company: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("company_id, active_company_id")
        .eq("id", userId)
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

      const { data: companyRow, error: companyErr } = await supabase
        .from("companies")
        .select("id, name, is_buyer, is_supplier, country")
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
          country: (companyRow as any).country ?? null,
        },
        loading: false,
        error: null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  return state;
}