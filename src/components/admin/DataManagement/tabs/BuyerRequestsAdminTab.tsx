import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminDataTable, filterInputStyle } from "../AdminDataTable";
import { TrashBadge } from "../TrashBadge";
import { useAdminDataQuery } from "../useAdminDataQuery";
import type { AdminColumn } from "../types";
import { useBulkSelection } from "../useBulkSelection";

type Row = {
  id: string; request_number: number | null; product_name: string | null;
  destination_country: string | null; status: string | null;
  created_at: string; deleted_at: string | null;
  buyer_company?: { name: string | null } | null;
};

export default function BuyerRequestsAdminTab() {
  const { t } = useTranslation();
  const [includeTrash, setTrash] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  useEffect(() => setPage(1), [status, search, from, to, includeTrash]);

  const q = useAdminDataQuery<Row>({
    table: "buyer_requests",
    columns: "id, request_number, product_name, destination_country, status, created_at, deleted_at, buyer_company:buyer_company_id(name)",
    filters: { status },
    search: search ? { columns: ["product_name"], value: search } : undefined,
    dateRange: { column: "created_at", from: from || undefined, to: to ? `${to}T23:59:59` : undefined },
    includeTrash, sort: { column: "created_at", dir: "desc" },
    page, pageSize: 50,
  });

  const columns: AdminColumn<Row>[] = [
    { key: "no", label: "#", render: (r) => r.request_number ?? "—" },
    { key: "buyer", label: t("admin.dataManagement.col.buyer", "Buyer"), render: (r) => r.buyer_company?.name ?? "—" },
    { key: "product", label: t("admin.dataManagement.col.product", "Product"), render: (r) => r.product_name ?? "—" },
    { key: "dest", label: t("admin.dataManagement.col.destination", "Destination"), render: (r) => r.destination_country ?? "—" },
    { key: "status", label: t("admin.dataManagement.col.status", "Status"), render: (r) => r.status ?? "—" },
    { key: "created", label: t("admin.dataManagement.col.created", "Created"), render: (r) => new Date(r.created_at).toLocaleDateString() },
    { key: "trash", label: "", width: 70, render: (r) => r.deleted_at ? <TrashBadge label={t("admin.dataManagement.deleted", "Deleted")} /> : null },
  ];

  const rows = q.data?.rows ?? [];
  const bulk = useBulkSelection<Row>("buyer_request", rows);

  return (
    <>
    <AdminDataTable
      rows={rows} columns={columns} loading={q.isLoading}
      total={q.data?.total ?? 0} page={page} pageSize={50} onPageChange={setPage}
      includeTrash={includeTrash} onToggleTrash={() => setTrash((v) => !v)}
      rowKey={(r) => r.id} rowDeleted={(r) => !!r.deleted_at}
      selectable
      selectedIds={bulk.selectedIds}
      onToggleId={bulk.toggleId}
      onToggleAll={bulk.toggleAll}
      onClearSelection={bulk.clear}
      onSoftDelete={bulk.hasActive ? bulk.openSoft : undefined}
      onRestore={bulk.hasDeleted ? bulk.openRestore : undefined}
      onHardDelete={bulk.openHard}
      toolbar={(
        <>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={filterInputStyle}>
            <option value="all">{t("admin.dataManagement.filter.allStatuses", "All statuses")}</option>
            {["draft","open","matched","closed","cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder={t("admin.dataManagement.filter.product", "Product…")}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...filterInputStyle, width: 180 }} />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={filterInputStyle} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={filterInputStyle} />
        </>
      )}
    />
    {bulk.modalEl}
    </>
  );
}