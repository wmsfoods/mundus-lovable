import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

type Port = { id: string; name: string; code: string };

export function useOfferDestinationPorts(offerId: string | undefined) {
  const [ports, setPorts] = useState<Port[]>([]);
  useEffect(() => {
    if (!offerId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("freight_options")
        .select("port_id, ports(id, name, code)")
        .eq("offer_id", offerId);
      if (cancelled) return;
      const list: Port[] = [];
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

export function OfferDestinationPorts({ ports }: { ports: Port[] }) {
  if (!ports.length) return null;
  const visible = ports.slice(0, 3);
  const extra = ports.length - visible.length;
  const summary = visible.map((p) => p.name).join(", ");
  const text = extra > 0 ? `📍 ${summary} +${extra} more` : `📍 ${summary}`;
  const label = (
    <span
      style={{
        fontSize: 11,
        color: "#6B7280",
        cursor: "pointer",
        textDecoration: "underline dotted",
        textUnderlineOffset: 2,
      }}
    >
      {text}
    </span>
  );
  return (
    <div style={{ marginTop: 4 }}>
      <HoverCard openDelay={100}>
        <HoverCardTrigger asChild>
          <button type="button" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
            {label}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            All destination ports ({ports.length})
          </div>
          <ul style={{ fontSize: 12, color: "#374151", margin: 0, paddingLeft: 16 }}>
            {ports.map((p) => (
              <li key={p.id}>{p.name} ({p.code})</li>
            ))}
          </ul>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}