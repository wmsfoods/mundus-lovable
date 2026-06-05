import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCountriesList, type CountryRow } from "./useCountriesList";

export type PortRow = {
  id: string;
  name: string;
  code: string;
  country_id: string;
};

let portsCache: PortRow[] | null = null;
let portsInflight: Promise<PortRow[]> | null = null;

async function loadAllPorts(): Promise<PortRow[]> {
  if (portsCache) return portsCache;
  if (portsInflight) return portsInflight;
  portsInflight = (async () => {
    const { data, error } = await supabase
      .from("ports")
      .select("id, name, code, country_id")
      .eq("is_active", true)
      .order("name", { ascending: true });
    portsInflight = null;
    if (error || !data) return [];
    portsCache = data as PortRow[];
    return portsCache;
  })();
  return portsInflight;
}

/** Loads countries + all ports once; exposes lookup helpers. */
export function usePortsCatalog() {
  const { countries, loading: countriesLoading } = useCountriesList();
  const [ports, setPorts] = useState<PortRow[]>(portsCache ?? []);
  const [portsLoading, setPortsLoading] = useState(!portsCache);

  useEffect(() => {
    let cancelled = false;
    loadAllPorts().then((rows) => {
      if (cancelled) return;
      setPorts(rows);
      setPortsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const portsByCountryId = new Map<string, PortRow[]>();
  for (const p of ports) {
    const arr = portsByCountryId.get(p.country_id);
    if (arr) arr.push(p);
    else portsByCountryId.set(p.country_id, [p]);
  }

  const countriesByIso = new Map<string, CountryRow>();
  const countriesById = new Map<string, CountryRow>();
  for (const c of countries) {
    if (c.iso_code) countriesByIso.set(c.iso_code.toUpperCase(), c);
    countriesById.set(c.id, c);
  }

  return {
    countries,
    ports,
    loading: countriesLoading || portsLoading,
    getPortsByCountryId: (id: string | null | undefined) =>
      (id && portsByCountryId.get(id)) || [],
    getPortsByIso: (iso: string | null | undefined) => {
      if (!iso) return [];
      const c = countriesByIso.get(iso.toUpperCase());
      return c ? portsByCountryId.get(c.id) ?? [] : [];
    },
    getCountryByIso: (iso: string | null | undefined) =>
      iso ? countriesByIso.get(iso.toUpperCase()) ?? null : null,
    getCountryById: (id: string | null | undefined) =>
      id ? countriesById.get(id) ?? null : null,
  };
}
