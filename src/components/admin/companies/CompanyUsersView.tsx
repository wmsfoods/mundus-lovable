import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Pencil, X as XIcon } from "lucide-react";
import { countryFlag } from "@/lib/countryFlags";
import { useAdminCompanyUsers, type AdminCompanyUserRow } from "@/hooks/useAdminCompanyUsers";
import { CompanyUserEditModal } from "./CompanyUserEditModal";
import { MultiSelectPopover } from "@/components/admin/MultiSelectPopover";
import { CountryMultiFilter } from "@/components/admin/CountryMultiFilter";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: "#d3e7b5", fg: "#3b6d11" },
  invited: { bg: "#d8e6f8", fg: "#0c447c" },
  inactive: { bg: "#e5e7eb", fg: "#5e5e58" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(iso));
  } catch { return iso; }
}
function initials(name: string, email: string) {
  const s = (name || email || "?").trim();
  const p = s.split(/\s+/);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function companyType(r: AdminCompanyUserRow): "buyer" | "supplier" | "both" | "none" {
  if (r.company_is_buyer && r.company_is_supplier) return "both";
  if (r.company_is_buyer) return "buyer";
  if (r.company_is_supplier) return "supplier";
  return "none";
}

export default function CompanyUsersView() {
  const { rows, loading, error, refetch, companies } = useAdminCompanyUsers();
  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState<string[]>([]);
  const [statusF, setStatusF] = useState<string[]>([]);
  const [roleF, setRoleF] = useState<string[]>([]);
  const [companyF, setCompanyF] = useState<string[]>([]);
  const [countryF, setCountryF] = useState<string[]>([]);
  const [editing, setEditing] = useState<AdminCompanyUserRow | null>(null);

  const allRoles = useMemo(() => Array.from(new Set(rows.map((r) => r.role).filter(Boolean))).sort() as string[], [rows]);
  const availableCountries = useMemo(
    () => new Set(rows.map((r) => r.company_country).filter(Boolean) as string[]),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeF.length && !typeF.includes(companyType(r))) return false;
      if (statusF.length && !statusF.includes(r.status)) return false;
      if (roleF.length && (!r.role || !roleF.includes(r.role))) return false;
      if (companyF.length && !companyF.includes(r.company_id)) return false;
      if (countryF.length && (!r.company_country || !countryF.includes(r.company_country))) return false;
      if (q) {
        const hay = `${r.full_name} ${r.email} ${r.company_name} ${r.role ?? ""} ${r.job_title ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, typeF, statusF, roleF, companyF, countryF]);

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (typeF.length) activeFilters.push({ key: "type", label: `Type: ${typeF.join(", ")}`, clear: () => setTypeF([]) });
  if (statusF.length) activeFilters.push({ key: "status", label: `Status: ${statusF.join(", ")}`, clear: () => setStatusF([]) });
  if (roleF.length) activeFilters.push({ key: "role", label: `Role: ${roleF.join(", ")}`, clear: () => setRoleF([]) });
  if (companyF.length) {
    const lbl = companyF.length === 1
      ? (companies.find((x) => x.id === companyF[0])?.name ?? "—")
      : `${companyF.length} companies`;
    activeFilters.push({ key: "company", label: `Company: ${lbl}`, clear: () => setCompanyF([]) });
  }
  if (countryF.length) {
    const lbl = countryF.length <= 2
      ? countryF.map((c) => `${countryFlag(c)} ${c}`).join(", ")
      : `${countryF.slice(0, 2).map((c) => countryFlag(c)).join(" ")} +${countryF.length - 2}`;
    activeFilters.push({ key: "country", label: `Country: ${lbl}`, clear: () => setCountryF([]) });
  }

  const clearAll = () => { setSearch(""); setTypeF([]); setStatusF([]); setRoleF([]); setCompanyF([]); setCountryF([]); };

  return (
    <>
      {/* Toolbar */}
      <div className="crm-toolbar" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div className="adm-search" style={{ flex: 1, minWidth: 220 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Search name, email, company, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <MultiSelectPopover
          value={typeF}
          onChange={setTypeF}
          placeholder="All types"
          options={[
            { value: "buyer", label: "Buyer" },
            { value: "supplier", label: "Supplier" },
            { value: "both", label: "Both" },
          ]}
        />
        <MultiSelectPopover
          value={statusF}
          onChange={setStatusF}
          placeholder="All statuses"
          options={[
            { value: "active", label: "Active" },
            { value: "invited", label: "Invited" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <MultiSelectPopover
          value={roleF}
          onChange={setRoleF}
          placeholder="All roles"
          searchable
          options={allRoles.map((r) => ({ value: r, label: r }))}
        />
        <MultiSelectPopover
          value={companyF}
          onChange={setCompanyF}
          placeholder="All companies"
          searchable
          triggerMinWidth={180}
          width={300}
          options={companies.map((c) => {
            const country = rows.find((r) => r.company_id === c.id)?.company_country ?? null;
            return {
              value: c.id,
              label: c.name,
              leading: country ? <span style={{ fontSize: 14 }}>{countryFlag(country)}</span> : null,
            };
          })}
        />
        <CountryMultiFilter value={countryF} onChange={setCountryF} available={availableCountries} />
      </div>

      {/* Active filter chips */}
      {(activeFilters.length > 0 || search) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, fontSize: 12 }}>
          {activeFilters.map((f) => (
            <span key={f.key} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdf2f8", border: "1px solid #f9d0e0", color: "#8B2252", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
              {f.label}
              <button onClick={f.clear} style={{ background: "none", border: "none", color: "#8B2252", cursor: "pointer", padding: 0, display: "inline-flex" }}><XIcon size={12} /></button>
            </span>
          ))}
          <button onClick={clearAll} style={{ background: "none", border: "none", color: "#6b7280", textDecoration: "underline", cursor: "pointer", fontSize: 11 }}>
            Clear all
          </button>
          <span style={{ color: "#6b7280", marginLeft: "auto" }}>{filtered.length} of {rows.length} users</span>
        </div>
      )}

      {/* Content */}
      {error ? (
        <div className="adm-panel" style={{ padding: 16, color: "#b91c1c" }}>{error}</div>
      ) : loading ? (
        <div className="adm-panel" style={{ padding: 16 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="adm-panel" style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
          No users match your filters.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="adm-panel adm-only-desktop" style={{ padding: 0 }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Onboarded</th>
                    <th>Status</th>
                    <th>Last Modified</th>
                    <th>Modified By</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <UserRow key={r.id} row={r} onEdit={() => setEditing(r)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="adm-only-mobile adm-cards-stack">
            {filtered.map((r) => <CardRow key={r.id} row={r} onEdit={() => setEditing(r)} />)}
          </div>
        </>
      )}

      {editing && (
        <CompanyUserEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={refetch}
        />
      )}
    </>
  );
}

function UserRow({ row, onEdit }: { row: AdminCompanyUserRow; onEdit: () => void }) {
  const onboarded = row.joined_at || row.accepted_at || row.created_at;
  const st = STATUS_COLORS[row.status] || STATUS_COLORS.inactive;
  return (
    <tr style={{ cursor: "pointer" }} onClick={onEdit}>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {row.avatar_url ? (
            <img src={row.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#fbe2e8", color: "#791f3f", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>
              {initials(row.full_name, row.email)}
            </span>
          )}
          <strong style={{ fontSize: 13 }}>{row.full_name || "—"}</strong>
        </div>
      </td>
      <td style={{ fontSize: 12, color: "#374151" }}>{row.email}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <Link to={`/admin/companies/${row.company_id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#8B2252", fontWeight: 600, textDecoration: "none", fontSize: 13 }}>
          {row.company_country && <span style={{ fontSize: 13 }}>{countryFlag(row.company_country)}</span>}
          {row.company_name}
        </Link>
      </td>
      <td><span className="adm-chip" style={{ fontSize: 11 }}>{row.role || "—"}</span></td>
      <td style={{ fontSize: 12 }}>{fmtDate(onboarded)}</td>
      <td>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: st.bg, color: st.fg, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
          {row.status}
        </span>
      </td>
      <td style={{ fontSize: 12 }}>{fmtDate(row.updated_at)}</td>
      <td style={{ fontSize: 12, color: "#6b7280" }}>{row.updated_by_name || "—"}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <button onClick={onEdit} className="adm-btn-ghost" aria-label="Edit"><Pencil size={14} /></button>
      </td>
    </tr>
  );
}

function CardRow({ row, onEdit }: { row: AdminCompanyUserRow; onEdit: () => void }) {
  const st = STATUS_COLORS[row.status] || STATUS_COLORS.inactive;
  const onboarded = row.joined_at || row.accepted_at || row.created_at;
  return (
    <div className="adm-panel" onClick={onEdit} style={{ padding: 12, display: "flex", gap: 10, cursor: "pointer" }}>
      {row.avatar_url ? (
        <img src={row.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#fbe2e8", color: "#791f3f", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {initials(row.full_name, row.email)}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}>
          <strong style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>{row.full_name || row.email}</strong>
          <span style={{ background: st.bg, color: st.fg, padding: "1px 6px", borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{row.status}</span>
        </div>
        <div style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis" }}>{row.email}</div>
        <Link to={`/admin/companies/${row.company_id}`} onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#8B2252", fontWeight: 600, textDecoration: "none", fontSize: 12 }}>
          {row.company_country && <span>{countryFlag(row.company_country)}</span>}
          {row.company_name}
        </Link>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
          <span className="adm-chip" style={{ fontSize: 10 }}>{row.role || "—"}</span>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          Onboarded {fmtDate(onboarded)} · Modified {fmtDate(row.updated_at)}{row.updated_by_name ? ` by ${row.updated_by_name}` : ""}
        </div>
      </div>
    </div>
  );
}