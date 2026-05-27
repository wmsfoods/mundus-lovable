import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CountryRow = {
  id: string;
  english_name: string;
  iso_code: string;
  flag_emoji: string | null;
};

let cache: CountryRow[] | null = null;
let inflight: Promise<CountryRow[]> | null = null;

async function load(): Promise<CountryRow[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("countries")
      .select("id, english_name, iso_code, flag_emoji")
      .order("english_name", { ascending: true });
    inflight = null;
    if (error || !data) return [];
    cache = data as CountryRow[];
    return cache;
  })();
  return inflight;
}

export function useCountriesList() {
  const [countries, setCountries] = useState<CountryRow[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let cancelled = false;
    load().then((rows) => {
      if (cancelled) return;
      setCountries(rows);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  return { countries, loading };
}

export function getCachedCountries(): CountryRow[] {
  return cache ?? [];
}