import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, CheckCircle2, AlertCircle, Plus, Pencil } from "lucide-react";
import {
  useAdminCompanies,
  companyType,
  type CompanyTypeFilter,
  type CompanyStatusFilter,
  type AdminCompanyRow,
} from "@/hooks/useAdminCompanies";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function fmtDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function TypeChip({ type, t }: { type: ReturnType<typeof companyType>; t: (k: string) => string }) {
  if (type === "none") return <span className="adm-chip">—</span>;
  const label =
    type === "buyer" ? t("admin.companies.filters.buyer") :
    type === "supplier" ? t("admin.companies.filters.supplier") :
    t("admin.companies.filters.both");
  return <span className={`adm-chip is-${type}`}>{label}</span>;
}

export default function AdminCompanies() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const navigate = useNavigate();
  const { rows, loading, error } = useAdminCompanies();

  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState<CompanyTypeFilter>("all");
  const [statusF, setStatusF] = useState<CompanyStatusFilter>("all");
  const [country, setCountry] = useState<string>("all");

  const countries = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.country && s.add(r.country));
    return Array.from(s).sort();
  }, [rows]);

  const totals = useMemo(() => {
    let inactive = 0;
    rows.forEach((r) => { if ((r.status ?? "active") !== "active") inactive++; });
    return { total: rows.length, active: rows.length - inactive };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const k = companyType(r);
      if (typeF === "buyer" && k !== "buyer") return false;
      if (typeF === "supplier" && k !== "supplier") return false;
      if (typeF === "both" && k !== "both") return false;
      const isActive = (r.status ?? "active") === "active";
      if (statusF === "active" && !isActive) return false;
      if (statusF === "inactive" && isActive) return false;
      if (country !== "all" && r.country !== country) return false;
      if (q) {
        const hay = `${r.name} ${r.country ?? ""} ${r.city ?? ""} #${r.company_number}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, typeF, statusF, country]);

  return (
    <div className="adm-body">
      <div className="adm-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span className="adm-page-title">{t("admin.companies.title")}</span>
          <span className="adm-page-subtle">
            · {t("admin.companies.subtitle", { active: totals.active, total: totals.total })}
          </span>
        </div>
        <button type="button" className="crm-btn-primary" onClick={() => navigate("/admin/companies/new")}>
          <Plus size={14} style={{ marginRight: 4 }} /> {t("admin.companies.actions.new")}
        </button>
      </div>

      {/* toolbar */}
      <div className="crm-toolbar">
        <div className="adm-search" style={{ flex: 1 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder={t("admin.companies.filters.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="crm-select" value={statusF} onChange={(e) => setStatusF(e.target.value as CompanyStatusFilter)}>
          <option value="all">{t("admin.companies.filters.allStatuses")}</option>
          <option value="active">{t("admin.companies.filters.active")}</option>
          <option value="inactive">{t("admin.companies.filters.inactive")}</option>
        </select>
        <select className="crm-select" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="all">{t("admin.companies.filters.allCountries")}</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="crm-select" value={typeF} onChange={(e) => setTypeF(e.target.value as CompanyTypeFilter)}>
          <option value="all">{t("admin.companies.filters.allTypes")}</option>
          <option value="buyer">{t("admin.companies.filters.buyer")}</option>
          <option value="supplier">{t("admin.companies.filters.supplier")}</option>
          <option value="both">{t("admin.companies.filters.both")}</option>
        </select>
      </div>

      {/* content */}
      {error ? (
        <div className="adm-panel" style={{ padding: 16, color: "var(--danger, #b91c1c)" }}>
          <AlertCircle size={14} style={{ marginRight: 6 }} /> {error}
        </div>
      ) : loading ? (
        <div className="adm-panel" style={{ padding: 16 }}>{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* desktop table */}
          <div className="adm-panel adm-only-desktop" style={{ padding: 0 }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>{t("admin.companies.cols.company")}</th>
                    <th>{t("admin.companies.cols.type")}</th>
                    <th>{t("admin.companies.cols.location")}</th>
                    <th>{t("admin.companies.cols.proteins")}</th>
                    <th>{t("admin.companies.cols.verified")}</th>
                    <th>{t("admin.companies.cols.onboarded")}</th>
                    <th>{t("admin.companies.cols.status")}</th>
                    <th style={{ width: 60 }}>{t("admin.companies.cols.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => <Row key={r.id} row={r} locale={locale} t={t} onOpen={() => navigate(`/admin/companies/${r.id}`)} />)}
                </tbody>
              </table>
            </div>
          </div>

          {/* mobile cards */}
          <div className="adm-only-mobile adm-cards-stack">
            {filtered.map((r) => <CardRow key={r.id} row={r} locale={locale} t={t} onOpen={() => navigate(`/admin/companies/${r.id}`)} />)}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ row, locale, t, onOpen }: { row: AdminCompanyRow; locale: string; t: (k: string, opts?: Record<string, unknown>) => string; onOpen: () => void }) {
  const k = companyType(row);
  const isActive = (row.status ?? "active") === "active";
  return (
    <tr onClick={onOpen} style={{ cursor: "pointer" }}>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #8B2252, #7f1d3a)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 12 }}>
            {initials(row.name)}
          </span>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <strong>{row.name}</strong>
            <span style={{ fontSize: 11, color: "var(--fg-muted, #6b7280)" }}>#{row.company_number}</span>
          </div>
        </div>
      </td>
      <td><TypeChip type={k} t={t} /></td>
      <td>{[row.city, row.country].filter(Boolean).join(", ") || "—"}</td>
      <td>
        {(row.protein_profiles ?? []).length > 0 ? (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(row.protein_profiles ?? []).slice(0, 4).map((p) => (
              <span key={p} className="adm-chip" style={{ fontSize: 11, background: "#FCE7F3", color: "#8B2252", borderColor: "#FBCFE8" }}>{p}</span>
            ))}
          </div>
        ) : <span style={{ color: "var(--fg-muted, #6b7280)" }}>—</span>}
      </td>
      <td>
        {row.is_verified ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontSize: 12, fontWeight: 600 }}>
            <CheckCircle2 size={14} /> {t("common.yes")}
          </span>
        ) : <span style={{ color: "var(--fg-muted, #6b7280)" }}>—</span>}
      </td>
      <td>{fmtDate(row.onboarded_at ?? row.created_at, locale)}</td>
      <td>
        <span className={`adm-chip ${isActive ? "is-buyer" : ""}`}>
          {isActive ? t("admin.companies.filters.active") : t("admin.companies.filters.inactive")}
        </span>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onOpen} className="adm-btn-ghost" aria-label="Edit" title={t("admin.companies.actions.edit") as string}>
          <Pencil size={14} />
        </button>
      </td>
    </tr>
  );
}

function CardRow({ row, locale, t, onOpen }: { row: AdminCompanyRow; locale: string; t: (k: string, opts?: Record<string, unknown>) => string; onOpen: () => void }) {
  const k = companyType(row);
  const isActive = (row.status ?? "active") === "active";
  return (
    <div className="adm-panel" onClick={onOpen} style={{ padding: 12, display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
      <span style={{ width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg, #8B2252, #7f1d3a)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
        {initials(row.name)}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
          <strong style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</strong>
          <span style={{ fontSize: 11, color: "var(--fg-muted, #6b7280)" }}>#{row.company_number}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-muted, #6b7280)" }}>
          {[row.city, row.country].filter(Boolean).join(", ") || "—"}
        </div>
        {(row.protein_profiles ?? []).length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
            {(row.protein_profiles ?? []).slice(0, 4).map((p) => (
              <span key={p} className="adm-chip" style={{ fontSize: 10, background: "#FCE7F3", color: "#8B2252", borderColor: "#FBCFE8" }}>{p}</span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
          <TypeChip type={k} t={t} />
          <span className={`adm-chip ${isActive ? "is-buyer" : ""}`}>
            {isActive ? t("admin.companies.filters.active") : t("admin.companies.filters.inactive")}
          </span>
          {row.is_verified && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontSize: 11, fontWeight: 600 }}>
              <CheckCircle2 size={12} /> {t("common.yes")}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-muted, #6b7280)", marginTop: 2 }}>
          {t("admin.companies.cols.onboarded")}: {fmtDate(row.onboarded_at ?? row.created_at, locale)}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="adm-panel" style={{ padding: 32, textAlign: "center" }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>{t("admin.companies.empty.title")}</h3>
      <p style={{ margin: "8px 0 16px", color: "var(--fg-muted, #6b7280)", fontSize: 13 }}>
        {t("admin.companies.empty.body")}
      </p>
      <Link to="/admin/crm/prospects" className="crm-btn-primary" style={{ display: "inline-flex" }}>
        {t("admin.companies.empty.cta")}
      </Link>
    </div>
  );
}