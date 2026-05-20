import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Globe, Search, Check, Anchor, MapPin, Ship, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminMarkets, regionFromIso, type AdminMarketRow } from "@/hooks/useAdminMarkets";


type RegionKey = "all" | "americas" | "europe" | "asia" | "middleEast" | "africa" | "oceania" | "other";
type ActiveKey = "all" | "active" | "inactive";
type SortKey = "name" | "ports" | "active";
const REGIONS: RegionKey[] = ["all","americas","europe","asia","middleEast","africa","oceania","other"];
const PAGE_SIZE = 25;

function pickName(r: AdminMarketRow, locale: string): string {
  const lang = (locale || "en").slice(0, 2);
  if (lang === "pt") return r.portuguese_name;
  if (lang === "es") return r.spanish_name;
  return r.english_name;
}

export default function AdminMarkets() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const { rows, totalPorts, originCount, loading, error, toggleMarketActive, bulkToggleMarketsActive, isToggling } = useAdminMarkets();


  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<RegionKey>("all");
  const [activeF, setActiveF] = useState<ActiveKey>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim().toLowerCase()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.is_active).length;
    return { total: rows.length, active };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (region !== "all") list = list.filter((r) => regionFromIso(r.iso_code) === region);
    if (activeF === "active") list = list.filter((r) => r.is_active);
    else if (activeF === "inactive") list = list.filter((r) => !r.is_active);
    if (search) {
      list = list.filter((r) =>
        pickName(r, locale).toLowerCase().includes(search) ||
        r.english_name.toLowerCase().includes(search) ||
        (r.iso_code ?? "").toLowerCase().includes(search),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "name") return pickName(a, locale).localeCompare(pickName(b, locale)) * dir;
      if (sortBy === "ports") return (a.port_count - b.port_count) * dir;
      return ((a.is_active ? 1 : 0) - (b.is_active ? 1 : 0)) * dir;
    });
    return sorted;
  }, [rows, region, activeF, search, sortBy, sortDir, locale]);

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

  const handleToggle = async (row: AdminMarketRow, next: boolean) => {
    setPendingId(row.market_id);
    try {
      await toggleMarketActive(row.market_id, next);
      toast.success(
        t(next ? "admin.marketplace.markets.toggle.activated" : "admin.marketplace.markets.toggle.deactivated", { country: pickName(row, locale) }),
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to update market");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="adm-body">
      <div className="adm-page-header" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #8B2252, #7f1d3a)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Globe size={18} />
          </span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="adm-page-title">{t("admin.marketplace.markets.title")}</span>
            <span className="adm-page-subtle">{t("admin.marketplace.markets.subtitle")}</span>
          </div>
        </div>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
        <StatCard icon={<Globe size={16} />} label={t("admin.marketplace.markets.stats.total")} value={totals.total} />
        <StatCard icon={<Check size={16} />} label={t("admin.marketplace.markets.stats.active")} value={totals.active} accent="#16a34a" />
        <StatCard icon={<Ship size={16} />} label={t("admin.marketplace.markets.stats.ports")} value={totalPorts} />
        <StatCard icon={<MapPin size={16} />} label={t("admin.marketplace.markets.stats.origins")} value={originCount} accent="#8B2252" />
      </div>

      {/* toolbar */}
      <div className="crm-toolbar" style={{ marginTop: 12 }}>
        <div className="adm-search" style={{ flex: 1 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder={t("admin.marketplace.markets.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select className="crm-select" value={region} onChange={(e) => { setRegion(e.target.value as RegionKey); setPage(1); }}>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{t(`admin.marketplace.markets.regions.${r}`)}</option>
          ))}
        </select>
        <select className="crm-select" value={activeF} onChange={(e) => { setActiveF(e.target.value as ActiveKey); setPage(1); }}>
          <option value="all">{t("admin.marketplace.markets.filters.all")}</option>
          <option value="active">{t("admin.marketplace.markets.filters.activeOnly")}</option>
          <option value="inactive">{t("admin.marketplace.markets.filters.inactiveOnly")}</option>
        </select>
      </div>

      {error ? (
        <div className="adm-panel" style={{ padding: 16, color: "var(--danger, #b91c1c)" }}>{error}</div>
      ) : loading ? (
        <div className="adm-panel" style={{ padding: 16 }}>{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="adm-panel" style={{ padding: 32, textAlign: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{t("admin.marketplace.markets.empty.title")}</h3>
          <p style={{ margin: "8px 0 0", color: "var(--fg-muted, #6b7280)", fontSize: 13 }}>
            {t("admin.marketplace.markets.empty.body")}
          </p>
        </div>
      ) : (
        <>
          {/* desktop table */}
          <div className="adm-panel adm-only-desktop" style={{ padding: 0, marginTop: 12 }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}></th>
                    <th>{sortHeader("name", t("admin.marketplace.markets.cols.country"))}</th>
                    <th>{t("admin.marketplace.markets.cols.iso")}</th>
                    <th>{sortHeader("ports", t("admin.marketplace.markets.cols.ports"))}</th>
                    <th>{t("admin.marketplace.markets.cols.origin")}</th>
                    <th>{t("admin.marketplace.markets.cols.destination")}</th>
                    <th>{sortHeader("active", t("admin.marketplace.markets.cols.active"))}</th>
                    <th>{t("admin.marketplace.markets.cols.special")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.market_id}>
                      <td style={{ fontSize: 22 }}>{r.flag_emoji ?? "🏳️"}</td>
                      <td><strong>{pickName(r, locale)}</strong></td>
                      <td><span className="adm-chip">{r.iso_code ?? "—"}</span></td>
                      <td>
                        {r.shared_with_country ? (
                          <span className="adm-chip" style={{ background: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D" }}>
                            <Anchor size={11} style={{ marginRight: 4 }} />{t("admin.marketplace.markets.shared")}
                          </span>
                        ) : (
                          <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.port_count}</span>
                        )}
                      </td>
                      <td>{r.is_origin ? <Check size={16} color="#16a34a" /> : <span style={{ color: "var(--fg-muted, #6b7280)" }}>—</span>}</td>
                      <td>{r.is_destination ? <Check size={16} color="#16a34a" /> : <span style={{ color: "var(--fg-muted, #6b7280)" }}>—</span>}</td>
                      <td>
                        <Switch
                          checked={r.is_active}
                          disabled={pendingId === r.market_id}
                          onCheckedChange={(v) => handleToggle(r, !!v)}
                        />
                      </td>
                      <td style={{ color: "var(--fg-muted, #6b7280)", fontSize: 12 }}>
                        {r.shared_with_country ? t("admin.marketplace.markets.usesPortsFrom", { country: r.shared_with_country }) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* mobile cards */}
          <div className="adm-only-mobile adm-cards-stack" style={{ marginTop: 12 }}>
            {pageRows.map((r) => (
              <div key={r.market_id} className="adm-panel" style={{ padding: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{r.flag_emoji ?? "🏳️"}</span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <strong style={{ fontSize: 14 }}>{pickName(r, locale)}</strong>
                    <span style={{ fontSize: 11, color: "var(--fg-muted, #6b7280)" }}>{r.iso_code ?? "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
                    {r.shared_with_country ? (
                      <span className="adm-chip" style={{ background: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D" }}>
                        <Anchor size={10} style={{ marginRight: 3 }} />{t("admin.marketplace.markets.shared")}
                      </span>
                    ) : (
                      <span className="adm-chip"><Ship size={10} style={{ marginRight: 3 }} />{r.port_count} {t("admin.marketplace.markets.portsShort")}</span>
                    )}
                    {r.is_origin && <span className="adm-chip" style={{ background: "#DCFCE7", color: "#166534", borderColor: "#86EFAC" }}>{t("admin.marketplace.markets.cols.origin")}</span>}
                    {r.is_destination && <span className="adm-chip" style={{ background: "#DBEAFE", color: "#1E40AF", borderColor: "#93C5FD" }}>{t("admin.marketplace.markets.cols.destination")}</span>}
                  </div>
                  {r.shared_with_country && (
                    <div style={{ fontSize: 11, color: "var(--fg-muted, #6b7280)" }}>{t("admin.marketplace.markets.usesPortsFrom", { country: r.shared_with_country })}</div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--fg-muted, #6b7280)" }}>
                      {r.is_active ? t("admin.marketplace.markets.filters.activeOnly") : t("admin.marketplace.markets.filters.inactiveOnly")}
                    </span>
                    <Switch
                      checked={r.is_active}
                      disabled={pendingId === r.market_id}
                      onCheckedChange={(v) => handleToggle(r, !!v)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 12, color: "var(--fg-muted, #6b7280)", flexWrap: "wrap", gap: 8 }}>
            <span>{t("admin.marketplace.markets.showing", { from: showingFrom, to: showingTo, total: filtered.length })}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="crm-btn-outline" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("common.back")}
              </button>
              <span style={{ display: "inline-flex", alignItems: "center", padding: "0 8px" }}>{safePage} / {pageCount}</span>
              <button type="button" className="crm-btn-outline" disabled={safePage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                {t("admin.marketplace.markets.next")}
              </button>
            </div>
          </div>
        </>
      )}
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