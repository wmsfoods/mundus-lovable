import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building, MapPin, Users, Briefcase, DollarSign, Tag, Filter, ExternalLink, Linkedin, Save, Download, Globe, BarChart3, FileCode } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  MOCK_COMPANIES, EMPLOYEE_RANGES, INDUSTRIES, KEYWORDS, STAGES,
  REGION_PRESETS, SIC_CODES, NAICS_CODES, MARKET_SEGMENTS,
  fmtRevenue, fmtNumber, type MockCompany,
} from "@/data/mockProspect";
import { FilterAccordion } from "@/components/prospect/FilterAccordion";
import { DetailDrawer } from "@/components/prospect/DetailDrawer";
import { PspPagination } from "@/components/prospect/Pagination";
import { SaveToCrmModal } from "@/components/prospect/SaveToCrmModal";

const PRESET_COUNTRIES = ["China","United Arab Emirates","Saudi Arabia","Brazil","Argentina","Egypt","Hong Kong","Philippines"];
const REVENUE_PRESETS = [
  { label: "Under $1M", min: 0, max: 1e6 },
  { label: "$1M-$10M", min: 1e6, max: 1e7 },
  { label: "$10M-$100M", min: 1e7, max: 1e8 },
  { label: "$100M+", min: 1e8, max: Infinity },
];

