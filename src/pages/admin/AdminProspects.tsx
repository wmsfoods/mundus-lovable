import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Upload, Plus, KanbanSquare, Table as TableIcon } from "lucide-react";
import {
  useAdminProspects, getStageCounts, STAGES,
  OWNERS, type ProspectStage,
  type Prospect,
} from "@/hooks/useAdminProspects";
import { AddProspectModal } from "@/components/admin/AddProspectModal";
import { ImportProspectsModal } from "@/components/admin/ImportProspectsModal";
import { supabase } from "@/integrations/supabase/client";

const fmtGmv = (v?: number) =>
  v == null ? "—" : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}k`;

export default function AdminProspects() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const mockList = useAdminProspects();
  const [dbList, setDbList] = useState<Prospect[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("crm_companies")
        .select("id,name,domain,country,city,company_type,stage,source,created_at,updated_at,annual_revenue,industry,website,linkedin_url,crm_contacts(id,full_name,email,phone,linkedin)")
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
          source: (c.source as any) || "manual",
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
          isOnboarded: stage === "onboarded",
        } as Prospect;
      });
      setDbList(mapped);
    })();
    return () => { cancelled = true; };
  }, []);

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
      <div className="adm-panel" style={{ padding: 0 }}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>{t("admin.crm.table.company")}</th>
                <th>{t("admin.crm.table.role")}</th>
                <th>{t("admin.crm.table.stage")}</th>
                <th>{t("admin.crm.table.source")}</th>
                <th>{t("admin.crm.table.country")}</th>
                <th style={{ textAlign: "right" }}>{t("admin.crm.table.estGmv")}</th>
                <th>{t("admin.crm.table.owner")}</th>
                <th>{t("admin.crm.table.lastActivity")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="crm-row" onClick={() => nav(`/admin/crm/prospects/${p.id}`)}>
                  <td>
                    <div className="adm-table-company">
                      <span className="adm-table-av crm-av-blue">{p.initials}</span>
                      <div className="crm-cell-stack">
                        <span className="name">{p.companyName}</span>
                        <span className="mono">{p.country} · #{p.id}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="pill info">{t(`admin.crm.roles.${p.role}`)}</span></td>
                  <td><span className={`pill stage-${p.stage}`}>{t(`admin.crm.stages.${p.stage}`)}</span></td>
                  <td><span className={`crm-source ${p.source}`}>{t(`admin.crm.sources.${p.source}`)}</span></td>
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
    </div>
  );
}