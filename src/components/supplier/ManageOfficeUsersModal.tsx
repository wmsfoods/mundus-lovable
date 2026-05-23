import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/mundus/Modal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type UserRow = { id: string; name: string; email: string };
type Membership = { user_id: string; role: string | null; is_primary: boolean | null };

type Props = {
  open: boolean;
  onClose: () => void;
  officeId: string;
  officeLabel: string;
  parentCompanyId: string;
  onChanged?: () => void;
};

export function ManageOfficeUsersModal({
  open,
  onClose,
  officeId,
  officeLabel,
  parentCompanyId,
  onChanged,
}: Props) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [companyUsers, setCompanyUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"member" | "office_admin">("member");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    setLoading(true);
    const [{ data: uo }, { data: cu }] = await Promise.all([
      supabase.from("user_offices").select("user_id, role, is_primary").eq("company_id", officeId),
      supabase.from("users").select("id, name, email").eq("company_id", parentCompanyId),
    ]);
    setMemberships((uo || []) as Membership[]);
    setCompanyUsers((cu || []) as UserRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedUserId(null);
    setRole("member");
    setIsPrimary(false);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, officeId, parentCompanyId]);

  const userMap = useMemo(() => {
    const m: Record<string, UserRow> = {};
    companyUsers.forEach((u) => (m[u.id] = u));
    return m;
  }, [companyUsers]);

  const memberIds = useMemo(() => new Set(memberships.map((m) => m.user_id)), [memberships]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companyUsers
      .filter((u) => !memberIds.has(u.id))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [companyUsers, memberIds, query]);

  async function handleAdd() {
    if (!selectedUserId) {
      toast.error("Select a user");
      return;
    }
    setSaving(true);
    try {
      if (isPrimary) {
        // Clear other primaries for this user
        await supabase.from("user_offices").update({ is_primary: false }).eq("user_id", selectedUserId);
      }
      const { error } = await supabase.from("user_offices").insert({
        user_id: selectedUserId,
        company_id: officeId,
        role,
        is_primary: isPrimary,
      });
      if (error) throw error;
      toast.success("User added to office");
      setSelectedUserId(null);
      setIsPrimary(false);
      setRole("member");
      setQuery("");
      await fetchData();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this user from the office?")) return;
    try {
      const { error } = await supabase
        .from("user_offices")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", officeId);
      if (error) throw error;
      toast.success("User removed");
      await fetchData();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={560} ariaLabel="Manage office users">
      <div style={{ padding: "20px 24px 8px", fontWeight: 600, fontSize: 18 }}>
        👥 Users — {officeLabel}
      </div>
      <div style={{ padding: "8px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--fg-muted)" }}>
            Current users
          </div>
          {loading ? (
            <div style={{ padding: 12, color: "var(--fg-muted)" }}>Loading…</div>
          ) : memberships.length === 0 ? (
            <div style={{ padding: 12, color: "var(--fg-muted)", border: "1px dashed var(--border)", borderRadius: 8, textAlign: "center" }}>
              No users assigned to this office yet
            </div>
          ) : (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              {memberships.map((m) => {
                const u = userMap[m.user_id];
                return (
                  <div key={m.user_id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: 500 }}>{u?.name ?? m.user_id}</div>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{u?.email ?? ""}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--g100)", borderRadius: 999 }}>
                        {m.role || "member"}{m.is_primary ? " · primary" : ""}
                      </span>
                      <button className="btn ghost" onClick={() => handleRemove(m.user_id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)" }} />

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--fg-muted)" }}>
            Add user to this office
          </div>
          <input className="input" placeholder="🔍 Search by name or email…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
          <div style={{ marginTop: 8, maxHeight: 180, overflow: "auto",
            border: "1px solid var(--border)", borderRadius: 8 }}>
            {available.length === 0 ? (
              <div style={{ padding: 12, color: "var(--fg-muted)", fontSize: 13 }}>
                No available users
              </div>
            ) : (
              available.map((u) => (
                <div key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  style={{
                    padding: "8px 12px", cursor: "pointer",
                    background: selectedUserId === u.id ? "var(--p050)" : "transparent",
                    borderBottom: "1px solid var(--border)",
                  }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{u.email}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Role:</div>
            <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
              <input type="radio" checked={role === "member"} onChange={() => setRole("member")} />
              Member
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
              <input type="radio" checked={role === "office_admin"} onChange={() => setRole("office_admin")} />
              Office Admin
            </label>
          </div>
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            Set as primary office
          </label>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose} disabled={saving}>Close</button>
        <button className="btn primary" onClick={handleAdd} disabled={saving || !selectedUserId}>
          {saving ? "Adding…" : "Add to Office"}
        </button>
      </div>
    </Modal>
  );
}