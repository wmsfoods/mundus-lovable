import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MASTER_ROLES = new Set(["master_buyer", "master_supplier", "owner"]);

/**
 * Returns whether the current authenticated user is a "master" admin
 * (master_buyer / master_supplier / owner) for the given company.
 */
export function useIsCompanyMaster(companyId: string | null | undefined): {
  isMaster: boolean;
  loading: boolean;
} {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ isMaster: false, loading: true });

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id || !companyId) {
      setState({ isMaster: false, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("company_users")
          .select("role, status")
          .eq("user_id", user.id)
          .eq("company_id", companyId)
          .eq("status", "active")
          .maybeSingle();
        if (cancelled) return;
        const ok = !error && !!data?.role && MASTER_ROLES.has(data.role);
        setState({ isMaster: ok, loading: false });
      } catch {
        if (!cancelled) setState({ isMaster: false, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, companyId, authLoading]);

  return state;
}