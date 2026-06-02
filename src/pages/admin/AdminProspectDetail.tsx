import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Send, MessageSquarePlus, Pencil, Mail, Phone, Smartphone, Linkedin, Camera,
  StickyNote, ArrowRight, Settings as SettingsIcon, PhoneCall,
  Save, X, PowerOff, Trash2, Plus, Search, ShieldOff, Globe, Building2, Sparkles, Loader2,
  type LucideIcon,
} from "lucide-react";
import {
  useProspect, updateProspectStage, addProspectActivity,
  updateProspect, deactivateProspect, reactivateProspect, deleteProspect,
  upsertContact, deleteContact,
  STAGES,
  type ProspectActivity, type Prospect, type ProspectContact, type LeadType, type DecisionLevel,
  type ProspectSource, type ProspectStage,
} from "@/hooks/useAdminProspects";
import { AddressAutocomplete } from "@/components/mundus/AddressAutocomplete";
import { useMundusTeam } from "@/hooks/useMundusTeam";
import { enrichContact } from "@/lib/prospectEnrich";

const STAGE_TO_DB: Record<ProspectStage, string> = {
  new: "cold", researching: "warm", contacted: "contacted",
  qualified: "qualified", onboarding: "onboarding", onboarded: "onboarded", lost: "lost",
};
const STAGE_FROM_DB: Record<string, ProspectStage> = {
  cold: "new", warm: "researching", contacted: "contacted",
  qualified: "qualified", onboarding: "onboarding", onboarded: "onboarded", lost: "lost",
};

function mapDbCompanyToProspect(c: any): Prospect {
  const primary = c.crm_contacts?.[0] ?? null;
  const stage = STAGE_FROM_DB[c.stage] ?? "new";
  const role: ProspectRoleLike = c.company_type === "supplier" ? "potential_supplier" : "potential_buyer";
  const leadType: LeadType = role === "potential_buyer" ? "buyer" : "supplier";
  const initials = (c.name || "?").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "?";
  const contacts: ProspectContact[] = (c.crm_contacts ?? []).map((ct: any, i: number) => ({
    id: ct.id,
    isPrimary: i === 0,
    fullName: ct.full_name ?? "",
    email: ct.email ?? undefined,
    phone: ct.phone ?? undefined,
    mobile: ct.mobile ?? undefined,
    linkedin: ct.linkedin ?? undefined,
    role: ct.job_title ?? undefined,
    photoUrl: ct.photo_url ?? undefined,
  }));
  return {
    id: c.id,
    companyName: c.name,
    initials,
    country: c.country || "—",
    role,
    source: (c.source as ProspectSource) || "wms_import",
    contactName: primary?.full_name || "—",
    contactEmail: primary?.email || "—",
    contactPhone: primary?.phone || undefined,
    notes: c.notes || "",
    stage,
    owner: "FN",
    ownerName: "Fernando Nascimento",
    estGmv: c.annual_revenue ?? undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    lastActivity: { type: "system", when: "—" },
    activity: [],
    leadType,
    street: c.street ?? c.address ?? undefined,
    city: c.city ?? undefined,
    state: c.state ?? undefined,
    zipCode: c.postal_code ?? undefined,
    industry: c.industry ?? undefined,
    website: c.website ?? undefined,
    companyLinkedin: c.linkedin_url ?? undefined,
    contacts,
    isActive: c.is_active !== false,
    isOnboarded: stage === "onboarded" || !!c.onboarded_at,
    mundusCompanyId: c.mundus_company_id ?? undefined,
  } as Prospect;
}

type ProspectRoleLike = "potential_buyer" | "potential_supplier";

const ICONS: Record<ProspectActivity["type"], LucideIcon> = {
  note: StickyNote, email: Mail, call: PhoneCall, stage_change: ArrowRight, system: SettingsIcon,
};

const DECISION_LEVELS: DecisionLevel[] = ["c_level","vp","director","manager","specialist","other"];
const LEAD_TYPES: LeadType[] = ["buyer","supplier","buyer_supplier"];
const SOURCES: ProspectSource[] = ["linkedin","trade_show","referral","web_scrape","apollo","manual","inbound","wms_import"];

const ROLE_OPTIONS: Record<LeadType, string[]> = {
  buyer: ["CEO", "Owner/Founder", "Sales Director", "International Trader", "Logistics"],
  supplier: ["CEO", "Owner/Founder", "Purchase Director", "Procurement", "Logistics"],
  buyer_supplier: ["CEO", "Owner/Founder", "Operations", "Director"],
};

// ---- Search more people (Mundus Intelligence) mock --------------------
type Discovered = {
  id: string; name: string; title: string; department: string;
  linkedin: string; emailStatus: "verified"|"unverified"|"unavailable";
  phoneStatus: "available"|"unavailable";
  email?: string; phone?: string; mobile?: string;
};
function mockDiscoveredPeople(p: Prospect): Discovered[] {
  const seeds = ["Operations","Procurement","Logistics","Quality","Sales","Finance","Trade"];
  return seeds.map((d, i) => ({
    id: `disc-${p.id}-${i}`,
    name: ["Ana Lima","Bruno Silva","Carlos Yang","Diana Park","Erik Müller","Fatima Khan","Gabriel Costa"][i],
    title: `${d} ${i % 2 ? "Manager" : "Director"}`,
    department: d,
    linkedin: "https://linkedin.com/in/sample",
    emailStatus: (i % 3 === 0 ? "verified" : i % 3 === 1 ? "unverified" : "unavailable") as Discovered["emailStatus"],
    phoneStatus: (i % 2 === 0 ? "available" : "unavailable") as Discovered["phoneStatus"],
  }));
}

