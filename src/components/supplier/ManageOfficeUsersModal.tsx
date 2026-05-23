import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/mundus/Modal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type UserRow = { id: string; name: string; email: string };
type Membership = { user_id: string; company_id: string; role: string | null; is_primary: boolean | null };
type OfficeRow = {
  id: string;
  office_name: string | null;
  office_country: string | null;
  parent_company_id: string | null;
};

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
  const [allMemberships, setAllMemberships] = useState<Membership[]>([]);
  const [allOffices, setAllOffices] = useState<OfficeRow[]>([]);
  const [companyUsers, setCompanyUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"member" | "office_admin">("member");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transferMode, setTransferMode] = useState<"add" | "transfer" | "exclusive">("add");
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  async function fetchData() {
    setLoading(true);
    const { data: offices } = await supabase
      .from("companies")
      .select("id, office_name, office_country, parent_company_id")
      .or(`id.eq.${parentCompanyId},parent_company_id.eq.${parentCompanyId}`);
    const officesList = (offices || []) as OfficeRow[];
    setAllOffices(officesList);
    const allOfficeIds = officesList.map((o) => o.id);

    const [{ data: allUo }, { data: cu }] = await Promise.all([
      allOfficeIds.length
        ? supabase
            .from("user_offices")
            .select("user_id, company_id, role, is_primary")
            .in("company_id", allOfficeIds)
        : Promise.resolve({ data: [] as Membership[] } as any),
      supabase.from("users").select("id, name, email").eq("company_id", parentCompanyId),
    ]);
    const all = (allUo || []) as Membership[];
    setAllMemberships(all);
    setMemberships(all.filter((m) => m.company_id === officeId));
    setCompanyUsers((cu || []) as UserRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedUserId(null);
    setRole("member");
    setIsPrimary(false);
    setTransferMode("add");
    setShowTransferConfirm(false);
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

  function getOfficeLabel(id: string): string {
    const office = allOffices.find((o) => o.id === id);
    if (!office) return "Unknown";
    if (!office.parent_company_id) return `🏛️ HQ ${office.office_country || ""}`.trim();
    return `🌏 ${office.office_name || office.office_country || "Office"}`;
  }

  function getUserOffices(userId: string) {
    return allMemberships
      .filter((m) => m.user_id === userId)
      .map((m) => ({
        officeId: m.company_id,
        label: getOfficeLabel(m.company_id),
        role: m.role,
        isHq: !allOffices.find((o) => o.id === m.company_id)?.parent_company_id,
      }));
  }

  function handleAddClick() {
    if (!selectedUserId) {
      toast.error("Select a user");
      return;
    }
    const existing = getUserOffices(selectedUserId);
    if (existing.length > 0) {
      setTransferMode("add");
      setShowTransferConfirm(true);
      return;
    }
    executeAdd();
  }

  async function executeAdd() {
    setSaving(true);
    try {
      if (isPrimary) {
        await supabase.from("user_offices").update({ is_primary: false }).eq("user_id", selectedUserId!);
      }

      if (transferMode === "transfer") {
        const others = getUserOffices(selectedUserId!).filter(
          (o) => o.officeId !== officeId && !o.isHq,
        );
        for (const o of others) {
          await supabase
            .from("user_offices")
            .delete()
            .eq("user_id", selectedUserId!)
            .eq("company_id", o.officeId);
        }
      } else if (transferMode === "exclusive") {
        await supabase.from("user_offices").delete().eq("user_id", selectedUserId!);
      }

      const { error } = await supabase.from("user_offices").insert({
        user_id: selectedUserId!,
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
      setShowTransferConfirm(false);
      setTransferMode("add");
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
    <>
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
                const otherOffices = getUserOffices(m.user_id).filter((o) => o.officeId !== officeId);
                return (
                  <div key={m.user_id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: 500 }}>{u?.name ?? m.user_id}</div>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{u?.email ?? ""}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
                        {otherOffices.length > 0
                          ? `📍 Also in: ${otherOffices.map((o) => o.label).join(", ")}`
                          : "📍 Only in this office"}
                      </div>
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
              available.map((u) => {
                const userOffices = getUserOffices(u.id);
                return (
                <div key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  style={{
                    padding: "8px 12px", cursor: "pointer",
                    background: selectedUserId === u.id ? "var(--p050)" : "transparent",
                    borderBottom: "1px solid var(--border)",
                  }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
                    {userOffices.length > 0
                      ? `📍 Currently in: ${userOffices.map((o) => o.label).join(", ")}`
                      : "📍 Not assigned to any office"}
                  </div>
                </div>
                );
              })
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
        <button className="btn primary" onClick={handleAddClick} disabled={saving || !selectedUserId}>
          {saving ? "Adding…" : "Add to Office"}
        </button>
      </div>
    </Modal>

    <Modal
      open={showTransferConfirm}
      onClose={() => setShowTransferConfirm(false)}
      width={480}
      ariaLabel="Transfer user confirmation"
    >
      {selectedUserId && (() => {
        const u = userMap[selectedUserId];
        const existing = getUserOffices(selectedUserId);
        return (
          <>
            <div style={{ padding: "20px 24px 8px", fontWeight: 600, fontSize: 18 }}>
              Transfer User?
            </div>
            <div style={{ padding: "8px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 14 }}>
                <strong>{u?.name}</strong> is currently assigned to:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {existing.map((o) => (
                  <li key={o.officeId}>
                    {o.label} ({o.role || "member"})
                  </li>
                ))}
              </ul>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Choose an action:</div>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontSize: 13 }}>
                <input type="radio" checked={transferMode === "add"} onChange={() => setTransferMode("add")} />
                <span>Add to {officeLabel} (keep other offices too)</span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontSize: 13 }}>
                <input type="radio" checked={transferMode === "transfer"} onChange={() => setTransferMode("transfer")} />
                <span>Transfer to {officeLabel} (remove from other branch offices, keep HQ)</span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontSize: 13 }}>
                <input type="radio" checked={transferMode === "exclusive"} onChange={() => setTransferMode("exclusive")} />
                <span>Move exclusively to {officeLabel} (remove from all other offices)</span>
              </label>
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setShowTransferConfirm(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn primary" onClick={executeAdd} disabled={saving}>
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </>
        );
      })()}
    </Modal>
    </>
  );
}