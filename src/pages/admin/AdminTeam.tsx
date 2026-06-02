import { useEffect, useMemo, useState } from "react";
import { Users2, Plus, Pencil, Trash2, X, Search as SearchIcon, ChevronLeft, ChevronRight, CheckCircle2, XCircle, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { auditLog } from "@/lib/auditLog";

const MUNDUS_COMPANY_ID = "00000000-0000-beef-0000-000000000001";

const ROLE_OPTIONS = [
  { key: "mundus_admin",   label: "Admin",      color: "#B64769", bg: "#fbe2e8" },
  { key: "mundus_ops",     label: "Operations", color: "#0c447c", bg: "#d8e6f8" },
  { key: "mundus_sales",   label: "Sales",      color: "#3b6d11", bg: "#d3e7b5" },
  { key: "mundus_support", label: "Support",    color: "#5b21b6", bg: "#ede9fe" },
] as const;

type RoleKey = typeof ROLE_OPTIONS[number]["key"];

const roleMeta = (key?: string | null) =>
  ROLE_OPTIONS.find((r) => r.key === key) ?? {
    key: key ?? "—", label: key ?? "—", color: "#5e5e58", bg: "#f1f0ed",
  };

type RoleRow = { id: string; name: string };
type Member = {
  id: string;            // company_users.id
  user_id: string | null;
  email: string;
  full_name: string;
  role_id: string | null;
  role_name: string;
  status: string;
  created_at: string;
  avatar_url: string | null;
  last_login_at: string | null;
};

function initials(name: string, email: string) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ name, email, url }: { name: string; email: string; url: string | null }) {
  return url ? (
    <img src={url} alt={name || email}
      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
  ) : (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: "#fbe2e8", color: "#791f3f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 12,
    }}>{initials(name, email)}</div>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const m = roleMeta(role);
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999,
      background: m.bg, color: m.color, fontSize: 11, fontWeight: 600,
    }}>{m.label}</span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: active ? "#3b6d11" : "#908d85",
      }} />
      <span style={{ fontSize: 11, color: active ? "#3b6d11" : "#908d85", textTransform: "uppercase", fontWeight: 600 }}>
        {active ? "Active" : "Inactive"}
      </span>
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "baseline", gap: 6,
      padding: "4px 9px", borderRadius: 999, background: "#f6f5f3",
      border: "1px solid rgba(0,0,0,0.06)",
    }}>
      <span style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#8B2252" }}>{value}</span>
    </span>
  );
}

// ---------- password rules ----------
const passwordIssues = (p: string) => {
  const issues: string[] = [];
  if (p.length < 8) issues.push("8+ characters");
  if (!/[A-Z]/.test(p)) issues.push("uppercase");
  if (!/[a-z]/.test(p)) issues.push("lowercase");
  if (!/[^A-Za-z0-9]/.test(p)) issues.push("special character");
  return issues;
};

