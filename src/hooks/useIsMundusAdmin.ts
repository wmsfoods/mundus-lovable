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
      const { data, error } = await supabase
        .from("company_users")
        .select("id, roles!inner(name)")
        .eq("user_id", user.id)
        .eq("roles.name", "mundus_admin")
        .limit(1);
      if (cancelled) return;
      setState({ isAdmin: !error && !!data && data.length > 0, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return state;
}
