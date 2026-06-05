import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminColumn } from "./types";

type Props<T> = {
  rows: T[];
  columns: AdminColumn<T>[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  includeTrash: boolean;
  onToggleTrash: () => void;
  toolbar?: ReactNode;
  rowKey: (row: T) => string;
  rowDeleted?: (row: T) => boolean;
  // Selection & bulk actions
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleId?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
  onClearSelection?: () => void;
  onSoftDelete?: () => void;
  onRestore?: () => void;
  onHardDelete?: () => void;
  bulkConfig?: {
    showSoft?: boolean;
    showRestore?: boolean;
    showHard?: boolean;
  };
};

export function AdminDataTable<T>({
  rows, columns, loading, total, page, pageSize, onPageChange,
  includeTrash, onToggleTrash, toolbar, rowKey, rowDeleted,
  selectable, selectedIds, onToggleId, onToggleAll, onClearSelection,
  onSoftDelete, onRestore, onHardDelete, bulkConfig,
}: Props<T>) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  const pageIds = rows.map(rowKey);
  const allChecked = selectable && pageIds.length > 0 && pageIds.every((id) => selectedIds?.has(id));
  const selCount = selectedIds?.size ?? 0;
  const cfg = bulkConfig ?? { showSoft: true, showRestore: true, showHard: true };

  return (
    <div className="adm-panel" style={{ overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
        padding: "6px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9",
      }}>
        {toolbar}
        <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#5e5e58", cursor: "pointer" }}>
          <input type="checkbox" checked={includeTrash} onChange={onToggleTrash} style={{ cursor: "pointer" }} />
          {t("admin.dataManagement.showTrash", "Show trash")}
        </label>
        <span style={{ fontSize: 10, color: "#908d85" }}>{total}</span>
      </div>

      {/* Bulk action bar */}
      {selectable && selCount > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
          padding: "6px 10px", background: "#fff8e1",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontSize: 11, color: "#5e5e58", fontWeight: 600 }}>
            {t("admin.dataManagement.bulk.selected", "{{count}} selected", { count: selCount })}
          </span>
          {cfg.showSoft && onSoftDelete && (
            <button onClick={onSoftDelete} style={bulkBtn("#5e5e58")}>
              {t("admin.dataManagement.bulk.moveToTrash", "Move to trash")}
            </button>
          )}
          {cfg.showRestore && onRestore && (
            <button onClick={onRestore} style={bulkBtn("#1f6feb")}>
              {t("admin.dataManagement.bulk.restore", "Restore")}
            </button>
          )}
          {cfg.showHard && onHardDelete && (
            <button onClick={onHardDelete} style={bulkBtn("#b3261e")}>
              {t("admin.dataManagement.bulk.hardDelete", "Hard delete")}
            </button>
          )}
          <button onClick={onClearSelection} style={{ marginLeft: "auto", padding: "3px 8px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white", cursor: "pointer" }}>
            {t("admin.dataManagement.bulk.clear", "Clear")}
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
          <thead>
            <tr style={{ background: "#fafaf9", textAlign: "left" }}>
              {selectable && (
                <th style={{ padding: "9px 8px", width: 28, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  <input type="checkbox" checked={!!allChecked} onChange={() => onToggleAll?.(pageIds)} />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 600, color: "#5e5e58", letterSpacing: 0.4, borderBottom: "1px solid rgba(0,0,0,0.08)", width: c.width }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: 20, textAlign: "center", color: "#908d85" }}>{t("admin.dataManagement.loading", "Loading…")}</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: 20, textAlign: "center", color: "#908d85" }}>{t("admin.dataManagement.noData", "No data")}</td></tr>
            )}
            {!loading && rows.map((r) => {
              const deleted = rowDeleted?.(r) ?? false;
              const id = rowKey(r);
              const checked = selectedIds?.has(id) ?? false;
              return (
                <tr key={id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", opacity: deleted ? 0.55 : 1, background: checked ? "#fff8e1" : undefined }}>
                  {selectable && (
                    <td style={{ padding: "9px 8px" }}>
                      <input type="checkbox" checked={checked} onChange={() => onToggleId?.(id)} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: "9px 12px", color: "#1a1a18" }}>{c.render(r)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
        padding: "6px 10px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9",
      }}>
        <span style={{ fontSize: 11, color: "#5e5e58" }}>{start}–{end} / {total}</span>
        <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => onPageChange(Math.max(1, safePage - 1))} disabled={safePage <= 1}
            style={{ padding: "3px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white", cursor: safePage <= 1 ? "not-allowed" : "pointer", opacity: safePage <= 1 ? 0.5 : 1 }}>
            <ChevronLeft size={12} />
          </button>
          <span style={{ fontSize: 11, color: "#5e5e58", padding: "0 4px" }}>{safePage} / {totalPages}</span>
          <button onClick={() => onPageChange(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}
            style={{ padding: "3px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white", cursor: safePage >= totalPages ? "not-allowed" : "pointer", opacity: safePage >= totalPages ? 0.5 : 1 }}>
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

const bulkBtn = (bg: string): React.CSSProperties => ({
  padding: "4px 10px", fontSize: 11, borderRadius: 5,
  border: "none", background: bg, color: "white", cursor: "pointer", fontWeight: 600,
});

/* Compact filter inputs used inside the toolbar prop */
export const filterInputStyle: React.CSSProperties = {
  padding: "5px 8px", fontSize: 11, borderRadius: 5,
  border: "1px solid rgba(0,0,0,0.10)", background: "white",
};