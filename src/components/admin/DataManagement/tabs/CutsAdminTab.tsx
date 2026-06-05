import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminDataTable, filterInputStyle } from "../AdminDataTable";
import { useAdminDataQuery } from "../useAdminDataQuery";
import type { AdminColumn } from "../types";

type Row = {
  id: string; name: string | null; category: string | null;
  region: string | null; is_active: boolean | null; created_at: string | null;
};

export default function CutsAdminTab() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [region, setRegion] = useState("all");
  const [search, setSearch] = useState("");
  useEffect(() => setPage(1), [category, region, search]);

  const q = useAdminDataQuery<Row>({
    table: "cuts",
    columns: "id, name, category, region, is_active, created_at",
    filters: { category, region },
    search: search ? { columns: ["name"], value: search } : undefined,
    includeTrash: true, // cuts have no deleted_at
    sort: { column: "created_at", dir: "desc" },
    page, pageSize: 50,
  });

  const columns: AdminColumn<Row>[] = [
    { key: "name", label: t("admin.dataManagement.col.name", "Name"), render: (r) => r.name ?? "—" },
    { key: "category", label: t("admin.dataManagement.col.category", "Category"), render: (r) => r.category ?? "—" },
    { key: "region", label: t("admin.dataManagement.col.region", "Region"), render: (r) => r.region ?? "—" },
    { key: "active", label: t("admin.dataManagement.col.active", "Active"), render: (r) => r.is_active ? "✓" : "—" },
    { key: "created", label: t("admin.dataManagement.col.created", "Created"), render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—" },
  ];

  return (
    <AdminDataTable
      rows={q.data?.rows ?? []} columns={columns} loading={q.isLoading}
      total={q.data?.total ?? 0} page={page} pageSize={50} onPageChange={setPage}
      includeTrash={true} onToggleTrash={() => {}}
      rowKey={(r) => r.id}
      toolbar={(
        <>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={filterInputStyle}>
            <option value="all">{t("admin.dataManagement.filter.allCategories", "All categories")}</option>
            {["beef","pork","poultry","lamb","seafood","other"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={filterInputStyle}>
            <option value="all">{t("admin.dataManagement.filter.allRegions", "All regions")}</option>
            <option value="us">US</option>
            <option value="global">Global</option>
          </select>
          <input placeholder={t("admin.dataManagement.filter.cutName", "Cut name…")}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...filterInputStyle, width: 200 }} />
        </>
      )}
    />
  );
}