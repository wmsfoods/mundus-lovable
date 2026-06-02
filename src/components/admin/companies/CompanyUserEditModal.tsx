import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AdminCompanyUserRow } from "@/hooks/useAdminCompanyUsers";

const BUYER_ROLES = [
  "master_buyer", "buyer_global_director", "procurement", "import_manager",
  "quality_control", "logistics", "finance", "compliance",
];
const SUPPLIER_ROLES = [
  "master_supplier", "supplier_global_director", "export_manager", "operator",
  "quality_control", "logistics",
];
const STATUSES = ["active", "invited", "inactive"];

export function CompanyUserEditModal({
  row,
  onClose,
  onSaved,
}: {
  row: AdminCompanyUserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [full_name, setName] = useState(row.full_name);
  const [email, setEmail] = useState(row.email);
  const [role, setRole] = useState(row.role || "");
  const [status, setStatus] = useState(row.status);
  const [job_title, setJob] = useState(row.job_title || "");
  const [phone, setPhone] = useState(row.phone || "");
  const [notes, setNotes] = useState(row.notes || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const availableRoles = row.company_is_supplier
    ? SUPPLIER_ROLES
    : row.company_is_buyer
    ? BUYER_ROLES
    : Array.from(new Set([...BUYER_ROLES, ...SUPPLIER_ROLES]));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("company_users")
      .update({ full_name, email, role, status, job_title, phone, notes })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("User updated");
    onSaved();
    onClose();
  };

  const remove = async () => {
    setDeleting(true);
    const { error } = await (supabase as any).from("company_users").delete().eq("id", row.id);
    setDeleting(false);
    if (error) {
      if (error.message?.includes("last_master_protected") || error.code === "P0010") {
        toast.error("Cannot delete the last master of the company. Promote another member first.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("User removed from company");
    onSaved();
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 10, width: "100%", maxWidth: 560,
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit User</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{row.company_name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Full Name" full>
            <input className="adm-input" value={full_name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" full>
            <input className="adm-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Role">
            <select className="adm-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">—</option>
              {availableRoles.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </Field>
          <Field label="Status">
            <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </Field>
          <Field label="Job Title">
            <input className="adm-input" value={job_title} onChange={(e) => setJob(e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="adm-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Notes" full>
            <textarea className="adm-input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #e5e7eb", gap: 8 }}>
          {confirmDel ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#b91c1c" }}>Confirm delete?</span>
              <button className="crm-btn-primary" style={{ background: "#dc2626" }} onClick={remove} disabled={deleting}>
                {deleting ? "..." : "Yes, remove"}
              </button>
              <button className="crm-btn-ghost" onClick={() => setConfirmDel(false)}>Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: "#b91c1c", border: "1px solid #fecaca", padding: "6px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <Trash2 size={13} /> Remove from company
            </button>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="crm-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="crm-btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1 / -1" : undefined }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}