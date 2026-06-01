import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Users2, Plus, Search as SearchIcon, MoreVertical, KeyRound, Mail, Pencil, Ban, CheckCircle2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useCompanyRole } from "@/components/auth/RequireRole";
import { useSupplierUsers, type SupplierUser } from "@/hooks/useSupplierUsers";
import { useBuyerUsers, type BuyerUser } from "@/hooks/useBuyerUsers";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type Ctx = "supplier" | "buyer";
type Row = (SupplierUser | BuyerUser);

const SUPPLIER_ROLES: { value: string; label: string; color: string; bg: string }[] = [
  { value: "supplier_global_director", label: "Global Director", color: "#5b21b6", bg: "#ede9fe" },
  { value: "master_supplier",          label: "Master Supplier", color: "#B64769", bg: "#fbe2e8" },
  { value: "export_manager",           label: "Export Manager",  color: "#0c447c", bg: "#d8e6f8" },
  { value: "operator",                 label: "Operator",        color: "#3b6d11", bg: "#d3e7b5" },
  { value: "quality_control",          label: "Quality Control", color: "#7c2d12", bg: "#fed7aa" },
  { value: "logistics",                label: "Logistics",       color: "#1f2937", bg: "#e5e7eb" },
];
const BUYER_ROLES: { value: string; label: string; color: string; bg: string }[] = [
  { value: "buyer_global_director", label: "Global Director", color: "#5b21b6", bg: "#ede9fe" },
  { value: "master_buyer",          label: "Master Buyer",    color: "#B64769", bg: "#fbe2e8" },
  { value: "procurement",           label: "Procurement",     color: "#0c447c", bg: "#d8e6f8" },
  { value: "import_manager",        label: "Import Manager",  color: "#3b6d11", bg: "#d3e7b5" },
  { value: "quality_control",       label: "Quality Control", color: "#7c2d12", bg: "#fed7aa" },
  { value: "logistics",             label: "Logistics",       color: "#1f2937", bg: "#e5e7eb" },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active:   { label: "Active",   color: "#3b6d11", bg: "#d3e7b5", dot: "#3b6d11" },
  invited:  { label: "Invited",  color: "#0c447c", bg: "#d8e6f8", dot: "#0c447c" },
  inactive: { label: "Inactive", color: "#5e5e58", bg: "#e5e7eb", dot: "#908d85" },
};

function initials(name: string, email: string) {
  const src = (name || email || "?").trim();
  const p = src.split(/\s+/);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function Avatar({ name, email, url }: { name: string; email: string; url: string | null }) {
  return url ? (
    <img src={url} alt={name || email} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
  ) : (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: "#fbe2e8", color: "#791f3f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 12,
    }}>{initials(name, email)}</div>
  );
}
function RoleBadge({ role, roles }: { role: string | null; roles: typeof SUPPLIER_ROLES }) {
  const m = roles.find((r) => r.value === role) ?? { label: role ?? "—", color: "#5e5e58", bg: "#f1f0ed" };
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: m.bg, color: m.color, fontSize: 11, fontWeight: 600 }}>
      {m.label}
    </span>
  );
}
function StatusBadge({ status }: { status: Row["status"] }) {
  const m = STATUS_META[status] ?? STATUS_META.inactive;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot }} />
      <span style={{ fontSize: 11, color: m.color, textTransform: "uppercase", fontWeight: 600 }}>{m.label}</span>
    </span>
  );
}

