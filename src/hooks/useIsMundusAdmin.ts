import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsMundusAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ isAdmin: false, loading: true });

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setState({ isAdmin: false, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("is_mundus_admin");
        if (cancelled) return;
        setState({ isAdmin: !error && data === true, loading: false });
      } catch {
        if (!cancelled) setState({ isAdmin: false, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return state;
}
