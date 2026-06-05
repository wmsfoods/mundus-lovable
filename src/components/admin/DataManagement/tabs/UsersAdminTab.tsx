import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminDataTable, filterInputStyle } from "../AdminDataTable";
import { TrashBadge } from "../TrashBadge";
import { useAdminDataQuery } from "../useAdminDataQuery";
import type { AdminColumn } from "../types";

type Row = {
  id: string; email: string | null; name: string | null;
  status: string | null; user_type: string | null;
  created_at: string; deleted_at: string | null;
  active_company?: { name: string | null } | null;
};

export default function UsersAdminTab() {
  const { t } = useTranslation();
  const [includeTrash, setTrash] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  useEffect(() => setPage(1), [status, search, includeTrash]);

  const q = useAdminDataQuery<Row>({
    table: "users",
    columns: "id, email, name, status, user_type, created_at, deleted_at, active_company:active_company_id(name)",
    filters: { status },
    search: search ? { columns: ["email", "name"], value: search } : undefined,
    includeTrash, sort: { column: "created_at", dir: "desc" },
    page, pageSize: 50,
  });

  const columns: AdminColumn<Row>[] = [
    { key: "email", label: t("admin.dataManagement.col.email", "Email"), render: (r) => r.email ?? "—" },
    { key: "name", label: t("admin.dataManagement.col.name", "Name"), render: (r) => r.name ?? "—" },
    { key: "type", label: t("admin.dataManagement.col.type", "Type"), render: (r) => r.user_type ?? "—" },
    { key: "company", label: t("admin.dataManagement.col.activeCompany", "Active company"), render: (r) => r.active_company?.name ?? "—" },
    { key: "status", label: t("admin.dataManagement.col.status", "Status"), render: (r) => r.status ?? "—" },
    { key: "created", label: t("admin.dataManagement.col.created", "Created"), render: (r) => new Date(r.created_at).toLocaleDateString() },
    { key: "trash", label: "", width: 70, render: (r) => r.deleted_at ? <TrashBadge label={t("admin.dataManagement.deleted", "Deleted")} /> : null },
  ];

  return (
    <AdminDataTable
      rows={q.data?.rows ?? []} columns={columns} loading={q.isLoading}
      total={q.data?.total ?? 0} page={page} pageSize={50} onPageChange={setPage}
      includeTrash={includeTrash} onToggleTrash={() => setTrash((v) => !v)}
      rowKey={(r) => r.id} rowDeleted={(r) => !!r.deleted_at}
      toolbar={(
        <>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={filterInputStyle}>
            <option value="all">{t("admin.dataManagement.filter.allStatuses", "All statuses")}</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="invited">invited</option>
          </select>
          <input placeholder={t("admin.dataManagement.filter.emailOrName", "Email or name…")}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...filterInputStyle, width: 220 }} />
        </>
      )}
    />
  );
}