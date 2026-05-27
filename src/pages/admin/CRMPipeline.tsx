import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, LayoutGrid, List as ListIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DocsTab } from "@/components/admin/docs/DocsTab";
import { WeeklyLearningLog } from "@/components/admin/learnings/WeeklyLearningLog";
import { CountryFilterPopover } from "@/components/admin/CountryFilterPopover";
import { countryFlag } from "@/lib/countryFlags";

type Tab = "pipeline" | "buyers" | "suppliers" | "interviews" | "learnings" | "documents";

type Contact = {
  id: string;
  full_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  is_primary: boolean | null;
};

type Company = {
  id: string;
  name: string;
  company_type: string | null;
  country: string | null;
  market_region: string | null;
  website: string | null;
  stage: string | null;
  notes: string | null;
  owner_id?: string | null;
  industry?: string | null;
  logo_url?: string | null;
  created_at?: string | null;
  crm_contacts: Contact[];
};

type Interview = {
  id: string;
  crm_company_id: string;
  crm_contact_id: string | null;
  interview_date: string | null;
  duration_minutes: number | null;
  conducted_by: string | null;
  pain_points: string | null;
  key_quotes: string | null;
  takeaways: string | null;
  next_steps: string | null;
  recording_url: string | null;
};

type Learning = {
  id: string;
  week_start: string;
  theme: string;
  insight: string;
  source_company_ids: string[];
  category: string | null;
};

const STAGE_BUCKETS: Array<{ key: string; stages: string[]; color: string }> = [
  { key: "cold", stages: ["cold"], color: "#94a3b8" },
  { key: "contacted", stages: ["warm", "contacted", "qualified"], color: "#3b82f6" },
  { key: "demo_scheduled", stages: ["demo_scheduled"], color: "#eab308" },
  { key: "demo_done", stages: ["demo_done"], color: "#a855f7" },
  { key: "active", stages: ["onboarding", "onboarded", "active"], color: "#22c55e" },
  { key: "lost", stages: ["lost"], color: "#ef4444" },
];

const ALL_STAGES = [
  "cold","warm","contacted","qualified",
  "demo_scheduled","demo_done",
  "onboarding","onboarded","active","lost",
];

