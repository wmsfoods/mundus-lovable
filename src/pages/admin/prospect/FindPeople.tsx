import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, User, Building, Briefcase, Layers, Mail, MapPin, Filter, Linkedin, Phone, Smartphone, Save, Download, Target, UserCheck, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  MOCK_PEOPLE, EMPLOYEE_RANGES, SENIORITIES, DEPARTMENTS, JOB_TITLES,
  DECISION_LEVELS, LEAD_TYPES, PRODUCT_INTERESTS,
  fakePhone, type MockPerson,
} from "@/data/mockProspect";
import { FilterAccordion } from "@/components/prospect/FilterAccordion";
import { DetailDrawer } from "@/components/prospect/DetailDrawer";
import { RevealButton } from "@/components/prospect/RevealButton";
import { PspPagination } from "@/components/prospect/Pagination";
import { SaveToCrmModal } from "@/components/prospect/SaveToCrmModal";

const PRESET_COUNTRIES = ["China","United Arab Emirates","Saudi Arabia","Brazil","United States","Japan","Denmark"];

export default function FindPeople() {
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<"total" | "saved">("total");
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

  const filtered = useMemo(() => {
    let list = [...MOCK_PEOPLE];
    if (tab === "saved") list = list.filter((p) => p.in_crm);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((p) => p.fullName.toLowerCase().includes(q) || p.jobTitle.toLowerCase().includes(q) || p.companyName.toLowerCase().includes(q));
    if (titles.length) list = list.filter((p) => titles.some((t) => p.jobTitle.toLowerCase().includes(t.toLowerCase())));
    if (seniorities.length) list = list.filter((p) => seniorities.includes(p.seniority));
    if (departments.length) list = list.filter((p) => departments.includes(p.department));
    if (emailStatuses.length) list = list.filter((p) => emailStatuses.includes(p.emailStatus));
    if (personLocations.length) list = list.filter((p) => personLocations.includes(p.country));
    if (companyFilter) list = list.filter((p) => p.companyName.toLowerCase().includes(companyFilter.toLowerCase()));
    if (productsOfInterest.length) list = list.filter((p) => (p.productsOfInterest ?? []).some((x) => productsOfInterest.includes(x)));
    if (sort === "name") list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (sort === "company") list.sort((a, b) => a.companyName.localeCompare(b.companyName));
    return list;
  }, [tab, search, titles, seniorities, departments, emailStatuses, personLocations, companyFilter, productsOfInterest, sort]);

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
    const n = { ...revealedMap };
    [...selected].forEach((id) => {
      const p = MOCK_PEOPLE.find((x) => x.id === id);
      if (p && p.email) n[id] = { ...n[id], email: p.email };
    });
    setRevealedMap(n);
    toast.success(`Revealed ${selected.size} emails`);
  };
  const bulkRevealPhones = () => {
    const n = { ...revealedMap };
    [...selected].forEach((id) => {
      const p = MOCK_PEOPLE.find((x) => x.id === id);
      if (p && p.phoneAvailable) n[id] = { ...n[id], phone: fakePhone(id) };
    });
    setRevealedMap(n);
    toast.success(`Revealed ${selected.size} phones`);
  };

  const exportCsv = () => {
    const ids = selected.size ? [...selected] : pageItems.map((c) => c.id);
    const rows = MOCK_PEOPLE.filter((p) => ids.includes(p.id));
    const csv = ["Name,Title,Company,Email,Country,City,Seniority,LinkedIn",
      ...rows.map((p) => `"${p.fullName}","${p.jobTitle}","${p.companyName}","${revealedMap[p.id]?.email ?? p.email ?? ""}","${p.country}","${p.city}","${p.seniority}","${p.linkedin}"`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "people.csv"; a.click();
    toast.success(`Exported ${rows.length} people`);
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

      <div className="psp-tabs">
        <button className={`psp-tab ${tab === "total" ? "is-active" : ""}`} onClick={() => { setTab("total"); setPage(1); }}>Total ({MOCK_PEOPLE.length})</button>
        <button className={`psp-tab ${tab === "saved" ? "is-active" : ""}`} onClick={() => { setTab("saved"); setPage(1); }}>Saved ({MOCK_PEOPLE.filter((p) => p.in_crm).length})</button>
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
          <div className="psp-results-scroll">
            <table className="psp-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}><Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} /></th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Mobile</th>
                  <th>Location</th>
                  <th>Seniority</th>
                  <th>Links</th>
                  <th>Status</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => {
                  const rev = revealedMap[p.id] ?? {};
                  return (
                    <tr key={p.id} className={selected.has(p.id) ? "is-selected" : ""}>
                      <td><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></td>
                      <td>
                        <div className="psp-company-cell">
                          <div>
                            <div className="name" onClick={() => setDetail(p)}>{p.fullName}</div>
                            <div className="domain">{p.jobTitle}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="psp-company-cell">
                          <img src={p.companyLogo} alt="" />
                          <span style={{ fontSize: 12 }}>{p.companyName}</span>
                        </div>
                      </td>
                      <td>
                        {p.emailStatus === "unavailable"
                          ? <span className="psp-badge unavailable">N/A</span>
                          : (rev.email
                              ? <span style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 12 }}>{rev.email} <span className={`psp-badge ${p.emailStatus}`}>{p.emailStatus[0].toUpperCase()}</span></span>
                              : <RevealButton label="Reveal email" icon={<Mail size={11} />} value={null}
                                  onReveal={() => { const v = p.email!; setRevealedMap((m) => ({ ...m, [p.id]: { ...m[p.id], email: v } })); return v; }} />)
                        }
                      </td>
                      <td>
                        {!p.phoneAvailable ? "—" : rev.phone
                          ? <span style={{ fontSize: 12 }}>{rev.phone}</span>
                          : <RevealButton label="Reveal" icon={<Phone size={11} />} value={null}
                              onReveal={() => { const v = fakePhone(p.id); setRevealedMap((m) => ({ ...m, [p.id]: { ...m[p.id], phone: v } })); return v; }} />}
                      </td>
                      <td>
                        {!p.mobileAvailable ? "—" : rev.mobile
                          ? <span style={{ fontSize: 12 }}>{rev.mobile}</span>
                          : <RevealButton label="Reveal" icon={<Smartphone size={11} />} value={null}
                              onReveal={() => { const v = fakePhone(p.id + "m"); setRevealedMap((m) => ({ ...m, [p.id]: { ...m[p.id], mobile: v } })); return v; }} />}
                      </td>
                      <td>{p.countryFlag} {p.city}, {p.country}</td>
                      <td><span className="psp-tag">{p.seniority}</span></td>
                      <td><a className="psp-icon-link" href={p.linkedin} target="_blank" rel="noreferrer"><Linkedin size={14} /></a></td>
                      <td><span className={`psp-badge ${p.in_crm || savedIds.has(p.id) ? "in-crm" : "new"}`}>{p.in_crm || savedIds.has(p.id) ? "In CRM" : "New"}</span></td>
                      <td>
                        {p.in_crm
                          ? <button className="psp-btn ghost" onClick={() => setDetail(p)}>View</button>
                          : <button className="psp-btn" onClick={() => setSavePerson(p)}>Save</button>}
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={11} className="psp-empty">No people match your filters.</td></tr>
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
