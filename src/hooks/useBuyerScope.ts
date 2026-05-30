import { useSupplierScope } from "./useSupplierScope";

/**
 * Buyer-side companion to useSupplierScope. The underlying logic is identical
 * because office focus + family root are company-type-agnostic, so we simply
 * re-export the same shape under a buyer-friendly name. The DB also enforces
 * isolation through `user_buyer_scope_ids()` independently of this hook.
 */
export function useBuyerScope() {
  const s = useSupplierScope();
  return {
    scopeIds: s.scopeIds,
    activeOfficeId: s.activeOfficeId,
    isAllOffices: s.isAllOffices,
    isGlobalDirector: s.isGlobalDirector,
    loading: s.loading,
  };
}
