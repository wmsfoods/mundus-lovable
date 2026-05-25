import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

export type OfferPort = { id: string; n: string };
export type OfferMarket = { id: string; n: string; f: string; p: OfferPort[] };
export type OfferCut = {
  id: string;
  name: string;
  displayName: string;
  image_url: string | null;
  bone_spec: "Bone-In" | "Boneless";
};

const CATEGORIES = ["Beef", "Pork", "Poultry", "Ovine"] as const;

export function useSupplierOfferData() {
  const { i18n } = useTranslation();
  const locale = i18n.language || "en";

  const query = useQuery({
    queryKey: ["supplier", "offer-data", locale],
    queryFn: async () => {
      const [marketsRes, countriesRes, portsRes, sharingRes, cutsRes, trRes] = await Promise.all([
        supabase.from("markets").select("id, country_id, is_active").eq("is_active", true),
        supabase.from("countries").select("id, english_name, portuguese_name, spanish_name, french_name, chinese_name, flag_emoji, iso_code"),
        supabase.from("ports").select("id, name, code, country_id, is_active").eq("is_active", true).order("name"),
        supabase.from("port_sharing").select("country_id, uses_ports_from_country_id"),
        supabase.from("cuts").select("id, name, category, image_url, is_active, bone_spec").eq("is_active", true).order("name"),
        supabase.from("cut_translations").select("cut_id, locale, name"),
      ]);

      if (marketsRes.error) throw marketsRes.error;
      if (countriesRes.error) throw countriesRes.error;
      if (portsRes.error) throw portsRes.error;
      if (sharingRes.error) throw sharingRes.error;
      if (cutsRes.error) throw cutsRes.error;
      if (trRes.error) throw trRes.error;

      const countriesById = new Map<string, any>();
      for (const c of countriesRes.data ?? []) countriesById.set(c.id, c);

      const portsByCountry = new Map<string, OfferPort[]>();
      for (const p of portsRes.data ?? []) {
        const list = portsByCountry.get(p.country_id) ?? [];
        list.push({ id: p.id, n: p.code ? `${p.name} (${p.code})` : p.name });
        portsByCountry.set(p.country_id, list);
      }

      const sharingByCountry = new Map<string, string>();
      for (const s of sharingRes.data ?? []) sharingByCountry.set(s.country_id, s.uses_ports_from_country_id);

      const markets: OfferMarket[] = [];
      for (const m of marketsRes.data ?? []) {
        const country = countriesById.get(m.country_id);
        if (!country) continue;
        const sourceCountryId = sharingByCountry.get(country.id) ?? country.id;
        const ports = portsByCountry.get(sourceCountryId) ?? [];
        const lang = locale.slice(0, 2);
        let name: string = country.english_name;
        if (lang === "pt") name = country.portuguese_name || name;
        else if (lang === "es") name = country.spanish_name || name;
        else if (lang === "fr") name = country.french_name || name;
        else if (lang === "zh") name = country.chinese_name || name;
        markets.push({
          id: country.id,
          n: name,
          f: country.flag_emoji ?? "",
          p: ports,
        });
      }
      markets.sort((a, b) => a.n.localeCompare(b.n));

      // translations: pick exact locale, else any prefix match (e.g. "pt" matches "pt-BR")
      const trByCut = new Map<string, string>();
      const exact = new Map<string, string>();
      const prefix = new Map<string, string>();
      const langPrefix = locale.split("-")[0];
      for (const t of trRes.data ?? []) {
        if (t.locale === locale) exact.set(t.cut_id, t.name);
        else if (t.locale.startsWith(langPrefix + "-") || t.locale === langPrefix) {
          if (!prefix.has(t.cut_id)) prefix.set(t.cut_id, t.name);
        }
      }
      for (const c of cutsRes.data ?? []) {
        const v = exact.get(c.id) ?? prefix.get(c.id);
        if (v) trByCut.set(c.id, v);
      }

      const cutsByCategory: Record<string, OfferCut[]> = {};
      for (const cat of CATEGORIES) cutsByCategory[cat] = [];
      for (const c of cutsRes.data ?? []) {
        const arr = cutsByCategory[c.category] ?? (cutsByCategory[c.category] = []);
        arr.push({
          id: c.id,
          name: c.name,
          displayName: trByCut.get(c.id) || c.name,
          image_url: c.image_url,
          bone_spec: (c.bone_spec === "Bone-In" ? "Bone-In" : "Boneless"),
        });
      }
      for (const cat of Object.keys(cutsByCategory)) {
        cutsByCategory[cat].sort((a, b) => a.displayName.localeCompare(b.displayName));
      }

      return { markets, cutsByCategory };
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    markets: query.data?.markets ?? [],
    cutsByCategory: query.data?.cutsByCategory ?? ({} as Record<string, OfferCut[]>),
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}