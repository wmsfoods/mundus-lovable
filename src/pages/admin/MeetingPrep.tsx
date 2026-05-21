import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, RefreshCw, FileDown, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Prep = {
  id: string;
  crm_company_id: string;
  crm_contact_id: string | null;
  scheduled_for: string | null;
  status: "pending" | "generating" | "ready" | "failed";
  company_research: string | null;
  contact_profile: string | null;
  market_context: string | null;
  likely_pain_points: string | null;
  talking_points: string | null;
  strategic_questions: string | null;
  mundus_value_props: string | null;
  research_links: Array<{ title: string; url: string }>;
  full_brief_md: string | null;
  generated_at: string | null;
};

type Company = { id: string; name: string; country: string | null; company_type: string | null; stage: string | null };

function bullets(text: string | null): string[] {
  if (!text) return [];
  return text.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

export default function MeetingPrep() {
  const { t } = useTranslation();
  const { companyId } = useParams<{ companyId: string }>();
  const nav = useNavigate();
  const [prep, setPrep] = useState<Prep | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    const [{ data: co }, { data: preps }] = await Promise.all([
      supabase.from("crm_companies").select("id,name,country,company_type,stage").eq("id", companyId).single(),
      supabase
        .from("crm_meeting_preps")
        .select("*")
        .eq("crm_company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    setCompany((co as any) ?? null);
    setPrep(((preps as any) ?? [])[0] ?? null);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  // Auto-poll while generating
  useEffect(() => {
    if (prep?.status !== "generating") return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [prep?.status, load]);

  async function generateNow(regenerate = false) {
    if (!companyId) return;
    setGenerating(true);
    try {
      let prepId = prep?.id;
      if (!prepId || regenerate) {
        if (regenerate && prepId) {
          await supabase.from("crm_meeting_preps").update({ status: "pending" }).eq("id", prepId);
        } else {
          const { data, error } = await supabase
            .from("crm_meeting_preps")
            .insert({
              crm_company_id: companyId,
              status: "pending",
              scheduled_for: new Date(Date.now() + 3 * 86400_000).toISOString(),
            })
            .select("id")
            .single();
          if (error || !data) throw error ?? new Error("Insert failed");
          prepId = data.id;
        }
      }
      const { error: invErr } = await supabase.functions.invoke("generate-meeting-prep", {
        body: { meeting_prep_id: prepId },
      });
      if (invErr) throw invErr;
      toast.success(t("admin.crm.meetingPrep.toast.generating"));
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function markDemoDone() {
    if (!companyId) return;
    const { error } = await supabase.from("crm_companies").update({ stage: "demo_done" }).eq("id", companyId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("admin.crm.meetingPrep.toast.demoDone"));
    nav("/admin/crm/pipeline");
  }

  async function updateScheduled(date: string) {
    if (!prep) return;
    const iso = date ? new Date(date).toISOString() : null;
    await supabase.from("crm_meeting_preps").update({ scheduled_for: iso }).eq("id", prep.id);
    setPrep({ ...prep, scheduled_for: iso });
  }

  if (loading) return <div className="adm-body"><div style={{ padding: 24 }}>Loading…</div></div>;
  if (!company) return <div className="adm-body"><div style={{ padding: 24 }}>Company not found</div></div>;

  const status = prep?.status ?? "none";
  const statusBadgeColor =
    status === "ready" ? "#22c55e" :
    status === "generating" ? "#3b82f6" :
    status === "failed" ? "#ef4444" :
    status === "pending" ? "#eab308" : "#94a3b8";

  return (
    <div className="adm-body">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button type="button" className="crm-btn-outline" onClick={() => nav("/admin/crm/pipeline")}>
          <ArrowLeft size={14} /> {t("admin.crm.meetingPrep.back")}
        </button>
      </div>

      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">{company.name}</span>
          <span className="adm-page-subtle">· {t("admin.crm.meetingPrep.title")}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={prep?.scheduled_for ? prep.scheduled_for.slice(0, 10) : ""}
            onChange={(e) => updateScheduled(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}
          />
          <span
            style={{
              fontSize: 11, fontWeight: 600, color: "#fff", background: statusBadgeColor,
              padding: "4px 10px", borderRadius: 999, textTransform: "uppercase",
            }}
          >
            {status}
          </span>
          {(status === "ready" || status === "failed") && (
            <button type="button" className="crm-btn-outline" onClick={() => generateNow(true)} disabled={generating}>
              <RefreshCw size={14} /> {t("admin.crm.meetingPrep.regenerate")}
            </button>
          )}
          {status === "ready" && (
            <>
              <button type="button" className="crm-btn-outline" onClick={() => toast.info("Export coming soon")}>
                <FileDown size={14} /> {t("admin.crm.meetingPrep.exportPdf")}
              </button>
              <button type="button" className="crm-btn-outline" onClick={() => toast.info("Email coming soon")}>
                <Mail size={14} /> {t("admin.crm.meetingPrep.email")}
              </button>
              <button type="button" className="crm-btn-primary" onClick={markDemoDone} style={{ background: "#a855f7" }}>
                <CheckCircle2 size={14} /> {t("admin.crm.meetingPrep.markDone")}
              </button>
            </>
          )}
        </div>
      </div>

      {(status === "none" || status === "pending") && (
        <div className="adm-panel" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ marginBottom: 16, color: "#374151" }}>{t("admin.crm.meetingPrep.empty")}</p>
          <button type="button" className="crm-btn-primary" onClick={() => generateNow(false)} disabled={generating}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : null}
            {t("admin.crm.meetingPrep.generateNow")}
          </button>
        </div>
      )}

      {status === "generating" && (
        <div className="adm-panel" style={{ padding: 40, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Loader2 size={32} className="animate-spin" color="#9B2251" />
          <p style={{ color: "#374151" }}>{t("admin.crm.meetingPrep.generatingMsg")}</p>
        </div>
      )}

      {status === "failed" && (
        <div className="adm-panel" style={{ padding: 24, background: "#FEF2F2", borderColor: "#FECACA" }}>
          <p style={{ color: "#991b1b", marginBottom: 12 }}>{t("admin.crm.meetingPrep.failedMsg")}</p>
          <button type="button" className="crm-btn-primary" onClick={() => generateNow(true)} disabled={generating}>
            {t("admin.crm.meetingPrep.regenerate")}
          </button>
        </div>
      )}

      {status === "ready" && prep && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
          <Section title={t("admin.crm.meetingPrep.sections.research")} body={prep.company_research} />
          <Section title={t("admin.crm.meetingPrep.sections.contact")} body={prep.contact_profile} />
          <Section title={t("admin.crm.meetingPrep.sections.market")} body={prep.market_context} />
          <ListSection title={t("admin.crm.meetingPrep.sections.painPoints")} items={bullets(prep.likely_pain_points)} />
          <ListSection title={t("admin.crm.meetingPrep.sections.talkingPoints")} items={bullets(prep.talking_points)} />
          <ListSection title={t("admin.crm.meetingPrep.sections.questions")} items={bullets(prep.strategic_questions)} />
          <ListSection
            title={t("admin.crm.meetingPrep.sections.valueProps")}
            items={bullets(prep.mundus_value_props)}
            wineHighlight
          />
          <LinksSection title={t("admin.crm.meetingPrep.sections.links")} links={prep.research_links ?? []} />
        </div>
      )}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string | null }) {
  return (
    <div className="adm-panel" style={{ padding: 16 }}>
      <div style={{ fontWeight: 600, color: "#111827", marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{body ?? "—"}</p>
    </div>
  );
}

function ListSection({ title, items, wineHighlight }: { title: string; items: string[]; wineHighlight?: boolean }) {
  return (
    <div
      className="adm-panel"
      style={{
        padding: 16,
        background: wineHighlight ? "linear-gradient(180deg, #FDF7F9, #fff)" : undefined,
        borderColor: wineHighlight ? "#9B2251" : undefined,
      }}
    >
      <div style={{ fontWeight: 600, color: wineHighlight ? "#9B2251" : "#111827", marginBottom: 8 }}>{title}</div>
      {items.length ? (
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : <p style={{ fontSize: 13, color: "#9ca3af" }}>—</p>}
    </div>
  );
}

function LinksSection({ title, links }: { title: string; links: Array<{ title: string; url: string }> }) {
  return (
    <div className="adm-panel" style={{ padding: 16 }}>
      <div style={{ fontWeight: 600, color: "#111827", marginBottom: 8 }}>{title}</div>
      {links.length ? (
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, lineHeight: 1.8 }}>
          {links.map((l, i) => (
            <li key={i}>
              <a href={l.url} target="_blank" rel="noreferrer" style={{ color: "#9B2251" }}>{l.title}</a>
            </li>
          ))}
        </ul>
      ) : <p style={{ fontSize: 13, color: "#9ca3af" }}>—</p>}
    </div>
  );
}