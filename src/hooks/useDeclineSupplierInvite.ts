import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DeclineInviteResult = { ok: boolean; reason?: string };

export function useDeclineSupplierInvite() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (linkId: string): Promise<DeclineInviteResult> => {
      const { data, error } = await (supabase as any).rpc("decline_supplier_invite", {
        p_link_id: linkId,
      });
      if (error) throw error;
      return (data ?? { ok: false, reason: "no_response" }) as DeclineInviteResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-customer-links", "my-suppliers"] });
    },
  });
  return {
    declineInvite: mutation.mutateAsync,
    isDeclining: mutation.isPending,
    error: mutation.error ? (mutation.error as Error).message : null,
  };
}