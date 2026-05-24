import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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

const BUYER_PROFILES: { value: string; label: string }[] = [
  { value: "master_buyer", label: "Master Buyer (full access)" },
  { value: "procurement", label: "Procurement" },
  { value: "import_manager", label: "Import Manager" },
  { value: "quality_control", label: "Quality Control" },
  { value: "logistics", label: "Logistics" },
];

const SUPPLIER_PROFILES: { value: string; label: string }[] = [
  { value: "master_supplier", label: "Master Supplier (full access)" },
  { value: "operator", label: "Operator" },
  { value: "export_manager", label: "Export Manager" },
  { value: "quality_control", label: "Quality Control" },
  { value: "logistics", label: "Logistics" },
];

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
  const { company } = useCurrentCompany();
  const profiles = ns === "buyer" ? BUYER_PROFILES : SUPPLIER_PROFILES;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileType, setProfileType] = useState(profiles[0].value);
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
      setProfileType(user.profileType || profiles[0].value);
      setJobTitle(user.jobTitle || "");
      setPhone(user.phone || "");
      setNotes(user.notes || "");
      setActive(user.status !== "inactive");
    } else {
      setName("");
      setEmail("");
      setProfileType(profiles[0].value);
      setJobTitle("");
      setPhone("");
      setNotes("");
      setActive(true);
    }
  }, [open, mode, user, profiles]);

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        role: profileType,
        job_title: jobTitle.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        status: active ? "active" : "inactive",
      };
      if (mode === "edit" && user) {
        const { error } = await (supabase as any)
          .from("company_users")
          .update(payload)
          .eq("id", user.id);
        if (error) throw error;
        toast.success("User updated");
      } else {
        if (!company?.id) throw new Error("No company");
        const { error } = await (supabase as any)
          .from("company_users")
          .insert({ ...payload, status: "invited", company_id: company.id });
        if (error) throw error;
        toast.success(`Invite sent to ${email.trim()}`);
      }
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    if (!confirm("Delete this user? This cannot be undone.")) return;
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
    toast.success("User deleted");
    onSaved?.();
    onClose();
  }

  const title = mode === "edit" ? "Edit User" : "Invite User";
  const subtitle =
    mode === "edit"
      ? "Update this team member's details and permissions."
      : "Send an invitation to add a new team member.";

  return (
    <Modal open={open} onClose={onClose} width={620} ariaLabel={title}>
      <div className="ufm-head">
        <div>
          <h2 className="ufm-title">{title}</h2>
          <p className="ufm-sub">{subtitle}</p>
        </div>
        {mode === "edit" && (
          <span className={`ufm-status-pill ${active ? "active" : "inactive"}`}>
            <span className="ufm-status-dot" /> {active ? "Active" : "Inactive"}
          </span>
        )}
      </div>

      <div className="ufm-body">
        <div className="ufm-row2">
          <div className="ufm-field">
            <label>Name <span className="ufm-req">*</span></label>
            <input
              className="ufm-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="ufm-field">
            <label>E-mail <span className="ufm-req">*</span></label>
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
            <label>Profile Type <span className="ufm-req">*</span></label>
            <select
              className="ufm-input"
              value={profileType}
              onChange={(e) => setProfileType(e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ufm-field">
            <label>Job title</label>
            <input
              className="ufm-input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Sales Director"
              autoComplete="organization-title"
            />
          </div>
        </div>
        <div className="ufm-field">
          <label>Phone</label>
          <PhoneInput value={phone} onChange={setPhone} />
        </div>
        <div className="ufm-field">
          <label>Notes</label>
          <textarea
            className="ufm-input ufm-textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this user…"
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
            <strong>Account {active ? "active" : "inactive"}</strong>
            <p>
              {active
                ? "User can sign in and access this workspace."
                : "User cannot sign in until reactivated."}
            </p>
          </div>
        </div>

        {mode === "edit" && user && (
          <div className="ufm-meta">
            <div>
              <span className="ufm-meta-label">CREATED</span>
              <span>{fmtDate(user.createdAt)}</span>
            </div>
            <div>
              <span className="ufm-meta-label">LAST LOGIN</span>
              <span>{fmtDateTime(user.lastLoginAt)}</span>
            </div>
            <div>
              <span className="ufm-meta-label">USER ID</span>
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
            <Trash2 size={14} /> Delete user
          </button>
        ) : (
          <span />
        )}
        <div className="ufm-footer-right">
          <button type="button" className="ufm-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ufm-btn-primary"
            onClick={handleSave}
            disabled={busy}
          >
            {mode === "edit" ? "Save changes" : "Send invite"}
          </button>
        </div>
      </div>
    </Modal>
  );
}