export default function FindCompanies() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"total" | "saved">("total");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [empRanges, setEmpRanges] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [revMin, setRevMin] = useState<number | null>(null);
  const [revMax, setRevMax] = useState<number | null>(null);
  const [stages, setStages] = useState<string[]>([]);
  const [notInCrm, setNotInCrm] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<MockCompany | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [excludeLocations, setExcludeLocations] = useState<string[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [sicNaicsTab, setSicNaicsTab] = useState<"sic" | "naics">("sic");
  const [sicCodes, setSicCodes] = useState<string[]>([]);
  const [naicsCodes, setNaicsCodes] = useState<string[]>([]);
  const [marketSegments, setMarketSegments] = useState<string[]>([]);
  const [companyType, setCompanyType] = useState<"all" | "private" | "public">("all");
  const [saveModalCompany, setSaveModalCompany] = useState<MockCompany | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const pageSize = 25;

  const toggle = <T extends string>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const activeFilters =
    (name ? 1 : 0) + (locations.length ? 1 : 0) + (empRanges.length ? 1 : 0) +
    (industries.length ? 1 : 0) + (keywords.length ? 1 : 0) +
    (revMin || revMax ? 1 : 0) + (stages.length || notInCrm ? 1 : 0) +
    (excludeLocations.length ? 1 : 0) + (cityQuery ? 1 : 0) +
    (sicCodes.length || naicsCodes.length ? 1 : 0) +
    (marketSegments.length ? 1 : 0) + (companyType !== "all" ? 1 : 0);

  const clearAll = () => {
    setName(""); setLocations([]); setEmpRanges([]); setIndustries([]);
    setKeywords([]); setRevMin(null); setRevMax(null); setStages([]); setNotInCrm(false);
    setExcludeLocations([]); setCityQuery(""); setSicCodes([]); setNaicsCodes([]);
    setMarketSegments([]); setCompanyType("all");
  };

  const filtered = useMemo(() => {
    let list = [...MOCK_COMPANIES];
    if (tab === "saved") list = list.filter((c) => c.in_crm);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q));
    const qn = name.toLowerCase().trim();
    if (qn) list = list.filter((c) => c.name.toLowerCase().includes(qn) || c.domain.toLowerCase().includes(qn));
    if (locations.length) list = list.filter((c) => locations.includes(c.country));
    if (excludeLocations.length) list = list.filter((c) => !excludeLocations.includes(c.country));
    if (cityQuery.trim()) {
      const cq = cityQuery.toLowerCase().trim();
      list = list.filter((c) => c.city.toLowerCase().includes(cq));
    }
    if (empRanges.length) list = list.filter((c) => empRanges.includes(c.employeeRange));
    if (industries.length) list = list.filter((c) => industries.includes(c.industry));
    if (keywords.length) list = list.filter((c) => keywords.some((k) => (c.keywords ?? []).includes(k) || c.description.toLowerCase().includes(k.toLowerCase())));
    if (revMin != null) list = list.filter((c) => c.revenue >= revMin);
    if (revMax != null) list = list.filter((c) => c.revenue <= revMax);
    if (stages.length) list = list.filter((c) => c.stage && stages.includes(c.stage));
    if (notInCrm) list = list.filter((c) => !c.in_crm && !savedIds.has(c.id));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "emp-desc") list.sort((a, b) => b.employees - a.employees);
    if (sort === "emp-asc") list.sort((a, b) => a.employees - b.employees);
    if (sort === "rev-desc") list.sort((a, b) => b.revenue - a.revenue);
    if (sort === "rev-asc") list.sort((a, b) => a.revenue - b.revenue);
    return list;
  }, [tab, search, name, locations, excludeLocations, cityQuery, empRanges, industries, keywords, revMin, revMax, stages, notInCrm, savedIds, sort]);

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((c) => selected.has(c.id));

  const toggleSelect = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    const n = new Set(selected);
    if (allOnPageSelected) pageItems.forEach((c) => n.delete(c.id));
    else pageItems.forEach((c) => n.add(c.id));
    setSelected(n);
  };

  const exportCsv = () => {
    const ids = selected.size ? [...selected] : pageItems.map((c) => c.id);
    const rows = MOCK_COMPANIES.filter((c) => ids.includes(c.id));
    const csv = ["Name,Domain,Industry,Country,City,Employees,Revenue,Founded,Website",
      ...rows.map((c) => `"${c.name}","${c.domain}","${c.industry}","${c.country}","${c.city}",${c.employees},${c.revenue},${c.founded},"${c.website}"`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "companies.csv"; a.click();
    toast.success(`Exported ${rows.length} companies`);
  };

  return (
    <div className="psp-page">
      <div className="psp-toolbar">
        <div className="psp-search">
          <Search size={14} className="psp-search-icon" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search companies..." />
        </div>
        <button className="psp-btn ghost psp-mobile-filter-btn" onClick={() => setShowFilters(true)}>
          <Filter size={12} />Filters {activeFilters > 0 && `(${activeFilters})`}
        </button>
        <button className="psp-btn ghost" onClick={() => toast.success("Search saved")}><Save size={12} />Save search</button>
        <select className="psp-input" style={{ width: 160 }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="relevance">Sort: Relevance</option>
          <option value="name">Name A-Z</option>
          <option value="emp-desc">Employees ↓</option>
          <option value="emp-asc">Employees ↑</option>
          <option value="rev-desc">Revenue ↓</option>
          <option value="rev-asc">Revenue ↑</option>
        </select>
        <span className="psp-credits">Credits: 4,480</span>
      </div>

      <div className="psp-tabs">
        <button className={`psp-tab ${tab === "total" ? "is-active" : ""}`} onClick={() => { setTab("total"); setPage(1); }}>Total ({MOCK_COMPANIES.length})</button>
        <button className={`psp-tab ${tab === "saved" ? "is-active" : ""}`} onClick={() => { setTab("saved"); setPage(1); }}>Saved ({MOCK_COMPANIES.filter((c) => c.in_crm).length})</button>
      </div>

      <div className="psp-layout">
        <aside className={`psp-filters ${showFilters ? "is-open" : ""}`}>
          <FilterAccordion label="Company Name" icon={<Building size={14} />} hasActive={!!name}>
            <input className="psp-input" placeholder="Name or domain..." value={name} onChange={(e) => { setName(e.target.value); setPage(1); }} />
          </FilterAccordion>

          <FilterAccordion label="Location" icon={<MapPin size={14} />} hasActive={locations.length > 0}>
            <div className="psp-region-row">
              {REGION_PRESETS.map((r) => {
                const allSelected = r.countries.every((c) => locations.includes(c));
                return (
                  <span key={r.label} className={`psp-chip ${allSelected ? "is-active" : ""}`}
                    onClick={() => {
                      if (allSelected) setLocations(locations.filter((c) => !r.countries.includes(c)));
                      else setLocations(Array.from(new Set([...locations, ...r.countries])));
                      setPage(1);
                    }}>{r.label}</span>
                );
              })}
            </div>
            <input className="psp-input" placeholder="Search city..." value={cityQuery} onChange={(e) => { setCityQuery(e.target.value); setPage(1); }} />
            <div className="psp-chip-row" style={{ marginTop: 6 }}>
              {PRESET_COUNTRIES.map((c) => (
                <span key={c} className={`psp-chip ${locations.includes(c) ? "is-active" : ""}`} onClick={() => { toggle(locations, c, setLocations); setPage(1); }}>{c}</span>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--adm-text-tertiary)" }}>Exclude locations</div>
            <div className="psp-chip-row">
              {PRESET_COUNTRIES.map((c) => (
                <span key={`x-${c}`} className={`psp-chip ${excludeLocations.includes(c) ? "is-active" : ""}`} onClick={() => { toggle(excludeLocations, c, setExcludeLocations); setPage(1); }}>{c}</span>
              ))}
            </div>
          </FilterAccordion>

          <FilterAccordion label="Employees" icon={<Users size={14} />} hasActive={empRanges.length > 0}>
            {EMPLOYEE_RANGES.map((r) => {
              const count = MOCK_COMPANIES.filter((c) => c.employeeRange === r).length;
              return (
                <div key={r} className="psp-checkbox-row">
                  <label><Checkbox checked={empRanges.includes(r)} onCheckedChange={() => { toggle(empRanges, r, setEmpRanges); setPage(1); }} />{r}</label>
                  <span className="count">{count}</span>
                </div>
              );
            })}
          </FilterAccordion>

          <FilterAccordion label="Industry & Keywords" icon={<Briefcase size={14} />} hasActive={industries.length > 0 || keywords.length > 0}>
            <input className="psp-input" placeholder="Search industries..." />
            <div className="psp-chip-row">
              {INDUSTRIES.map((i) => (
                <span key={i} className={`psp-chip ${industries.includes(i) ? "is-active" : ""}`} onClick={() => { toggle(industries, i, setIndustries); setPage(1); }}>{i}</span>
              ))}
            </div>
            <div style={{ height: 8 }} />
            <input
              className="psp-input"
              placeholder="Add keyword + Enter..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && keywordInput.trim()) { setKeywords([...keywords, keywordInput.trim()]); setKeywordInput(""); }
              }}
            />
            <div className="psp-chip-row">
              {KEYWORDS.map((k) => (
                <span key={k} className={`psp-chip ${keywords.includes(k) ? "is-active" : ""}`} onClick={() => toggle(keywords, k, setKeywords)}>{k}</span>
              ))}
            </div>
            {keywords.filter((k) => !KEYWORDS.includes(k)).map((k) => (
              <span key={k} className="psp-chip is-active" onClick={() => setKeywords(keywords.filter((x) => x !== k))}>{k} ×</span>
            ))}
          </FilterAccordion>

          <FilterAccordion label="Revenue" icon={<DollarSign size={14} />} hasActive={!!(revMin || revMax)}>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="psp-input" type="number" placeholder="Min USD" value={revMin ?? ""} onChange={(e) => setRevMin(e.target.value ? +e.target.value : null)} />
              <input className="psp-input" type="number" placeholder="Max USD" value={revMax ?? ""} onChange={(e) => setRevMax(e.target.value ? +e.target.value : null)} />
            </div>
            <div className="psp-chip-row">
              {REVENUE_PRESETS.map((p) => (
                <span key={p.label} className="psp-chip" onClick={() => { setRevMin(p.min); setRevMax(p.max === Infinity ? null : p.max); }}>{p.label}</span>
              ))}
            </div>
          </FilterAccordion>

          <FilterAccordion label="Stage (CRM)" icon={<Tag size={14} />} hasActive={stages.length > 0 || notInCrm}>
            {STAGES.map((s) => (
              <div key={s} className="psp-checkbox-row">
                <label><Checkbox checked={stages.includes(s)} onCheckedChange={() => toggle(stages, s, setStages)} />{s.toUpperCase()}</label>
              </div>
            ))}
            <div className="psp-checkbox-row">
              <label><Checkbox checked={notInCrm} onCheckedChange={(v) => setNotInCrm(!!v)} />Not in CRM</label>
            </div>
          </FilterAccordion>

          <FilterAccordion label="SIC / NAICS Codes" icon={<FileCode size={14} />} hasActive={sicCodes.length > 0 || naicsCodes.length > 0} defaultOpen={false}>
            <div className="psp-chip-row">
              <span className={`psp-chip ${sicNaicsTab === "sic" ? "is-active" : ""}`} onClick={() => setSicNaicsTab("sic")}>SIC</span>
              <span className={`psp-chip ${sicNaicsTab === "naics" ? "is-active" : ""}`} onClick={() => setSicNaicsTab("naics")}>NAICS</span>
            </div>
            <input className="psp-input" placeholder={sicNaicsTab === "sic" ? "Search SIC code..." : "Search NAICS code..."} />
            <div className="psp-chip-row">
              {(sicNaicsTab === "sic" ? SIC_CODES : NAICS_CODES).map((c) => {
                const arr = sicNaicsTab === "sic" ? sicCodes : naicsCodes;
                const setArr = sicNaicsTab === "sic" ? setSicCodes : setNaicsCodes;
                return (
                  <span key={c.code} className={`psp-chip ${arr.includes(c.code) ? "is-active" : ""}`}
                    onClick={() => toggle(arr, c.code, setArr)} title={c.label}>
                    {c.code} · {c.label}
                  </span>
                );
              })}
            </div>
          </FilterAccordion>

          <FilterAccordion label="Market Segment" icon={<BarChart3 size={14} />} hasActive={marketSegments.length > 0} defaultOpen={false}>
            <div style={{ fontSize: 11, color: "var(--adm-text-tertiary)", marginBottom: 6 }}>Hint: most meat trade is B2B</div>
            {MARKET_SEGMENTS.map((s) => (
              <div key={s} className="psp-checkbox-row">
                <label><Checkbox checked={marketSegments.includes(s)} onCheckedChange={() => toggle(marketSegments, s, setMarketSegments)} />{s}</label>
              </div>
            ))}
          </FilterAccordion>

          <FilterAccordion label="Company Type" icon={<Globe size={14} />} hasActive={companyType !== "all"} defaultOpen={false}>
            {(["all", "private", "public"] as const).map((t) => (
              <div key={t} className="psp-checkbox-row">
                <label>
                  <input type="radio" name="psp-co-type" checked={companyType === t} onChange={() => setCompanyType(t)} />
                  {t === "all" ? "All" : t === "private" ? "Private Company" : "Public Company"}
                </label>
              </div>
            ))}
          </FilterAccordion>

          {activeFilters > 0 && (
            <button className="psp-clear-btn" onClick={clearAll}>Clear all ({activeFilters})</button>
          )}
        </aside>

        <div className="psp-results">
          <div className="psp-results-scroll">
            <table className="psp-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}><Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} /></th>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Location</th>
                  <th>Employees</th>
                  <th>Revenue</th>
                  <th>Founded</th>
                  <th>Links</th>
                  <th>Status</th>
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c.id} className={selected.has(c.id) ? "is-selected" : ""}>
                    <td><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></td>
                    <td>
                      <div className="psp-company-cell">
                        <img src={c.logo_url} alt="" />
                        <div>
                          <div className="name" onClick={() => setDetail(c)}>{c.name}</div>
                          <div className="domain">{c.domain}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="psp-tag">{c.industry}</span></td>
                    <td>{c.countryFlag} {c.city}, {c.country}</td>
                    <td>{fmtNumber(c.employees)}</td>
                    <td>{fmtRevenue(c.revenue)}</td>
                    <td>{c.founded}</td>
                    <td>
                      <span style={{ display: "inline-flex", gap: 8 }}>
                        <a className="psp-icon-link" href={c.website} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
                        <a className="psp-icon-link" href={c.linkedin} target="_blank" rel="noreferrer"><Linkedin size={14} /></a>
                      </span>
                    </td>
                    <td><span className={`psp-badge ${c.in_crm ? "in-crm" : "new"}`}>{c.in_crm ? "In CRM" : "New"}</span></td>
                    <td>
                      {c.in_crm ? (
                        <button className="psp-btn ghost" onClick={() => setDetail(c)}>View</button>
                      ) : (
                        <button className="psp-btn" onClick={() => toast.success(`${c.name} saved`)}>Save</button>
                      )}
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr><td colSpan={10} className="psp-empty">No companies match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <PspPagination total={filtered.length} page={page} pageSize={pageSize} onChange={setPage} />

          {selected.size > 0 && (
            <div className="psp-bulk-bar">
              <span className="count">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())}>Clear</button>
              <div className="spacer" />
              <button className="solid" onClick={() => toast.success(`Saved ${selected.size} to CRM`)}>Save to CRM</button>
              <button onClick={() => toast.info("Pick a list (coming soon)")}>Add to List</button>
              <button onClick={() => toast.info("Enrichment coming soon")}>Enrich</button>
              <button onClick={exportCsv}><Download size={12} /> Export CSV</button>
            </div>
          )}
        </div>
      </div>

      {detail && (
        <DetailDrawer
          open={!!detail}
          onClose={() => setDetail(null)}
          head={
            <>
              <img src={detail.logo_url} alt="" />
              <div>
                <div className="title">{detail.name}</div>
                <div className="sub">{detail.domain} · {detail.industry}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                  <span className="psp-tag">{detail.countryFlag} {detail.country}</span>
                  <span className="psp-tag">Founded {detail.founded}</span>
                </div>
              </div>
            </>
          }
          footer={
            <>
              {detail.in_crm
                ? <button className="psp-btn solid">Open in CRM</button>
                : <button className="psp-btn solid" onClick={() => toast.success("Saved to CRM")}>Save to CRM</button>}
              <a className="psp-btn ghost" href={detail.website} target="_blank" rel="noreferrer"><ExternalLink size={12} />Website</a>
              <a className="psp-btn ghost" href={detail.linkedin} target="_blank" rel="noreferrer"><Linkedin size={12} />LinkedIn</a>
            </>
          }
        >
          <div className="psp-drawer-section">
            <p>{detail.description}</p>
          </div>
          <div className="psp-drawer-section">
            <h4>Key Facts</h4>
            <dl className="psp-kv">
              <dt>Employees</dt><dd>{fmtNumber(detail.employees)}</dd>
              <dt>Revenue</dt><dd>{fmtRevenue(detail.revenue)}</dd>
              <dt>Founded</dt><dd>{detail.founded}</dd>
              <dt>Headquarters</dt><dd>{detail.city}, {detail.country}</dd>
            </dl>
          </div>
          <div className="psp-drawer-section">
            <h4>People at this company</h4>
            <button className="psp-btn" onClick={() => nav(`/admin/prospect/people?company=${encodeURIComponent(detail.name)}`)}>
              Find people →
            </button>
          </div>
          <div className="psp-drawer-section">
            <h4>CRM Status</h4>
            <dl className="psp-kv">
              <dt>Stage</dt><dd>{detail.stage ?? "—"}</dd>
              <dt>In CRM</dt><dd>{detail.in_crm ? "Yes" : "No"}</dd>
            </dl>
          </div>
        </DetailDrawer>
      )}
    </div>
  );
}
