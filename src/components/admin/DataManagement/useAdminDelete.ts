import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminEntityType =
  | "offer" | "negotiation" | "order"
  | "buyer_request" | "company" | "user" | "cut";

export type AdminDeleteMode = "soft" | "hard" | "restore";

export type AdminDeleteResult = {
  affected?: number;
  deleted?: number;
  blocked?: boolean;
  reason?: string;
};

export function useAdminDelete() {
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["adminData"] });

  const softDelete = useMutation({
    mutationFn: async ({ entityType, ids }: { entityType: AdminEntityType; ids: string[] }): Promise<AdminDeleteResult> => {
      const { data, error } = await (supabase as any).rpc("admin_soft_delete", {
        p_entity_type: entityType, p_ids: ids,
      });
      if (error) throw error;
      return data as AdminDeleteResult;
    },
    onSuccess: invalidate,
  });

  const restore = useMutation({
    mutationFn: async ({ entityType, ids }: { entityType: AdminEntityType; ids: string[] }): Promise<AdminDeleteResult> => {
      const { data, error } = await (supabase as any).rpc("admin_restore", {
        p_entity_type: entityType, p_ids: ids,
      });
      if (error) throw error;
      return data as AdminDeleteResult;
    },
    onSuccess: invalidate,
  });

  const hardDelete = useMutation({
    mutationFn: async ({ entityType, ids }: { entityType: AdminEntityType; ids: string[] }): Promise<AdminDeleteResult> => {
      const { data, error } = await (supabase as any).rpc("admin_hard_delete", {
        p_entity_type: entityType, p_ids: ids,
      });
      if (error) throw error;
      return data as AdminDeleteResult;
    },
    onSuccess: (r) => { if (!r?.blocked) invalidate(); },
  });

  return { softDelete, restore, hardDelete };
}