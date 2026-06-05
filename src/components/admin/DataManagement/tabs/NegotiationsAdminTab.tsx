import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminDataTable, filterInputStyle } from "../AdminDataTable";
import { TrashBadge } from "../TrashBadge";
import { useAdminDataQuery } from "../useAdminDataQuery";
import type { AdminColumn } from "../types";

type Row = {
  id: string; offer_id: string | null; status: string | null; current_round: number | null;
  created_at: string; deleted_at: string | null;
  offers?: { offer_number: number | null; supplier_name: string | null } | null;
  buyer_company?: { name: string | null } | null;
};

export default function NegotiationsAdminTab() {
  const { t } = useTranslation();
  const [includeTrash, setTrash] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  useEffect(() => setPage(1), [status, search, from, to, includeTrash]);

  const q = useAdminDataQuery<Row>({
    table: "negotiations",
    columns: "id, offer_id, status, current_round, created_at, deleted_at, offers:offer_id(offer_number, supplier_name), buyer_company:buyer_company_id(name)",
    filters: { status },
    dateRange: { column: "created_at", from: from || undefined, to: to ? `${to}T23:59:59` : undefined },
    includeTrash, sort: { column: "created_at", dir: "desc" },
    page, pageSize: 50,
  });

  const filtered = (q.data?.rows ?? []).filter((r) => {
    if (!search) return true;
    const hay = `${r.offers?.supplier_name ?? ""} ${r.buyer_company?.name ?? ""}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  const columns: AdminColumn<Row>[] = [
    { key: "id", label: t("admin.dataManagement.col.id", "ID"), render: (r) => <code style={{ fontSize: 10, color: "#5e5e58" }}>{r.id.slice(0, 8)}</code> },
    { key: "offer", label: t("admin.dataManagement.col.offer", "Offer"), render: (r) => r.offers?.offer_number ?? "—" },
    { key: "buyer", label: t("admin.dataManagement.col.buyer", "Buyer"), render: (r) => r.buyer_company?.name ?? "—" },
    { key: "supplier", label: t("admin.dataManagement.col.supplier", "Supplier"), render: (r) => r.offers?.supplier_name ?? "—" },
    { key: "status", label: t("admin.dataManagement.col.status", "Status"), render: (r) => r.status ?? "—" },
    { key: "round", label: t("admin.dataManagement.col.round", "Round"), render: (r) => r.current_round ?? "—" },
    { key: "created", label: t("admin.dataManagement.col.created", "Created"), render: (r) => new Date(r.created_at).toLocaleDateString() },
    { key: "trash", label: "", width: 70, render: (r) => r.deleted_at ? <TrashBadge label={t("admin.dataManagement.deleted", "Deleted")} /> : null },
  ];

  return (
    <AdminDataTable
      rows={filtered} columns={columns} loading={q.isLoading}
      total={q.data?.total ?? 0} page={page} pageSize={50} onPageChange={setPage}
      includeTrash={includeTrash} onToggleTrash={() => setTrash((v) => !v)}
      rowKey={(r) => r.id} rowDeleted={(r) => !!r.deleted_at}
      toolbar={(
        <>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={filterInputStyle}>
            <option value="all">{t("admin.dataManagement.filter.allStatuses", "All statuses")}</option>
            {["pending","active","accepted","rejected","expired"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder={t("admin.dataManagement.filter.buyerOrSupplier", "Buyer or supplier…")}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...filterInputStyle, width: 200 }} />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={filterInputStyle} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={filterInputStyle} />
        </>
      )}
    />
  );
}