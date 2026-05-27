import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MwInstanceInput = {
  name: string;
  evolution_instance_id: string;
  evolution_base_url: string;
  evolution_api_key: string;
  provider_type: "self_hosted" | "cloud";
  instance_id_external?: string | null;
};

const TABLE = "mw_instances" as const;

export function useMwInstancesCrud(onChange?: () => void) {
  const [busy, setBusy] = useState(false);

  const create = async (input: MwInstanceInput) => {
    setBusy(true);
    try {
      const webhook = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mw-evolution-webhook`;
      const { data: auth } = await supabase.auth.getUser();
      const payload = {
        name: input.name,
        evolution_instance_id: input.evolution_instance_id,
        evolution_base_url: input.evolution_base_url,
        evolution_api_key: input.evolution_api_key,
        provider_type: input.provider_type,
        instance_id_external: input.provider_type === "cloud" ? input.instance_id_external ?? null : null,
        webhook_url: webhook,
        status: "disconnected",
        created_by: auth.user?.id ?? null,
      };
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => { insert: (v: unknown) => { select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } } };
      }).from(TABLE).insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      onChange?.();
      return data!;
    } finally { setBusy(false); }
  };

  const update = async (id: string, input: Partial<MwInstanceInput>) => {
    setBusy(true);
    try {
      const patch: Record<string, unknown> = { ...input };
      if (input.provider_type === "self_hosted") patch.instance_id_external = null;
      const { error } = await (supabase as unknown as {
        from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } };
      }).from(TABLE).update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      onChange?.();
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await (supabase as unknown as {
        from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } };
      }).from(TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
      onChange?.();
    } finally { setBusy(false); }
  };

  return { busy, create, update, remove };
}