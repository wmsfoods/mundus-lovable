import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CACHE_KEY = "mundus.isAdmin";

function readCache(userId: string | undefined): boolean | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid: string; value: boolean };
    return parsed.uid === userId ? !!parsed.value : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, value: boolean) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ uid: userId, value }));
  } catch {
    /* ignore */
  }
}

export function useIsMundusAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState(() => {
    const cached = readCache(user?.id);
    return cached === null
      ? { isAdmin: false, loading: true }
      : { isAdmin: cached, loading: false };
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setState({ isAdmin: false, loading: false });
      return;
    }
    // Show cached value immediately (skip loading flash) while we revalidate.
    const cached = readCache(user.id);
    if (cached !== null) setState({ isAdmin: cached, loading: false });
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("is_mundus_admin");
        if (cancelled) return;
        const value = !error && data === true;
        writeCache(user.id, value);
        setState({ isAdmin: value, loading: false });
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
