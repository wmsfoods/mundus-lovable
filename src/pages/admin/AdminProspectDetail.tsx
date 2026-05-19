import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Send, MessageSquarePlus, Pencil, Mail, Phone,
  StickyNote, ArrowRight, Settings as SettingsIcon, PhoneCall,
  type LucideIcon,
} from "lucide-react";
import {
  useProspect, updateProspectStage, addProspectActivity,
  type ProspectActivity,
} from "@/hooks/useAdminProspects";

const fmtGmv = (v?: number) =>
  v == null ? "—" : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}k`;

const ICONS: Record<ProspectActivity["type"], LucideIcon> = {
  note: StickyNote,
  email: Mail,
  call: PhoneCall,
  stage_change: ArrowRight,
  system: SettingsIcon,
};

export default function AdminProspectDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const nav = useNavigate();
  const p = useProspect(id);

  if (!p) {
    return (
      <div className="adm-body">
        <Link to="/admin/crm/prospects" className="adm-link">← {t("admin.crm.detail.back")}</Link>
        <div className="adm-coming-soon"><h1>404</h1><p>Prospect not found.</p></div>
      </div>
    );
  }

  const onInvite = () => {
    if (p.stage !== "qualified") return;
    updateProspectStage(p.id, "onboarding", p.owner);
    addProspectActivity(p.id, {
      type: "system",
      body: `Invite to platform sent to ${p.contactEmail}`,
      actor: p.owner,
      at: "now",
    });
    toast.success(t("admin.crm.toast.invited", { email: p.contactEmail }));
  };

  const onAddNote = () => {
    const text = window.prompt("Note:");
    if (!text) return;
    addProspectActivity(p.id, { type: "note", body: text, actor: p.owner, at: "now" });
    toast.success("Note added");
  };

  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(p.contactName + " " + p.companyName)}`;

  return (
    <div className="adm-body">
      <div className="adm-panel">
        <Link to="/admin/crm/prospects" className="adm-link">← {t("admin.crm.detail.back")}</Link>
        <div className="crm-detail-head">
          <span className="crm-detail-av">{p.initials}</span>
          <div className="crm-cell-stack" style={{ flex: 1 }}>
            <h1 className="crm-detail-name">{p.companyName}</h1>
            <span className="mono">{p.country} · #{p.id}</span>
          </div>
          <div className="crm-header-actions">
            <button
              type="button"
              className="crm-btn-primary"
              disabled={p.stage !== "qualified"}
              title={p.stage !== "qualified" ? t("admin.crm.detail.inviteDisabled") : ""}
              onClick={onInvite}
            >
              <Send size={14} /> {t("admin.crm.detail.invite")}
            </button>
            <button type="button" className="crm-btn-outline" onClick={onAddNote}>
              <MessageSquarePlus size={14} /> {t("admin.crm.detail.addNote")}
            </button>
            <button type="button" className="crm-btn-ghost" onClick={() => toast("Edit coming soon")}>
              <Pencil size={14} /> {t("admin.crm.detail.edit")}
            </button>
          </div>
        </div>
        <div className="crm-chips">
          <span className={`pill stage-${p.stage}`}>{t(`admin.crm.stages.${p.stage}`)}</span>
          <span className="pill info">{t(`admin.crm.roles.${p.role}`)}</span>
          <span className={`crm-source ${p.source}`}>{t(`admin.crm.sources.${p.source}`)}</span>
          <span className="crm-chip"><span className="crm-owner-av">{p.owner}</span> {p.ownerName}</span>
          <span className="crm-chip">{t("admin.crm.detail.created")}: {p.createdAt}</span>
          <span className="crm-chip">{t("admin.crm.detail.lastContact")}: {p.lastActivity?.when ?? "—"}</span>
        </div>
      </div>

      <div className="crm-detail-grid">
        {/* Activity */}
        <div className="adm-panel">
          <div className="adm-panel-h">
            <span className="adm-panel-title">{t("admin.crm.detail.activity")}</span>
            <button type="button" className="adm-link" onClick={onAddNote}>+ {t("admin.crm.detail.addNote")}</button>
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

        {/* Sidebar */}
        <div className="crm-detail-side">
          <div className="adm-panel">
            <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.crm.detail.contact")}</span></div>
            <div className="crm-contact">
              <div className="crm-contact-name">{p.contactName}</div>
              <a href={`mailto:${p.contactEmail}`} className="crm-contact-row"><Mail size={14} /> {p.contactEmail}</a>
              {p.contactPhone && (
                <a href={`tel:${p.contactPhone}`} className="crm-contact-row"><Phone size={14} /> {p.contactPhone}</a>
              )}
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="adm-link">
                {t("admin.crm.detail.linkedinSearch")}
              </a>
            </div>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.crm.detail.companyInfo")}</span></div>
            <div>
              <div className="adm-kv-row"><span>Country</span><span className="v">{p.country}</span></div>
              <div className="adm-kv-row"><span>Role</span><span className="v">{t(`admin.crm.roles.${p.role}`)}</span></div>
              <div className="adm-kv-row"><span>Source</span><span className="v">{t(`admin.crm.sources.${p.source}`)}</span></div>
              <div className="adm-kv-row"><span>Est. GMV</span><span className="v">{fmtGmv(p.estGmv)}</span></div>
              {p.notes && (
                <div style={{ paddingTop: 8, color: "var(--adm-text-secondary)", fontSize: 12, lineHeight: 1.5 }}>
                  {p.notes}
                </div>
              )}
            </div>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.crm.detail.owner")}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="crm-owner-av" style={{ width: 32, height: 32, fontSize: 12 }}>{p.owner}</span>
              <div className="crm-cell-stack">
                <span style={{ fontSize: 12 }}>{p.ownerName}</span>
                <button type="button" className="adm-link" onClick={() => toast("Reassign coming soon")}>
                  {t("admin.crm.detail.reassign")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="button" className="adm-link" style={{ alignSelf: "flex-start" }} onClick={() => nav(-1)}>
        ← Back
      </button>
    </div>
  );
}