import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";

export type AdminPortRow = {
  port_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  country_id: string;
  english_name: string;
  portuguese_name: string;
  spanish_name: string;
  iso_code: string | null;
  flag_emoji: string | null;
  /** Name(s) of other countries that use this port's country ports */
  shared_with_country: string | null;
};

type CountryRow = {
  id: string;
  english_name: string;
  portuguese_name: string;
  spanish_name: string;
  iso_code: string | null;
  flag_emoji: string | null;
};

type PortRow = { id: string; name: string; code: string | null; country_id: string; is_active: boolean };
type PortSharingRow = { country_id: string; uses_ports_from_country_id: string };

export type AdminCountryOption = {
  id: string;
  english_name: string;
  portuguese_name: string;
  spanish_name: string;
  iso_code: string | null;
  flag_emoji: string | null;
};

export function useAdminPorts() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "ports"],
    queryFn: async () => {
      const [portsRes, countriesRes, sharingRes] = await Promise.all([
        supabase.from("ports").select("id, name, code, country_id, is_active"),
        supabase
          .from("countries")
          .select("id, english_name, portuguese_name, spanish_name, iso_code, flag_emoji"),
        supabase.from("port_sharing").select("country_id, uses_ports_from_country_id"),
      ]);
      if (portsRes.error) throw portsRes.error;
      if (countriesRes.error) throw countriesRes.error;
      if (sharingRes.error) throw sharingRes.error;

      const ports = (portsRes.data ?? []) as PortRow[];
      const countries = (countriesRes.data ?? []) as CountryRow[];
      const sharing = (sharingRes.data ?? []) as PortSharingRow[];

      const countryById = new Map(countries.map((c) => [c.id, c]));
      // map: portsCountryId -> list of other country names that use these ports
      const usedByMap = new Map<string, string[]>();
      for (const s of sharing) {
        const consumer = countryById.get(s.country_id);
        if (!consumer) continue;
        const arr = usedByMap.get(s.uses_ports_from_country_id) ?? [];
        arr.push(consumer.english_name);
        usedByMap.set(s.uses_ports_from_country_id, arr);
      }

      const rows: AdminPortRow[] = ports.map((p) => {
        const c = countryById.get(p.country_id);
        const sharedList = usedByMap.get(p.country_id) ?? [];
        return {
          port_id: p.id,
          name: p.name,
          code: p.code,
          is_active: !!p.is_active,
          country_id: p.country_id,
          english_name: c?.english_name ?? "—",
          portuguese_name: c?.portuguese_name ?? c?.english_name ?? "—",
          spanish_name: c?.spanish_name ?? c?.english_name ?? "—",
          iso_code: c?.iso_code ?? null,
          flag_emoji: c?.flag_emoji ?? null,
          shared_with_country: sharedList.length ? sharedList.join(", ") : null,
        };
      });

      const totalPorts = rows.length;
      const activePorts = rows.filter((r) => r.is_active).length;
      const countriesWithPorts = new Set(rows.map((r) => r.country_id)).size;

      const allCountries: AdminCountryOption[] = countries
        .map((c) => ({
          id: c.id,
          english_name: c.english_name,
          portuguese_name: c.portuguese_name,
          spanish_name: c.spanish_name,
          iso_code: c.iso_code,
          flag_emoji: c.flag_emoji,
        }));
      return { rows, totalPorts, activePorts, countriesWithPorts, allCountries };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ portId, isActive }: { portId: string; isActive: boolean }) => {
      const { data: p } = await supabase.from("ports").select("name").eq("id", portId).maybeSingle();
      const { error } = await supabase
        .from("ports")
        .update({ is_active: isActive })
        .eq("id", portId);
      if (error) throw error;
      auditLog({
        action: isActive ? "port.added" : "port.removed",
        category: "catalog",
        entityType: "port",
        entityId: portId,
        entityLabel: (p as any)?.name ?? null,
        severity: isActive ? "info" : "warn",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ports"] }),
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ portIds, isActive }: { portIds: string[]; isActive: boolean }) => {
      if (!portIds.length) return;
      const { error } = await supabase
        .from("ports")
        .update({ is_active: isActive })
        .in("id", portIds);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ports"] }),
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, code, countryId, isActive }: { name: string; code: string | null; countryId: string; isActive: boolean }) => {
      const { error } = await supabase.from("ports").insert({
        name,
        code: code && code.trim() ? code.trim().toUpperCase() : null,
        country_id: countryId,
        is_active: isActive,
      });
      if (error) throw error;
      auditLog({
        action: "port.added",
        category: "catalog",
        entityType: "port",
        entityLabel: name,
        details: { code, countryId, isActive },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ports"] }),
  });

  return {
    rows: query.data?.rows ?? [],
    totalPorts: query.data?.totalPorts ?? 0,
    activePorts: query.data?.activePorts ?? 0,
    countriesWithPorts: query.data?.countriesWithPorts ?? 0,
    allCountries: query.data?.allCountries ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    togglePortActive: (portId: string, isActive: boolean) =>
      toggleMutation.mutateAsync({ portId, isActive }),
    bulkTogglePortsActive: (portIds: string[], isActive: boolean) =>
      bulkToggleMutation.mutateAsync({ portIds, isActive }),
    createPort: (input: { name: string; code: string | null; countryId: string; isActive?: boolean }) =>
      createMutation.mutateAsync({ name: input.name, code: input.code, countryId: input.countryId, isActive: input.isActive ?? true }),
    isCreating: createMutation.isPending,
    isToggling: toggleMutation.isPending || bulkToggleMutation.isPending,
  };
}
