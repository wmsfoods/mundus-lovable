import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, Loader2, Sparkles, MoreVertical, ExternalLink, Copy, Eye, ShoppingCart, Factory } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CountryFilterPopover } from "@/components/admin/CountryFilterPopover";
import { countryFlag } from "@/lib/countryFlags";
import { Pagination } from "@/components/mundus/Pagination";
import { bulkEnrichByCompanyIds } from "@/lib/prospectEnrich";
import { auditLog } from "@/lib/auditLog";

const PAGE_SIZE = 50;

const GENERIC_DOMAINS = new Set([
  "gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com","aol.com",
  "live.com","msn.com","proton.me","protonmail.com","qq.com","163.com","126.com",
]);
const isGenericDomain = (d: string) => GENERIC_DOMAINS.has(d.toLowerCase());

interface CLevelRow {
  id: string;
  full_name: string;
  email: string | null;
  linkedin: string | null;
  job_title: string | null;
  country: string | null;
  company_id: string | null;
  apollo_enriched_at: string | null;
  qualified_as: string | null;
  qualified_at: string | null;
  company_name: string | null;
  company_country: string | null;
  company_domain: string | null;
  company_type: string | null;
}

interface DomainMatch {
  hasMatch: boolean;
  matchType: "prospect_buyer" | "prospect_supplier" | "prospect_unknown" | null;
  matchCompanyName: string | null;
  matchCount: number;
}

function classifyTitle(t: string | null | undefined): "ceo" | "cfo" | "coo" | "vp" | "director" | "other" {
  if (!t) return "other";
  const s = t.toLowerCase();
  if (/(chief executive|ceo|president|founder|owner|managing director)/.test(s)) return "ceo";
  if (/(chief financial|cfo|finance)/.test(s)) return "cfo";
  if (/(chief operating|coo|operations)/.test(s)) return "coo";
  if (/(\bvp\b|vice president|svp|evp)/.test(s)) return "vp";
  if (/director/.test(s)) return "director";
  return "other";
}

function KPI({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ padding: 14, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12 }}>
      <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function DomainMatchBadge({ match }: { match?: DomainMatch }) {
  if (!match || !match.hasMatch) return <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span>;
  const info: Record<string, { label: string; bg: string; color: string; icon: string }> = {
    prospect_buyer: { label: "Buyer prospect", bg: "#DBEAFE", color: "#1D4ED8", icon: "🛒" },
    prospect_supplier: { label: "Supplier prospect", bg: "#ECFDF5", color: "#059669", icon: "🏭" },
    prospect_unknown: { label: "In prospects", bg: "#F3F4F6", color: "#374151", icon: "🔗" },
  };
  const i = info[match.matchType ?? "prospect_unknown"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: i.bg, color: i.color, whiteSpace: "nowrap", width: "fit-content" }}>
        {i.icon} {i.label}
      </span>
      {match.matchCompanyName && (
        <span style={{ fontSize: 10, color: "#6B7280" }}>
          {match.matchCompanyName}{match.matchCount > 1 ? ` (${match.matchCount} contacts)` : ""}
        </span>
      )}
    </div>
  );
}

