import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AdminDataTable, filterInputStyle } from "../AdminDataTable";
import { ChildCountBadge } from "../ChildCountBadge";
import { TrashBadge } from "../TrashBadge";
import { useAdminDataQuery } from "../useAdminDataQuery";
import type { AdminColumn } from "../types";

type Row = {
  id: string; offer_number: number | null; supplier_name: string | null;
  status: string | null; created_at: string; deleted_at: string | null;
};

export default function OffersAdminTab() {
  const { t } = useTranslation();
  const [includeTrash, setTrash] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [supplier, setSupplier] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  useEffect(() => setPage(1), [status, supplier, from, to, includeTrash]);

  const q = useAdminDataQuery<Row>({
    table: "offers",
    columns: "id, offer_number, supplier_name, status, created_at, deleted_at",
    filters: { status },
    search: supplier ? { columns: ["supplier_name"], value: supplier } : undefined,
    dateRange: { column: "created_at", from: from || undefined, to: to ? `${to}T23:59:59` : undefined },
    includeTrash, sort: { column: "created_at", dir: "desc" },
    page, pageSize: 50,
  });

  const ids = useMemo(() => (q.data?.rows ?? []).map((r) => r.id), [q.data]);
  const [counts, setCounts] = useState<Record<string, { items: number; negs: number; orders: number }>>({});
  useEffect(() => {
    if (!ids.length) { setCounts({}); return; }
    let cancelled = false;
    (async () => {
      const [items, negs, orders] = await Promise.all([
        (supabase as any).from("offer_items").select("offer_id").in("offer_id", ids),
        (supabase as any).from("negotiations").select("offer_id").in("offer_id", ids),
        (supabase as any).from("orders").select("offer_id").in("offer_id", ids),
      ]);
      if (cancelled) return;
      const tally = (rows: any[]) => rows?.reduce<Record<string, number>>((a, r) => {
        a[r.offer_id] = (a[r.offer_id] ?? 0) + 1; return a;
      }, {}) ?? {};
      const i = tally(items.data ?? []); const n = tally(negs.data ?? []); const o = tally(orders.data ?? []);
      const m: Record<string, { items: number; negs: number; orders: number }> = {};
      ids.forEach((id) => { m[id] = { items: i[id] ?? 0, negs: n[id] ?? 0, orders: o[id] ?? 0 }; });
      setCounts(m);
    })();
    return () => { cancelled = true; };
  }, [ids.join(",")]);

  const columns: AdminColumn<Row>[] = [
    { key: "id", label: t("admin.dataManagement.col.id", "ID"), render: (r) => <code style={{ fontSize: 10, color: "#5e5e58" }}>{r.id.slice(0, 8)}</code> },
    { key: "no", label: "#", render: (r) => r.offer_number ?? "—" },
    { key: "supplier", label: t("admin.dataManagement.col.supplier", "Supplier"), render: (r) => r.supplier_name || "—" },
    { key: "status", label: t("admin.dataManagement.col.status", "Status"), render: (r) => r.status ?? "—" },
    { key: "items", label: t("admin.dataManagement.col.items", "Items"), render: (r) => <ChildCountBadge total={counts[r.id]?.items ?? 0} /> },
    { key: "negs", label: t("admin.dataManagement.col.negotiations", "Negotiations"), render: (r) => <ChildCountBadge total={counts[r.id]?.negs ?? 0} /> },
    { key: "orders", label: t("admin.dataManagement.col.orders", "Orders"), render: (r) => <ChildCountBadge total={counts[r.id]?.orders ?? 0} /> },
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
            {["draft","active","paused","expired","archived"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder={t("admin.dataManagement.filter.supplier", "Supplier…")}
            value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ ...filterInputStyle, width: 160 }} />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={filterInputStyle} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={filterInputStyle} />
        </>
      )}
    />
  );
}