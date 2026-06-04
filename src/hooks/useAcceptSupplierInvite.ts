import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AcceptInviteResult = { ok: boolean; reason?: string };

export function useAcceptSupplierInvite() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (linkId: string): Promise<AcceptInviteResult> => {
      const { data, error } = await (supabase as any).rpc("accept_supplier_invite", {
        p_link_id: linkId,
      });
      if (error) throw error;
      return (data ?? { ok: false, reason: "no_response" }) as AcceptInviteResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-customer-links", "my-suppliers"] });
    },
  });
  return {
    acceptInvite: mutation.mutateAsync,
    isAccepting: mutation.isPending,
    error: mutation.error ? (mutation.error as Error).message : null,
  };
}