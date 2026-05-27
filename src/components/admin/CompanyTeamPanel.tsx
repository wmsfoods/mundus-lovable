import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { MoreVertical, KeyRound, Mail, UserPlus, Pencil, Ban, Trash2, Loader2, X, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Isolated client so admin's session isn't replaced by signUp.
const SB_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SB_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const authIsolated = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

type Member = {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  role: string;
  profile_type: string | null;
  phone: string | null;
  avatar_url: string | null;
  auth_user_id: string | null;
  account_status: "pending" | "invited" | "active" | "disabled";
  invited_at: string | null;
  created_at: string;
};

type Props = { companyId: string; isSupplier?: boolean; isBuyer?: boolean };

const ROLE_OPTIONS = ["master", "operator", "viewer", "member"];

function memberInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function Avatar({ url, name, size = 28 }: { url: string | null; name: string; size?: number }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: 999, overflow: "hidden", display: "inline-flex",
        alignItems: "center", justifyContent: "center", background: "#f3f4f6",
        color: "#6b7280", fontSize: Math.max(10, Math.floor(size * 0.38)), fontWeight: 600, flexShrink: 0,
      }}
    >
      {url
        ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span>{memberInitials(name)}</span>}
    </span>
  );
}

function tempPassword() {
  return crypto.randomUUID().slice(0, 12) + "Aa1!";
}

function StatusBadge({ status }: { status: Member["account_status"] }) {
  const map = {
    pending:  { bg: "#fef3c7", color: "#92400e", label: "Pending" },
    invited:  { bg: "#dbeafe", color: "#1e40af", label: "Invited" },
    active:   { bg: "#dcfce7", color: "#166534", label: "Active" },
    disabled: { bg: "#fee2e2", color: "#991b1b", label: "Disabled" },
  } as const;
  const s = map[status];
  return <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{s.label}</span>;
}

