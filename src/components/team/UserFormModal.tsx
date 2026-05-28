import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/mundus/Modal";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { PhoneInput } from "@/components/company/CompanyProfilePage";

type Mode = "edit" | "invite";
type Ns = "buyer" | "supplier";

export type UserFormUser = {
  id: string;
  userNumber?: number | null;
  name: string;
  email: string;
  profileType: string;
  jobTitle?: string | null;
  phone?: string | null;
  notes?: string | null;
  status: "active" | "invited" | "inactive";
  createdAt?: string | null;
  lastLoginAt?: string | null;
};

const BUYER_PROFILE_VALUES = ["master_buyer", "procurement", "import_manager", "quality_control", "logistics"];
const SUPPLIER_PROFILE_VALUES = ["master_supplier", "operator", "export_manager", "quality_control", "logistics"];

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${fmtDate(iso)} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export type UserFormModalProps = {
  open: boolean;
  mode: Mode;
  ns: Ns;
  user?: UserFormUser | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function UserFormModal({
  open,
  mode,
  ns,
  user,
  onClose,
  onSaved,
}: UserFormModalProps) {
  const { t, i18n } = useTranslation();
  const { company } = useCurrentCompany();
  const profileValues = ns === "buyer" ? BUYER_PROFILE_VALUES : SUPPLIER_PROFILE_VALUES;
  const profileLabel = (v: string) => t(`team.form.profile.${v}`, { defaultValue: v });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileType, setProfileType] = useState(profileValues[0]);
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setProfileType(user.profileType || profileValues[0]);
      setJobTitle(user.jobTitle || "");
      setPhone(user.phone || "");
      setNotes(user.notes || "");
      setActive(user.status !== "inactive");
    } else {
      setName("");
      setEmail("");
      setProfileType(profileValues[0]);
      setJobTitle("");
      setPhone("");
      setNotes("");
      setActive(true);
    }
  }, [open, mode, user, profileValues]);

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      toast.error(t("team.form.errors.nameEmailRequired"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "edit" && user) {
        const payload = {
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          role: profileType,
          job_title: jobTitle.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          status: active ? "active" : "inactive",
        };
        const { error } = await (supabase as any)
          .from("company_users")
          .update(payload)
          .eq("id", user.id);
        if (error) throw error;
        toast.success(t("team.form.toast.updated"));
      } else {
        if (!company?.id) throw new Error(t("team.form.errors.noCompany"));
        const { data, error } = await supabase.functions.invoke("send-team-invite", {
          body: {
            company_id: company.id,
            full_name: name.trim(),
            email: email.trim().toLowerCase(),
            role: profileType,
            job_title: jobTitle.trim() || null,
            phone: phone.trim() || null,
            notes: notes.trim() || null,
            language: i18n.language,
            origin: window.location.origin,
          },
        });
        if (error) throw error;
        const res = data as { ok?: boolean; email_sent?: boolean; email_error?: string };
        if (res?.email_sent) {
          toast.success(t("team.form.toast.inviteSent", { email: email.trim() }));
        } else {
          toast.success(t("team.form.toast.inviteCreated", { email: email.trim() }));
          if (res?.email_error) console.warn("invite email error:", res.email_error);
        }
      }
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || t("team.form.errors.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    if (!confirm(t("team.form.confirmDelete"))) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("company_users")
      .delete()
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("team.form.toast.deleted"));
    onSaved?.();
    onClose();
  }

  const title = mode === "edit" ? t("team.form.title.edit") : t("team.form.title.invite");
  const subtitle = mode === "edit" ? t("team.form.subtitle.edit") : t("team.form.subtitle.invite");

  return (
    <Modal open={open} onClose={onClose} width={620} ariaLabel={title}>
      <div className="ufm-head">
        <div>
          <h2 className="ufm-title">{title}</h2>
          <p className="ufm-sub">{subtitle}</p>
        </div>
        {mode === "edit" && (
          <span className={`ufm-status-pill ${active ? "active" : "inactive"}`}>
            <span className="ufm-status-dot" /> {active ? t("team.form.status.active") : t("team.form.status.inactive")}
          </span>
        )}
      </div>

      <div className="ufm-body">
        <div className="ufm-row2">
          <div className="ufm-field">
            <label>{t("team.form.fields.name")} <span className="ufm-req">*</span></label>
            <input
              className="ufm-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="ufm-field">
            <label>{t("team.form.fields.email")} <span className="ufm-req">*</span></label>
            <input
              type="email"
              className="ufm-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>
        <div className="ufm-row2">
          <div className="ufm-field">
            <label>{t("team.form.fields.profileType")} <span className="ufm-req">*</span></label>
            <select
              className="ufm-input"
              value={profileType}
              onChange={(e) => setProfileType(e.target.value)}
            >
              {profileValues.map((v) => (
                <option key={v} value={v}>
                  {profileLabel(v)}
                </option>
              ))}
            </select>
          </div>
          <div className="ufm-field">
            <label>{t("team.form.fields.jobTitle")}</label>
            <input
              className="ufm-input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={t("team.form.placeholders.jobTitle")}
              autoComplete="organization-title"
            />
          </div>
        </div>
        <div className="ufm-field">
          <label>{t("team.form.fields.phone")}</label>
          <PhoneInput value={phone} onChange={setPhone} />
        </div>
        <div className="ufm-field">
          <label>{t("team.form.fields.notes")}</label>
          <textarea
            className="ufm-input ufm-textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("team.form.placeholders.notes")}
          />
        </div>

        <div className="ufm-toggle-card">
          <label className="ufm-switch">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span className="ufm-switch-slider" />
          </label>
          <div>
            <strong>{active ? t("team.form.account.activeTitle") : t("team.form.account.inactiveTitle")}</strong>
            <p>
              {active ? t("team.form.account.activeHint") : t("team.form.account.inactiveHint")}
            </p>
          </div>
        </div>

        {mode === "edit" && user && (
          <div className="ufm-meta">
            <div>
              <span className="ufm-meta-label">{t("team.form.meta.created")}</span>
              <span>{fmtDate(user.createdAt)}</span>
            </div>
            <div>
              <span className="ufm-meta-label">{t("team.form.meta.lastLogin")}</span>
              <span>{fmtDateTime(user.lastLoginAt)}</span>
            </div>
            <div>
              <span className="ufm-meta-label">{t("team.form.meta.userId")}</span>
              <span>#{user.userNumber ?? "—"}</span>
            </div>
          </div>
        )}
      </div>

      <div className="ufm-footer">
        {mode === "edit" ? (
          <button
            type="button"
            className="ufm-delete"
            onClick={handleDelete}
            disabled={busy}
          >
            <Trash2 size={14} /> {t("team.form.actions.delete")}
          </button>
        ) : (
          <span />
        )}
        <div className="ufm-footer-right">
          <button type="button" className="ufm-btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="ufm-btn-primary"
            onClick={handleSave}
            disabled={busy}
          >
            {busy
              ? t("common.submitting")
              : mode === "edit"
                ? t("team.form.actions.save")
                : t("team.form.actions.sendInvite")}
          </button>
        </div>
      </div>
    </Modal>
  );
}