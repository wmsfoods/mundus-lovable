import { useCallback, useState } from "react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { useAdminDelete, type AdminDeleteMode, type AdminEntityType } from "./useAdminDelete";

export function useBulkSelection<T extends { id: string; deleted_at?: string | null }>(
  entityType: AdminEntityType,
  rows: T[],
) {
  const [selectedIds, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<AdminDeleteMode | null>(null);
  const { softDelete, restore, hardDelete } = useAdminDelete();

  const toggleId = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const all = ids.every((i) => prev.has(i));
      const n = new Set(prev);
      if (all) ids.forEach((i) => n.delete(i));
      else ids.forEach((i) => n.add(i));
      return n;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  // Determine if selection contains deleted rows (for showing Restore button)
  const idsArr = Array.from(selectedIds);
  const selRows = rows.filter((r) => selectedIds.has(r.id));
  const hasDeleted = selRows.some((r) => !!r.deleted_at);
  const hasActive = selRows.some((r) => !r.deleted_at);

  const handleConfirm = async () => {
    if (!modal) return { affected: 0 };
    if (modal === "soft") return await softDelete.mutateAsync({ entityType, ids: idsArr });
    if (modal === "restore") return await restore.mutateAsync({ entityType, ids: idsArr });
    return await hardDelete.mutateAsync({ entityType, ids: idsArr });
  };

  const onClose = () => { setModal(null); clear(); };

  const modalEl = (
    <ConfirmDeleteModal
      open={modal !== null}
      mode={modal ?? "soft"}
      entityType={entityType}
      ids={idsArr}
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  );

  return {
    selectedIds, toggleId, toggleAll, clear,
    openSoft: () => setModal("soft"),
    openRestore: () => setModal("restore"),
    openHard: () => setModal("hard"),
    hasDeleted, hasActive,
    modalEl,
  };
}