export default function CompanyUsersPage({ context, companyIdOverride }: { context: Ctx; companyIdOverride?: string }) {
  const { t, i18n } = useTranslation();
  const { company } = useCurrentCompany();
  const companyId = companyIdOverride ?? company?.id ?? null;
  const { role, isMundusAdmin } = useCompanyRole();
  const canManage =
    isMundusAdmin ||
    ["master_supplier", "supplier_global_director", "master_buyer", "buyer_global_director"].includes(role ?? "");

  const supplierHook = useSupplierUsers(companyIdOverride ?? null);
  const buyerHook = useBuyerUsers(companyIdOverride ?? null);
  const { data, isLoading, refetch } = context === "supplier" ? supplierHook : buyerHook;
  const roles = context === "supplier" ? SUPPLIER_ROLES : BUYER_ROLES;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "invited" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(25);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((m) => {
      if (roleFilter !== "all" && m.profileType !== roleFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (q && !`${m.name} ${m.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, roleFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize);

  const sendInvite = async (payload: {
    full_name: string; email: string; role: string; job_title?: string | null; phone?: string | null;
  }) => {
    if (!companyId) { toast.error("No company"); return false; }
    const { data: resp, error } = await supabase.functions.invoke("send-team-invite", {
      body: {
        company_id: companyId,
        full_name: payload.full_name,
        email: payload.email,
        role: payload.role,
        job_title: payload.job_title ?? null,
        phone: payload.phone ?? null,
        language: i18n.language || "en",
        origin: window.location.origin,
      },
    });
    if (error || (resp && (resp as any).error)) {
      toast.error(error?.message || (resp as any)?.error || "Failed to send invite");
      return false;
    }
    toast.success(`Invitation sent to ${payload.email}`);
    auditLog({
      action: "team.invited", category: "user",
      entityType: "company", entityId: companyId,
      entityLabel: `${payload.full_name} (${payload.email})`, severity: "info",
      details: { role: payload.role, context },
    });
    return true;
  };

  const resendInvite = async (m: Row) => {
    setBusyId(m.id);
    await sendInvite({
      full_name: m.name, email: m.email, role: m.profileType, job_title: m.jobTitle || null, phone: m.phone || null,
    });
    setBusyId(null);
    refetch();
  };
  const sendReset = async (m: Row) => {
    setBusyId(m.id);
    const { error } = await supabase.auth.resetPasswordForEmail(m.email, {
      redirectTo: window.location.origin + "/login",
    });
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(`Reset email sent to ${m.email}`);
      auditLog({ action: "team.reset_sent", category: "user", entityLabel: m.email });
    }
  };
  const setStatus = async (m: Row, next: "active" | "inactive") => {
    setBusyId(m.id);
    const { error } = await supabase.from("company_users").update({ status: next } as any).eq("id", m.id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(next === "inactive" ? "User deactivated" : "User reactivated");
    auditLog({
      action: next === "inactive" ? "team.deactivated" : "team.reactivated",
      category: "user", entityLabel: m.email,
      severity: next === "inactive" ? "warn" : "info",
    });
    refetch();
  };

  return (
    <div className="adm-page" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
          <Users2 size={15} /> {t("shell.nav.users", { defaultValue: "Users" })}
          <span style={{ fontSize: 11, color: "#908d85", fontWeight: 500, marginLeft: 6 }}>{company?.name ?? ""}</span>
        </h1>
        {canManage && (
          <button onClick={() => setInviteOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6,
              border: "none", background: "#8B2252", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} /> Invite User
          </button>
        )}
      </div>

      <div className="adm-panel" style={{ overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, background: "white" }}>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
          padding: "6px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9",
        }}>
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
            <SearchIcon size={12} style={{ position: "absolute", left: 8, top: 7, color: "#908d85" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…"
              style={{ width: "100%", padding: "5px 8px 5px 24px", fontSize: 11, border: "1px solid rgba(0,0,0,0.10)", borderRadius: 5, background: "white" }} />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: "5px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white" }}>
            <option value="all">All roles</option>
            {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ padding: "5px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white" }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="inactive">Inactive</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#908d85" }}>
            {filtered.length} of {data.length}
          </span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#fafaf9", textAlign: "left" }}>
              {["MEMBER", "EMAIL", "ROLE", "STATUS", "LAST LOGIN", "ACTIONS"].map((h) => (
                <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 600, color: "#5e5e58", letterSpacing: 0.4, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#908d85" }}>Loading…</td></tr>}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 28, textAlign: "center", color: "#908d85" }}>
                No users yet. Click <strong>Invite User</strong> to add your first teammate.
              </td></tr>
            )}
            {!isLoading && data.length > 0 && paged.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#908d85" }}>No users match these filters</td></tr>
            )}
            {paged.map((m) => {
              const active = m.status === "active";
              return (
                <tr key={m.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", opacity: m.status === "inactive" ? 0.6 : 1 }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={m.name} email={m.email} url={m.avatarUrl} />
                      <div>
                        <div style={{ fontWeight: 600, color: "#1a1a18" }}>{m.name}</div>
                        {m.jobTitle && <div style={{ fontSize: 11, color: "#908d85" }}>{m.jobTitle}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#5e5e58" }}>{m.email}</td>
                  <td style={{ padding: "10px 12px" }}><RoleBadge role={m.profileType} roles={roles} /></td>
                  <td style={{ padding: "10px 12px" }}><StatusBadge status={m.status} /></td>
                  <td style={{ padding: "10px 12px", color: "#5e5e58" }}>{fmtDate(m.lastLoginAt)}</td>
                  <td style={{ padding: "6px 12px", textAlign: "right" }}>
                    {canManage ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" disabled={busyId === m.id}
                          style={{ background: "transparent", border: 0, padding: 6, cursor: "pointer", borderRadius: 4, color: "#6b7280" }}>
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" style={{ minWidth: 220 }}>
                        {m.status === "invited" && (
                          <DropdownMenuItem onClick={() => resendInvite(m)}>
                            <Mail size={14} /> Resend invite
                          </DropdownMenuItem>
                        )}
                        {m.status === "active" && (
                          <DropdownMenuItem onClick={() => sendReset(m)}>
                            <KeyRound size={14} /> Send password reset
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setEditing(m)}>
                          <Pencil size={14} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {active ? (
                          <DropdownMenuItem onClick={() => setStatus(m, "inactive")} style={{ color: "#b91c1c" }}>
                            <Ban size={14} /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setStatus(m, "active")}>
                            <CheckCircle2 size={14} /> Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    ) : (
                      <span style={{ color: "#cfcdc7" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "8px 10px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9", fontSize: 11, color: "#5e5e58",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>Rows:</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) as any)}
              style={{ padding: "3px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white" }}>
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <button disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: "3px 8px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white", cursor: safePage <= 1 ? "not-allowed" : "pointer" }}>
              Prev
            </button>
            <span>Page {safePage} / {totalPages}</span>
            <button disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: "3px 8px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white", cursor: safePage >= totalPages ? "not-allowed" : "pointer" }}>
              Next
            </button>
          </div>
        </div>
      </div>

      {inviteOpen && (
        <InviteModal roles={roles}
          onClose={() => setInviteOpen(false)}
          onSubmit={async (v) => {
            const ok = await sendInvite(v);
            if (ok) { setInviteOpen(false); refetch(); }
          }} />
      )}
      {editing && (
        <EditModal member={editing} roles={roles}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }} />
      )}
    </div>
  );
}

function InviteModal({
  roles, onClose, onSubmit,
}: {
  roles: typeof SUPPLIER_ROLES;
  onClose: () => void;
  onSubmit: (v: { full_name: string; email: string; role: string; job_title: string | null; phone: string | null }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[1]?.value ?? roles[0].value);
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!fullName.trim() || !email.trim()) { toast.error("Name and email are required"); return; }
    setBusy(true);
    await onSubmit({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      job_title: jobTitle.trim() || null,
      phone: phone.trim() || null,
    });
    setBusy(false);
  };

  return (
    <ModalShell title="Invite User" onClose={onClose}>
      <Field label="Full Name *"><input className="cu-input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
      <Field label="Email *"><input className="cu-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Role">
        <select className="cu-input" value={role} onChange={(e) => setRole(e.target.value)}>
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>
      <Field label="Job Title"><input className="cu-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></Field>
      <Field label="Phone"><input className="cu-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      <Footer onCancel={onClose} onSave={submit} busy={busy} saveLabel="Send invite" />
    </ModalShell>
  );
}

function EditModal({
  member, roles, onClose, onSaved,
}: {
  member: Row;
  roles: typeof SUPPLIER_ROLES;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(member.name);
  const [role, setRole] = useState(member.profileType);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!fullName.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    const { error } = await supabase.from("company_users")
      .update({ full_name: fullName.trim(), role } as any).eq("id", member.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("User updated");
    auditLog({
      action: "team.edited", category: "user", entityLabel: member.email,
      details: { full_name: fullName.trim(), role },
    });
    onSaved();
  };

  return (
    <ModalShell title="Edit User" onClose={onClose}>
      <Field label="Full Name *"><input className="cu-input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
      <Field label="Email"><input className="cu-input" value={member.email} readOnly disabled /></Field>
      <Field label="Role">
        <select className="cu-input" value={role} onChange={(e) => setRole(e.target.value as any)}>
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>
      <Footer onCancel={onClose} onSave={save} busy={busy} saveLabel="Save" />
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: 10, padding: 20, width: 460, maxWidth: "92vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a18" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: 0, cursor: "pointer", color: "#6b7280" }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>{children}</div>
        <style>{`.cu-input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;color:#1c1917;outline:none;width:100%}.cu-input:focus{border-color:#8B2252}`}</style>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#374151" }}>
      <span>{label}</span>{children}
    </label>
  );
}
function Footer({ onCancel, onSave, busy, saveLabel }: { onCancel: () => void; onSave: () => void; busy: boolean; saveLabel: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
      <button onClick={onCancel} style={{ padding: "8px 14px", background: "white", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Cancel</button>
      <button onClick={onSave} disabled={busy}
        style={{ padding: "8px 14px", background: "#8B2252", color: "white", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
        {busy ? "…" : saveLabel}
      </button>
    </div>
  );
}