function stageBadgeStyle(stage: string | null | undefined): { background: string; color: string } {
  const m: Record<string, { background: string; color: string }> = {
    cold:          { background: "#F3F4F6", color: "#374151" },
    warm:          { background: "#FEF3C7", color: "#92400E" },
    contacted:     { background: "#DBEAFE", color: "#1D4ED8" },
    qualified:     { background: "#E0E7FF", color: "#4338CA" },
    demo_scheduled:{ background: "#FCE7F3", color: "#9D174D" },
    demo_done:     { background: "#EDE9FE", color: "#5B21B6" },
    onboarding:    { background: "#CFFAFE", color: "#155E75" },
    onboarded:     { background: "#D1FAE5", color: "#065F46" },
    active:        { background: "#D1FAE5", color: "#065F46" },
    lost:          { background: "#FEE2E2", color: "#991B1B" },
  };
  return m[stage ?? "cold"] ?? m.cold;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const day = 86400000;
  if (diff < day) return "today";
  if (diff < 2 * day) return "1d ago";
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mo ago`;
  return `${Math.floor(diff / (365 * day))}y ago`;
}

function stageColor(stage: string | null | undefined): string {
  const b = STAGE_BUCKETS.find((b) => stage && b.stages.includes(stage));
  return b?.color ?? "#94a3b8";
}

function primaryContact(c: Company): Contact | null {
  if (!c.crm_contacts?.length) return null;
  return c.crm_contacts.find((x) => x.is_primary) ?? c.crm_contacts[0];
}

function startOfWeek(d: Date): string {
  const day = d.getDay(); // 0 sun..6 sat
  const diff = (day + 6) % 7; // monday-start
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  return m.toISOString().slice(0, 10);
}

export default function CRMPipeline() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("pipeline");
  const [refresh, setRefresh] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [prepStatusByCompany, setPrepStatusByCompany] = useState<Record<string, string>>({});
  const [typeFilter, setTypeFilter] = useState<"all" | "buyer" | "supplier" | "prospect">("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "list">("list");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [seniorityFilter, setSeniorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const PAGE_SIZE = 50;

  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addCompanyType, setAddCompanyType] = useState<"buyer" | "supplier">("buyer");
  const [logInterviewOpen, setLogInterviewOpen] = useState(false);
  const [addLearningOpen, setAddLearningOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: c }, { data: i }, { data: l }] = await Promise.all([
        supabase
          .from("crm_companies")
          .select("id,name,company_type,country,market_region,website,stage,notes,owner_id,industry,logo_url,created_at,crm_contacts(id,full_name,role,email,phone,linkedin,is_primary,seniority)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("crm_interviews").select("*").order("interview_date", { ascending: false }).limit(500),
        supabase.from("crm_learnings").select("*").order("week_start", { ascending: false }).limit(500),
      ]);
      if (cancelled) return;
      setCompanies((c as any) ?? []);
      setInterviews((i as any) ?? []);
      setLearnings((l as any) ?? []);
      // Load owners (users referenced as owner_id)
      const ownerIds = Array.from(new Set(((c as any[]) ?? []).map((x) => x.owner_id).filter(Boolean)));
      if (ownerIds.length > 0) {
        const { data: us } = await supabase.from("users").select("id,name,email").in("id", ownerIds);
        if (!cancelled) {
          setOwners((us ?? []).map((u: any) => ({ id: u.id, name: u.name || u.email || "Unknown" })));
        }
      }
      const { data: preps } = await supabase
        .from("crm_meeting_preps")
        .select("crm_company_id,status,created_at")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const latest: Record<string, string> = {};
      (preps ?? []).forEach((p: any) => {
        if (!latest[p.crm_company_id]) latest[p.crm_company_id] = p.status;
      });
      setPrepStatusByCompany(latest);
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  const countries = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((c) => {
      if (c.country) counts[c.country] = (counts[c.country] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [companies]);

  useEffect(() => { setPage(1); }, [search, typeFilter, stageFilter, countryFilter, ownerFilter, dateFilter, seniorityFilter, sortBy, view]);

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const day = 86400000;
    let since = 0;
    if (dateFilter === "today") { const d = new Date(); d.setHours(0,0,0,0); since = d.getTime(); }
    else if (dateFilter === "7d") since = now - 7 * day;
    else if (dateFilter === "30d") since = now - 30 * day;
    else if (dateFilter === "90d") since = now - 90 * day;
    else if (dateFilter === "year") since = new Date(new Date().getFullYear(), 0, 1).getTime();

    const out = companies.filter((c) => {
      if (typeFilter !== "all" && c.company_type !== typeFilter) return false;
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (countryFilter.length > 0 && (!c.country || !countryFilter.includes(c.country))) return false;
      if (ownerFilter === "unassigned" && c.owner_id) return false;
      if (ownerFilter !== "all" && ownerFilter !== "unassigned" && c.owner_id !== ownerFilter) return false;
      if (since > 0 && c.created_at && new Date(c.created_at).getTime() < since) return false;
      if (seniorityFilter !== "all") {
        const contacts = (c as any).crm_contacts || [];
        if (!contacts.some((x: any) => x?.seniority === seniorityFilter)) return false;
      }
      if (q) {
        const pc = primaryContact(c);
        const hay = `${c.name} ${c.country ?? ""} ${pc?.full_name ?? ""} ${pc?.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const cmp = (a: Company, b: Company) => {
      switch (sortBy) {
        case "oldest": return (a.created_at ?? "").localeCompare(b.created_at ?? "");
        case "name": return (primaryContact(a)?.full_name ?? "").localeCompare(primaryContact(b)?.full_name ?? "");
        case "company": return a.name.localeCompare(b.name);
        case "stage": return (a.stage ?? "").localeCompare(b.stage ?? "");
        case "newest":
        default: return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
    };
    return out.sort(cmp);
  }, [companies, typeFilter, search, stageFilter, countryFilter, ownerFilter, dateFilter, seniorityFilter, sortBy]);

  const activeFilterCount = [
    search.trim() !== "",
    stageFilter !== "all",
    countryFilter.length > 0,
    ownerFilter !== "all",
    dateFilter !== "all",
    typeFilter !== "all",
    seniorityFilter !== "all",
  ].filter(Boolean).length;

  function clearAllFilters() {
    setSearch(""); setStageFilter("all"); setCountryFilter([]);
    setOwnerFilter("all"); setDateFilter("all"); setTypeFilter("all"); setSeniorityFilter("all");
  }

  const grouped = useMemo(() => {
    const map: Record<string, Company[]> = {};
    STAGE_BUCKETS.forEach((b) => { map[b.key] = []; });
    filteredCompanies.forEach((c) => {
      const b = STAGE_BUCKETS.find((b) => c.stage && b.stages.includes(c.stage));
      if (b) map[b.key].push(c);
    });
    return map;
  }, [filteredCompanies]);

  async function updateStage(companyId: string, stage: string) {
    const { error } = await supabase.from("crm_companies").update({ stage }).eq("id", companyId);
    if (error) { toast.error(error.message); return; }
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, stage } : c)));
    toast.success("Stage updated");

    if (stage === "demo_scheduled") {
      try {
        const { data: existing } = await supabase
          .from("crm_meeting_preps")
          .select("id,status")
          .eq("crm_company_id", companyId)
          .in("status", ["pending", "generating", "ready"])
          .limit(1);
        if (!existing || existing.length === 0) {
          const { data: created, error: insErr } = await supabase
            .from("crm_meeting_preps")
            .insert({
              crm_company_id: companyId,
              status: "pending",
              scheduled_for: new Date(Date.now() + 3 * 86400_000).toISOString(),
            })
            .select("id")
            .single();
          if (insErr || !created) throw insErr ?? new Error("Insert failed");
          setPrepStatusByCompany((p) => ({ ...p, [companyId]: "pending" }));
          toast.info(t("admin.crm.meetingPrep.toast.autoStarted"));
          supabase.functions
            .invoke("generate-meeting-prep", { body: { meeting_prep_id: created.id } })
            .then(() => setPrepStatusByCompany((p) => ({ ...p, [companyId]: "generating" })))
            .catch((e) => toast.error(e?.message ?? "Prep generation failed"));
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Could not start meeting prep");
      }
    }
  }

  const TABS: Array<{ k: Tab; l: string }> = [
    { k: "pipeline", l: t("admin.crm.pipeline.tabs.pipeline") },
    { k: "buyers", l: t("admin.crm.pipeline.tabs.buyers") },
    { k: "suppliers", l: t("admin.crm.pipeline.tabs.suppliers") },
    { k: "interviews", l: t("admin.crm.pipeline.tabs.interviews") },
    { k: "learnings", l: t("admin.crm.pipeline.tabs.learnings") },
    { k: "documents", l: "Documents" },
  ];

  function openAddCompany(type: "buyer" | "supplier") {
    setAddCompanyType(type);
    setAddCompanyOpen(true);
  }

  return (
    <div className="adm-body">
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">CRM Pipeline</span>
          <span className="adm-page-subtle">· {companies.length} companies</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
        {TABS.map((tt) => (
          <button
            key={tt.k}
            type="button"
            onClick={() => setTab(tt.k)}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: tab === tt.k ? "2px solid #9B2251" : "2px solid transparent",
              color: tab === tt.k ? "#9B2251" : "#6b7280",
              fontWeight: tab === tt.k ? 600 : 500,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {tt.l}
          </button>
        ))}
      </div>

      {tab === "pipeline" && (
        <PipelineView
          view={view}
          setView={setView}
          grouped={grouped}
          rows={filteredCompanies}
          owners={owners}
          countries={countries}
          page={page}
          setPage={setPage}
          pageSize={PAGE_SIZE}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          search={search}
          setSearch={setSearch}
          stageFilter={stageFilter}
          setStageFilter={setStageFilter}
          countryFilter={countryFilter}
          setCountryFilter={setCountryFilter}
          ownerFilter={ownerFilter}
          setOwnerFilter={setOwnerFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          seniorityFilter={seniorityFilter}
          setSeniorityFilter={setSeniorityFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          activeFilterCount={activeFilterCount}
          clearAllFilters={clearAllFilters}
          onCard={(id) => nav(`/admin/crm/prospects/${id}`)}
          prepStatus={prepStatusByCompany}
          onPrepClick={(id) => nav(`/admin/crm/meeting-prep/${id}`)}
          onStageChange={updateStage}
        />
      )}

      {(tab === "buyers" || tab === "suppliers") && (
        <CompanyTable
          rows={filteredCompanies.filter((c) => c.company_type === (tab === "buyers" ? "buyer" : "supplier"))}
          search={search}
          setSearch={setSearch}
          onAdd={() => openAddCompany(tab === "buyers" ? "buyer" : "supplier")}
          addLabel={tab === "buyers" ? t("admin.crm.pipeline.buyers.add") : t("admin.crm.pipeline.suppliers.add")}
          onRow={(id) => nav(`/admin/crm/prospects/${id}`)}
        />
      )}

      {tab === "interviews" && (
        <InterviewsTable
          rows={interviews}
          companies={companies}
          onAdd={() => setLogInterviewOpen(true)}
        />
      )}

      {tab === "learnings" && (
        <WeeklyLearningLog />
      )}

      {tab === "documents" && (
        <DocsTab />
      )}

      <AddCompanyModal
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        defaultType={addCompanyType}
        onSaved={() => setRefresh((n) => n + 1)}
      />
      <LogInterviewModal
        open={logInterviewOpen}
        onOpenChange={setLogInterviewOpen}
        companies={companies}
        onSaved={() => setRefresh((n) => n + 1)}
      />
      <AddLearningModal
        open={addLearningOpen}
        onOpenChange={setAddLearningOpen}
        companies={companies}
        onSaved={() => setRefresh((n) => n + 1)}
      />
    </div>
  );
}

/* ───────────── Pipeline (Kanban + List) ───────────── */

type PipelineViewProps = {
  view: "kanban" | "list";
  setView: (v: "kanban" | "list") => void;
  grouped: Record<string, Company[]>;
  rows: Company[];
  owners: Array<{ id: string; name: string }>;
  countries: Array<{ name: string; count: number }>;
  page: number;
  setPage: (n: number) => void;
  pageSize: number;
  typeFilter: "all" | "buyer" | "supplier" | "prospect";
  setTypeFilter: (v: "all" | "buyer" | "supplier" | "prospect") => void;
  search: string;
  setSearch: (v: string) => void;
  stageFilter: string;
  setStageFilter: (v: string) => void;
  countryFilter: string[];
  setCountryFilter: (v: string[]) => void;
  ownerFilter: string;
  setOwnerFilter: (v: string) => void;
  dateFilter: string;
  setDateFilter: (v: string) => void;
  seniorityFilter: string;
  setSeniorityFilter: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  activeFilterCount: number;
  clearAllFilters: () => void;
  onCard: (id: string) => void;
  onStageChange: (id: string, stage: string) => void;
  prepStatus: Record<string, string>;
  onPrepClick: (id: string) => void;
};

function PipelineView(p: PipelineViewProps) {
  const { t } = useTranslation();
  const ownerMap = useMemo(() => Object.fromEntries(p.owners.map((o) => [o.id, o.name])), [p.owners]);
  const totalCount = p.rows.length;
  const pageStart = (p.page - 1) * p.pageSize;
  const paginated = p.rows.slice(pageStart, pageStart + p.pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / p.pageSize));

  const selectStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, background: "#fff" };

  return (
    <>
      {/* Top bar: type segmented + view toggle */}
      <div className="crm-toolbar" style={{ marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
        <div className="crm-seg">
          {(["all", "buyer", "supplier", "prospect"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`crm-seg-btn ${p.typeFilter === r ? "is-active" : ""}`}
              onClick={() => p.setTypeFilter(r)}
            >
              {t(`admin.crm.pipeline.filters.${r}`)}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: "#F3F4F6", borderRadius: 8, padding: 2 }}>
          <button
            type="button"
            onClick={() => p.setView("list")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: p.view === "list" ? "#fff" : "transparent",
              border: "none", cursor: "pointer",
              boxShadow: p.view === "list" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              color: p.view === "list" ? "#111827" : "#6b7280",
            }}
          ><ListIcon size={13} /> List</button>
          <button
            type="button"
            onClick={() => p.setView("kanban")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: p.view === "kanban" ? "#fff" : "transparent",
              border: "none", cursor: "pointer",
              boxShadow: p.view === "kanban" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              color: p.view === "kanban" ? "#111827" : "#6b7280",
            }}
          ><LayoutGrid size={13} /> Board</button>
        </div>
      </div>

      {/* Smart filters row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            value={p.search}
            onChange={(e) => p.setSearch(e.target.value)}
            placeholder="Search company, contact, email..."
            style={{ width: "100%", padding: "7px 10px 7px 32px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13 }}
          />
        </div>
        <select value={p.stageFilter} onChange={(e) => p.setStageFilter(e.target.value)} style={selectStyle}>
          <option value="all">All stages</option>
          {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <CountryFilterPopover
          countries={p.countries}
          selected={p.countryFilter}
          onChange={p.setCountryFilter}
        />
        <select value={p.ownerFilter} onChange={(e) => p.setOwnerFilter(e.target.value)} style={selectStyle}>
          <option value="all">👤 All owners</option>
          <option value="unassigned">— Unassigned</option>
          {p.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={p.dateFilter} onChange={(e) => p.setDateFilter(e.target.value)} style={selectStyle}>
          <option value="all">📅 All time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="year">This year</option>
        </select>
        <select value={p.sortBy} onChange={(e) => p.setSortBy(e.target.value)} style={selectStyle}>
          <option value="newest">↓ Newest first</option>
          <option value="oldest">↑ Oldest first</option>
          <option value="name">A-Z Contact</option>
          <option value="company">A-Z Company</option>
          <option value="stage">By stage</option>
        </select>
        {p.activeFilterCount > 0 && (
          <button
            type="button"
            onClick={p.clearAllFilters}
            style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: "1px solid #EF4444", color: "#EF4444", background: "#FEF2F2", cursor: "pointer",
            }}
          >
            ✕ Clear filters ({p.activeFilterCount})
          </button>
        )}
        <span style={{ fontSize: 12, color: "#6B7280", marginLeft: "auto" }}>
          {totalCount.toLocaleString()} results
        </span>
      </div>

      {p.view === "list" ? (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  {["Company", "Contact", "Email", "Country", "Stage", "Owner", "Created", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => {
                  const pc = primaryContact(c);
                  const badge = stageBadgeStyle(c.stage);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => p.onCard(c.id)}
                      style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, background: "#F3F4F6",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700, color: "#9B2251", flexShrink: 0, overflow: "hidden",
                          }}>
                            {c.logo_url
                              ? <img src={c.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                              : (c.name?.slice(0, 2).toUpperCase() ?? "??")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{c.industry ?? c.company_type ?? ""}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 500 }}>{pc?.full_name ?? "—"}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{pc?.role ?? ""}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12 }}>{pc?.email ?? "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{countryFlag(c.country)}</span>
                          <span>{c.country ?? "—"}</span>
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: badge.background, color: badge.color,
                        }}>{c.stage ?? "cold"}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12 }}>
                        {c.owner_id ? (ownerMap[c.owner_id] ?? "—") : <span style={{ color: "#9CA3AF" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280" }}>
                        {c.created_at ? formatRelative(c.created_at) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); p.onCard(c.id); }}
                          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, border: "1px solid #D1D5DB", background: "#fff", cursor: "pointer" }}
                        >View</button>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 36, color: "#9ca3af", fontSize: 13 }}>No prospects match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalCount > p.pageSize && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                Showing {pageStart + 1}-{Math.min(p.page * p.pageSize, totalCount)} of {totalCount.toLocaleString()}
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  type="button"
                  disabled={p.page <= 1}
                  onClick={() => p.setPage(p.page - 1)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #D1D5DB", background: "#fff", fontSize: 12, cursor: p.page <= 1 ? "not-allowed" : "pointer", opacity: p.page <= 1 ? 0.5 : 1 }}
                >← Prev</button>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{p.page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={p.page >= totalPages}
                  onClick={() => p.setPage(p.page + 1)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #D1D5DB", background: "#fff", fontSize: 12, cursor: p.page >= totalPages ? "not-allowed" : "pointer", opacity: p.page >= totalPages ? 0.5 : 1 }}
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(220px, 1fr))",
          gap: 12,
          overflowX: "auto",
        }}
      >
        {STAGE_BUCKETS.map((b) => (
          <div
            key={b.key}
            style={{
              background: "#f8fafc",
              borderRadius: 8,
              padding: 10,
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  background: b.color,
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {t(`admin.crm.pipeline.stages.${b.key}`)}
              </span>
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                {p.grouped[b.key].length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {p.grouped[b.key].map((c) => {
                const pc = primaryContact(c);
                return (
                  <div
                    key={c.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      padding: 10,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                    onClick={() => p.onCard(c.id)}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", display: "flex", gap: 6, alignItems: "center" }}>
                      <span>{c.country ?? "—"}</span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: c.company_type === "supplier" ? "#fef3c7" : "#dbeafe",
                          color: c.company_type === "supplier" ? "#92400e" : "#1e40af",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        {c.company_type ?? "—"}
                      </span>
                    </div>
                    {pc && (
                      <div style={{ fontSize: 11, color: "#374151" }}>
                        {pc.full_name}
                        {pc.role ? ` · ${pc.role}` : ""}
                      </div>
                    )}
                    <select
                      onClick={(e) => e.stopPropagation()}
                      value={c.stage ?? "cold"}
                      onChange={(e) => p.onStageChange(c.id, e.target.value)}
                      style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 4,
                        background: "#fff",
                      }}
                    >
                      {ALL_STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {(c.stage === "demo_scheduled" || c.stage === "demo_done") && p.prepStatus[c.id] && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); p.onPrepClick(c.id); }}
                        style={{
                          fontSize: 10,
                          padding: "3px 8px",
                          borderRadius: 4,
                          border: "1px solid #9B2251",
                          background: "#FDF7F9",
                          color: "#9B2251",
                          fontWeight: 600,
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        📋 {c.stage === "demo_done" ? "Brief" : "Prep"} · {p.prepStatus[c.id]}
                      </button>
                    )}
                  </div>
                );
              })}
              {p.grouped[b.key].length === 0 && (
                <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: 12 }}>—</div>
              )}
            </div>
          </div>
        ))}
        </div>
      )}
    </>
  );
}

/* ───────────── Buyers / Suppliers Table ───────────── */

function CompanyTable({
  rows, search, setSearch, onAdd, addLabel, onRow,
}: {
  rows: Company[];
  search: string;
  setSearch: (v: string) => void;
  onAdd: () => void;
  addLabel: string;
  onRow: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="crm-toolbar" style={{ marginBottom: 12 }}>
        <div className="adm-search" style={{ flex: 1 }}>
          <Search size={14} />
          <input
            placeholder={t("admin.crm.pipeline.filters.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="crm-btn-primary" onClick={onAdd}>
          <Plus size={14} /> {addLabel}
        </button>
      </div>

      <div className="adm-panel" style={{ padding: 0 }}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t("admin.crm.pipeline.table.company")}</th>
                <th>{t("admin.crm.pipeline.table.persona")}</th>
                <th>{t("admin.crm.pipeline.table.contact")}</th>
                <th>{t("admin.crm.pipeline.table.email")}</th>
                <th>{t("admin.crm.pipeline.table.phone")}</th>
                <th>{t("admin.crm.pipeline.table.linkedin")}</th>
                <th>{t("admin.crm.pipeline.table.country")}</th>
                <th>{t("admin.crm.pipeline.table.stage")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const pc = primaryContact(c);
                return (
                  <tr key={c.id} className="crm-row" onClick={() => onRow(c.id)} style={{ cursor: "pointer" }}>
                    <td><strong>{c.name}</strong></td>
                    <td>{pc?.role ?? "—"}</td>
                    <td>{pc?.full_name ?? "—"}</td>
                    <td>{pc?.email ?? "—"}</td>
                    <td>{pc?.phone ?? "—"}</td>
                    <td>
                      {pc?.linkedin ? (
                        <a href={pc.linkedin} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                          link
                        </a>
                      ) : "—"}
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{countryFlag(c.country)}</span>
                        <span>{c.country ?? "—"}</span>
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#fff",
                          background: stageColor(c.stage),
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        {c.stage ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 28, color: "#9ca3af" }}>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ───────────── Interviews ───────────── */

function InterviewsTable({
  rows, companies, onAdd,
}: {
  rows: Interview[];
  companies: Company[];
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const companyMap = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c])), [companies]);

  return (
    <>
      <div className="crm-toolbar" style={{ marginBottom: 12, justifyContent: "flex-end" }}>
        <button type="button" className="crm-btn-primary" onClick={onAdd}>
          <Plus size={14} /> {t("admin.crm.pipeline.interviews.add")}
        </button>
      </div>
      <div className="adm-panel" style={{ padding: 0 }}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t("admin.crm.pipeline.interviews.company")}</th>
                <th>{t("admin.crm.pipeline.interviews.contact")}</th>
                <th>{t("admin.crm.pipeline.interviews.date")}</th>
                <th>{t("admin.crm.pipeline.interviews.duration")}</th>
                <th>{t("admin.crm.pipeline.interviews.painPoints")}</th>
                <th>{t("admin.crm.pipeline.interviews.takeaways")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((iv) => {
                const co = companyMap[iv.crm_company_id];
                const ct = co?.crm_contacts.find((x) => x.id === iv.crm_contact_id);
                return (
                  <tr key={iv.id}>
                    <td>{co?.name ?? "—"}</td>
                    <td>{ct?.full_name ?? "—"}</td>
                    <td>{iv.interview_date ?? "—"}</td>
                    <td>{iv.duration_minutes ? `${iv.duration_minutes} min` : "—"}</td>
                    <td style={{ maxWidth: 240 }}>{(iv.pain_points ?? "").slice(0, 80)}{(iv.pain_points?.length ?? 0) > 80 ? "…" : ""}</td>
                    <td style={{ maxWidth: 240 }}>{(iv.takeaways ?? "").slice(0, 80)}{(iv.takeaways?.length ?? 0) > 80 ? "…" : ""}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 28, color: "#9ca3af" }}>
                  {t("admin.crm.pipeline.interviews.empty")}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ───────────── Learnings ───────────── */

function LearningsView({
  rows, companies, onAdd,
}: {
  rows: Learning[];
  companies: Company[];
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const companyMap = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);
  const grouped = useMemo(() => {
    const m: Record<string, Learning[]> = {};
    rows.forEach((l) => {
      (m[l.week_start] ||= []).push(l);
    });
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  return (
    <>
      <div className="crm-toolbar" style={{ marginBottom: 12, justifyContent: "flex-end" }}>
        <button type="button" className="crm-btn-primary" onClick={onAdd}>
          <Plus size={14} /> {t("admin.crm.pipeline.learnings.add")}
        </button>
      </div>

      {grouped.length === 0 && (
        <div className="adm-panel" style={{ padding: 28, textAlign: "center", color: "#9ca3af" }}>
          {t("admin.crm.pipeline.learnings.empty")}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {grouped.map(([week, list]) => (
          <div key={week} className="adm-panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9B2251", marginBottom: 12 }}>
              {t("admin.crm.pipeline.learnings.week")} {week}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {list.map((l) => (
                <div key={l.id} style={{ borderLeft: "3px solid #9B2251", paddingLeft: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{l.theme}</div>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>{l.insight}</div>
                  {l.category && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{l.category}</span>
                  )}
                  {l.source_company_ids?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {l.source_company_ids.map((id) => (
                        <span
                          key={id}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            background: "#f3f4f6",
                            borderRadius: 4,
                          }}
                        >
                          {companyMap[id] ?? "—"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────── Modals ───────────── */

function AddCompanyModal({
  open, onOpenChange, defaultType, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType: "buyer" | "supplier";
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", type: defaultType, country: "", market_region: "",
    website: "", stage: "cold", source: "wms_import",
    contactName: "", contactRole: "", contactEmail: "", contactPhone: "", contactLinkedin: "",
    notes: "",
  });

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, type: defaultType }));
  }, [open, defaultType]);

  const upd = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setBusy(true);
    try {
      const { data: co, error } = await supabase
        .from("crm_companies")
        .insert({
          name: form.name.trim(),
          company_type: form.type,
          country: form.country || null,
          market_region: form.market_region || null,
          website: form.website || null,
          stage: form.stage,
          source: form.source,
          notes: form.notes || null,
        })
        .select("id")
        .single();
      if (error || !co) throw error ?? new Error("Insert failed");

      if (form.contactName.trim()) {
        await supabase.from("crm_contacts").insert({
          company_id: co.id,
          full_name: form.contactName.trim(),
          role: form.contactRole || null,
          email: form.contactEmail || null,
          phone: form.contactPhone || null,
          linkedin: form.contactLinkedin || null,
          is_primary: true,
        });
      }

      toast.success("Company added");
      onSaved();
      onOpenChange(false);
      setForm({
        name: "", type: defaultType, country: "", market_region: "",
        website: "", stage: "cold", source: "wms_import",
        contactName: "", contactRole: "", contactEmail: "", contactPhone: "", contactLinkedin: "",
        notes: "",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="crm-dialog">
        <DialogHeader>
          <DialogTitle>{t("admin.crm.pipeline.modal.addCompany")}</DialogTitle>
        </DialogHeader>
        <form className="crm-form" onSubmit={submit}>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.name")} *</span>
            <input value={form.name} onChange={(e) => upd("name", e.target.value)} required />
          </label>
          <div className="crm-form-row">
            <label className="crm-field"><span>{t("admin.crm.pipeline.modal.type")}</span>
              <select value={form.type} onChange={(e) => upd("type", e.target.value as any)}>
                <option value="buyer">buyer</option>
                <option value="supplier">supplier</option>
              </select>
            </label>
            <label className="crm-field"><span>{t("admin.crm.pipeline.modal.stage")}</span>
              <select value={form.stage} onChange={(e) => upd("stage", e.target.value)}>
                {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="crm-form-row">
            <label className="crm-field"><span>{t("admin.crm.pipeline.modal.country")}</span>
              <input value={form.country} onChange={(e) => upd("country", e.target.value)} />
            </label>
            <label className="crm-field"><span>{t("admin.crm.pipeline.modal.marketRegion")}</span>
              <input value={form.market_region} onChange={(e) => upd("market_region", e.target.value)} />
            </label>
          </div>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.website")}</span>
            <input value={form.website} onChange={(e) => upd("website", e.target.value)} />
          </label>
          <div className="crm-form-row">
            <label className="crm-field"><span>{t("admin.crm.pipeline.modal.contactName")}</span>
              <input value={form.contactName} onChange={(e) => upd("contactName", e.target.value)} />
            </label>
            <label className="crm-field"><span>{t("admin.crm.pipeline.modal.contactRole")}</span>
              <input value={form.contactRole} onChange={(e) => upd("contactRole", e.target.value)} />
            </label>
          </div>
          <div className="crm-form-row">
            <label className="crm-field"><span>{t("admin.crm.pipeline.modal.contactEmail")}</span>
              <input type="email" value={form.contactEmail} onChange={(e) => upd("contactEmail", e.target.value)} />
            </label>
            <label className="crm-field"><span>{t("admin.crm.pipeline.modal.contactPhone")}</span>
              <input value={form.contactPhone} onChange={(e) => upd("contactPhone", e.target.value)} />
            </label>
          </div>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.contactLinkedin")}</span>
            <input value={form.contactLinkedin} onChange={(e) => upd("contactLinkedin", e.target.value)} />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.notes")}</span>
            <textarea rows={3} value={form.notes} onChange={(e) => upd("notes", e.target.value)} />
          </label>
          <DialogFooter>
            <button type="button" className="crm-btn-outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t("admin.crm.pipeline.modal.cancel")}
            </button>
            <button type="submit" className="crm-btn-primary" disabled={busy}>
              {busy ? "…" : t("admin.crm.pipeline.modal.submit")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogInterviewModal({
  open, onOpenChange, companies, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companies: Company[];
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    company_id: "", contact_id: "", date: new Date().toISOString().slice(0, 10),
    duration: "", conducted_by: "", pain_points: "", key_quotes: "",
    takeaways: "", next_steps: "", recording_url: "",
  });

  const selectedCompany = companies.find((c) => c.id === form.company_id);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.company_id) { toast.error("Pick a company"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("crm_interviews").insert({
        crm_company_id: form.company_id,
        crm_contact_id: form.contact_id || null,
        interview_date: form.date || null,
        duration_minutes: form.duration ? Number(form.duration) : null,
        conducted_by: form.conducted_by || null,
        pain_points: form.pain_points || null,
        key_quotes: form.key_quotes || null,
        takeaways: form.takeaways || null,
        next_steps: form.next_steps || null,
        recording_url: form.recording_url || null,
      });
      if (error) throw error;
      toast.success("Interview logged");
      onSaved();
      onOpenChange(false);
      setForm({
        company_id: "", contact_id: "", date: new Date().toISOString().slice(0, 10),
        duration: "", conducted_by: "", pain_points: "", key_quotes: "",
        takeaways: "", next_steps: "", recording_url: "",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="crm-dialog">
        <DialogHeader>
          <DialogTitle>{t("admin.crm.pipeline.modal.logInterview")}</DialogTitle>
        </DialogHeader>
        <form className="crm-form" onSubmit={submit}>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.pickCompany")} *</span>
            <select value={form.company_id} onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value, contact_id: "" }))} required>
              <option value="">—</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.pickContact")}</span>
            <select value={form.contact_id} onChange={(e) => setForm((f) => ({ ...f, contact_id: e.target.value }))}>
              <option value="">—</option>
              {selectedCompany?.crm_contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </label>
          <div className="crm-form-row">
            <label className="crm-field"><span>{t("admin.crm.pipeline.interviews.date")}</span>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </label>
            <label className="crm-field"><span>{t("admin.crm.pipeline.modal.duration")}</span>
              <input type="number" min="0" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
            </label>
          </div>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.conductedBy")}</span>
            <input value={form.conducted_by} onChange={(e) => setForm((f) => ({ ...f, conducted_by: e.target.value }))} />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.painPoints")}</span>
            <textarea rows={2} value={form.pain_points} onChange={(e) => setForm((f) => ({ ...f, pain_points: e.target.value }))} />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.keyQuotes")}</span>
            <textarea rows={2} value={form.key_quotes} onChange={(e) => setForm((f) => ({ ...f, key_quotes: e.target.value }))} />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.takeaways")}</span>
            <textarea rows={2} value={form.takeaways} onChange={(e) => setForm((f) => ({ ...f, takeaways: e.target.value }))} />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.nextSteps")}</span>
            <textarea rows={2} value={form.next_steps} onChange={(e) => setForm((f) => ({ ...f, next_steps: e.target.value }))} />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.recordingUrl")}</span>
            <input value={form.recording_url} onChange={(e) => setForm((f) => ({ ...f, recording_url: e.target.value }))} />
          </label>
          <DialogFooter>
            <button type="button" className="crm-btn-outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t("admin.crm.pipeline.modal.cancel")}
            </button>
            <button type="submit" className="crm-btn-primary" disabled={busy}>
              {busy ? "…" : t("admin.crm.pipeline.modal.submit")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddLearningModal({
  open, onOpenChange, companies, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companies: Company[];
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    week_start: startOfWeek(new Date()),
    theme: "", insight: "", category: "",
    source_company_ids: [] as string[],
  });

  function toggleCo(id: string) {
    setForm((f) => ({
      ...f,
      source_company_ids: f.source_company_ids.includes(id)
        ? f.source_company_ids.filter((x) => x !== id)
        : [...f.source_company_ids, id],
    }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.theme.trim() || !form.insight.trim()) { toast.error("Theme & insight required"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("crm_learnings").insert({
        week_start: form.week_start,
        theme: form.theme.trim(),
        insight: form.insight.trim(),
        category: form.category || null,
        source_company_ids: form.source_company_ids,
      });
      if (error) throw error;
      toast.success("Learning saved");
      onSaved();
      onOpenChange(false);
      setForm({
        week_start: startOfWeek(new Date()),
        theme: "", insight: "", category: "",
        source_company_ids: [],
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="crm-dialog">
        <DialogHeader>
          <DialogTitle>{t("admin.crm.pipeline.modal.addLearning")}</DialogTitle>
        </DialogHeader>
        <form className="crm-form" onSubmit={submit}>
          <label className="crm-field"><span>{t("admin.crm.pipeline.modal.weekStart")}</span>
            <input type="date" value={form.week_start} onChange={(e) => setForm((f) => ({ ...f, week_start: e.target.value }))} />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.learnings.theme")} *</span>
            <input value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))} required />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.learnings.insight")} *</span>
            <textarea rows={3} value={form.insight} onChange={(e) => setForm((f) => ({ ...f, insight: e.target.value }))} required />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.learnings.category")}</span>
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </label>
          <label className="crm-field"><span>{t("admin.crm.pipeline.learnings.sources")}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflowY: "auto", padding: 6, border: "1px solid #e5e7eb", borderRadius: 6 }}>
              {companies.map((c) => {
                const on = form.source_company_ids.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCo(c.id)}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: "1px solid",
                      borderColor: on ? "#9B2251" : "#e5e7eb",
                      background: on ? "#9B2251" : "#fff",
                      color: on ? "#fff" : "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </label>
          <DialogFooter>
            <button type="button" className="crm-btn-outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t("admin.crm.pipeline.modal.cancel")}
            </button>
            <button type="submit" className="crm-btn-primary" disabled={busy}>
              {busy ? "…" : t("admin.crm.pipeline.modal.submit")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}