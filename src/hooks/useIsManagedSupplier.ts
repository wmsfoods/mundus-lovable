import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsManagedSupplier(supplierId: string | null | undefined) {
  const [isManaged, setIsManaged] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) {
      setIsManaged(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("companies")
        .select("mundus_managed_supplier")
        .eq("id", supplierId)
        .maybeSingle();
      if (cancelled) return;
      setIsManaged(!!(data as { mundus_managed_supplier?: boolean } | null)?.mundus_managed_supplier);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supplierId]);

  return { isManaged: !!isManaged, loading };
}