import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VitrineStats = {
  tons: number;
  origins: number;
  destinations: number;
  loading: boolean;
};

export function useVitrineStats(): VitrineStats {
  const [state, setState] = useState<VitrineStats>({
    tons: 0,
    origins: 0,
    destinations: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_mundus_vitrine_stats");
      if (cancelled) return;
      if (error || !data) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      const d = data as { total_tons?: number; origins?: number; destinations?: number };
      setState({
        tons: Number(d.total_tons ?? 0),
        origins: Number(d.origins ?? 0),
        destinations: Number(d.destinations ?? 0),
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}