import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "./useCurrentCompany";
import { useActiveOffice } from "./useActiveOffice";
import { useIsMundusAdmin } from "./useIsMundusAdmin";

/**
 * Resolves family-routing context for the supplier requests pipeline.
 *
 *  - `familyRootId`     – id of the family root (HQ) company
 *  - `isFamilyHq`       – the family has at least one child office
 *  - `familyOfficeIds`  – every office that belongs to the family (HQ + children)
 *  - `isHqLevelUser`    – the current user is allowed to see the unassigned pool
 *                         (mundus admin · family global director · HQ-root member)
 *  - `isOfficeOperator` – user is locked to a specific office (never sees pool)
 */
export function useFamilyContext() {
  const { company } = useCurrentCompany();
  const { isGlobalDirector, offices } = useActiveOffice();
  const { isAdmin: isMundusAdmin } = useIsMundusAdmin();

  const [familyRootId, setFamilyRootId] = useState<string | null>(null);
  const [isHqMember, setIsHqMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!company?.id) {
        setFamilyRootId(null);
        setLoading(false);
        return;
      }
      const { data: row } = await (supabase as any)
        .from("companies")
        .select("parent_company_id")
        .eq("id", company.id)
        .maybeSingle();
      if (cancelled) return;
      const rootId = (row?.parent_company_id as string | null) ?? company.id;
      setFamilyRootId(rootId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: cu } = await (supabase as any)
        .from("company_users")
        .select("company_id, status")
        .eq("user_id", user.id)
        .eq("company_id", rootId)
        .maybeSingle();
      if (cancelled) return;
      setIsHqMember(!!cu && (cu.status ?? "active") === "active");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [company?.id]);

  const familyOfficeIds = offices.map((o) => o.id);
  const isFamilyHq = offices.some((o) => o.parent_company_id === familyRootId);
  const isHqLevelUser = isMundusAdmin || isGlobalDirector || isHqMember;
  const isOfficeOperator = !isHqLevelUser;

  return {
    loading,
    familyRootId,
    familyOfficeIds,
    isFamilyHq,
    isHqLevelUser,
    isOfficeOperator,
    isMundusAdmin,
    isGlobalDirector,
    offices,
  };
}