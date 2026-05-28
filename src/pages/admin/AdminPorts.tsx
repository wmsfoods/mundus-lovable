import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Ship, Search, Check, Anchor, Globe, X, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminPorts, type AdminPortRow } from "@/hooks/useAdminPorts";
import AddPortModal from "@/components/admin/AddPortModal";

type ActiveKey = "all" | "active" | "inactive";
type SortKey = "name" | "code" | "country";
const PAGE_SIZE = 25;

function pickCountry(r: AdminPortRow, locale: string): string {
  const lang = (locale || "en").slice(0, 2);
  if (lang === "pt") return r.portuguese_name;
  if (lang === "es") return r.spanish_name;
  return r.english_name;
}

export default function AdminPorts() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const { rows, totalPorts, activePorts, countriesWithPorts, allCountries, loading, error, togglePortActive, bulkTogglePortsActive, isToggling, createPort, isCreating } = useAdminPorts();
  const [addOpen, setAddOpen] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [countryId, setCountryId] = useState<string>("all");
  const [activeF, setActiveF] = useState<ActiveKey>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tm = setTimeout(() => { setSearch(searchInput.trim().toLowerCase()); setPage(1); }, 300);
    return () => clearTimeout(tm);
  }, [searchInput]);

  // distinct countries that have ports, sorted alphabetically by current locale
  const countryOptions = useMemo(() => {
    const map = new Map<string, AdminPortRow>();
    for (const r of rows) if (!map.has(r.country_id)) map.set(r.country_id, r);
    return [...map.values()].sort((a, b) => pickCountry(a, locale).localeCompare(pickCountry(b, locale)));
  }, [rows, locale]);

  const filtered = useMemo(() => {
    let list = rows;
    if (countryId !== "all") list = list.filter((r) => r.country_id === countryId);
    if (activeF === "active") list = list.filter((r) => r.is_active);
    else if (activeF === "inactive") list = list.filter((r) => !r.is_active);
    if (search) {
      list = list.filter((r) =>
        r.name.toLowerCase().includes(search) ||
        (r.code ?? "").toLowerCase().includes(search),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "code") return (a.code ?? "").localeCompare(b.code ?? "") * dir;
      if (sortBy === "country") return pickCountry(a, locale).localeCompare(pickCountry(b, locale)) * dir;
      return a.name.localeCompare(b.name) * dir;
    });
    return sorted;
  }, [rows, countryId, activeF, search, sortBy, sortDir, locale]);

  // Count ports per (name + country) to surface possible duplicates for admin review.
  const duplicateCityCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const p of rows) {
      const key = `${(p.name ?? "").trim().toLowerCase()}|${p.country_id}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, [rows]);
  const isDuplicate = (r: AdminPortRow) =>
    (duplicateCityCounts[`${(r.name ?? "").trim().toLowerCase()}|${r.country_id}`] || 0) > 1;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(safePage * PAGE_SIZE, filtered.length);

  const sortHeader = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => {
        if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
        else { setSortBy(key); setSortDir("asc"); }
      }}
      style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "inherit", font: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      {label}{sortBy === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );

  const handleToggle = async (row: AdminPortRow, next: boolean) => {
    setPendingId(row.port_id);
    try {
      await togglePortActive(row.port_id, next);
      const label = `${row.name}${row.code ? ` (${row.code})` : ""}`;
      toast.success(
        t(next ? "admin.marketplace.ports.toggle.activated" : "admin.marketplace.ports.toggle.deactivated", { port: label }),
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to update port");
    } finally {
      setPendingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.port_id));
  const pageSomeSelected = pageRows.some((r) => selectedIds.has(r.port_id));
  const togglePageAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) pageRows.forEach((r) => next.delete(r.port_id));
      else pageRows.forEach((r) => next.add(r.port_id));
      return next;
    });
  };
  const selectAllFiltered = () => setSelectedIds(new Set(filtered.map((r) => r.port_id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulk = async (next: boolean) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      await bulkTogglePortsActive(ids, next);
      toast.success(
        t(next ? "admin.marketplace.ports.toggle.activated" : "admin.marketplace.ports.toggle.deactivated", { port: `${ids.length}` }),
      );
      clearSelection();
    } catch (e: any) {
      toast.error(e?.message || "Bulk update failed");
    }
  };

  return (
    <div className="adm-body">
      <div className="adm-page-header adm-ports-header" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #8B2252, #7f1d3a)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Ship size={18} />
          </span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="adm-page-title">{t("admin.marketplace.ports.title")}</span>
            <span className="adm-page-subtle">{t("admin.marketplace.ports.subtitle")}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="crm-btn-primary adm-ports-add-btn"
          onClick={() => setAddOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={14} />
          {t("admin.marketplace.ports.create.button", { defaultValue: "Add port" })}
        </button>
      </div>

      {/* stats */}
      <div className="adm-ports-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
        <StatCard icon={<Ship size={16} />} label={t("admin.marketplace.ports.stats.total")} value={totalPorts} />
        <StatCard icon={<Check size={16} />} label={t("admin.marketplace.ports.stats.active")} value={activePorts} accent="#16a34a" />
        <StatCard icon={<Globe size={16} />} label={t("admin.marketplace.ports.stats.countries")} value={countriesWithPorts} accent="#8B2252" />
      </div>

      {/* toolbar */}
      <div className="crm-toolbar adm-ports-toolbar" style={{ marginTop: 12 }}>
        <div className="adm-search" style={{ flex: 1 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder={t("admin.marketplace.ports.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select className="crm-select" value={countryId} onChange={(e) => { setCountryId(e.target.value); setPage(1); }}>
          <option value="all">{t("admin.marketplace.ports.allCountries")}</option>
          {countryOptions.map((c) => (
            <option key={c.country_id} value={c.country_id}>
              {(c.flag_emoji ?? "🏳️") + " " + pickCountry(c, locale)}
            </option>
          ))}
        </select>
        <select className="crm-select" value={activeF} onChange={(e) => { setActiveF(e.target.value as ActiveKey); setPage(1); }}>
          <option value="all">{t("admin.marketplace.ports.filters.all")}</option>
          <option value="active">{t("admin.marketplace.ports.filters.activeOnly")}</option>
          <option value="inactive">{t("admin.marketplace.ports.filters.inactiveOnly")}</option>
        </select>
      </div>

      {error ? (
        <div className="adm-panel" style={{ padding: 16, color: "var(--danger, #b91c1c)" }}>{error}</div>
      ) : loading ? (
        <div className="adm-panel" style={{ padding: 16 }}>{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="adm-panel" style={{ padding: 32, textAlign: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{t("admin.marketplace.ports.empty.title")}</h3>
          <p style={{ margin: "8px 0 0", color: "var(--fg-muted, #6b7280)", fontSize: 13 }}>
            {t("admin.marketplace.ports.empty.body")}
          </p>
        </div>
      ) : (
        <>
          {/* bulk action bar */}
          {selectedIds.size > 0 && (
            <div
              className="adm-panel adm-ports-bulkbar"
              style={{
                marginTop: 12, padding: "10px 12px", display: "flex", alignItems: "center",
                gap: 10, flexWrap: "wrap", background: "#FFF7ED", borderColor: "#FED7AA",
              }}
            >
              <strong style={{ fontSize: 13 }}>
                {t("admin.marketplace.ports.bulk.selected", { count: selectedIds.size, defaultValue: "{{count}} selected" })}
              </strong>
              {selectedIds.size < filtered.length && (
                <button type="button" className="crm-btn-outline adm-bulk-selectall" onClick={selectAllFiltered}>
                  {t("admin.marketplace.ports.bulk.selectAllFiltered", { count: filtered.length, defaultValue: "Select all {{count}} filtered" })}
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button
                type="button"
                className="crm-btn-outline"
                disabled={isToggling}
                onClick={() => handleBulk(true)}
                style={{ borderColor: "#16a34a", color: "#16a34a" }}
              >
                <Check size={14} style={{ marginRight: 4 }} />
                {t("admin.marketplace.ports.bulk.activate", { defaultValue: "Activate" })}
              </button>
              <button
                type="button"
                className="crm-btn-outline"
                disabled={isToggling}
                onClick={() => handleBulk(false)}
                style={{ borderColor: "#dc2626", color: "#dc2626" }}
              >
                <X size={14} style={{ marginRight: 4 }} />
                {t("admin.marketplace.ports.bulk.deactivate", { defaultValue: "Deactivate" })}
              </button>
              <button type="button" className="crm-btn-outline adm-bulk-clear" onClick={clearSelection}>
                {t("admin.marketplace.ports.bulk.clear", { defaultValue: "Clear" })}
              </button>
            </div>
          )}

          {/* desktop table */}
          <div className="adm-panel adm-only-desktop" style={{ padding: 0, marginTop: 12 }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <Checkbox
                        checked={pageAllSelected ? true : pageSomeSelected ? "indeterminate" : false}
                        onCheckedChange={togglePageAll}
                        aria-label="Select page"
                      />
                    </th>
                    <th style={{ width: 48 }}></th>
                    <th>{sortHeader("name", t("admin.marketplace.ports.cols.name"))}</th>
                    <th>{sortHeader("code", t("admin.marketplace.ports.cols.code"))}</th>
                    <th>{sortHeader("country", t("admin.marketplace.ports.cols.country"))}</th>
                    <th>{t("admin.marketplace.ports.cols.shared")}</th>
                    <th>{t("admin.marketplace.ports.cols.active")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.port_id} style={selectedIds.has(r.port_id) ? { background: "#FFF7ED" } : undefined}>
                      <td>
                        <Checkbox
                          checked={selectedIds.has(r.port_id)}
                          onCheckedChange={() => toggleSelect(r.port_id)}
                          aria-label={`Select ${r.name}`}
                        />
                      </td>
                      <td style={{ fontSize: 22 }}>{r.flag_emoji ?? "🏳️"}</td>
                      <td>
                        <strong>{r.name}</strong>
                        {isDuplicate(r) && (
                          <span
                            style={{ marginLeft: 6, color: "#D97706", fontSize: 11, fontWeight: 600 }}
                            title="Multiple ports share this city — review for duplicates"
                          >
                            ⚠️ duplicate?
                          </span>
                        )}
                      </td>
                      <td><span className="adm-chip">{r.code ?? "—"}</span></td>
                      <td>{pickCountry(r, locale)}</td>
                      <td>
                        {r.shared_with_country ? (
                          <span
                            className="adm-chip"
                            title={t("admin.marketplace.ports.usedBy", { country: r.shared_with_country })}
                            style={{ background: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D" }}
                          >
                            <Anchor size={11} style={{ marginRight: 4 }} />
                            {t("admin.marketplace.ports.shared")}
                          </span>
                        ) : (
                          <span style={{ color: "var(--fg-muted, #6b7280)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <Switch
                          checked={r.is_active}
                          disabled={pendingId === r.port_id}
                          onCheckedChange={(v) => handleToggle(r, !!v)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* mobile cards */}
          <div className="adm-only-mobile adm-cards-stack" style={{ marginTop: 12 }}>
            <div className="adm-panel" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <Checkbox
                checked={pageAllSelected ? true : pageSomeSelected ? "indeterminate" : false}
                onCheckedChange={togglePageAll}
                aria-label="Select page"
              />
              <span style={{ fontSize: 12, color: "var(--fg-muted, #6b7280)", flex: 1 }}>
                {pageAllSelected
                  ? t("admin.marketplace.ports.bulk.deselectPage", { defaultValue: "Deselect page" })
                  : t("admin.marketplace.ports.bulk.selectPage", { defaultValue: "Select all on page" })}
              </span>
              <span style={{ fontSize: 11, color: "var(--fg-muted, #6b7280)" }}>
                {showingFrom}–{showingTo} / {filtered.length}
              </span>
            </div>
            {pageRows.map((r) => {
              const isSel = selectedIds.has(r.port_id);
              return (
                <div
                  key={r.port_id}
                  className="adm-panel adm-port-card"
                  style={{ background: isSel ? "#FFF7ED" : undefined }}
                >
                  <div className="adm-port-card__top">
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={() => toggleSelect(r.port_id)}
                      aria-label={`Select ${r.name}`}
                    />
                    <span className="adm-port-card__flag" aria-hidden>{r.flag_emoji ?? "🏳️"}</span>
                    <div className="adm-port-card__title">
                      <strong>{r.name}</strong>
                      <span className="adm-port-card__country">{pickCountry(r, locale)}</span>
                    </div>
                    <Switch
                      checked={r.is_active}
                      disabled={pendingId === r.port_id}
                      onCheckedChange={(v) => handleToggle(r, !!v)}
                      aria-label={r.is_active ? "Deactivate" : "Activate"}
                    />
                  </div>
                  <div className="adm-port-card__meta">
                    <span className="adm-chip">{r.code ?? "—"}</span>
                    <span
                      className="adm-chip"
                      style={
                        r.is_active
                          ? { background: "rgba(22,163,74,0.10)", color: "#15803d", borderColor: "rgba(22,163,74,0.25)" }
                          : { background: "rgba(107,114,128,0.10)", color: "#6b7280", borderColor: "rgba(107,114,128,0.25)" }
                      }
                    >
                      {r.is_active ? t("admin.marketplace.ports.filters.activeOnly") : t("admin.marketplace.ports.filters.inactiveOnly")}
                    </span>
                    {r.shared_with_country && (
                      <span className="adm-chip" style={{ background: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D" }}>
                        <Anchor size={10} style={{ marginRight: 3 }} />
                        {t("admin.marketplace.ports.shared")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* pagination */}
          <div className="adm-ports-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 12, color: "var(--fg-muted, #6b7280)", flexWrap: "wrap", gap: 8 }}>
            <span>{t("admin.marketplace.ports.showing", { from: showingFrom, to: showingTo, total: filtered.length })}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="crm-btn-outline" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("common.back")}
              </button>
              <span style={{ display: "inline-flex", alignItems: "center", padding: "0 8px" }}>{safePage} / {pageCount}</span>
              <button type="button" className="crm-btn-outline" disabled={safePage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                {t("admin.marketplace.ports.next")}
              </button>
            </div>
          </div>
        </>
      )}

      <AddPortModal
        open={addOpen}
        onOpenChange={setAddOpen}
        countries={allCountries}
        onCreate={(input) => createPort({ ...input, isActive: true })}
        isCreating={isCreating}
      />
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
  return (
    <div className="adm-panel" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-muted, #6b7280)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        <span style={{ color: accent ?? "#8B2252" }}>{icon}</span> {label}
      </span>
      <strong style={{ fontSize: 22, fontVariantNumeric: "tabular-nums", color: accent ?? "inherit" }}>{value.toLocaleString()}</strong>
    </div>
  );
}
