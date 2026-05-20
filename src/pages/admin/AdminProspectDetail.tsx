import { useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Send, MessageSquarePlus, Pencil, Mail, Phone, Smartphone, Linkedin, Camera,
  StickyNote, ArrowRight, Settings as SettingsIcon, PhoneCall,
  Save, X, PowerOff, Trash2, Plus, Search, ShieldOff, Globe,
  type LucideIcon,
} from "lucide-react";
import {
  useProspect, updateProspectStage, addProspectActivity,
  updateProspect, deactivateProspect, reactivateProspect, deleteProspect,
  upsertContact, deleteContact,
  STAGES, OWNERS,
  type ProspectActivity, type Prospect, type ProspectContact, type LeadType, type DecisionLevel,
  type ProspectSource, type ProspectStage,
} from "@/hooks/useAdminProspects";

const ICONS: Record<ProspectActivity["type"], LucideIcon> = {
  note: StickyNote, email: Mail, call: PhoneCall, stage_change: ArrowRight, system: SettingsIcon,
};

const DECISION_LEVELS: DecisionLevel[] = ["c_level","vp","director","manager","specialist","other"];
const LEAD_TYPES: LeadType[] = ["buyer","supplier","buyer_supplier"];
const SOURCES: ProspectSource[] = ["linkedin","trade_show","referral","web_scrape","apollo","manual","inbound"];

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
  const p = useProspect(id);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Prospect | null>(null);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");

  if (!p) {
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
  const save = () => {
    if (!draft) return;
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

  const onDeactivate = () => {
    deactivateProspect(p.id, deactivateReason);
    setShowDeactivate(false); setDeactivateReason("");
    toast.success(t("admin.crm.detail.deactivate.toast"));
  };
  const onReactivate = () => {
    reactivateProspect(p.id);
    toast.success(t("admin.crm.detail.reactivate.toast"));
  };
  const onDelete = () => {
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
              </>
            )}
            {editing && (
              <>
                <button type="button" className="crm-btn-ghost" onClick={cancelEdit}>
                  <X size={14} /> {t("admin.crm.detail.actions.cancel")}
                </button>
                <button type="button" className="crm-btn-primary" onClick={save}>
                  <Save size={14} /> {t("admin.crm.detail.actions.save")}
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
            <input className="psp-input" value={d.street ?? ""} onChange={(e) => setDraftField("street", e.target.value)} />
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
          <ContactBlock contact={main} editing={editing} onChange={setContactField} showRole={false} t={t} />
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
                <ContactBlock contact={c} editing={editing} onChange={setContactField} showRole={true} t={t} />
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

function ContactBlock({ contact, editing, onChange, showRole, t }: {
  contact: ProspectContact;
  editing: boolean;
  onChange: (cid: string, k: keyof ProspectContact, v: string | undefined) => void;
  showRole: boolean;
  t: (k: string) => string;
}) {
  const c = contact;
  return (
    <div className="psp-grid-2">
      <Field label={t("admin.crm.detail.fields.fullName")} editing={editing} value={c.fullName || "—"}>
        <input className="psp-input" value={c.fullName} onChange={(e) => onChange(c.id, "fullName", e.target.value)} />
      </Field>
      {showRole && (
        <Field label={t("admin.crm.detail.fields.role")} editing={editing} value={c.role || "—"}>
          <input className="psp-input" value={c.role ?? ""} onChange={(e) => onChange(c.id, "role", e.target.value)} />
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