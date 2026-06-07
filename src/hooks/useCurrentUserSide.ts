import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "./useCurrentCompany";
import { useIsMundusAdmin } from "./useIsMundusAdmin";

export type NegotiationSide = "buyer" | "supplier" | "mundus" | null;

/**
 * Resolves whether the current authenticated user is participating in a
 * negotiation as the buyer, the supplier, or as Mundus staff (admin view).
 */
export function useCurrentUserSide(negotiationId: string | null | undefined): {
  side: NegotiationSide;
  loading: boolean;
} {
  const { company, loading: companyLoading } = useCurrentCompany();
  const { isAdmin, loading: adminLoading } = useIsMundusAdmin();
  const [ids, setIds] = useState<{ buyerCompanyId: string | null; supplierId: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!negotiationId) {
      setIds(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("negotiations")
        .select("buyer_company_id, offer:offers!negotiations_offer_id_fkey ( supplier_id )")
        .eq("id", negotiationId)
        .maybeSingle();
      if (cancelled) return;
      const supplierId = (data as any)?.offer?.supplier_id ?? null;
      setIds({
        buyerCompanyId: (data as any)?.buyer_company_id ?? null,
        supplierId,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [negotiationId]);

  if (loading || companyLoading || adminLoading) {
    return { side: null, loading: true };
  }

  const myCompanyId = company?.id ?? null;
  let side: NegotiationSide = null;
  if (myCompanyId && ids?.buyerCompanyId === myCompanyId) side = "buyer";
  else if (myCompanyId && ids?.supplierId === myCompanyId) side = "supplier";
  else if (isAdmin) side = "mundus";

  return { side, loading: false };
}