export default function AdminProspectDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const nav = useNavigate();
  const mock = useProspect(id);
  const isDbProspect = !!id && !id.startsWith("pr-");
  const [dbP, setDbP] = useState<Prospect | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (mock || !isDbProspect || !id) return;
    let cancelled = false;
    setDbLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("crm_companies")
        .select("id,name,domain,country,city,state,street,postal_code,address,company_type,stage,source,created_at,updated_at,annual_revenue,industry,website,linkedin_url,notes,is_active,mundus_company_id,onboarded_at,crm_contacts(id,full_name,email,phone,mobile,linkedin,job_title,photo_url)")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setDbP(null); setDbLoading(false); return; }
      setDbP(mapDbCompanyToProspect(data));
      setDbLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, isDbProspect, mock]);

  const p = mock ?? dbP;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Prospect | null>(null);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");

  if (!p) {
    if (isDbProspect && dbLoading) {
      return (
        <div className="adm-body">
          <Link to="/admin/crm/prospects" className="adm-link">← {t("admin.crm.detail.back")}</Link>
          <div className="adm-panel" style={{ padding: 16 }}>{t("common.loading", { defaultValue: "Loading…" })}</div>
        </div>
      );
    }
    return (
      <div className="adm-body">
        <Link to="/admin/crm/prospects" className="adm-link">← {t("admin.crm.detail.back")}</Link>
        <div className="adm-coming-soon"><h1>404</h1><p>Prospect not found.</p></div>
      </div>
    );
  }

  const d = editing && draft ? draft : p;
  const startEdit = () => { setDraft({ ...p, contacts: p.contacts.map(c => ({...c})) }); setEditing(true); };
  const cancelEdit = () => { setDraft(null); setEditing(false); };
  const save = async () => {
    if (!draft) return;
    if (isDbProspect) {
      setSaving(true);
      try {
        const companyType = draft.leadType === "supplier" ? "supplier" : draft.leadType === "buyer_supplier" ? "buyer_supplier" : "prospect";
        const { error } = await supabase.from("crm_companies").update({
          name: draft.companyName,
          country: draft.country || null,
          city: draft.city || null,
          state: draft.state || null,
          street: draft.street || null,
          postal_code: draft.zipCode || null,
          industry: draft.industry || null,
          website: draft.website || null,
          linkedin_url: draft.companyLinkedin || null,
          notes: draft.notes || null,
          source: draft.source,
          stage: STAGE_TO_DB[draft.stage],
          company_type: companyType,
        }).eq("id", p.id);
        if (error) throw error;
        // primary contact basic fields
        const primary = draft.contacts.find((c) => c.isPrimary) ?? draft.contacts[0];
        if (primary && primary.id) {
          await supabase.from("crm_contacts").update({
            full_name: primary.fullName,
            email: primary.email || null,
            phone: primary.phone || null,
            mobile: primary.mobile || null,
            linkedin: primary.linkedin || null,
            job_title: primary.role || null,
          }).eq("id", primary.id);
        }
        setDbP({ ...draft });
        setEditing(false); setDraft(null);
        toast.success(t("admin.crm.detail.savedToast"));
      } catch (e: any) {
        toast.error(e?.message || "Failed to save");
      } finally {
        setSaving(false);
      }
      return;
    }
    updateProspect(p.id, {
      companyName: draft.companyName, leadType: draft.leadType,
      street: draft.street, city: draft.city, state: draft.state, zipCode: draft.zipCode,
      country: draft.country, industry: draft.industry, website: draft.website,
      companyLinkedin: draft.companyLinkedin, notes: draft.notes,
      source: draft.source, owner: draft.owner, ownerName: OWNERS.find(o => o.initials === draft.owner)?.name ?? draft.owner,
    });
    if (draft.stage !== p.stage) {
      updateProspectStage(p.id, draft.stage);
    }
    draft.contacts.forEach((c) => upsertContact(p.id, c));
    p.contacts.forEach((orig) => {
      if (!draft.contacts.some((c) => c.id === orig.id)) deleteContact(p.id, orig.id);
    });
    setEditing(false); setDraft(null);
    toast.success(t("admin.crm.detail.savedToast"));
  };

  const onDeactivate = async () => {
    if (isDbProspect) {
      const { error } = await supabase.from("crm_companies")
        .update({ is_active: false, deactivation_reason: deactivateReason || null, deactivated_at: new Date().toISOString() })
        .eq("id", p.id);
      if (error) { toast.error(error.message); return; }
      setDbP(dbP ? { ...dbP, isActive: false, deactivationReason: deactivateReason } : null);
    } else {
      deactivateProspect(p.id, deactivateReason);
    }
    setShowDeactivate(false); setDeactivateReason("");
    toast.success(t("admin.crm.detail.deactivate.toast"));
  };
  const onReactivate = async () => {
    if (isDbProspect) {
      const { error } = await supabase.from("crm_companies")
        .update({ is_active: true, deactivation_reason: null, deactivated_at: null })
        .eq("id", p.id);
      if (error) { toast.error(error.message); return; }
      setDbP(dbP ? { ...dbP, isActive: true, deactivationReason: undefined } : null);
    } else {
      reactivateProspect(p.id);
    }
    toast.success(t("admin.crm.detail.reactivate.toast"));
  };
  const onDelete = async () => {
    if (isDbProspect) {
      if (p.isOnboarded || p.mundusCompanyId) {
        toast.error(t("admin.crm.detail.delete.cannotOnboarded"));
        return;
      }
      // delete contacts then company (no FK cascade declared)
      await supabase.from("crm_contacts").delete().eq("company_id", p.id);
      const { error } = await supabase.from("crm_companies").delete().eq("id", p.id);
      if (error) { toast.error(error.message); return; }
      setShowDelete(false);
      toast.success(t("admin.crm.detail.delete.toast"));
      nav("/admin/crm/prospects");
      return;
    }
    const res = deleteProspect(p.id);
    if (!res.ok) {
      toast.error(t("admin.crm.detail.delete.cannotOnboarded"));
      return;
    }
    setShowDelete(false);
    toast.success(t("admin.crm.detail.delete.toast"));
    nav("/admin/crm/prospects");
  };

  const setDraftField = <K extends keyof Prospect>(k: K, v: Prospect[K]) => {
    if (!draft) return;
    setDraft({ ...draft, [k]: v });
  };
  const setContactField = (cid: string, k: keyof ProspectContact, v: string | undefined) => {
    if (!draft) return;
    setDraft({ ...draft, contacts: draft.contacts.map((c) => c.id === cid ? { ...c, [k]: v } as ProspectContact : c) });
  };
  const addAdditionalContact = () => {
    if (!draft) return;
    const newC: ProspectContact = { id: `co-${p.id}-${Date.now()}`, isPrimary: false, fullName: "" };
    setDraft({ ...draft, contacts: [...draft.contacts, newC] });
  };
  const removeContact = (cid: string) => {
    if (!draft) return;
    setDraft({ ...draft, contacts: draft.contacts.filter((c) => c.id !== cid) });
  };

  const main = d.contacts.find((c) => c.isPrimary) ?? d.contacts[0];
  const additional = d.contacts.filter((c) => !c.isPrimary);
  const canDelete = !p.isOnboarded && !p.mundusCompanyId;
  const canSearchMore = !p.isOnboarded && !p.mundusCompanyId;
  const canConvert = p.isActive && !p.isOnboarded && !p.mundusCompanyId;

  return (
    <div className="adm-body">
      {/* Header */}
      <div className="adm-panel">
        <Link to="/admin/crm/prospects" className="adm-link">← {t("admin.crm.detail.back")}</Link>
        <div className="crm-detail-head">
          <span className="crm-detail-av">{p.initials}</span>
          <div className="crm-cell-stack" style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input className="psp-input" style={{ height: 36, fontSize: 16, fontWeight: 700 }}
                value={d.companyName} onChange={(e) => setDraftField("companyName", e.target.value)} />
            ) : (
              <h1 className="crm-detail-name">{p.companyName}</h1>
            )}
            <span className="mono">{p.country} · #{p.id}</span>
          </div>
          <div className="crm-header-actions psp-actions-wrap">
            {!editing && (
              <>
                <button type="button" className="crm-btn-ghost" onClick={startEdit} disabled={!p.isActive}>
                  <Pencil size={14} /> {t("admin.crm.detail.actions.edit")}
                </button>
                {isDbProspect && main?.id && (
                  <button
                    type="button"
                    className="crm-btn-outline"
                    disabled={enriching}
                    style={{ borderColor: "#2563EB", color: "#2563EB" }}
                    onClick={async () => {
                      if (!main?.id || !id) return;
                      setEnriching(true);
                      toast.info("Enriching via Apollo…");
                      try {
                        const r = await enrichContact({
                          id: main.id,
                          company_id: id,
                          full_name: main.fullName ?? null,
                          email: main.email ?? null,
                          phone: main.phone ?? null,
                          mobile: main.mobile ?? null,
                          linkedin: main.linkedin ?? null,
                          photo_url: main.photoUrl ?? null,
                          job_title: main.role ?? null,
                        });
                        if (r.ok) {
                          toast.success(`Enriched ${r.updatedFields?.length ?? 0} fields`);
                          setTimeout(() => window.location.reload(), 600);
                        } else {
                          toast.error("Enrich failed: " + (r.error ?? "unknown"));
                        }
                      } finally {
                        setEnriching(false);
                      }
                    }}
                  >
                    {enriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {enriching ? " Enriching…" : " Enrich"}
                  </button>
                )}
                {p.isActive ? (
                  <button type="button" className="crm-btn-outline" onClick={() => setShowDeactivate(true)}>
                    <PowerOff size={14} /> {t("admin.crm.detail.actions.deactivate")}
                  </button>
                ) : (
                  <button type="button" className="crm-btn-outline" onClick={onReactivate}>
                    <PowerOff size={14} /> {t("admin.crm.detail.actions.reactivate")}
                  </button>
                )}
                <button type="button" className="crm-btn-ghost"
                  onClick={() => canDelete ? setShowDelete(true) : toast.error(t("admin.crm.detail.delete.cannotOnboarded"))}
                  title={canDelete ? "" : t("admin.crm.detail.delete.cannotOnboarded")}
                  disabled={!canDelete}>
                  <Trash2 size={14} /> {t("admin.crm.detail.actions.delete")}
                </button>
                {canSearchMore && (
                  <button type="button" className="crm-btn-primary" onClick={() => setShowSearch(true)}>
                    <Search size={14} /> {t("admin.crm.detail.actions.searchMorePeople")}
                  </button>
                )}
                {canConvert && (
                  <button type="button" className="crm-btn-primary" onClick={() => setShowConvert(true)}>
                    <Building2 size={14} /> {t("admin.crm.detail.actions.convert")}
                  </button>
                )}
              </>
            )}
            {editing && (
              <>
                <button type="button" className="crm-btn-ghost" onClick={cancelEdit}>
                  <X size={14} /> {t("admin.crm.detail.actions.cancel")}
                </button>
                <button type="button" className="crm-btn-primary" onClick={save} disabled={saving}>
                  <Save size={14} /> {saving ? "…" : t("admin.crm.detail.actions.save")}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="crm-chips">
          {/* Active/Inactive */}
          <span className={`pill ${p.isActive ? "stage-qualified" : "stage-lost"}`}>
            {p.isActive ? t("admin.crm.detail.status.active") : t("admin.crm.detail.status.inactive")}
          </span>
          {/* Stage */}
          {editing ? (
            <select className="psp-chip-select" value={d.stage}
              onChange={(e) => setDraftField("stage", e.target.value as ProspectStage)}>
              {STAGES.map(s => <option key={s} value={s}>{t(`admin.crm.stages.${s}`)}</option>)}
            </select>
          ) : (
            <span className={`pill stage-${p.stage}`}>{t(`admin.crm.stages.${p.stage}`)}</span>
          )}
          {/* Lead type */}
          {editing ? (
            <select className="psp-chip-select" value={d.leadType}
              onChange={(e) => setDraftField("leadType", e.target.value as LeadType)}>
              {LEAD_TYPES.map(lt => <option key={lt} value={lt}>{t(`admin.crm.detail.leadType.${lt}`)}</option>)}
            </select>
          ) : (
            <span className="pill info">{t(`admin.crm.detail.leadType.${p.leadType}`)}</span>
          )}
          {p.isOnboarded && <span className="pill stage-onboarded">{t("admin.crm.detail.status.onboarded")}</span>}
          {/* Source */}
          {editing ? (
            <select className="psp-chip-select" value={d.source}
              onChange={(e) => setDraftField("source", e.target.value as ProspectSource)}>
              {SOURCES.map(s => <option key={s} value={s}>{t(`admin.crm.sources.${s}`)}</option>)}
            </select>
          ) : (
            <span className={`crm-source ${p.source}`}>{t(`admin.crm.sources.${p.source}`)}</span>
          )}
          {/* Owner */}
          {editing ? (
            <select className="psp-chip-select" value={d.owner}
              onChange={(e) => setDraftField("owner", e.target.value)}>
              {OWNERS.map(o => <option key={o.initials} value={o.initials}>{o.initials} — {o.name}</option>)}
            </select>
          ) : (
            <span className="crm-chip"><span className="crm-owner-av">{p.owner}</span> {p.ownerName}</span>
          )}
          <span className="crm-chip">{t("admin.crm.detail.created")}: {p.createdAt}</span>
        </div>
      </div>

      {/* Company info */}
      <div className="adm-panel">
        <div className="adm-panel-h">
          <span className="adm-panel-title">{t("admin.crm.detail.sections.company")}</span>
        </div>
        <div className="psp-grid-2">
          <Field label={t("admin.crm.detail.fields.leadType")} editing={editing}
            value={t(`admin.crm.detail.leadType.${d.leadType}`)}>
            <select className="psp-input" value={d.leadType}
              onChange={(e) => setDraftField("leadType", e.target.value as LeadType)}>
              {LEAD_TYPES.map((lt) => <option key={lt} value={lt}>{t(`admin.crm.detail.leadType.${lt}`)}</option>)}
            </select>
          </Field>
          <Field label={t("admin.crm.detail.fields.industry")} editing={editing} value={d.industry ?? "—"}>
            <input className="psp-input" value={d.industry ?? ""} onChange={(e) => setDraftField("industry", e.target.value)} />
          </Field>
          <Field label={t("admin.crm.detail.fields.street")} editing={editing} value={d.street ?? "—"}>
            <AddressAutocomplete
              className="psp-input"
              value={d.street ?? ""}
              onChange={(v) => setDraftField("street", v)}
              onAddressSelect={(addr) => {
                if (!draft) return;
                setDraft({
                  ...draft,
                  street: addr.street || addr.formatted,
                  city: addr.city || draft.city,
                  state: addr.state || draft.state,
                  zipCode: addr.zip || draft.zipCode,
                  country: addr.countryCode || draft.country,
                });
              }}
            />
          </Field>
          <Field label={t("admin.crm.detail.fields.city")} editing={editing} value={d.city ?? "—"}>
            <input className="psp-input" value={d.city ?? ""} onChange={(e) => setDraftField("city", e.target.value)} />
          </Field>
          <Field label={t("admin.crm.detail.fields.state")} editing={editing} value={d.state ?? "—"}>
            <input className="psp-input" value={d.state ?? ""} onChange={(e) => setDraftField("state", e.target.value)} />
          </Field>
          <Field label={t("admin.crm.detail.fields.zipCode")} editing={editing} value={d.zipCode ?? "—"}>
            <input className="psp-input" value={d.zipCode ?? ""} onChange={(e) => setDraftField("zipCode", e.target.value)} />
          </Field>
          <Field label={t("admin.crm.detail.fields.country")} editing={editing} value={d.country}>
            <input className="psp-input" value={d.country} onChange={(e) => setDraftField("country", e.target.value.toUpperCase())} />
          </Field>
          <Field label={t("admin.crm.detail.fields.website")} editing={editing}
            value={d.website ? <a className="adm-link" href={d.website} target="_blank" rel="noopener noreferrer"><Globe size={12}/> {d.website}</a> : "—"}>
            <input className="psp-input" value={d.website ?? ""} placeholder="https://" onChange={(e) => setDraftField("website", e.target.value)} />
          </Field>
          <Field label={t("admin.crm.detail.fields.companyLinkedin")} editing={editing}
            value={d.companyLinkedin ? <a className="adm-link" href={d.companyLinkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={12}/> LinkedIn</a> : "—"}>
            <input className="psp-input" value={d.companyLinkedin ?? ""} placeholder="https://linkedin.com/company/..." onChange={(e) => setDraftField("companyLinkedin", e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Main contact */}
      <div className="adm-panel">
        <div className="adm-panel-h">
          <span className="adm-panel-title">{t("admin.crm.detail.sections.mainContact")}</span>
        </div>
        {main ? (
          <ContactBlock contact={main} editing={editing} onChange={setContactField} showRole={false} leadType={d.leadType} t={t} />
        ) : <div style={{ color: "var(--adm-text-tertiary)", fontSize: 12 }}>—</div>}
      </div>

      {/* Additional contacts */}
      <div className="adm-panel">
        <div className="adm-panel-h">
          <span className="adm-panel-title">{t("admin.crm.detail.sections.additionalContacts")}</span>
          {editing && (
            <button type="button" className="adm-link" onClick={addAdditionalContact}>
              <Plus size={12} /> {t("admin.crm.detail.actions.addContact")}
            </button>
          )}
        </div>
        {additional.length === 0 ? (
          <div style={{ color: "var(--adm-text-tertiary)", fontSize: 12 }}>{t("admin.crm.detail.contacts.empty")}</div>
        ) : (
          <div className="psp-contacts-list">
            {additional.map((c) => (
              <div key={c.id} className="psp-contact-card">
                <ContactBlock contact={c} editing={editing} onChange={setContactField} showRole={true} leadType={d.leadType} t={t} />
                {editing && (
                  <button type="button" className="crm-btn-ghost psp-contact-del" onClick={() => removeContact(c.id)}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes & Activity */}
      <div className="crm-detail-grid">
        <div className="adm-panel">
          <div className="adm-panel-h">
            <span className="adm-panel-title">{t("admin.crm.detail.activity")}</span>
            <button type="button" className="adm-link" onClick={() => {
              const text = window.prompt("Note:"); if (!text) return;
              addProspectActivity(p.id, { type: "note", body: text, actor: p.owner, at: "now" });
              toast.success("Note added");
            }}>+ {t("admin.crm.detail.addNote")}</button>
          </div>
          {p.activity.length === 0 ? (
            <div style={{ color: "var(--adm-text-tertiary)", fontSize: 12 }}>{t("admin.crm.detail.noActivity")}</div>
          ) : (
            <div className="crm-timeline">
              {p.activity.map((ev) => {
                const Icon = ICONS[ev.type];
                return (
                  <div className={`crm-evt evt-${ev.type}`} key={ev.id}>
                    <span className="crm-evt-dot" />
                    <div className="crm-evt-body">
                      <div className="crm-evt-line">
                        <Icon size={14} />
                        <span className="crm-evt-actor">{ev.actor}</span>
                        <span className="crm-evt-text">{ev.body}</span>
                        <span className="crm-evt-when">{ev.at}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="adm-panel">
          <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.crm.detail.sections.notes")}</span></div>
          {editing ? (
            <textarea className="psp-input" style={{ height: 120, padding: 10 }}
              value={d.notes} onChange={(e) => setDraftField("notes", e.target.value)} />
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--adm-text-secondary)", whiteSpace: "pre-wrap" }}>
              {p.notes || "—"}
            </div>
          )}
        </div>
      </div>

      {/* Deactivate modal */}
      {showDeactivate && (
        <>
          <div className="psp-drawer-backdrop" onClick={() => setShowDeactivate(false)} />
          <div className="psp-scrm-modal" style={{ width: "min(480px, 96vw)" }}>
            <div className="psp-scrm-head">
              <div>
                <div className="psp-scrm-title">{t("admin.crm.detail.deactivate.title")}</div>
                <div className="psp-scrm-sub">{p.companyName}</div>
              </div>
              <button className="psp-drawer-close" onClick={() => setShowDeactivate(false)}><X size={18}/></button>
            </div>
            <div className="psp-scrm-body" style={{ padding: 16 }}>
              <p style={{ fontSize: 13, lineHeight: 1.5, margin: "0 0 12px" }}>
                {t("admin.crm.detail.deactivate.body")}
              </p>
              <label className="psp-scrm-label">{t("admin.crm.detail.deactivate.reason")}</label>
              <textarea className="psp-input" style={{ height: 80, padding: 10, marginTop: 4 }}
                value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder={t("admin.crm.detail.deactivate.reasonPlaceholder")} />
            </div>
            <div className="psp-scrm-foot">
              <button className="crm-btn-ghost" onClick={() => setShowDeactivate(false)}>
                {t("admin.crm.detail.actions.cancel")}
              </button>
              <button className="crm-btn-primary" style={{ background: "var(--adm-danger)" }} onClick={onDeactivate}>
                <ShieldOff size={14} /> {t("admin.crm.detail.deactivate.confirm")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {showDelete && (
        <>
          <div className="psp-drawer-backdrop" onClick={() => setShowDelete(false)} />
          <div className="psp-scrm-modal" style={{ width: "min(440px, 96vw)" }}>
            <div className="psp-scrm-head">
              <div>
                <div className="psp-scrm-title">{t("admin.crm.detail.delete.title")}</div>
                <div className="psp-scrm-sub">{p.companyName}</div>
              </div>
              <button className="psp-drawer-close" onClick={() => setShowDelete(false)}><X size={18}/></button>
            </div>
            <div className="psp-scrm-body" style={{ padding: 16 }}>
              <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{t("admin.crm.detail.delete.body")}</p>
            </div>
            <div className="psp-scrm-foot">
              <button className="crm-btn-ghost" onClick={() => setShowDelete(false)}>{t("admin.crm.detail.actions.cancel")}</button>
              <button className="crm-btn-primary" style={{ background: "var(--adm-danger)" }} onClick={onDelete}>
                <Trash2 size={14} /> {t("admin.crm.detail.actions.delete")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Search more people drawer */}
      {showSearch && (
        <SearchPeopleDrawer prospect={p} onClose={() => setShowSearch(false)} />
      )}

      {/* Convert to Mundus modal */}
      {showConvert && (
        <ConvertToMundusModal
          prospect={p}
          onClose={() => setShowConvert(false)}
          onDone={() => { setShowConvert(false); toast.success(t("admin.crm.detail.convert.toast")); }}
        />
      )}
    </div>
  );
}

// ---------- inline helpers ----------------------------------------------

function Field({ label, editing, value, children }: {
  label: string; editing: boolean; value: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="psp-scrm-field">
      <label className="psp-scrm-label">{label}</label>
      {editing ? children : <div style={{ fontSize: 13, color: "var(--adm-text)", padding: "4px 0" }}>{value}</div>}
    </div>
  );
}

function ContactBlock({ contact, editing, onChange, showRole, leadType, t }: {
  contact: ProspectContact;
  editing: boolean;
  onChange: (cid: string, k: keyof ProspectContact, v: string | undefined) => void;
  showRole: boolean;
  leadType: LeadType;
  t: (k: string) => string;
}) {
  const c = contact;
  const initials = (c.fullName || "?")
    .replace(/[^A-Za-z\s]/g, "")
    .split(/\s+/).filter(Boolean)
    .slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
  const roleOpts = ROLE_OPTIONS[leadType];
  const roleInList = !c.role || roleOpts.includes(c.role);

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(c.id, "photoUrl", String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="psp-contact-row">
      <div className="psp-contact-photo-wrap">
        {c.photoUrl ? (
          <img src={c.photoUrl} alt={c.fullName} className="psp-contact-photo" />
        ) : (
          <span className="psp-contact-photo psp-contact-photo-fallback">{initials}</span>
        )}
        {editing && (
          <>
            <label className="psp-contact-photo-edit" title={t("admin.crm.detail.actions.changePhoto") || "Change photo"}>
              <Camera size={12} />
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => onPickPhoto(e.target.files?.[0])}
              />
            </label>
            {c.photoUrl && (
              <button
                type="button"
                className="psp-contact-photo-remove"
                onClick={() => onChange(c.id, "photoUrl", undefined)}
              >
                {t("common.remove") || "Remove"}
              </button>
            )}
          </>
        )}
      </div>
      <div className="psp-grid-2" style={{ flex: 1, minWidth: 0 }}>
      <Field label={t("admin.crm.detail.fields.fullName")} editing={editing} value={c.fullName || "—"}>
        <input className="psp-input" value={c.fullName} onChange={(e) => onChange(c.id, "fullName", e.target.value)} />
      </Field>
      {showRole && (
        <Field label={t("admin.crm.detail.fields.role")} editing={editing} value={c.role || "—"}>
          <select
            className="psp-input"
            value={roleInList ? (c.role ?? "") : "__other__"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__other__") return;
              onChange(c.id, "role", v || undefined);
            }}
          >
            <option value="">—</option>
            {roleOpts.map((r) => <option key={r} value={r}>{r}</option>)}
            {!roleInList && c.role && <option value={c.role}>{c.role}</option>}
          </select>
        </Field>
      )}
      <Field label={t("admin.crm.detail.fields.email")} editing={editing}
        value={c.email ? <a className="adm-link" href={`mailto:${c.email}`}><Mail size={12}/> {c.email}</a> : "—"}>
        <input className="psp-input" type="email" value={c.email ?? ""} onChange={(e) => onChange(c.id, "email", e.target.value)} />
      </Field>
      <Field label={t("admin.crm.detail.fields.additionalEmail")} editing={editing} value={c.additionalEmail || "—"}>
        <input className="psp-input" type="email" value={c.additionalEmail ?? ""} onChange={(e) => onChange(c.id, "additionalEmail", e.target.value)} />
      </Field>
      <Field label={t("admin.crm.detail.fields.phone")} editing={editing}
        value={c.phone ? <a className="adm-link" href={`tel:${c.phone}`}><Phone size={12}/> {c.phone}</a> : "—"}>
        <input className="psp-input" value={c.phone ?? ""} onChange={(e) => onChange(c.id, "phone", e.target.value)} />
      </Field>
      <Field label={t("admin.crm.detail.fields.mobile")} editing={editing}
        value={c.mobile ? <a className="adm-link" href={`tel:${c.mobile}`}><Smartphone size={12}/> {c.mobile}</a> : "—"}>
        <input className="psp-input" value={c.mobile ?? ""} onChange={(e) => onChange(c.id, "mobile", e.target.value)} />
      </Field>
      <Field label={t("admin.crm.detail.fields.personalLinkedin")} editing={editing}
        value={c.linkedin ? <a className="adm-link" href={c.linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={12}/> LinkedIn</a> : "—"}>
        <input className="psp-input" value={c.linkedin ?? ""} placeholder="https://linkedin.com/in/..." onChange={(e) => onChange(c.id, "linkedin", e.target.value)} />
      </Field>
      {!showRole && (
        <Field label={t("admin.crm.detail.fields.decisionLevel")} editing={editing}
          value={c.decisionLevel ? t(`admin.crm.detail.decisionLevel.${c.decisionLevel}`) : "—"}>
          <select className="psp-input" value={c.decisionLevel ?? ""}
            onChange={(e) => onChange(c.id, "decisionLevel", e.target.value || undefined)}>
            <option value="">—</option>
            {DECISION_LEVELS.map((dl) => <option key={dl} value={dl}>{t(`admin.crm.detail.decisionLevel.${dl}`)}</option>)}
          </select>
        </Field>
      )}
      </div>
    </div>
  );
}

function SearchPeopleDrawer({ prospect, onClose }: { prospect: Prospect; onClose: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Discovered[]>([]);
  const [revealed, setRevealed] = useState<Record<string, "email" | "phone" | "mobile" | "all">>({});

  useMemo(() => {
    setTimeout(() => { setPeople(mockDiscoveredPeople(prospect)); setLoading(false); }, 600);
  }, [prospect]);

  const reveal = (id: string, kind: "email"|"phone"|"mobile") => {
    setPeople((prev) => prev.map((p) => p.id === id ? {
      ...p,
      email: kind === "email" ? `${p.name.toLowerCase().replace(/\s/g,".")}@${prospect.companyName.toLowerCase().replace(/[^a-z0-9]+/g,"")}.com` : p.email,
      phone: kind === "phone" ? `+1 555-${1000 + Math.floor(Math.random()*9000)}` : p.phone,
      mobile: kind === "mobile" ? `+1 555-${5000 + Math.floor(Math.random()*4000)}` : p.mobile,
    } : p));
    setRevealed((r) => ({ ...r, [id]: kind }));
    toast.success(t("admin.crm.detail.apollo.revealed"));
  };

  const addAsContact = (d: Discovered) => {
    const c: ProspectContact = {
      id: `co-${prospect.id}-${Date.now()}`,
      isPrimary: false,
      fullName: d.name,
      role: d.title,
      email: d.email,
      phone: d.phone,
      mobile: d.mobile,
      linkedin: d.linkedin,
    };
    upsertContact(prospect.id, c);
    toast.success(t("admin.crm.detail.apollo.added"));
  };

  return (
    <>
      <div className="psp-drawer-backdrop" onClick={onClose} />
      <div className="psp-drawer">
        <div className="psp-drawer-head">
          <div>
            <div className="title">{t("admin.crm.detail.apollo.title")}</div>
            <div className="sub">{prospect.companyName}</div>
          </div>
          <button className="psp-drawer-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="psp-drawer-body">
          {loading ? (
            <div className="psp-empty">{t("common.loading")}</div>
          ) : people.length === 0 ? (
            <div className="psp-empty">{t("admin.crm.detail.apollo.empty")}</div>
          ) : (
            people.map((d) => (
              <div key={d.id} className="psp-drawer-section">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: "var(--adm-text-tertiary)" }}>{d.title} · {d.department}</div>
                  </div>
                  <button className="psp-btn solid" onClick={() => addAsContact(d)}>
                    <Plus size={11}/> {t("admin.crm.detail.apollo.add")}
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {d.email ? (
                    <span className="psp-badge verified" style={{ padding: "4px 8px" }}><Mail size={11}/> {d.email}</span>
                  ) : (
                    <button className="psp-reveal" disabled={d.emailStatus === "unavailable"} onClick={() => reveal(d.id, "email")}>
                      <Mail size={11}/> {t("admin.crm.detail.apollo.revealEmail")}
                    </button>
                  )}
                  {d.phone ? (
                    <span className="psp-badge verified" style={{ padding: "4px 8px" }}><Phone size={11}/> {d.phone}</span>
                  ) : (
                    <button className="psp-reveal" disabled={d.phoneStatus === "unavailable"} onClick={() => reveal(d.id, "phone")}>
                      <Phone size={11}/> {t("admin.crm.detail.apollo.revealPhone")}
                    </button>
                  )}
                  {d.mobile ? (
                    <span className="psp-badge verified" style={{ padding: "4px 8px" }}><Smartphone size={11}/> {d.mobile}</span>
                  ) : (
                    <button className="psp-reveal" disabled={d.phoneStatus === "unavailable"} onClick={() => reveal(d.id, "mobile")}>
                      <Smartphone size={11}/> {t("admin.crm.detail.apollo.revealMobile")}
                    </button>
                  )}
                  <a className="adm-link" href={d.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, alignSelf: "center" }}>
                    <Linkedin size={11}/> LinkedIn
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="psp-drawer-foot">
          <button className="psp-btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </>
  );
}

function ConvertToMundusModal({ prospect, onClose, onDone }: {
  prospect: Prospect;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const main = prospect.contacts.find((c) => c.isPrimary) ?? prospect.contacts[0];
  const isLegacy = prospect.id.startsWith("pr-");

  type CompanyType = "buyer" | "supplier" | "buyer_supplier";
  type Candidate = {
    company_id: string; name: string;
    is_buyer?: boolean; is_supplier?: boolean;
    parent_company_id?: string | null; office_type?: string | null;
  };
  type Detect = {
    scenario: "new" | "existing" | "no_email";
    domain: string | null; generic?: boolean;
    candidates: Candidate[];
  };

  const [loading, setLoading] = useState(true);
  const [detect, setDetect] = useState<Detect | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // NEW-company form
  const [type, setType] = useState<CompanyType>(prospect.leadType === "buyer_supplier" ? "buyer_supplier" : prospect.leadType === "supplier" ? "supplier" : "buyer");
  const [structure, setStructure] = useState<"standalone" | "office">("standalone");
  const [parentId, setParentId] = useState<string>("");
  const [officeType, setOfficeType] = useState<"branch" | "regional_office">("branch");
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; office_type: string | null; parent_company_id: string | null }>>([]);

  // ATTACH form
  const [chosenCandidate, setChosenCandidate] = useState<string>("");
  const [family, setFamily] = useState<Array<{ id: string; name: string; office_type: string | null; parent_company_id: string | null }>>([]);
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");
  const [memberRole, setMemberRole] = useState<string>("");

  const ROLE_OPTIONS = [
    "master_supplier","export_manager","operator","quality_control","logistics","supplier_global_director",
    "master_buyer","procurement","import_manager","buyer_global_director","finance","compliance",
  ];

  useEffect(() => {
    if (isLegacy) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("convert_detect_candidates", { p_crm_company_id: prospect.id });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setDetect({ scenario: "no_email", domain: null, candidates: [] });
      } else {
        const d = data as Detect;
        setDetect(d);
        if (d.scenario === "existing" && d.candidates?.length === 1) {
          setChosenCandidate(d.candidates[0].company_id);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [prospect.id, isLegacy]);

  // Load companies list when "office of existing" structure is chosen
  useEffect(() => {
    if (structure !== "office" || companies.length > 0) return;
    (async () => {
      const { data } = await (supabase as any).from("companies")
        .select("id,name,office_type,parent_company_id")
        .eq("is_active", true).order("name");
      setCompanies((data as any[]) ?? []);
    })();
  }, [structure]);

  // Load family of chosen candidate (attach mode)
  useEffect(() => {
    if (!chosenCandidate) { setFamily([]); setTargetCompanyId(""); return; }
    (async () => {
      const { data } = await (supabase as any).from("companies")
        .select("id,name,office_type,parent_company_id")
        .eq("is_active", true)
        .or(`id.eq.${chosenCandidate},parent_company_id.eq.${chosenCandidate}`)
        .order("office_type");
      const fam = (data as any[]) ?? [];
      setFamily(fam);
      setTargetCompanyId(fam.length === 1 ? fam[0].id : chosenCandidate);
    })();
  }, [chosenCandidate]);

  const friendly = (msg: string) => {
    if (msg.includes("already_converted")) return "This prospect was already converted to a Mundus company.";
    if (msg.includes("no_primary_contact_email")) return "This prospect has no contact email.";
    if (msg.includes("not_authorized")) return "You don't have permission to convert prospects.";
    return msg;
  };

  const submit = async () => {
    if (!detect) return;
    setSubmitting(true);
    try {
      let args: any;
      if (detect.scenario === "new") {
        args = {
          p_crm_company_id: prospect.id,
          p_mode: "new",
          p_company_type: type,
          p_parent_company_id: structure === "office" ? parentId || null : null,
          p_office_type: structure === "office" ? officeType : null,
          p_target_company_id: null,
          p_member_role: null,
        };
      } else if (detect.scenario === "existing") {
        if (!targetCompanyId || !memberRole) {
          toast.error("Pick a company/office and a role.");
          setSubmitting(false); return;
        }
        args = {
          p_crm_company_id: prospect.id,
          p_mode: "attach",
          p_company_type: null,
          p_parent_company_id: null,
          p_office_type: null,
          p_target_company_id: targetCompanyId,
          p_member_role: memberRole,
        };
      } else {
        setSubmitting(false); return;
      }
      const { data, error } = await (supabase as any).rpc("convert_prospect_to_mundus", args);
      if (error) { toast.error(friendly(error.message)); setSubmitting(false); return; }
      const result = (data as any)?.result;
      if (result === "created") toast.success("Company created in Mundus (invited). Send the invite email when ready.");
      else if (result === "attached") toast.success("Contact attached to existing Mundus company (invited).");
      else if (result === "already_member") toast.info("This person is already a member of that company — nothing to do.");
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  const TYPES: Array<{ id: CompanyType; label: string; desc: string }> = [
    { id: "buyer", label: t("admin.crm.detail.convert.type.buyer"), desc: t("admin.crm.detail.convert.type.buyerDesc") },
    { id: "supplier", label: t("admin.crm.detail.convert.type.supplier"), desc: t("admin.crm.detail.convert.type.supplierDesc") },
    { id: "buyer_supplier", label: t("admin.crm.detail.convert.type.both"), desc: t("admin.crm.detail.convert.type.bothDesc") },
  ];

  const parentCandidates = companies.filter((c) => !c.parent_company_id);

  const canConfirm = !submitting && !loading && detect && (
    isLegacy ? false :
    detect.scenario === "new" ? (structure === "standalone" || !!parentId) :
    detect.scenario === "existing" ? (!!targetCompanyId && !!memberRole) :
    false
  );

  return (
    <>
      <div className="psp-drawer-backdrop" onClick={onClose} />
      <div className="psp-scrm-modal" style={{ width: "min(560px, 96vw)" }}>
        <div className="psp-scrm-head">
          <div>
            <div className="psp-scrm-title">{t("admin.crm.detail.convert.title")}</div>
            <div className="psp-scrm-sub">{prospect.companyName} · {prospect.country}</div>
          </div>
          <button className="psp-drawer-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="psp-scrm-body" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {isLegacy ? (
            <div className="psp-convert-warn" style={{ background: "hsl(0 80% 96%)", color: "hsl(0 60% 35%)" }}>
              This prospect is not saved to the database yet, so it can't be converted.
            </div>
          ) : loading || !detect ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--g500)" }}>
              <Loader2 size={16} className="animate-spin" /> Checking for existing companies…
            </div>
          ) : detect.scenario === "no_email" ? (
            <div className="psp-convert-warn" style={{ background: "hsl(0 80% 96%)", color: "hsl(0 60% 35%)" }}>
              This prospect has no contact email, so it can't be converted. Add a contact email first.
            </div>
          ) : detect.scenario === "new" ? (
            <>
              <div style={{ fontSize: 13, color: "var(--g600)" }}>
                No existing Mundus company matches this contact's domain — a new company will be created.
                {detect.generic && detect.domain && (
                  <div style={{ marginTop: 4, color: "var(--g500)" }}>
                    The contact email uses a public domain ({detect.domain}), so a brand-new company will be created.
                  </div>
                )}
              </div>

              {main && (
                <div style={{ fontSize: 12, color: "var(--g500)", background: "var(--g050)", padding: 8, borderRadius: 6 }}>
                  Primary contact: <b>{main.fullName}</b> &lt;{main.email}&gt;{main.phone ? ` · ${main.phone}` : ""}
                </div>
              )}

              <div>
                <label className="psp-scrm-label">{t("admin.crm.detail.convert.typeLabel")}</label>
                <div className="psp-convert-types">
                  {TYPES.map((opt) => (
                    <label key={opt.id} className={`psp-convert-type ${type === opt.id ? "is-selected" : ""}`}>
                      <input type="radio" name="mundus-type" value={opt.id}
                        checked={type === opt.id} onChange={() => setType(opt.id)} />
                      <div>
                        <div className="psp-convert-type-label">{opt.label}</div>
                        <div className="psp-convert-type-desc">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="psp-scrm-label">Structure</label>
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                    <input type="radio" name="structure" checked={structure === "standalone"}
                      onChange={() => setStructure("standalone")} />
                    Standalone company
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                    <input type="radio" name="structure" checked={structure === "office"}
                      onChange={() => setStructure("office")} />
                    Office of an existing company
                  </label>
                </div>
                {structure === "office" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <select className="psp-input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                      <option value="">Select parent company…</option>
                      {parentCandidates.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select className="psp-input" value={officeType} onChange={(e) => setOfficeType(e.target.value as any)}>
                      <option value="branch">Branch</option>
                      <option value="regional_office">Regional office</option>
                    </select>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="psp-convert-warn" style={{ background: "hsl(38 92% 95%)", color: "hsl(28 80% 30%)" }}>
                A Mundus company with this domain ({detect.domain}) already exists. Choose how to attach this contact.
              </div>

              {main && (
                <div style={{ fontSize: 12, color: "var(--g500)", background: "var(--g050)", padding: 8, borderRadius: 6 }}>
                  Primary contact: <b>{main.fullName}</b> &lt;{main.email}&gt;{main.phone ? ` · ${main.phone}` : ""}
                </div>
              )}

              <div>
                <label className="psp-scrm-label">Existing company</label>
                <select className="psp-input" value={chosenCandidate}
                  onChange={(e) => setChosenCandidate(e.target.value)}>
                  <option value="">Select a company…</option>
                  {detect.candidates.map((c) => {
                    const tags = [c.is_buyer ? "Buyer" : null, c.is_supplier ? "Supplier" : null].filter(Boolean).join(" / ");
                    return <option key={c.company_id} value={c.company_id}>{c.name}{tags ? ` — ${tags}` : ""}</option>;
                  })}
                </select>
              </div>

              {family.length > 1 && (
                <div>
                  <label className="psp-scrm-label">Target office</label>
                  <select className="psp-input" value={targetCompanyId}
                    onChange={(e) => setTargetCompanyId(e.target.value)}>
                    {family.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.office_type ? ` (${c.office_type})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="psp-scrm-label">Member role</label>
                <select className="psp-input" value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}>
                  <option value="">Select role…</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        <div className="psp-scrm-foot">
          <button className="crm-btn-ghost" onClick={onClose}>{t("admin.crm.detail.actions.cancel")}</button>
          <button className="crm-btn-primary" onClick={submit} disabled={!canConfirm}>
            <Building2 size={14} /> {t("admin.crm.detail.convert.confirm")}
          </button>
        </div>
      </div>
    </>
  );
}