export default function AdminTeam() {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | RoleKey>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [rolesRes, cuRes] = await Promise.all([
      supabase.from("roles" as any).select("id, name").in("name", ROLE_OPTIONS.map((r) => r.key)),
      supabase
        .from("company_users")
        .select("id, user_id, email, full_name, role_id, status, created_at, last_login_at")
        .eq("company_id", MUNDUS_COMPANY_ID)
        .order("created_at", { ascending: false }),
    ]);

    const rolesData = ((rolesRes.data ?? []) as unknown) as RoleRow[];
    setRoles(rolesData);

    const cu = (cuRes.data ?? []) as any[];
    const userIds = cu.map((r) => r.user_id).filter(Boolean) as string[];
    let usersById: Record<string, { name: string | null; email: string; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: us } = await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .in("id", userIds);
      (us ?? []).forEach((u: any) => {
        usersById[u.id] = { name: u.name, email: u.email, avatar_url: u.avatar_url };
      });
    }

    const rolesById = Object.fromEntries(rolesData.map((r) => [r.id, r.name]));
    const list: Member[] = cu.map((r) => {
      const u = r.user_id ? usersById[r.user_id] : undefined;
      return {
        id: r.id,
        user_id: r.user_id,
        email: r.email ?? u?.email ?? "",
        full_name: r.full_name ?? u?.name ?? "",
        role_id: r.role_id,
        role_name: r.role_id ? (rolesById[r.role_id] ?? "") : "",
        status: r.status ?? "active",
        created_at: r.created_at,
        avatar_url: u?.avatar_url ?? null,
        last_login_at: r.last_login_at,
      };
    });
    setMembers(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const roleIdByKey = useMemo(
    () => Object.fromEntries(roles.map((r) => [r.name, r.id])) as Record<string, string>,
    [roles],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role_name !== roleFilter) return false;
      if (statusFilter === "active" && m.status !== "active") return false;
      if (statusFilter === "inactive" && m.status === "active") return false;
      if (q && !`${m.full_name} ${m.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, search, roleFilter, statusFilter]);

  // Reset page when filters change or list shrinks
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  const pageIds = useMemo(() => paged.map((m) => m.id), [paged]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  const togglePageSelection = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const selectedMembers = useMemo(
    () => members.filter((m) => selected.has(m.id)),
    [members, selected],
  );

  const bulkUpdateStatus = async (status: "active" | "inactive") => {
    if (selectedMembers.length === 0) return;
    setBulkBusy(true);
    try {
      const ids = selectedMembers.map((m) => m.id);
      const { error } = await supabase
        .from("company_users")
        .update({ status } as any)
        .in("id", ids);
      if (error) throw error;
      auditLog({
        action: status === "active" ? "team.bulk_activated" : "team.bulk_deactivated",
        category: "user",
        severity: status === "active" ? "info" : "warn",
        details: { count: ids.length, ids },
      });
      toast.success(`${ids.length} member${ids.length > 1 ? "s" : ""} ${status === "active" ? "activated" : "deactivated"}`);
      clearSelection();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Bulk update failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkRemove = async () => {
    if (selectedMembers.length === 0) return;
    setBulkBusy(true);
    try {
      const ids = selectedMembers.map((m) => m.id);
      const { error } = await supabase
        .from("company_users")
        .update({ status: "inactive" } as any)
        .in("id", ids);
      if (error) throw error;
      auditLog({
        action: "team.bulk_removed", category: "user", severity: "warn",
        details: { count: ids.length, ids },
      });
      toast.success(`${ids.length} member${ids.length > 1 ? "s" : ""} removed`);
      clearSelection();
      setBulkRemoveOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Bulk remove failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const stats = useMemo(() => {
    const active = members.filter((m) => m.status === "active");
    const roleSet = new Set(active.map((m) => m.role_name).filter(Boolean));
    const last = members[0]?.created_at ?? null;
    return { active: active.length, roles: roleSet.size, last };
  }, [members]);

  return (
    <div className="adm-page" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Compact header: title + stats + add button on a single row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
            <Users2 size={15} /> Team
          </h1>
          <span style={{ fontSize: 11, color: "#908d85" }}>Mundus Trade admins</span>
          <div style={{ display: "inline-flex", gap: 6, marginLeft: 4 }}>
            <MiniStat label="Active" value={stats.active} />
            <MiniStat label="Roles" value={stats.roles} />
            <MiniStat label="Last" value={fmtDate(stats.last)} />
          </div>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 6, border: "none",
            background: "#B64769", color: "white", fontSize: 12, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={13} /> Add Member
        </button>
      </div>

      {/* Table panel with inline filter bar */}
      <div className="adm-panel" style={{ overflow: "hidden" }}>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
          padding: "6px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9",
          position: "sticky", top: 0, zIndex: 5,
        }}>
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
            <SearchIcon size={12} style={{ position: "absolute", left: 8, top: 7, color: "#908d85" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              style={{
                width: "100%", padding: "5px 8px 5px 24px", fontSize: 11,
                border: "1px solid rgba(0,0,0,0.10)", borderRadius: 5, background: "white",
              }}
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}
            style={{ padding: "5px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white" }}>
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ padding: "5px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white" }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#908d85" }}>
            {filtered.length} of {members.length}
          </span>
        </div>

        {selected.size > 0 && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
            padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)",
            background: "#fbe2e8", position: "sticky", top: 36, zIndex: 4,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#791f3f" }}>
              {selected.size} selected
            </span>
            <button onClick={() => bulkUpdateStatus("active")} disabled={bulkBusy}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, fontWeight: 600,
                borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white", color: "#3b6d11", cursor: "pointer" }}>
              <CheckCircle2 size={12} /> Activate
            </button>
            <button onClick={() => bulkUpdateStatus("inactive")} disabled={bulkBusy}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, fontWeight: 600,
                borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white", color: "#5e5e58", cursor: "pointer" }}>
              <XCircle size={12} /> Deactivate
            </button>
            <button onClick={() => setBulkRemoveOpen(true)} disabled={bulkBusy}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, fontWeight: 600,
                borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white", color: "#791f1f", cursor: "pointer" }}>
              <Trash2 size={12} /> Remove
            </button>
            <button onClick={clearSelection} disabled={bulkBusy}
              style={{ marginLeft: "auto", padding: "4px 8px", fontSize: 11, borderRadius: 5,
                border: "1px solid rgba(0,0,0,0.10)", background: "white", color: "#5e5e58", cursor: "pointer" }}>
              Clear
            </button>
          </div>
        )}

        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#fafaf9", textAlign: "left" }}>
              <th style={{ padding: "9px 12px", width: 28, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  ref={(el) => { if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected; }}
                  onChange={togglePageSelection}
                  aria-label="Select all on page"
                  style={{ cursor: "pointer" }}
                />
              </th>
              {["MEMBER", "EMAIL", "ROLE", "STATUS", "ADDED", "ACTIONS"].map((h) => (
                <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 600, color: "#5e5e58", letterSpacing: 0.4, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#908d85" }}>Loading…</td></tr>
            )}
            {!loading && paged.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#908d85" }}>No members found</td></tr>
            )}
            {paged.map((m) => {
              const active = m.status === "active";
              const isSel = selected.has(m.id);
              return (
                <tr key={m.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", opacity: active ? 1 : 0.55, background: isSel ? "#fdf3f6" : "transparent" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleOne(m.id)}
                      aria-label={`Select ${m.full_name || m.email}`} style={{ cursor: "pointer" }} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={m.full_name} email={m.email} url={m.avatar_url} />
                      <span style={{ fontWeight: 600 }}>{m.full_name || "—"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#5e5e58" }}>{m.email || "—"}</td>
                  <td style={{ padding: "10px 12px" }}><RoleBadge role={m.role_name} /></td>
                  <td style={{ padding: "10px 12px" }}><StatusDot active={active} /></td>
                  <td style={{ padding: "10px 12px", color: "#5e5e58" }}>{fmtDate(m.created_at)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditing(m)} title="Edit"
                        style={{ padding: 6, border: "1px solid rgba(0,0,0,0.10)", background: "white", borderRadius: 4, cursor: "pointer" }}>
                        <Pencil size={13} />
                      </button>
                      {active && (
                        <button onClick={() => setDeleting(m)} title="Remove"
                          style={{ padding: 6, border: "1px solid rgba(0,0,0,0.10)", background: "white", borderRadius: 4, cursor: "pointer", color: "#791f1f" }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                      {m.email && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Send password reset email to ${m.email}?`)) return;
                            const { error } = await supabase.auth.resetPasswordForEmail(m.email!, {
                              redirectTo: `${window.location.origin}/login`,
                            });
                            if (error) toast.error("Failed: " + error.message);
                            else {
                              toast.success(`Reset email sent to ${m.email}`);
                              auditLog({ action: "user.password_reset_sent", category: "user", entityLabel: m.email!, severity: "warn" });
                            }
                          }}
                          title="Send password reset email"
                          style={{ padding: 6, border: "1px solid rgba(0,0,0,0.10)", background: "white", borderRadius: 4, cursor: "pointer", color: "#5e5e58" }}>
                          <KeyRound size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
          padding: "6px 10px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9",
        }}>
          <span style={{ fontSize: 11, color: "#5e5e58" }}>
            {filtered.length === 0 ? "0" : `${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)}`} of {filtered.length}
          </span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
            <label style={{ fontSize: 10, color: "#908d85", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>Rows</label>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ padding: "3px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)", background: "white" }}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
              style={{ padding: "3px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)",
                background: "white", cursor: safePage <= 1 ? "not-allowed" : "pointer", opacity: safePage <= 1 ? 0.5 : 1 }}>
              <ChevronLeft size={12} />
            </button>
            <span style={{ fontSize: 11, color: "#5e5e58", padding: "0 4px" }}>
              Page {safePage} of {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              style={{ padding: "3px 6px", fontSize: 11, borderRadius: 5, border: "1px solid rgba(0,0,0,0.10)",
                background: "white", cursor: safePage >= totalPages ? "not-allowed" : "pointer", opacity: safePage >= totalPages ? 0.5 : 1 }}>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {addOpen && (
        <AddMemberModal
          roleIdByKey={roleIdByKey}
          onClose={() => setAddOpen(false)}
          onCreated={() => { setAddOpen(false); load(); }}
        />
      )}
      {editing && (
        <EditMemberModal
          member={editing}
          roleIdByKey={roleIdByKey}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {deleting && (
        <ConfirmRemove
          member={deleting}
          onClose={() => setDeleting(null)}
          onDone={() => { setDeleting(null); load(); }}
        />
      )}
      {bulkRemoveOpen && (
        <ModalShell title={`Remove ${selected.size} member${selected.size > 1 ? "s" : ""}?`} onClose={() => setBulkRemoveOpen(false)}>
          <p style={{ fontSize: 13, color: "#1a1a18", margin: "0 0 16px" }}>
            This will revoke admin access for the selected members. They will be marked inactive.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setBulkRemoveOpen(false)} disabled={bulkBusy}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", background: "white", cursor: "pointer", fontSize: 12 }}>
              Cancel
            </button>
            <button onClick={bulkRemove} disabled={bulkBusy}
              style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#791f1f", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {bulkBusy ? "Removing…" : "Remove"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ============================ Modals ============================

function ModalShell({ title, onClose, children }:{
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "white", borderRadius: 8, width: "100%", maxWidth: 460,
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#908d85" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6,
  border: "1px solid rgba(0,0,0,0.12)", background: "#f6f5f3",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#5e5e58", textTransform: "uppercase", letterSpacing: 0.4,
};

function AddMemberModal({ roleIdByKey, onClose, onCreated }:{
  roleIdByKey: Record<string, string>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleKey>("mundus_ops");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const issues = passwordIssues(password);

  const submit = async () => {
    if (!name.trim() || !email.trim()) return toast.error("Name and email are required");
    if (issues.length) return toast.error("Password missing: " + issues.join(", "));
    const role_id = roleIdByKey[role];
    if (!role_id) return toast.error("Role not found in database");
    setBusy(true);
    try {
      // Server-side creation (service role): creates auth user + public.users
      // + company_users in one shot. We can't use client-side signUp here
      // because it would swap the admin's session for the new user's session
      // and break the subsequent RLS-protected inserts.
      const { data, error } = await supabase.functions.invoke("admin-create-team-member", {
        body: { full_name: name.trim(), email: email.trim(), password, role_id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
      const userId = (data as any)?.user_id ?? null;

      auditLog({
        action: "team.member_added", category: "user",
        entityId: userId ?? undefined, entityLabel: name.trim(),
        details: { role, email: email.trim() },
      });
      toast.success("Team member added");
      onCreated();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to add member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Add Team Member" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={labelStyle}>Full Name *</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@mundustrade.com" />
        </div>
        <div>
          <label style={labelStyle}>Role *</label>
          <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
            {ROLE_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Password *</label>
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          <div style={{ fontSize: 10, color: issues.length ? "#791f1f" : "#3b6d11", marginTop: 4 }}>
            {password ? (issues.length ? `Missing: ${issues.join(", ")}` : "Strong password ✓")
              : "8+ chars, uppercase, lowercase, special character"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onClose} disabled={busy}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", background: "white", cursor: "pointer", fontSize: 12 }}>
            Cancel
          </button>
          <button onClick={submit} disabled={busy}
            style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#B64769", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {busy ? "Adding…" : "Add Member"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function EditMemberModal({ member, roleIdByKey, onClose, onSaved }:{
  member: Member;
  roleIdByKey: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(member.full_name);
  const [role, setRole] = useState<RoleKey>(
    (ROLE_OPTIONS.find((r) => r.key === member.role_name)?.key ?? "mundus_ops") as RoleKey,
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const role_id = roleIdByKey[role];
    if (!role_id) return toast.error("Role not found");
    setBusy(true);
    try {
      const { error } = await supabase
        .from("company_users")
        .update({ full_name: name.trim(), role_id } as any)
        .eq("id", member.id);
      if (error) throw error;

      if (member.user_id && name.trim() && name.trim() !== member.full_name) {
        await supabase.from("users").update({ name: name.trim() }).eq("id", member.user_id);
      }

      auditLog({
        action: "team.member_edited", category: "user",
        entityId: member.user_id ?? member.id, entityLabel: name.trim(),
        details: { oldRole: member.role_name, newRole: role },
      });
      toast.success("Member updated");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Edit Team Member" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={{ ...inputStyle, opacity: 0.7 }} value={member.email} readOnly />
        </div>
        <div>
          <label style={labelStyle}>Role</label>
          <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
            {ROLE_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onClose} disabled={busy}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", background: "white", cursor: "pointer", fontSize: 12 }}>
            Cancel
          </button>
          <button onClick={submit} disabled={busy}
            style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#B64769", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfirmRemove({ member, onClose, onDone }:{
  member: Member; onClose: () => void; onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("company_users")
        .update({ status: "inactive" } as any)
        .eq("id", member.id);
      if (error) throw error;
      auditLog({
        action: "team.member_removed", category: "user", severity: "warn",
        entityId: member.user_id ?? member.id,
        entityLabel: member.full_name || member.email,
      });
      toast.success("Member removed");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell title="Remove Team Member" onClose={onClose}>
      <p style={{ fontSize: 13, color: "#1a1a18", margin: "0 0 16px" }}>
        Are you sure you want to remove <strong>{member.full_name || member.email}</strong> from the team?
        This will revoke their admin access.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} disabled={busy}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", background: "white", cursor: "pointer", fontSize: 12 }}>
          Cancel
        </button>
        <button onClick={submit} disabled={busy}
          style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#791f1f", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
          {busy ? "Removing…" : "Remove"}
        </button>
      </div>
    </ModalShell>
  );
}