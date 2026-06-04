import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DedupCase =
  | "existing_user"
  | "pending_invite"
  | "existing_company_new_contact"
  | "new_buyer"
  | "invalid_input";

export type DedupResult = {
  case: DedupCase;
  echo_email?: string;
  echo_tax_id?: string;
  expires_at?: string;
};

/** Debounced dedup check (300ms). Hits `dedup_check_invite` RPC. */
export function useDedupCheck(email: string, taxId?: string | null) {
  const [debouncedEmail, setDebouncedEmail] = useState(email);
  const [debouncedTax, setDebouncedTax] = useState(taxId ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedEmail(email);
      setDebouncedTax(taxId ?? "");
    }, 300);
    return () => clearTimeout(t);
  }, [email, taxId]);

  const enabled = !!debouncedEmail && /.+@.+\..+/.test(debouncedEmail);

  const query = useQuery({
    enabled,
    queryKey: ["dedup-check-invite", debouncedEmail, debouncedTax],
    queryFn: async (): Promise<DedupResult> => {
      const args: { p_email: string; p_tax_id?: string } = { p_email: debouncedEmail };
      if (debouncedTax) args.p_tax_id = debouncedTax;
      const { data, error } = await (supabase as any).rpc("dedup_check_invite", args);
      if (error) throw error;
      return (data ?? { case: "invalid_input" }) as DedupResult;
    },
    staleTime: 30_000,
  });

  return {
    result: query.data ?? null,
    loading: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    enabled,
  };
}