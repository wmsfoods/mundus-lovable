import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PortInfo = { id: string; name: string; code: string };

export type AdminMarketRow = {
  market_id: string;
  is_active: boolean;
  country_id: string;
  english_name: string;
  portuguese_name: string;
  spanish_name: string;
  iso_code: string | null;
  flag_emoji: string | null;
  is_origin: boolean;
  is_destination: boolean;
  port_count: number;
  shared_with_country: string | null; // english_name of the country whose ports are used
  shared_with_country_flag: string | null;
  ports: PortInfo[]; // effective ports — own, or shared source's
};

type CountryRow = {
  id: string;
  english_name: string;
  portuguese_name: string;
  spanish_name: string;
  iso_code: string | null;
  flag_emoji: string | null;
  is_origin: boolean;
  is_destination: boolean;
};

type MarketRow = { id: string; country_id: string; is_active: boolean };
type PortRow = { id: string; country_id: string; name: string; code: string };
type PortSharingRow = { country_id: string; uses_ports_from_country_id: string };

export function useAdminMarkets() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "markets"],
    queryFn: async () => {
      const [countriesRes, marketsRes, portsRes, sharingRes] = await Promise.all([
        supabase
          .from("countries")
          .select("id, english_name, portuguese_name, spanish_name, iso_code, flag_emoji, is_origin, is_destination"),
        supabase.from("markets").select("id, country_id, is_active"),
        supabase.from("ports").select("id, country_id, name, code").order("name"),
        supabase.from("port_sharing").select("country_id, uses_ports_from_country_id"),
      ]);
      if (countriesRes.error) throw countriesRes.error;
      if (marketsRes.error) throw marketsRes.error;
      if (portsRes.error) throw portsRes.error;
      if (sharingRes.error) throw sharingRes.error;

      const countries = (countriesRes.data ?? []) as CountryRow[];
      const markets = (marketsRes.data ?? []) as MarketRow[];
      const ports = (portsRes.data ?? []) as PortRow[];
      const sharing = (sharingRes.data ?? []) as PortSharingRow[];

      const portsByCountry = new Map<string, PortInfo[]>();
      for (const p of ports) {
        const arr = portsByCountry.get(p.country_id) ?? [];
        arr.push({ id: p.id, name: p.name, code: p.code });
        portsByCountry.set(p.country_id, arr);
      }
      const countryById = new Map(countries.map((c) => [c.id, c]));
      const sharingByCountry = new Map<string, CountryRow>();
      for (const s of sharing) {
        const other = countryById.get(s.uses_ports_from_country_id);
        if (other) sharingByCountry.set(s.country_id, other);
      }

      const rows: AdminMarketRow[] = markets.map((m) => {
        const c = countryById.get(m.country_id);
        const sharedCountry = sharingByCountry.get(m.country_id) ?? null;
        const ownPorts = portsByCountry.get(m.country_id) ?? [];
        const effectivePorts = sharedCountry
          ? portsByCountry.get(sharedCountry.id) ?? []
          : ownPorts;
        return {
          market_id: m.id,
          is_active: !!m.is_active,
          country_id: m.country_id,
          english_name: c?.english_name ?? "—",
          portuguese_name: c?.portuguese_name ?? c?.english_name ?? "—",
          spanish_name: c?.spanish_name ?? c?.english_name ?? "—",
          iso_code: c?.iso_code ?? null,
          flag_emoji: c?.flag_emoji ?? null,
          is_origin: !!c?.is_origin,
          is_destination: !!c?.is_destination,
          port_count: ownPorts.length,
          shared_with_country: sharedCountry?.english_name ?? null,
          shared_with_country_flag: sharedCountry?.flag_emoji ?? null,
          ports: effectivePorts,
        };
      });

      const totalPorts = ports.length;
      const originCount = countries.filter((c) => c.is_origin).length;

      return { rows, totalPorts, originCount };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ marketId, isActive }: { marketId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("markets")
        .update({ is_active: isActive })
        .eq("id", marketId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "markets"] }),
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ marketIds, isActive }: { marketIds: string[]; isActive: boolean }) => {
      if (!marketIds.length) return;
      const { error } = await supabase
        .from("markets")
        .update({ is_active: isActive })
        .in("id", marketIds);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "markets"] }),
  });

  const createMutation = useMutation({
    mutationFn: async ({ countryId, isActive }: { countryId: string; isActive: boolean }) => {
      const { error } = await supabase.from("markets").insert({ country_id: countryId, is_active: isActive });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "markets"] }),
  });

  return {
    rows: query.data?.rows ?? [],
    totalPorts: query.data?.totalPorts ?? 0,
    originCount: query.data?.originCount ?? 0,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    toggleMarketActive: (marketId: string, isActive: boolean) =>
      toggleMutation.mutateAsync({ marketId, isActive }),
    bulkToggleMarketsActive: (marketIds: string[], isActive: boolean) =>
      bulkToggleMutation.mutateAsync({ marketIds, isActive }),
    createMarket: (countryId: string, isActive = true) => createMutation.mutateAsync({ countryId, isActive }),
    isCreating: createMutation.isPending,
    isToggling: toggleMutation.isPending || bulkToggleMutation.isPending,
  };
}


export const REGION_BY_ISO: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const add = (region: string, codes: string[]) => codes.forEach((c) => (map[c] = region));
  add("americas", ["US","CA","MX","BR","AR","CL","CO","PE","EC","VE","UY","PY","PA","CR","GT","HN","SV","NI","CU","DO","HT","JM","TT","BB","GD","KN","LC","VC","DM","AG","BS","BZ","GY","SR","BM","AW","CW","SX","PR","VG"]);
  add("europe", ["GB","DE","FR","IT","ES","NL","BE","PT","SE","NO","DK","FI","IE","PL","GR","RO","BG","HR","SI","EE","LV","LT","CY","MT","IS","FO","GI","CH","UA","ME","MD","GE","RU","AT","CZ","SK","HU","RS","BA","MK","AL","BY","LU","LI","MC","SM","VA","AD"]);
  add("asia", ["CN","JP","KR","IN","ID","MY","TH","VN","PH","SG","TW","HK","MO","BD","KH","MM","PK","LK","MV","BN","TL","KP","MN","NP","BT","KZ","UZ","KG","TJ","TM","AF","LA"]);
  add("middleEast", ["AE","SA","QA","KW","OM","BH","JO","LB","IQ","IR","IL","PS","TR","SY","YE","EG"]);
  add("africa", ["ZA","NG","GH","KE","TZ","SN","CI","CM","AO","MZ","MG","MU","SC","DJ","ER","SO","SD","LY","TN","MA","DZ","GA","CG","CD","GQ","BJ","TG","LR","SL","GN","GW","CV","MR","NA","ST","KM","GM","ZM","ZW","BW","SZ","LS","MW","RW","BI","UG","ET","CF","TD","NE","ML","BF","SS"]);
  add("oceania", ["AU","NZ","FJ","PG","WS","TO","VU","KI","NR","MH","PW","TV","FM","NC","PF","AS","GU","MP","CK","NU","WF"]);
  return map;
})();

export function regionFromIso(iso: string | null | undefined): string {
  if (!iso) return "other";
  return REGION_BY_ISO[iso.toUpperCase()] ?? "other";
}