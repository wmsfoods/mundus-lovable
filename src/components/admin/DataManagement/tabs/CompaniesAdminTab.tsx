import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AdminDataTable, filterInputStyle } from "../AdminDataTable";
import { ChildCountBadge } from "../ChildCountBadge";
import { TrashBadge } from "../TrashBadge";
import { useAdminDataQuery } from "../useAdminDataQuery";
import type { AdminColumn } from "../types";
import { useBulkSelection } from "../useBulkSelection";

type Row = {
  id: string; name: string | null; country: string | null;
  is_buyer: boolean; is_supplier: boolean; is_admin: boolean;
  created_at: string; deleted_at: string | null;
};

export default function CompaniesAdminTab() {
  const { t } = useTranslation();
  const [includeTrash, setTrash] = useState(false);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<"all" | "buyer" | "supplier" | "mundus">("all");
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => setPage(1), [role, country, search, includeTrash]);

  const filters: Record<string, any> = {};
  if (role === "buyer") filters.is_buyer = true;
  if (role === "supplier") filters.is_supplier = true;
  if (role === "mundus") filters.is_admin = true;

  const q = useAdminDataQuery<Row>({
    table: "companies",
    columns: "id, name, country, is_buyer, is_supplier, is_admin, created_at, deleted_at",
    filters,
    search: search ? { columns: ["name"], value: search } : undefined,
    dateRange: country ? undefined : undefined,
    includeTrash, sort: { column: "created_at", dir: "desc" },
    page, pageSize: 50,
  });

  // client-side country filter
  const filtered = (q.data?.rows ?? []).filter((r) => !country || (r.country ?? "").toLowerCase().includes(country.toLowerCase()));

  const ids = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const [counts, setCounts] = useState<Record<string, { users: number; offers: number }>>({});
  useEffect(() => {
    if (!ids.length) { setCounts({}); return; }
    let cancelled = false;
    (async () => {
      const [users, offers] = await Promise.all([
        (supabase as any).from("company_users").select("company_id").in("company_id", ids).eq("status", "active"),
        (supabase as any).from("offers").select("supplier_id").in("supplier_id", ids).is("deleted_at", null),
      ]);
      if (cancelled) return;
      const u: Record<string, number> = {};
      ((users.data ?? []) as any[]).forEach((r) => { u[r.company_id] = (u[r.company_id] ?? 0) + 1; });
      const o: Record<string, number> = {};
      ((offers.data ?? []) as any[]).forEach((r) => { o[r.supplier_id] = (o[r.supplier_id] ?? 0) + 1; });
      const m: Record<string, { users: number; offers: number }> = {};
      ids.forEach((id) => { m[id] = { users: u[id] ?? 0, offers: o[id] ?? 0 }; });
      setCounts(m);
    })();
    return () => { cancelled = true; };
  }, [ids.join(",")]);

  const roleLabel = (r: Row) => {
    if (r.is_admin) return "Mundus";
    if (r.is_buyer && r.is_supplier) return "Buyer + Supplier";
    if (r.is_buyer) return "Buyer";
    if (r.is_supplier) return "Supplier";
    return "—";
  };

  const columns: AdminColumn<Row>[] = [
    { key: "name", label: t("admin.dataManagement.col.name", "Name"), render: (r) => r.name ?? "—" },
    { key: "role", label: t("admin.dataManagement.col.role", "Role"), render: roleLabel },
    { key: "users", label: t("admin.dataManagement.col.users", "Users"), render: (r) => <ChildCountBadge total={counts[r.id]?.users ?? 0} /> },
    { key: "offers", label: t("admin.dataManagement.col.offers", "Offers"), render: (r) => <ChildCountBadge total={counts[r.id]?.offers ?? 0} /> },
    { key: "country", label: t("admin.dataManagement.col.country", "Country"), render: (r) => r.country ?? "—" },
    { key: "created", label: t("admin.dataManagement.col.created", "Created"), render: (r) => new Date(r.created_at).toLocaleDateString() },
    { key: "trash", label: "", width: 70, render: (r) => r.deleted_at ? <TrashBadge label={t("admin.dataManagement.deleted", "Deleted")} /> : null },
  ];

  const bulk = useBulkSelection<Row>("company", filtered);

  return (
    <>
    <AdminDataTable
      rows={filtered} columns={columns} loading={q.isLoading}
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
          <select value={role} onChange={(e) => setRole(e.target.value as any)} style={filterInputStyle}>
            <option value="all">{t("admin.dataManagement.filter.allRoles", "All roles")}</option>
            <option value="buyer">Buyer</option>
            <option value="supplier">Supplier</option>
            <option value="mundus">Mundus</option>
          </select>
          <input placeholder={t("admin.dataManagement.filter.country", "Country…")}
            value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...filterInputStyle, width: 120 }} />
          <input placeholder={t("admin.dataManagement.filter.companyName", "Company name…")}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...filterInputStyle, width: 200 }} />
        </>
      )}
    />
    {bulk.modalEl}
    </>
  );
}