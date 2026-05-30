import { useMemo } from "react";
import { useActiveOffice } from "./useActiveOffice";
import { useCurrentCompany } from "./useCurrentCompany";

/**
 * Single source of truth for "which supplier company ids should the UI
 * currently query against?" Honors the active office focus on top of the
 * family scope that RLS already enforces at the database layer.
 *
 * Rules:
 *  - Specific office focused        → scopeIds = [activeOfficeId]
 *  - "All Offices" (consolidated)   → scopeIds = all visible family offices
 *  - Single-office operator         → scopeIds = [their only office]
 *  - Fallback (still resolving)     → scopeIds = [company.id] when known
 *
 * Callers MUST gate their queries on `loading === false` to avoid querying
 * with a stale/empty scope and flipping the UI mid-render.
 */
export function useSupplierScope() {
  const { company, loading: companyLoading } = useCurrentCompany();
  const {
    activeOfficeId,
    isAllOffices,
    isGlobalDirector,
    offices,
    loading: officeLoading,
  } = useActiveOffice();

  const loading = companyLoading || officeLoading;

  const scopeIds = useMemo<string[]>(() => {
    if (activeOfficeId) return [activeOfficeId];
    if (isAllOffices && offices.length > 0) return offices.map((o) => o.id);
    if (company?.id) return [company.id];
    return [];
  }, [activeOfficeId, isAllOffices, offices, company?.id]);

  return {
    scopeIds,
    activeOfficeId,
    isAllOffices,
    isGlobalDirector,
    loading,
  };
}