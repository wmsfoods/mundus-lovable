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
};

export function AdminDataTable<T>({
  rows, columns, loading, total, page, pageSize, onPageChange,
  includeTrash, onToggleTrash, toolbar, rowKey, rowDeleted,
}: Props<T>) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

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

      {/* Placeholder bulk actions banner */}
      <div style={{
        padding: "4px 10px", fontSize: 10, color: "#908d85",
        background: "#f6f5f3", borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        {t("admin.dataManagement.bulkSoon", "Coming soon: bulk actions (Batch A2)")}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
          <thead>
            <tr style={{ background: "#fafaf9", textAlign: "left" }}>
              {columns.map((c) => (
                <th key={c.key} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 600, color: "#5e5e58", letterSpacing: 0.4, borderBottom: "1px solid rgba(0,0,0,0.08)", width: c.width }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={columns.length} style={{ padding: 20, textAlign: "center", color: "#908d85" }}>{t("admin.dataManagement.loading", "Loading…")}</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns.length} style={{ padding: 20, textAlign: "center", color: "#908d85" }}>{t("admin.dataManagement.noData", "No data")}</td></tr>
            )}
            {!loading && rows.map((r) => {
              const deleted = rowDeleted?.(r) ?? false;
              return (
                <tr key={rowKey(r)} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", opacity: deleted ? 0.55 : 1 }}>
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

/* Compact filter inputs used inside the toolbar prop */
export const filterInputStyle: React.CSSProperties = {
  padding: "5px 8px", fontSize: 11, borderRadius: 5,
  border: "1px solid rgba(0,0,0,0.10)", background: "white",
};