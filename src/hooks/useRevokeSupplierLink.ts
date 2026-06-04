import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RevokeLinkResult = { ok: boolean; reason?: string };

/** Buyer-side revoke of a supplier link. */
export function useRevokeSupplierLink() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (linkId: string): Promise<RevokeLinkResult> => {
      const { data, error } = await (supabase as any).rpc("revoke_supplier_link", {
        p_link_id: linkId,
      });
      if (error) throw error;
      return (data ?? { ok: false, reason: "no_response" }) as RevokeLinkResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-customer-links", "my-suppliers"] });
    },
  });
  return {
    revokeLink: mutation.mutateAsync,
    isRevoking: mutation.isPending,
    error: mutation.error ? (mutation.error as Error).message : null,
  };
}