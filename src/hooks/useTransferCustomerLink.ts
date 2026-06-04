import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TransferLinkResult = { ok: boolean; reason?: string };

export type TransferLinkInput = {
  linkId: string;
  targetOfficeId: string;
};

/** Master Supplier moves a customer link within the same parent_company_id. */
export function useTransferCustomerLink() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ linkId, targetOfficeId }: TransferLinkInput): Promise<TransferLinkResult> => {
      const { data, error } = await (supabase as any).rpc("transfer_supplier_link", {
        p_link_id: linkId,
        p_target_office_id: targetOfficeId,
      });
      if (error) throw error;
      return (data ?? { ok: false, reason: "no_response" }) as TransferLinkResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-customer-links", "my-customers"] });
    },
  });
  return {
    transferLink: mutation.mutateAsync,
    isTransferring: mutation.isPending,
    error: mutation.error ? (mutation.error as Error).message : null,
  };
}