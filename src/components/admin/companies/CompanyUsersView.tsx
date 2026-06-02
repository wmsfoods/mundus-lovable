import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Pencil, X as XIcon } from "lucide-react";
import { countryFlag } from "@/lib/countryFlags";
import { useAdminCompanyUsers, type AdminCompanyUserRow } from "@/hooks/useAdminCompanyUsers";
import { CompanyUserEditModal } from "./CompanyUserEditModal";

type StatusF = "all" | "active" | "invited" | "inactive";
type TypeF = "all" | "buyer" | "supplier" | "both";

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
  const [typeF, setTypeF] = useState<TypeF>("all");
  const [statusF, setStatusF] = useState<StatusF>("all");
  const [roleF, setRoleF] = useState<string>("all");
  const [companyF, setCompanyF] = useState<string>("all");
  const [countryF, setCountryF] = useState<string>("all");
  const [editing, setEditing] = useState<AdminCompanyUserRow | null>(null);

  const allRoles = useMemo(() => Array.from(new Set(rows.map((r) => r.role).filter(Boolean))).sort() as string[], [rows]);
  const allCountries = useMemo(() => Array.from(new Set(rows.map((r) => r.company_country).filter(Boolean))).sort() as string[], [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeF !== "all" && companyType(r) !== typeF) return false;
      if (statusF !== "all" && r.status !== statusF) return false;
      if (roleF !== "all" && r.role !== roleF) return false;
      if (companyF !== "all" && r.company_id !== companyF) return false;
      if (countryF !== "all" && r.company_country !== countryF) return false;
      if (q) {
        const hay = `${r.full_name} ${r.email} ${r.company_name} ${r.role ?? ""} ${r.job_title ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, typeF, statusF, roleF, companyF, countryF]);

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (typeF !== "all") activeFilters.push({ key: "type", label: `Type: ${typeF}`, clear: () => setTypeF("all") });
  if (statusF !== "all") activeFilters.push({ key: "status", label: `Status: ${statusF}`, clear: () => setStatusF("all") });
  if (roleF !== "all") activeFilters.push({ key: "role", label: `Role: ${roleF}`, clear: () => setRoleF("all") });
  if (companyF !== "all") {
    const c = companies.find((x) => x.id === companyF);
    activeFilters.push({ key: "company", label: `Company: ${c?.name ?? "—"}`, clear: () => setCompanyF("all") });
  }
  if (countryF !== "all") activeFilters.push({ key: "country", label: `Country: ${countryF}`, clear: () => setCountryF("all") });

  const clearAll = () => { setSearch(""); setTypeF("all"); setStatusF("all"); setRoleF("all"); setCompanyF("all"); setCountryF("all"); };

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
        <select className="crm-select" value={typeF} onChange={(e) => setTypeF(e.target.value as TypeF)}>
          <option value="all">All types</option>
          <option value="buyer">Buyer</option>
          <option value="supplier">Supplier</option>
          <option value="both">Both</option>
        </select>
        <select className="crm-select" value={statusF} onChange={(e) => setStatusF(e.target.value as StatusF)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="crm-select" value={roleF} onChange={(e) => setRoleF(e.target.value)}>
          <option value="all">All roles</option>
          {allRoles.map((r) => (<option key={r} value={r}>{r}</option>))}
        </select>
        <select className="crm-select" value={companyF} onChange={(e) => setCompanyF(e.target.value)}>
          <option value="all">All companies</option>
          {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <select className="crm-select" value={countryF} onChange={(e) => setCountryF(e.target.value)}>
          <option value="all">All countries</option>
          {allCountries.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
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