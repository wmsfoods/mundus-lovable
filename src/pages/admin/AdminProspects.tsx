import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Upload, Plus, KanbanSquare, Table as TableIcon, Trash2, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useAdminProspects, getStageCounts, STAGES,
  OWNERS, type ProspectStage,
  type Prospect,
} from "@/hooks/useAdminProspects";
import { AddProspectModal } from "@/components/admin/AddProspectModal";
import { ImportProspectsModal } from "@/components/admin/ImportProspectsModal";
import { supabase } from "@/integrations/supabase/client";
import { bulkEnrichByCompanyIds } from "@/lib/prospectEnrich";

const fmtGmv = (v?: number) =>
  v == null ? "—" : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}k`;

export default function AdminProspects() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const mockList = useAdminProspects();
  const [dbList, setDbList] = useState<Prospect[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("crm_companies")
        .select("id,name,domain,country,city,company_type,stage,source,created_at,updated_at,annual_revenue,industry,website,linkedin_url,onboarded_at,mundus_company_id,crm_contacts(id,full_name,email,phone,linkedin)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled || !data) return;
      const mapped: Prospect[] = data.map((c: any) => {
        const primary = c.crm_contacts?.[0] ?? null;
        const stageMap: Record<string, ProspectStage> = {
          cold: "new", warm: "researching", contacted: "contacted",
          qualified: "qualified", onboarding: "onboarding",
          onboarded: "onboarded", lost: "lost",
        };
        const stage = stageMap[c.stage] ?? "new";
        const role = c.company_type === "supplier" ? "potential_supplier" : "potential_buyer";
        return {
          id: c.id,
          companyName: c.name,
          initials: (c.name || "?").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "?",
          country: c.country || "—",
          role,
          source: (c.source as any) || "wms_import",
          contactName: primary?.full_name || "—",
          contactEmail: primary?.email || "—",
          contactPhone: primary?.phone || undefined,
          notes: "",
          stage,
          owner: "FN",
          ownerName: "Fernando Nascimento",
          estGmv: c.annual_revenue ?? undefined,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          lastActivity: { type: "system", when: "just now" },
          activity: [],
          leadType: role === "potential_buyer" ? "buyer" : "supplier",
          city: c.city ?? undefined,
          industry: c.industry ?? undefined,
          website: c.website ?? undefined,
          companyLinkedin: c.linkedin_url ?? undefined,
          contacts: [],
          isActive: true,
          isOnboarded: stage === "onboarded" || !!c.onboarded_at,
          mundusCompanyId: c.mundus_company_id ?? undefined,
        } as Prospect;
      });
      setDbList(mapped);
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  const list = useMemo(() => [...dbList, ...mockList], [dbList, mockList]);

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<ProspectStage | "all">("all");
  const [role, setRole] = useState<"all" | "buyer" | "supplier">("all");
  const [owner, setOwner] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const counts = useMemo(() => getStageCounts(list), [list]);
  const totalCount = list.length;
  const activeCount = totalCount - counts.lost - counts.onboarded;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      if (stage !== "all" && p.stage !== stage) return false;
      if (role !== "all") {
        if (role === "buyer" && p.role !== "potential_buyer") return false;
        if (role === "supplier" && p.role !== "potential_supplier") return false;
      }
      if (owner !== "all" && p.owner !== owner) return false;
      if (q && !`${p.companyName} ${p.contactName} ${p.country}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [list, search, stage, role, owner]);

  const isDbId = (id: string) => !id.startsWith("pr-");
  const deletableFiltered = useMemo(
    () => filtered.filter((p) => isDbId(p.id) && !p.isOnboarded && !p.mundusCompanyId),
    [filtered],
  );
  const pageAllSelected = deletableFiltered.length > 0 && deletableFiltered.every((p) => selectedIds.has(p.id));
  const pageSomeSelected = deletableFiltered.some((p) => selectedIds.has(p.id));
  const togglePageAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) deletableFiltered.forEach((p) => next.delete(p.id));
      else deletableFiltered.forEach((p) => next.add(p.id));
      return next;
    });
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setDeleting(true);
    try {
      await supabase.from("crm_contacts").delete().in("company_id", ids);
      const { error } = await supabase.from("crm_companies").delete().in("id", ids);
      if (error) throw error;
      toast.success(t("admin.crm.bulkDelete.success", { count: ids.length, defaultValue: "{{count}} prospect(s) deleted" }));
      clearSelection();
      setConfirmDelete(false);
      setRefreshTick((n) => n + 1);
    } catch (e: any) {
      toast.error(e?.message || "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="adm-body">
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">{t("admin.crm.title")}</span>
          <span className="adm-page-subtle">· {t("admin.crm.subtitle", { active: activeCount, total: totalCount })}</span>
        </div>
        <div className="crm-header-actions">
          <button type="button" className="crm-btn-outline" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> {t("admin.crm.importCsv")}
          </button>
          <button type="button" className="crm-btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> {t("admin.crm.addProspect")}
          </button>
        </div>
      </div>

      {/* funnel tiles */}
      <div className="crm-funnel-tiles">
        {STAGES.map((s) => (
          <button
            type="button"
            key={s}
            className={`crm-tile ${stage === s ? "is-active" : ""}`}
            onClick={() => setStage((cur) => (cur === s ? "all" : s))}
          >
            <span className="l">{t(`admin.crm.stages.${s}`)}</span>
            <span className="v">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="crm-toolbar">
        <div className="adm-search" style={{ flex: 1 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder={t("admin.crm.filters.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="crm-seg">
          {(["all", "buyer", "supplier"] as const).map((r) => (
            <button
              type="button"
              key={r}
              className={`crm-seg-btn ${role === r ? "is-active" : ""}`}
              onClick={() => setRole(r)}
            >
              {r === "all" ? t("admin.crm.filters.allRoles") : r === "buyer" ? t("admin.crm.filters.buyers") : t("admin.crm.filters.suppliers")}
            </button>
          ))}
        </div>
        <select className="crm-select" value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="all">{t("admin.crm.filters.allOwners")}</option>
          {OWNERS.map((o) => <option key={o.initials} value={o.initials}>{o.initials} — {o.name}</option>)}
        </select>
        <div className="crm-seg">
          <button type="button" className="crm-seg-btn is-active" aria-label="Table"><TableIcon size={14} /></button>
          <Link to="/admin/crm/pipeline" className="crm-seg-btn" aria-label="Kanban"><KanbanSquare size={14} /></Link>
        </div>
      </div>

      {/* table */}
      {selectedIds.size > 0 && (
        <div
          className="adm-panel"
          style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#FEF2F2", borderColor: "#FECACA", marginBottom: 8 }}
        >
          <strong style={{ fontSize: 13 }}>
            {t("admin.crm.bulkDelete.selected", { count: selectedIds.size, defaultValue: "{{count}} selected" })}
          </strong>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="crm-btn-outline"
            disabled={enriching}
            onClick={async () => {
              const ids = [...selectedIds];
              setEnriching(true);
              setEnrichProgress({ done: 0, total: ids.length });
              toast.info(`Enriching ${ids.length} prospect(s) via Apollo…`);
              try {
                const r = await bulkEnrichByCompanyIds(ids, (done, total) =>
                  setEnrichProgress({ done, total }),
                );
                toast.success(`Enriched: ${r.success} ✓ · ${r.failed} failed`);
                setRefreshTick((x) => x + 1);
              } catch (e: any) {
                toast.error("Enrich failed: " + (e?.message ?? "unknown"));
              } finally {
                setEnriching(false);
                setEnrichProgress(null);
              }
            }}
            style={{ borderColor: "#2563EB", color: "#2563EB" }}
          >
            {enriching ? <Loader2 size={14} className="animate-spin" style={{ marginRight: 4 }} />
                       : <Sparkles size={14} style={{ marginRight: 4 }} />}
            {enriching && enrichProgress
              ? `Enriching ${enrichProgress.done}/${enrichProgress.total}`
              : t("admin.crm.bulkEnrich.button", { defaultValue: "Enrich via Apollo" })}
          </button>
          <button
            type="button"
            className="crm-btn-outline"
            disabled={deleting}
            onClick={() => setConfirmDelete(true)}
            style={{ borderColor: "#dc2626", color: "#dc2626" }}
          >
            <Trash2 size={14} style={{ marginRight: 4 }} />
            {t("admin.crm.bulkDelete.delete", { defaultValue: "Delete" })}
          </button>
          <button type="button" className="crm-btn-outline" onClick={clearSelection}>
            <X size={14} style={{ marginRight: 4 }} />
            {t("admin.crm.bulkDelete.clear", { defaultValue: "Clear" })}
          </button>
        </div>
      )}
      <div className="adm-panel" style={{ padding: 0 }}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <colgroup>
              <col style={{ width: "3%" }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr>
                <th onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={pageAllSelected ? true : pageSomeSelected ? "indeterminate" : false}
                    onCheckedChange={togglePageAll}
                    aria-label="Select page"
                  />
                </th>
                <th>{t("admin.crm.table.company")}</th>
                <th>{t("admin.crm.table.role")}</th>
                <th>{t("admin.crm.table.stage")}</th>
                <th>{t("admin.crm.table.country")}</th>
                <th style={{ textAlign: "right" }}>{t("admin.crm.table.estGmv")}</th>
                <th>{t("admin.crm.table.owner")}</th>
                <th>{t("admin.crm.table.lastActivity")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="crm-row"
                  onClick={() => nav(`/admin/crm/prospects/${p.id}`)}
                  style={selectedIds.has(p.id) ? { background: "#FEF2F2" } : undefined}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    {isDbId(p.id) && !p.isOnboarded && !p.mundusCompanyId ? (
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                        aria-label={`Select ${p.companyName}`}
                      />
                    ) : null}
                  </td>
                  <td>
                    <div className="adm-table-company">
                      <span className="adm-table-av crm-av-blue">{p.initials}</span>
                      <div className="crm-cell-stack">
                        <span className="name">{p.companyName}</span>
                        {(() => {
                          const primary = p.contacts?.find((c) => c.isPrimary) ?? p.contacts?.[0];
                          const contactName = primary?.fullName || p.contactName;
                          return (
                            <span className="crm-cell-sub">
                              {p.country}{contactName ? ` · ${contactName}` : ""}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </td>
                  <td><span className="pill info">{t(`admin.crm.roles.${p.role}`)}</span></td>
                  <td><span className={`pill stage-${p.stage}`}>{t(`admin.crm.stages.${p.stage}`)}</span></td>
                  <td><span className="mono">{p.country}</span></td>
                  <td style={{ textAlign: "right" }}>{fmtGmv(p.estGmv)}</td>
                  <td><span className="crm-owner-av">{p.owner}</span></td>
                  <td>
                    <div className="crm-cell-stack">
                      <span>{p.lastActivity?.when ?? "—"}</span>
                      <span className="crm-cell-sub">
                        {p.activity[0] ? `${p.activity[0].type}: ${p.activity[0].body.slice(0, 40)}${p.activity[0].body.length > 40 ? "…" : ""}` : ""}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 28, color: "var(--adm-text-tertiary)" }}>
                  {t("admin.crm.empty")}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddProspectModal open={addOpen} onOpenChange={setAddOpen} />
      <ImportProspectsModal open={importOpen} onOpenChange={setImportOpen} />

      {confirmDelete && (
        <>
          <div
            onClick={() => !deleting && setConfirmDelete(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50 }}
          />
          <div
            style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "min(440px, 96vw)", background: "#fff", borderRadius: 12, zIndex: 51,
              boxShadow: "0 20px 50px rgba(0,0,0,.25)", padding: 20,
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {t("admin.crm.bulkDelete.confirmTitle", { defaultValue: "Delete prospects?" })}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--adm-text-tertiary, #6b7280)" }}>
              {t("admin.crm.bulkDelete.confirmBody", { count: selectedIds.size, defaultValue: "This will permanently delete {{count}} prospect(s) and their contacts. This cannot be undone." })}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="crm-btn-outline" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>
              <button
                type="button"
                className="crm-btn-primary"
                disabled={deleting}
                onClick={handleBulkDelete}
                style={{ background: "#dc2626" }}
              >
                <Trash2 size={14} style={{ marginRight: 4 }} />
                {deleting ? "…" : t("admin.crm.bulkDelete.delete", { defaultValue: "Delete" })}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}