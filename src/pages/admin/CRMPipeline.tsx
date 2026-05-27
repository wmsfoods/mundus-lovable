import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  const [typeFilter, setTypeFilter] = useState<"all" | "buyer" | "supplier">("all");
  const [search, setSearch] = useState("");

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
          .select("id,name,company_type,country,market_region,website,stage,notes,crm_contacts(id,full_name,role,email,phone,linkedin,is_primary)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("crm_interviews").select("*").order("interview_date", { ascending: false }).limit(500),
        supabase.from("crm_learnings").select("*").order("week_start", { ascending: false }).limit(500),
      ]);
      if (cancelled) return;
      setCompanies((c as any) ?? []);
      setInterviews((i as any) ?? []);
      setLearnings((l as any) ?? []);
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

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (typeFilter !== "all" && c.company_type !== typeFilter) return false;
      if (q) {
        const pc = primaryContact(c);
        const hay = `${c.name} ${c.country ?? ""} ${pc?.full_name ?? ""} ${pc?.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [companies, typeFilter, search]);

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
        <PipelineKanban
          grouped={grouped}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          search={search}
          setSearch={setSearch}
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
        <LearningsView
          rows={learnings}
          companies={companies}
          onAdd={() => setAddLearningOpen(true)}
        />
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

/* ───────────── Pipeline (Kanban) ───────────── */

function PipelineKanban({
  grouped, typeFilter, setTypeFilter, search, setSearch, onCard, onStageChange, prepStatus, onPrepClick,
}: {
  grouped: Record<string, Company[]>;
  typeFilter: "all" | "buyer" | "supplier";
  setTypeFilter: (v: "all" | "buyer" | "supplier") => void;
  search: string;
  setSearch: (v: string) => void;
  onCard: (id: string) => void;
  onStageChange: (id: string, stage: string) => void;
  prepStatus: Record<string, string>;
  onPrepClick: (id: string) => void;
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
        <div className="crm-seg">
          {(["all", "buyer", "supplier"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`crm-seg-btn ${typeFilter === r ? "is-active" : ""}`}
              onClick={() => setTypeFilter(r)}
            >
              {t(`admin.crm.pipeline.filters.${r}`)}
            </button>
          ))}
        </div>
      </div>

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
                {grouped[b.key].length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {grouped[b.key].map((c) => {
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
                    onClick={() => onCard(c.id)}
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
                      onChange={(e) => onStageChange(c.id, e.target.value)}
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
                    {(c.stage === "demo_scheduled" || c.stage === "demo_done") && prepStatus[c.id] && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onPrepClick(c.id); }}
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
                        📋 {c.stage === "demo_done" ? "Brief" : "Prep"} · {prepStatus[c.id]}
                      </button>
                    )}
                  </div>
                );
              })}
              {grouped[b.key].length === 0 && (
                <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: 12 }}>—</div>
              )}
            </div>
          </div>
        ))}
      </div>
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
                    <td>{c.country ?? "—"}</td>
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
    website: "", stage: "cold", source: "manual",
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
        website: "", stage: "cold", source: "manual",
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