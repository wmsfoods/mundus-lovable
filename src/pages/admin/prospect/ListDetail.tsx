import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Trash2, Search, Download, ExternalLink, Linkedin, Building, Upload, Workflow } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { PspPagination } from "@/components/prospect/Pagination";

const WINE = "#8B2252";

type ListRow = { id: string; name: string; created_at: string };
type Item = {
  id: string;
  company_name: string;
  domain: string | null;
  logo_url: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  employees: number | null;
  revenue: number | null;
  founded: string | null;
  website: string | null;
  linkedin: string | null;
};

function fmtNum(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString();
}
function fmtRev(n: number | null) {
  if (!n) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const tr = (k: string, v?: Record<string, unknown>) =>
    t(`admin.prospect.lists.${k}`, v as never) as unknown as string;

  const [list, setList] = useState<ListRow | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pageSize = 25;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [listRes, itemsRes] = await Promise.all([
      supabase.from("crm_lists").select("id,name,created_at").eq("id", id).single(),
      supabase.from("crm_list_items").select("*").eq("list_id", id).order("added_at", { ascending: false }),
    ]);
    if (listRes.error) toast.error(listRes.error.message);
    setList((listRes.data as ListRow) ?? null);
    setItems((itemsRes.data as Item[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.company_name.toLowerCase().includes(q) ||
      (i.domain ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const removeItem = async (itemId: string) => {
    const { error } = await supabase.from("crm_list_items").delete().eq("id", itemId);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("removed"));
    setItems((arr) => arr.filter((i) => i.id !== itemId));
    if (list) await supabase.from("crm_lists").update({ record_count: items.length - 1 }).eq("id", list.id);
  };

  const deleteList = async () => {
    if (!id) return;
    setConfirmDelete(false);
    const { error } = await supabase.from("crm_lists").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("deleted"));
    nav("/admin/prospect/lists");
  };

  const exportCsv = () => {
    const csv = ["Name,Domain,Industry,Country,City,Employees,Revenue,Founded,Website,LinkedIn",
      ...filtered.map((c) => `"${c.company_name}","${c.domain ?? ""}","${c.industry ?? ""}","${c.country ?? ""}","${c.city ?? ""}",${c.employees ?? ""},${c.revenue ?? ""},"${c.founded ?? ""}","${c.website ?? ""}","${c.linkedin ?? ""}"`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${list?.name ?? "list"}.csv`; a.click();
    toast.success(`Exported ${filtered.length} rows`);
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    try { return new Intl.DateTimeFormat(i18n.language || "en", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(iso)); }
    catch { return iso; }
  };

  if (loading) return <div className="psp-page"><div className="psp-empty" style={{ padding: 60 }}>Loading…</div></div>;
  if (!list) return <div className="psp-page"><div className="psp-empty" style={{ padding: 60 }}>List not found</div></div>;

  return (
    <div className="psp-page">
      {/* Header */}
      <div className="psp-toolbar" style={{ flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => nav("/admin/prospect/lists")}
          className="psp-btn ghost"
          aria-label={tr("back")}
        >
          <ArrowLeft size={14} /> {tr("back")}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--adm-text)" }}>{list.name}</div>
          <div style={{ fontSize: 11, color: "var(--adm-text-tertiary)" }}>
            {tr("itemCount", { count: items.length })} · {tr("created", { date: fmtDate(list.created_at) })}
          </div>
        </div>
        {items.length > 0 && (
          <button className="psp-btn ghost" onClick={exportCsv}>
            <Download size={12} /> {tr("export")}
          </button>
        )}
        <button
          className="psp-btn ghost"
          onClick={() => setConfirmDelete(true)}
          style={{ color: "#dc2626" }}
        >
          <Trash2 size={12} /> {tr("deleteList")}
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Building size={32} style={{ margin: "0 auto 12px", display: "block", color: "var(--adm-text-tertiary)" }} />
            <p style={{ fontWeight: 600, color: "var(--adm-text)", marginBottom: 4 }}>{tr("emptyList")}</p>
            <p style={{ fontSize: 13, color: "var(--adm-text-tertiary)" }}>{tr("emptyListDesc")}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, maxWidth: 900, margin: "0 auto" }}>
            <ActionCard
              icon={<Search size={18} />}
              title={tr("findCompanies")}
              desc={tr("findCompaniesDesc")}
              onClick={() => nav(`/admin/prospect/companies?listId=${list.id}`)}
            />
            <ActionCard
              icon={<Upload size={18} />}
              title={tr("importCsv")}
              desc={tr("importCsvDesc")}
              onClick={() => toast.info("Coming soon")}
            />
            <ActionCard
              icon={<Workflow size={18} />}
              title={tr("createWorkflow")}
              desc={tr("createWorkflowDesc")}
              onClick={() => toast.info("Coming soon")}
            />
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--adm-border)", background: "#fff" }}>
            <div className="psp-search" style={{ maxWidth: 320 }}>
              <Search size={14} className="psp-search-icon" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={tr("searchPlaceholder")}
              />
            </div>
          </div>

          <div className="psp-results">
            <div className="psp-results-scroll">
              <table className="psp-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Employees</th>
                    <th>Revenue</th>
                    <th>Founded</th>
                    <th>Links</th>
                    <th style={{ width: 90 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="psp-company-cell">
                          {c.logo_url
                            ? <img src={c.logo_url} alt="" />
                            : <span style={{ width: 28, height: 28, borderRadius: 6, background: `${WINE}15`, display: "inline-flex", alignItems: "center", justifyContent: "center", color: WINE, fontSize: 11, fontWeight: 600 }}>{c.company_name.slice(0, 2).toUpperCase()}</span>}
                          <div>
                            <div className="name">{c.company_name}</div>
                            <div className="domain">{c.domain ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.industry ? <span className="psp-tag">{c.industry}</span> : "—"}</td>
                      <td>{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                      <td>{fmtNum(c.employees)}</td>
                      <td>{fmtRev(c.revenue)}</td>
                      <td>{c.founded || "—"}</td>
                      <td>
                        <span style={{ display: "inline-flex", gap: 8 }}>
                          {c.website && <a className="psp-icon-link" href={c.website} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>}
                          {c.linkedin && <a className="psp-icon-link" href={c.linkedin} target="_blank" rel="noreferrer"><Linkedin size={14} /></a>}
                        </span>
                      </td>
                      <td>
                        <button className="psp-btn ghost" onClick={() => removeItem(c.id)} style={{ color: "#dc2626" }}>
                          <Trash2 size={12} /> {tr("removeFromList")}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pageItems.length === 0 && (
                    <tr><td colSpan={8} className="psp-empty">No matches</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PspPagination total={filtered.length} page={page} pageSize={pageSize} onChange={setPage} />
          </div>
        </>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("deleteList")}</AlertDialogTitle>
            <AlertDialogDescription>{tr("deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteList} style={{ background: "#dc2626" }}>
              {tr("deleteList")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "#fff", border: "1px solid var(--adm-border, #e5e7eb)", borderRadius: 10,
        padding: 16, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8,
        transition: "border-color 120ms, box-shadow 120ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = WINE; e.currentTarget.style.boxShadow = "0 2px 10px rgba(139,34,82,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--adm-border, #e5e7eb)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <span style={{
        width: 36, height: 36, borderRadius: 8, background: `${WINE}15`, color: WINE,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</span>
      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--adm-text)" }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--adm-text-tertiary)", lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}