import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MUNDUS_COMPANY_ID = "00000000-0000-beef-0000-000000000001";

export interface MundusTeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
}

function deriveInitials(name: string): string {
  const parts = (name || "").replace(/[^A-Za-z\s]/g, "").split(/\s+/).filter(Boolean);
  const ini = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
  return ini || "?";
}

let cache: MundusTeamMember[] | null = null;
let inflight: Promise<MundusTeamMember[]> | null = null;
const listeners = new Set<(t: MundusTeamMember[]) => void>();

async function fetchTeam(): Promise<MundusTeamMember[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("company_id", MUNDUS_COMPANY_ID)
      .order("name", { ascending: true });
    if (error) {
      inflight = null;
      throw error;
    }
    const team: MundusTeamMember[] = (data ?? []).map((u: any) => ({
      id: u.id,
      name: u.name ?? u.email ?? "Unknown",
      email: u.email ?? "",
      initials: deriveInitials(u.name ?? u.email ?? ""),
    }));
    cache = team;
    inflight = null;
    listeners.forEach((cb) => cb(team));
    return team;
  })();
  return inflight;
}

export function useMundusTeam() {
  const [team, setTeam] = useState<MundusTeamMember[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let mounted = true;
    const cb = (t: MundusTeamMember[]) => mounted && setTeam(t);
    listeners.add(cb);
    if (!cache) {
      fetchTeam()
        .then((t) => mounted && (setTeam(t), setLoading(false)))
        .catch(() => mounted && setLoading(false));
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
      listeners.delete(cb);
    };
  }, []);
  const ownerName = (initials: string) =>
    team.find((m) => m.initials === initials)?.name ?? initials;
  return { team, loading, ownerName };
}

export function getMundusTeamSync(): MundusTeamMember[] {
  return cache ?? [];
}

// Kick off fetch eagerly when module is imported in app code.
void fetchTeam().catch(() => {});