import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OriginPort = { id: string; name: string; code: string | null };

export function useOfferOriginPorts(offerId: string | undefined) {
  const [ports, setPorts] = useState<OriginPort[]>([]);
  useEffect(() => {
    if (!offerId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("offer_origin_ports")
        .select("port_id, ports(id, name, code)")
        .eq("offer_id", offerId);
      if (cancelled) return;
      const list: OriginPort[] = [];
      const seen = new Set<string>();
      (data ?? []).forEach((row: any) => {
        const p = row.ports;
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          list.push({ id: p.id, name: p.name, code: p.code });
        }
      });
      setPorts(list);
    })();
    return () => { cancelled = true; };
  }, [offerId]);
  return ports;
}