export default function CLevelModule() {
  const nav = useNavigate();
  const [rows, setRows] = useState<CLevelRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countryCounts, setCountryCounts] = useState<Array<{ name: string; count: number }>>([]);
  const [titleFilter, setTitleFilter] = useState<"all" | "ceo" | "cfo" | "coo" | "vp" | "director" | "other">("all");
  const [domainFilter, setDomainFilter] = useState<"all" | "has_match" | "no_match" | "qualified">("all");
  const [sortBy, setSortBy] = useState<"newest" | "name" | "company">("newest");
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [domainMatches, setDomainMatches] = useState<Record<string, DomainMatch>>({});

  // KPIs (global)
  const [kpis, setKpis] = useState({ total: 0, withEmail: 0, linkedInOnly: 0, qualified: 0, enriched: 0 });

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Countries list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("crm_contacts")
        .select("country")
        .eq("seniority", "c_level")
        .not("country", "is", null)
        .limit(5000);
      if (cancelled || !data) return;
      const counts: Record<string, number> = {};
      for (const r of data as any[]) {
        const n = (r.country || "").trim();
        if (!n) continue;
        counts[n] = (counts[n] ?? 0) + 1;
      }
      setCountryCounts(Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  // KPIs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const base = () => supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("seniority", "c_level");
      const [total, withEmail, qualified, enriched, linkedInOnly] = await Promise.all([
        base(),
        base().not("email", "is", null),
        base().not("qualified_as", "is", null),
        base().not("apollo_enriched_at", "is", null),
        base().is("email", null).not("linkedin", "is", null),
      ]);
      if (cancelled) return;
      setKpis({
        total: total.count ?? 0,
        withEmail: withEmail.count ?? 0,
        qualified: qualified.count ?? 0,
        enriched: enriched.count ?? 0,
        linkedInOnly: linkedInOnly.count ?? 0,
      });
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  // List query
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("crm_contacts")
        .select("id,full_name,email,linkedin,job_title,country,company_id,apollo_enriched_at,qualified_as,qualified_at,crm_companies(id,name,country,domain,company_type)", { count: "exact" })
        .eq("seniority", "c_level");

      if (sortBy === "newest") q = q.order("created_at", { ascending: false });
      else if (sortBy === "name") q = q.order("full_name", { ascending: true });
      // 'company' sort applied client-side after fetch

      const s = debouncedSearch.replace(/[,()]/g, " ").trim();
      if (s) q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,job_title.ilike.%${s}%`);
      if (selectedCountries.length > 0) q = q.in("country", selectedCountries);
      if (domainFilter === "qualified") q = q.not("qualified_as", "is", null);

      q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error("[CLevel] query error", error);
        setRows([]); setTotalCount(0); setLoading(false);
        return;
      }
      let mapped: CLevelRow[] = (data || []).map((c: any) => ({
        id: c.id, full_name: c.full_name, email: c.email, linkedin: c.linkedin,
        job_title: c.job_title, country: c.country, company_id: c.company_id,
        apollo_enriched_at: c.apollo_enriched_at, qualified_as: c.qualified_as,
        qualified_at: c.qualified_at,
        company_name: c.crm_companies?.name ?? null,
        company_country: c.crm_companies?.country ?? null,
        company_domain: c.crm_companies?.domain ?? null,
        company_type: c.crm_companies?.company_type ?? null,
      }));
      if (titleFilter !== "all") mapped = mapped.filter((r) => classifyTitle(r.job_title) === titleFilter);
      if (sortBy === "company") mapped.sort((a, b) => (a.company_name || "").localeCompare(b.company_name || ""));
      setRows(mapped);
      setTotalCount(count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debouncedSearch, selectedCountries, titleFilter, domainFilter, sortBy, page, refreshTick]);

  // Domain cross-reference
  useEffect(() => {
    if (rows.length === 0) { setDomainMatches({}); return; }
    let cancelled = false;
    (async () => {
      const domainMap = new Map<string, string[]>();
      for (const r of rows) {
        const d = (r.email?.split("@")[1] || r.company_domain || "").toLowerCase().trim();
        if (!d || isGenericDomain(d)) continue;
        if (!domainMap.has(d)) domainMap.set(d, []);
        domainMap.get(d)!.push(r.id);
      }
      const domainList = [...domainMap.keys()];
      if (domainList.length === 0) { setDomainMatches({}); return; }

      const { data } = await supabase
        .from("crm_companies")
        .select("id,name,domain,company_type")
        .in("domain", domainList);
      if (cancelled) return;

      // contact counts per domain
      const matchByDomain: Record<string, { name: string; type: string | null; contactCount: number }> = {};
      for (const co of data ?? []) {
        const d = (co.domain || "").toLowerCase();
        if (!matchByDomain[d]) matchByDomain[d] = { name: co.name, type: co.company_type, contactCount: 0 };
      }
      if (Object.keys(matchByDomain).length > 0) {
        const companyIds = (data ?? []).map((c) => c.id);
        const { data: contactCounts } = await supabase
          .from("crm_contacts")
          .select("company_id")
          .in("company_id", companyIds);
        const idToDomain = new Map<string, string>();
        for (const co of data ?? []) idToDomain.set(co.id, (co.domain || "").toLowerCase());
        for (const cc of contactCounts ?? []) {
          const d = idToDomain.get((cc as any).company_id);
          if (d && matchByDomain[d]) matchByDomain[d].contactCount += 1;
        }
      }

      const out: Record<string, DomainMatch> = {};
      for (const [domain, ids] of domainMap) {
        const m = matchByDomain[domain];
        for (const id of ids) {
          if (m) {
            out[id] = {
              hasMatch: true,
              matchType: m.type === "buyer" ? "prospect_buyer" : m.type === "supplier" ? "prospect_supplier" : "prospect_unknown",
              matchCompanyName: m.name,
              matchCount: m.contactCount,
            };
          } else {
            out[id] = { hasMatch: false, matchType: null, matchCompanyName: null, matchCount: 0 };
          }
        }
      }
      setDomainMatches(out);
    })();
    return () => { cancelled = true; };
  }, [rows]);

  // Apply domain filter (client-side, since it depends on cross-ref)
  const visibleRows = useMemo(() => {
    if (domainFilter === "has_match") return rows.filter((r) => domainMatches[r.id]?.hasMatch);
    if (domainFilter === "no_match") return rows.filter((r) => !domainMatches[r.id]?.hasMatch);
    return rows;
  }, [rows, domainMatches, domainFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function qualifyAs(row: CLevelRow, type: "buyer" | "supplier") {
    try {
      if (row.company_id) {
        await supabase.from("crm_companies").update({ company_type: type }).eq("id", row.company_id);
      }
      const { error } = await supabase.from("crm_contacts").update({
        lead_status: "qualified",
        qualified_at: new Date().toISOString(),
        qualified_as: type,
      }).eq("id", row.id);
      if (error) throw error;
      auditLog({
        action: "clevel.qualified", category: "user",
        entityId: row.id, entityLabel: `${row.full_name} → ${type}`,
        details: { companyName: row.company_name, type },
      });
      toast.success(`${row.full_name} moved to ${type === "buyer" ? "Buyers" : "Suppliers"} pipeline`);
      setMenuOpen(null);
      setRefreshTick((n) => n + 1);
    } catch (e: any) {
      toast.error(e?.message || "Qualification failed");
    }
  }

  async function enrichOne(row: CLevelRow) {
    if (!row.company_id) { toast.error("No linked company to enrich"); return; }
    setEnrichingId(row.id);
    try {
      const r = await bulkEnrichByCompanyIds([row.company_id]);
      toast.success(`Enriched: ${r.success} ✓ · ${r.failed} failed`);
      setRefreshTick((n) => n + 1);
    } catch (e: any) {
      toast.error("Enrich failed: " + (e?.message ?? "unknown"));
    } finally {
      setEnrichingId(null);
      setMenuOpen(null);
    }
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KPI label="Total C-Levels" value={kpis.total} color="#7C3AED" />
        <KPI label="With Email" value={kpis.withEmail} color="#2563EB" />
        <KPI label="LinkedIn Only" value={kpis.linkedInOnly} color="#0891B2" />
        <KPI label="Qualified" value={kpis.qualified} color="#059669" />
        <KPI label="Enriched" value={kpis.enriched} color="#D97706" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <div className="adm-search" style={{ flex: "1 1 240px", minWidth: 240 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Search name, company, title, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <CountryFilterPopover countries={countryCounts} selected={selectedCountries} onChange={setSelectedCountries} />
        <select className="crm-select" value={titleFilter} onChange={(e) => setTitleFilter(e.target.value as any)}>
          <option value="all">All titles</option>
          <option value="ceo">CEO / President</option>
          <option value="cfo">CFO / Finance</option>
          <option value="coo">COO / Operations</option>
          <option value="vp">VP / SVP / EVP</option>
          <option value="director">Director</option>
          <option value="other">Other</option>
        </select>
        <select className="crm-select" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value as any)}>
          <option value="all">All matches</option>
          <option value="has_match">🔗 Has domain match</option>
          <option value="no_match">⚪ No match</option>
          <option value="qualified">✅ Qualified</option>
        </select>
        <select className="crm-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="newest">Newest first</option>
          <option value="name">A-Z Name</option>
          <option value="company">A-Z Company</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: "#6B7280", margin: "4px 2px 8px" }}>
        {loading ? "Loading…" : `Showing ${visibleRows.length} of ${totalCount.toLocaleString()} C-Level contacts`}
      </div>

      {/* Table (desktop) */}
      <div className="adm-panel adm-only-desktop" style={{ padding: 0 }}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Title</th>
                <th>Country</th>
                <th>Email</th>
                <th>LinkedIn</th>
                <th>Domain Match</th>
                <th>Status</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const country = r.country || r.company_country || "";
                return (
                  <tr key={r.id} className="crm-row">
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: "#F5F3FF", color: "#6D28D9", padding: "1px 6px", borderRadius: 8, fontSize: 10, fontWeight: 700, border: "1px solid #DDD6FE" }}>👔</span>
                        <span style={{ fontWeight: 600 }}>{r.full_name}</span>
                      </div>
                    </td>
                    <td>{r.company_name || "—"}</td>
                    <td style={{ fontSize: 12, color: "#374151" }}>{r.job_title || "—"}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 16 }}>{countryFlag(country)}</span>
                        <span>{country || "—"}</span>
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{r.email || <span style={{ color: "#9CA3AF" }}>—</span>}</td>
                    <td>
                      {r.linkedin ? (
                        <a href={r.linkedin} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                           style={{ color: "#2563EB", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          LinkedIn <ExternalLink size={11} />
                        </a>
                      ) : <span style={{ color: "#9CA3AF" }}>—</span>}
                    </td>
                    <td><DomainMatchBadge match={domainMatches[r.id]} /></td>
                    <td>
                      {r.qualified_as ? (
                        <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "#D1FAE5", color: "#065F46" }}>
                          ✅ {r.qualified_as === "buyer" ? "Buyer" : "Supplier"}
                        </span>
                      ) : (
                        <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "#FEF3C7", color: "#92400E" }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setMenuOpen((m) => (m === r.id ? null : r.id))}
                        style={{ background: "transparent", border: "1px solid #E5E7EB", borderRadius: 6, padding: 4, cursor: "pointer" }}
                      >
                        <MoreVertical size={14} />
                      </button>
                      {menuOpen === r.id && (
                        <>
                          <div onClick={() => setMenuOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
                          <div style={{
                            position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 31,
                            background: "white", border: "1px solid #E5E7EB", borderRadius: 8,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 200, padding: 4,
                          }}>
                            {r.company_id && (
                              <MenuItem icon={<Eye size={13} />} label="View company" onClick={() => { setMenuOpen(null); nav(`/admin/crm/prospects/${r.company_id}`); }} />
                            )}
                            <MenuItem
                              icon={enrichingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                              label="Enrich with Apollo"
                              disabled={!r.company_id || enrichingId === r.id}
                              onClick={() => enrichOne(r)}
                            />
                            <MenuItem icon={<ShoppingCart size={13} color="#2563EB" />} label="Move to Buyers" onClick={() => qualifyAs(r, "buyer")} />
                            <MenuItem icon={<Factory size={13} color="#059669" />} label="Move to Suppliers" onClick={() => qualifyAs(r, "supplier")} />
                            {r.linkedin && (
                              <MenuItem icon={<ExternalLink size={13} />} label="Open LinkedIn" onClick={() => { window.open(r.linkedin!, "_blank"); setMenuOpen(null); }} />
                            )}
                            {r.email && (
                              <MenuItem icon={<Copy size={13} />} label="Copy email" onClick={() => { navigator.clipboard.writeText(r.email!); toast.success("Email copied"); setMenuOpen(null); }} />
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 28, color: "#6B7280" }}>
                  {loading ? "…" : "No C-Level contacts found"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="adm-only-mobile adm-cards-stack">
        {visibleRows.map((r) => (
          <CLevelCardRow
            key={r.id}
            row={r}
            domainMatch={domainMatches[r.id]}
            enrichingId={enrichingId}
            onViewCompany={(id) => nav(`/admin/crm/prospects/${id}`)}
            onQualify={qualifyAs}
            onEnrich={enrichOne}
          />
        ))}
        {visibleRows.length === 0 && (
          <div className="adm-panel" style={{ padding: 16, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
            {loading ? "…" : "No C-Level contacts found"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        padding: "8px 10px", borderRadius: 6, fontSize: 13, textAlign: "left",
        background: "transparent", border: "none", cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "#9CA3AF" : "#111827",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#F9FAFB"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {icon}<span>{label}</span>
    </button>
  );
}