export default function CompanyTeamPanel({ companyId, isSupplier, isBuyer }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (error) toast.error("Failed to load team: " + error.message);
    setMembers((data ?? []) as Member[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const createAccount = async (m: Member) => {
    if (m.account_status !== "pending") return;
    setBusyId(m.id);
    try {
      const { data: authData, error: authErr } = await authIsolated.auth.signUp({
        email: m.email,
        password: tempPassword(),
        options: { data: { full_name: m.full_name } },
      });
      if (authErr || !authData?.user) throw authErr ?? new Error("signup_failed");
      const newId = authData.user.id;
      const userType = isSupplier && !isBuyer ? "supplier" : isBuyer && !isSupplier ? "buyer" : null;
      await supabase.from("users").upsert({
        id: newId,
        email: m.email,
        name: m.full_name,
        company_id: companyId,
        active_company_id: companyId,
        status: "active",
        user_type: userType ?? undefined,
      } as any);
      await supabase
        .from("team_invitations")
        .update({ auth_user_id: newId, account_status: "invited", invited_at: new Date().toISOString() })
        .eq("id", m.id);
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(m.email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetErr) toast.warning(`Account created but reset email failed: ${resetErr.message}`);
      else toast.success(`Account created & reset email sent to ${m.email}`);
      auditLog({
        action: "team.account_created",
        category: "user",
        entityType: "company",
        entityId: companyId,
        entityLabel: `${m.full_name} (${m.email})`,
        severity: "warn",
      });
      await load();
    } catch (e: any) {
      toast.error("Failed: " + (e?.message ?? "unknown"));
    } finally {
      setBusyId(null);
    }
  };

  const resendReset = async (m: Member) => {
    setBusyId(m.id);
    const { error } = await supabase.auth.resetPasswordForEmail(m.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setBusyId(null);
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success(`Reset email resent to ${m.email}`);
      auditLog({ action: "team.reset_resent", category: "user", entityLabel: m.email, severity: "warn" });
    }
  };

  const toggleDisable = async (m: Member) => {
    const newStatus = m.account_status === "disabled" ? (m.auth_user_id ? "invited" : "pending") : "disabled";
    setBusyId(m.id);
    const { error } = await supabase.from("team_invitations").update({ account_status: newStatus }).eq("id", m.id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(newStatus === "disabled" ? "Member disabled" : "Member re-enabled");
      auditLog({ action: `team.${newStatus === "disabled" ? "disabled" : "enabled"}`, category: "user", entityLabel: m.email });
      load();
    }
  };

  const removeMember = async (m: Member) => {
    if (!confirm(`Remove ${m.full_name} (${m.email}) from this team? This does NOT delete their login if one exists.`)) return;
    setBusyId(m.id);
    const { error } = await supabase.from("team_invitations").delete().eq("id", m.id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Member removed");
      auditLog({ action: "team.removed", category: "user", entityLabel: m.email });
      load();
    }
  };

  return (
    <div className="adm-panel" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1c1917" }}>Team Members</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>
            Imported members start as <strong>Pending</strong>. Create the account and send a reset email when ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#8B2252", color: "white", border: 0, borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
        >
          <UserPlus size={14} /> Add Team Member
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
          <Loader2 size={18} className="animate-spin" style={{ display: "inline-block" }} />
        </div>
      ) : members.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
          No team members yet. Add one or import via the Migration page.
        </div>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                {["Name", "Email", "Role", "Profile Type", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{m.full_name}</td>
                  <td style={{ padding: "10px 12px", color: "#5e5e58" }}>{m.email}</td>
                  <td style={{ padding: "10px 12px", textTransform: "capitalize", color: "#374151" }}>{m.role}</td>
                  <td style={{ padding: "10px 12px", color: "#5e5e58" }}>{m.profile_type || "—"}</td>
                  <td style={{ padding: "10px 12px" }}><StatusBadge status={m.account_status} /></td>
                  <td style={{ padding: "6px 12px", textAlign: "right", width: 50 }}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" disabled={busyId === m.id} style={{ background: "transparent", border: 0, padding: 6, cursor: "pointer", borderRadius: 4, color: "#6b7280" }}>
                          {busyId === m.id ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" style={{ minWidth: 240 }}>
                        {m.account_status === "pending" && (
                          <DropdownMenuItem onClick={() => createAccount(m)}>
                            <KeyRound size={14} /> Create Account & Send Reset
                          </DropdownMenuItem>
                        )}
                        {m.account_status === "invited" && (
                          <DropdownMenuItem onClick={() => resendReset(m)}>
                            <Mail size={14} /> Resend Reset Email
                          </DropdownMenuItem>
                        )}
                        {m.account_status === "active" && (
                          <DropdownMenuItem onClick={() => resendReset(m)}>
                            <Mail size={14} /> Send Password Reset
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setEditing(m)}>
                          <Pencil size={14} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleDisable(m)}>
                          <Ban size={14} /> {m.account_status === "disabled" ? "Re-enable" : "Disable"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => removeMember(m)} style={{ color: "#b91c1c" }}>
                          <Trash2 size={14} /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(addOpen || editing) && (
        <MemberFormModal
          companyId={companyId}
          member={editing}
          onClose={() => { setAddOpen(false); setEditing(null); }}
          onSaved={() => { setAddOpen(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function MemberFormModal({
  companyId, member, onClose, onSaved,
}: { companyId: string; member: Member | null; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(member?.full_name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState(member?.role ?? "member");
  const [profileType, setProfileType] = useState(member?.profile_type ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!fullName.trim() || !email.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    if (member) {
      const { error } = await supabase.from("team_invitations").update({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        profile_type: profileType || null,
        phone: phone || null,
      }).eq("id", member.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Member updated");
    } else {
      const { error } = await supabase.from("team_invitations").insert({
        company_id: companyId,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        profile_type: profileType || null,
        phone: phone || null,
        account_status: "pending",
      });
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Member added");
    }
    onSaved();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 10, padding: 20, width: 480, maxWidth: "92vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{member ? "Edit Team Member" : "Add Team Member"}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: 0, cursor: "pointer", color: "#6b7280" }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <Field label="Full Name *"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="adm-input" /></Field>
          <Field label="Email *"><input value={email} onChange={(e) => setEmail(e.target.value)} className="adm-input" type="email" /></Field>
          <Field label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="adm-input">
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Profile Type"><input value={profileType} onChange={(e) => setProfileType(e.target.value)} className="adm-input" placeholder="e.g. Master Supplier, Operator" /></Field>
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="adm-input" /></Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 14px", background: "white", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: "8px 14px", background: "#8B2252", color: "white", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#374151" }}>
      <span>{label}</span>
      {children}
      <style>{`.adm-input { padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; font-weight: 400; color: #1c1917; outline: none; }
      .adm-input:focus { border-color: #8B2252; }`}</style>
    </label>
  );
}