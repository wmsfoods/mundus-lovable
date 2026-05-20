import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, User, Building, Briefcase, Layers, Mail, MapPin, Filter, Linkedin, Phone, Smartphone, Save, Download, Target, UserCheck, Package, SearchX } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  EMPLOYEE_RANGES, SENIORITIES, DEPARTMENTS, JOB_TITLES,
  DECISION_LEVELS, LEAD_TYPES, PRODUCT_INTERESTS,
  
  fakePhone, type MockPerson,
} from "@/types/prospect";
import { FilterAccordion } from "@/components/prospect/FilterAccordion";
import { DetailDrawer } from "@/components/prospect/DetailDrawer";
import { RevealButton } from "@/components/prospect/RevealButton";
import { PspPagination } from "@/components/prospect/Pagination";
import { SaveToCrmModal } from "@/components/prospect/SaveToCrmModal";

const PRESET_COUNTRIES = ["China","United Arab Emirates","Saudi Arabia","Brazil","United States","Japan","Denmark"];

export default function FindPeople() {
  const [sp] = useSearchParams();
  
  const [search, setSearch] = useState("");
  const [titles, setTitles] = useState<string[]>([]);
  const [titleInput, setTitleInput] = useState("");
  const [seniorities, setSeniorities] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [emailStatuses, setEmailStatuses] = useState<string[]>([]);
  const [personLocations, setPersonLocations] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState("");
  const [companySizes, setCompanySizes] = useState<string[]>([]);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<MockPerson | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [revealedMap, setRevealedMap] = useState<Record<string, { email?: string; phone?: string; mobile?: string }>>({});
  const [decisionLevels, setDecisionLevels] = useState<string[]>([]);
  const [leadTypes, setLeadTypes] = useState<string[]>([]);
  const [productsOfInterest, setProductsOfInterest] = useState<string[]>([]);
  const [savePerson, setSavePerson] = useState<MockPerson | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const pageSize = 25;

  useEffect(() => {
    const c = sp.get("company");
    if (c) setCompanyFilter(c);
  }, [sp]);

  const toggle = <T extends string>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const activeFilters =
    titles.length + (seniorities.length ? 1 : 0) + (departments.length ? 1 : 0) +
    (emailStatuses.length ? 1 : 0) + (personLocations.length ? 1 : 0) +
    (companyFilter ? 1 : 0) + (companySizes.length ? 1 : 0);

  const clearAll = () => {
    setTitles([]); setSeniorities([]); setDepartments([]); setEmailStatuses([]);
    setPersonLocations([]); setCompanyFilter(""); setCompanySizes([]);
  };

  // TODO: Connect to prospect-search edge function to fetch real data
  const filtered: MockPerson[] = [];

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));

  const toggleSelect = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    const n = new Set(selected);
    if (allOnPageSelected) pageItems.forEach((p) => n.delete(p.id));
    else pageItems.forEach((p) => n.add(p.id));
    setSelected(n);
  };

  const bulkRevealEmails = () => {
    toast.info("No data to reveal yet");
  };
  const bulkRevealPhones = () => {
    toast.info("No data to reveal yet");
  };

  const exportCsv = () => {
    toast.info("No data to export yet");
  };

  return (
    <div className="psp-page">
      <div className="psp-toolbar">
        <div className="psp-search">
          <Search size={14} className="psp-search-icon" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search people..." />
        </div>
        <button className="psp-btn ghost psp-mobile-filter-btn" onClick={() => setShowFilters(true)}>
          <Filter size={12} />Filters {activeFilters > 0 && `(${activeFilters})`}
        </button>
        <button className="psp-btn ghost" onClick={() => toast.success("Search saved")}><Save size={12} />Save search</button>
        <select className="psp-input" style={{ width: 160 }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="relevance">Sort: Relevance</option>
          <option value="name">Name A-Z</option>
          <option value="company">Company A-Z</option>
        </select>
        <span className="psp-credits">Credits: 4,480</span>
      </div>


      <div className="psp-layout">
        <aside className={`psp-filters ${showFilters ? "is-open" : ""}`}>
          <FilterAccordion label="Job Title" icon={<Briefcase size={14} />} hasActive={titles.length > 0}>
            <input
              className="psp-input" placeholder="Enter job titles + Enter..."
              value={titleInput} onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && titleInput.trim()) { setTitles([...titles, titleInput.trim()]); setTitleInput(""); } }}
            />
            <div className="psp-chip-row">
              {JOB_TITLES.map((t) => (
                <span key={t} className={`psp-chip ${titles.includes(t) ? "is-active" : ""}`} onClick={() => toggle(titles, t, setTitles)}>{t}</span>
              ))}
            </div>
          </FilterAccordion>

          <FilterAccordion label="Seniority" icon={<Layers size={14} />} hasActive={seniorities.length > 0}>
            {SENIORITIES.map((s) => (
              <div key={s} className="psp-checkbox-row">
                <label><Checkbox checked={seniorities.includes(s)} onCheckedChange={() => toggle(seniorities, s, setSeniorities)} />{s}</label>
              </div>
            ))}
          </FilterAccordion>

          <FilterAccordion label="Department" icon={<User size={14} />} hasActive={departments.length > 0}>
            {DEPARTMENTS.map((d) => (
              <div key={d} className="psp-checkbox-row">
                <label><Checkbox checked={departments.includes(d)} onCheckedChange={() => toggle(departments, d, setDepartments)} />{d}</label>
              </div>
            ))}
          </FilterAccordion>

          <FilterAccordion label="Email Status" icon={<Mail size={14} />} hasActive={emailStatuses.length > 0}>
            <div className="psp-checkbox-row"><label><Checkbox checked={emailStatuses.includes("verified")} onCheckedChange={() => toggle(emailStatuses, "verified", setEmailStatuses)} /><span className="psp-badge verified">Verified</span> Safe to send</label></div>
            <div className="psp-checkbox-row"><label><Checkbox checked={emailStatuses.includes("unverified")} onCheckedChange={() => toggle(emailStatuses, "unverified", setEmailStatuses)} /><span className="psp-badge unverified">Unverified</span> With caution</label></div>
            <div className="psp-checkbox-row"><label><Checkbox checked={emailStatuses.includes("unavailable")} onCheckedChange={() => toggle(emailStatuses, "unavailable", setEmailStatuses)} /><span className="psp-badge unavailable">Unavailable</span> Do not send</label></div>
          </FilterAccordion>

          <FilterAccordion label="Person Location" icon={<MapPin size={14} />} hasActive={personLocations.length > 0}>
            <input className="psp-input" placeholder="Enter countries..." />
            <div className="psp-chip-row">
              {PRESET_COUNTRIES.map((c) => (
                <span key={c} className={`psp-chip ${personLocations.includes(c) ? "is-active" : ""}`} onClick={() => toggle(personLocations, c, setPersonLocations)}>{c}</span>
              ))}
            </div>
          </FilterAccordion>

          <FilterAccordion label="Company" icon={<Building size={14} />} hasActive={!!companyFilter}>
            <input className="psp-input" placeholder="Filter by company..." value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} />
          </FilterAccordion>

          <FilterAccordion label="Company Size" icon={<Layers size={14} />} hasActive={companySizes.length > 0}>
            {EMPLOYEE_RANGES.map((r) => (
              <div key={r} className="psp-checkbox-row">
                <label><Checkbox checked={companySizes.includes(r)} onCheckedChange={() => toggle(companySizes, r, setCompanySizes)} />{r}</label>
              </div>
            ))}
          </FilterAccordion>

          <FilterAccordion label="Decision Level" icon={<Target size={14} />} hasActive={decisionLevels.length > 0} defaultOpen={false}>
            {DECISION_LEVELS.map((d) => (
              <div key={d} className="psp-checkbox-row">
                <label><Checkbox checked={decisionLevels.includes(d)} onCheckedChange={() => toggle(decisionLevels, d, setDecisionLevels)} />{d}</label>
              </div>
            ))}
          </FilterAccordion>

          <FilterAccordion label="Lead Type" icon={<UserCheck size={14} />} hasActive={leadTypes.length > 0} defaultOpen={false}>
            {LEAD_TYPES.map((d) => (
              <div key={d} className="psp-checkbox-row">
                <label><Checkbox checked={leadTypes.includes(d)} onCheckedChange={() => toggle(leadTypes, d, setLeadTypes)} />{d}</label>
              </div>
            ))}
          </FilterAccordion>

          <FilterAccordion label="Products of Interest" icon={<Package size={14} />} hasActive={productsOfInterest.length > 0} defaultOpen={false}>
            <div className="psp-chip-row">
              {PRODUCT_INTERESTS.map((p) => (
                <span key={p} className={`psp-chip ${productsOfInterest.includes(p) ? "is-active" : ""}`} onClick={() => toggle(productsOfInterest, p, setProductsOfInterest)}>{p}</span>
              ))}
            </div>
          </FilterAccordion>

          {activeFilters > 0 && (
            <button className="psp-clear-btn" onClick={clearAll}>Clear all ({activeFilters})</button>
          )}
        </aside>

        <div className="psp-results">
          <div className="psp-empty-state" style={{ padding: "80px 20px", textAlign: "center", color: "var(--adm-text-tertiary)" }}>
            <SearchX size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--adm-text-primary)", margin: "0 0 8px" }}>Search for people</h3>
            <p style={{ fontSize: 13, margin: 0 }}>Use the filters to find prospects, or search by name</p>
          </div>

          {selected.size > 0 && (
            <div className="psp-bulk-bar">
              <span className="count">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())}>Clear</button>
              <div className="spacer" />
              <button className="solid" onClick={() => toast.success(`Saved ${selected.size} to CRM`)}>Save to CRM</button>
              <button onClick={bulkRevealEmails}><Mail size={12} /> Reveal emails ({selected.size})</button>
              <button onClick={bulkRevealPhones}><Phone size={12} /> Reveal phones ({selected.size})</button>
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
              <img src={detail.companyLogo} alt="" />
              <div>
                <div className="title">{detail.fullName}</div>
                <div className="sub">{detail.jobTitle} · {detail.companyName}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                  <span className="psp-tag">{detail.seniority}</span>
                  <span className="psp-tag">{detail.countryFlag} {detail.country}</span>
                </div>
              </div>
            </>
          }
          footer={
            <>
              {detail.in_crm
                ? <button className="psp-btn solid">Open in CRM</button>
                : <button className="psp-btn solid" onClick={() => setSavePerson(detail)}>Save to CRM</button>}
              <button className="psp-btn ghost" onClick={() => toast.info("Sequence builder coming soon")}>Add to Sequence</button>
            </>
          }
        >
          <div className="psp-drawer-section">
            <h4>Contact</h4>
            <dl className="psp-kv">
              <dt>Email</dt><dd>{revealedMap[detail.id]?.email ?? detail.email ?? "—"}</dd>
              <dt>Phone</dt><dd>{revealedMap[detail.id]?.phone ?? (detail.phoneAvailable ? "Available · reveal in table" : "—")}</dd>
              <dt>Mobile</dt><dd>{revealedMap[detail.id]?.mobile ?? (detail.mobileAvailable ? "Available · reveal in table" : "—")}</dd>
              <dt>LinkedIn</dt><dd><a className="psp-icon-link" href={detail.linkedin} target="_blank" rel="noreferrer">View profile ↗</a></dd>
              <dt>WhatsApp</dt><dd>{detail.whatsapp ?? "—"}</dd>
            </dl>
          </div>
          <div className="psp-drawer-section">
            <h4>Lead Info</h4>
            <dl className="psp-kv">
              <dt>Status</dt><dd>{detail.in_crm ? "In CRM" : "New"}</dd>
              <dt>Department</dt><dd>{detail.department}</dd>
              <dt>Source</dt><dd>Prospect search</dd>
            </dl>
          </div>
          <div className="psp-drawer-section">
            <h4>Products of Interest</h4>
            <div className="psp-chip-row">
              {(detail.productsOfInterest ?? []).length > 0
                ? detail.productsOfInterest!.map((p) => <span key={p} className="psp-chip is-active">{p}</span>)
                : <span style={{ fontSize: 12, color: "var(--adm-text-tertiary)" }}>—</span>}
            </div>
          </div>
          <div className="psp-drawer-section">
            <h4>Activity Timeline</h4>
            <p style={{ color: "var(--adm-text-tertiary)" }}>No activities yet</p>
          </div>
        </DetailDrawer>
      )}

      <SaveToCrmModal
        open={!!savePerson}
        onClose={() => setSavePerson(null)}
        person={savePerson}
        onSaved={() => { if (savePerson) setSavedIds((s) => new Set(s).add(savePerson.id)); }}
      />
    </div>
  );
}
