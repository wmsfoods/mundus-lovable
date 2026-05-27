import { useEffect, useMemo, useState } from "react";
import { X, ChevronDown, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MockPerson, MockCompany } from "@/data/mockProspect";
import { AddressAutocomplete } from "@/components/mundus/AddressAutocomplete";

const DEPARTMENTS = ["Operations","Purchasing","Sales","Marketing","Logistics","Finance","Executive","Other"];
const SENIORITIES = ["C-Level","VP","Director","Manager","Senior","Staff","Entry"];
const DECISION_LEVELS = ["Decision Maker","Influencer","Gatekeeper","User","Champion"];
const LEAD_TYPES = ["Buyer","Supplier","Both","Prospect"];
const LEAD_STATUSES = ["New","Contacted","Qualified","Nurturing","Opportunity","Customer"];
const BUYER_TYPES = ["Importer","Retailer","Distributor","Restaurant Chain","Foodservice","Wholesaler"];
const LANGUAGES = ["English","Portuguese","Spanish","Chinese","Arabic","French"];
const PRODUCTS = ["Beef","Pork","Poultry","Lamb","Halal","Organic"];
const COMPANY_CATEGORIES = ["Processor","Trader","Retailer","Foodservice","Distributor","Wholesaler","Importer","Exporter"];
const COMPANY_TYPES = ["Buyer","Supplier","Both","Prospect","Competitor","Partner"];
const MARKET_REGIONS = ["Asia","LATAM","Middle East","Europe","Africa","North America","Oceania"];
const PRODUCT_CATEGORIES = ["Beef","Pork","Poultry","Lamb"];

type AddContact = { full_name: string; role: string; email: string; secondary_email: string; phone: string; mobile: string; linkedin: string };

type Props = {
  open: boolean;
  onClose: () => void;
  person?: MockPerson | null;
  company?: MockCompany | null;
  /** When the underlying record gets saved */
  onSaved?: (id: string) => void;
};

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="psp-scrm-section">
      <button type="button" className="psp-scrm-section-head" onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 120ms" }} />
      </button>
      {open && <div className="psp-scrm-section-body">{children}</div>}
    </div>
  );
}

function Field({ label, required, auto, children }: { label: string; required?: boolean; auto?: boolean; children: React.ReactNode }) {
  return (
    <label className="psp-scrm-field">
      <span className="psp-scrm-label">
        {label}{required && <span style={{ color: "var(--adm-danger)" }}>*</span>}
        {auto && <span className="psp-scrm-auto"><Sparkles size={9} /> auto</span>}
      </span>
      {children}
    </label>
  );
}

export function SaveToCrmModal({ open, onClose, person, company, onSaved }: Props) {
  const src = person ?? null;
  const srcCompany = company ?? null;

  // Contact
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [wechat, setWechat] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [personalLinkedin, setPersonalLinkedin] = useState("");

  // Pro
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [seniority, setSeniority] = useState("");
  const [decisionLevel, setDecisionLevel] = useState("");
  const [role, setRole] = useState("");

  // Lead
  const [leadType, setLeadType] = useState("Buyer");
  const [leadStatus, setLeadStatus] = useState("New");
  const [productsOfInterest, setProductsOfInterest] = useState<string[]>([]);
  const [buyerType, setBuyerType] = useState("");
  const [language, setLanguage] = useState("English");

  // Location
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [timezone, setTimezone] = useState("");

  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Company
  const [coName, setCoName] = useState("");
  const [coDomain, setCoDomain] = useState("");
  const [coIndustry, setCoIndustry] = useState("");
  const [coCategory, setCoCategory] = useState("");
  const [coType, setCoType] = useState("Prospect");
  const [coStreet, setCoStreet] = useState("");
  const [coCity, setCoCity] = useState("");
  const [coState, setCoState] = useState("");
  const [coZip, setCoZip] = useState("");
  const [coCountry, setCoCountry] = useState("");
  const [coPhone, setCoPhone] = useState("");
  const [coLinkedin, setCoLinkedin] = useState("");
  const [coWebsite, setCoWebsite] = useState("");
  const [coTaxId, setCoTaxId] = useState("");
  const [coEmployees, setCoEmployees] = useState<number | "">("");
  const [coRevenue, setCoRevenue] = useState<number | "">("");
  const [coFounded, setCoFounded] = useState<number | "">("");
  const [coMarketRegion, setCoMarketRegion] = useState("");
  const [coProductCats, setCoProductCats] = useState<string[]>([]);
  const [coIsPublic, setCoIsPublic] = useState(false);

  const [additional, setAdditional] = useState<AddContact[]>([]);

  const [saving, setSaving] = useState(false);
  const [dupWarn, setDupWarn] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Prefill on open
  useEffect(() => {
    if (!open) return;
    const co = srcCompany ?? null;
    if (src) {
      setFullName(src.fullName || "");
      setEmail(src.email || "");
      setSecondaryEmail(src.secondaryEmail || "");
      setPhone(src.phone || "");
      setMobile(src.mobile || "");
      setLinkedin(src.linkedin || "");
      setPersonalLinkedin(src.personalLinkedin || "");
      setJobTitle(src.jobTitle || "");
      setDepartment(src.department || "");
      setSeniority(src.seniority || "");
      setCountry(src.country || "");
      setCity(src.city || "");
      setState(src.state || "");
      setProductsOfInterest(src.productsOfInterest ?? []);
      setWhatsapp(src.whatsapp ?? "");
      setPhotoUrl(src.photoUrl ?? null);
    } else {
      setFullName(""); setEmail(""); setSecondaryEmail(""); setPhone(""); setMobile("");
      setLinkedin(""); setPersonalLinkedin("");
      setJobTitle(""); setDepartment(""); setSeniority(""); setProductsOfInterest([]);
      setWhatsapp(""); setPhotoUrl(null); setState("");
    }
    if (co) {
      setCoName(co.name); setCoDomain(co.domain); setCoIndustry(co.industry);
      setCoCity(co.city); setCoCountry(co.country); setCoLinkedin(co.linkedin);
      setCoWebsite(co.website); setCoEmployees(co.employees); setCoRevenue(co.revenue);
      setCoFounded(co.founded);
    } else if (src) {
      setCoName(src.companyName); setCoCity(src.city); setCoCountry(src.country);
    } else {
      setCoName(""); setCoDomain(""); setCoIndustry("");
    }
    setDupWarn(null);
    setAdditional([]);
    setNotes(""); setTags([]); setTagInput("");
  }, [open, src, srcCompany]);

  // Dedup check (debounced-ish)
  useEffect(() => {
    if (!open || (!email && !coDomain)) { setDupWarn(null); return; }
    let cancelled = false;
    (async () => {
      if (email) {
        const r = await supabase.from("crm_contacts").select("id").eq("email", email.toLowerCase()).limit(1);
        if (!cancelled && r.data && r.data.length) {
          setDupWarn(`Contact with email ${email} already exists in your CRM.`);
        }
      }
      if (coDomain) {
        const r = await supabase.from("crm_companies").select("id").eq("domain", coDomain.toLowerCase()).limit(1);
        if (!cancelled && r.data && r.data.length) {
          setDupWarn((p) => p ?? `Company with domain ${coDomain} already exists.`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [open, email, coDomain]);

  // Buyer Type only applies to Buyer / Both leads. Clear it whenever the lead
  // type moves away from Buyer (e.g. Supplier, Prospect) so we don't persist
  // a stale value.
  useEffect(() => {
    if (leadType !== "Buyer" && leadType !== "Both") setBuyerType("");
  }, [leadType]);
  const buyerTypeDisabled = leadType !== "Buyer" && leadType !== "Both";

  const toggleIn = <T extends string>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const addAdditional = () =>
    setAdditional((a) => [...a, { full_name: "", role: "", email: "", secondary_email: "", phone: "", mobile: "", linkedin: "" }]);
  const removeAdditional = (i: number) => setAdditional((a) => a.filter((_, idx) => idx !== i));
  const patchAdditional = (i: number, patch: Partial<AddContact>) =>
    setAdditional((a) => a.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const handleSave = async () => {
    if (!fullName.trim() && !coName.trim()) {
      toast.error("Please fill at least the contact full name or company name.");
      return;
    }
    setSaving(true);
    try {
      let companyId: string | null = null;
      if (coName.trim()) {
        const { data: coRow, error: coErr } = await supabase.from("crm_companies").insert({
          name: coName.trim(),
          domain: coDomain || null,
          website: coWebsite || null,
          industry: coIndustry || null,
          company_category: coCategory || null,
          company_type: coType.toLowerCase(),
          country: coCountry || null,
          state: coState || null,
          city: coCity || null,
          address: coStreet || null,
          postal_code: coZip || null,
          phone: coPhone || null,
          linkedin_url: coLinkedin || null,
          tax_id: coTaxId || null,
          estimated_employees: coEmployees === "" ? null : Number(coEmployees),
          annual_revenue: coRevenue === "" ? null : Number(coRevenue),
          founded_year: coFounded === "" ? null : Number(coFounded),
          market_region: coMarketRegion || null,
          product_categories: coProductCats,
          is_public: coIsPublic,
          source: "apollo",
          stage: "cold",
        }).select("id").single();
        if (coErr) throw coErr;
        companyId = coRow.id;
      }

      if (fullName.trim()) {
        const { error: ctErr } = await supabase.from("crm_contacts").insert({
          full_name: fullName.trim(),
          first_name: fullName.trim().split(/\s+/)[0] || null,
          last_name: fullName.trim().split(/\s+/).slice(1).join(" ") || null,
          photo_url: photoUrl || null,
          email: email || null,
          secondary_email: secondaryEmail || null,
          phone: phone || null,
          mobile: mobile || null,
          whatsapp: whatsapp || null,
          wechat: wechat || null,
          linkedin: linkedin || null,
          personal_linkedin: personalLinkedin || null,
          job_title: jobTitle || null,
          department: department || null,
          seniority: seniority ? seniority.toLowerCase().replace(/[- ]/g, "_") : null,
          decision_level: decisionLevel || null,
          role: role || null,
          lead_status: leadStatus.toLowerCase().replace(/\s/g, "_"),
          lead_source: "Mundus Prospect Search",
          buyer_type: buyerType || null,
          preferred_language: language.slice(0, 2).toLowerCase(),
          products_of_interest: productsOfInterest,
          country: country || null,
          city: city || null,
          state: state || null,
          timezone: timezone || null,
          company_id: companyId,
          notes: notes || null,
          tags,
          source: "apollo_search",
        });
        if (ctErr) throw ctErr;
      }

      // Additional contacts
      if (additional.length && companyId) {
        const rows = additional
          .filter((a) => a.full_name.trim())
          .map((a) => ({
            full_name: a.full_name.trim(),
            role: a.role || null,
            email: a.email || null,
            secondary_email: a.secondary_email || null,
            phone: a.phone || null,
            mobile: a.mobile || null,
            linkedin: a.linkedin || null,
            company_id: companyId,
            source: "apollo_search",
          }));
        if (rows.length) await supabase.from("crm_contacts").insert(rows);
      }

      // Activity log
      if (companyId) {
        await supabase.from("crm_activities").insert({
          activity_type: "imported",
          company_id: companyId,
          subject: "Imported from Mundus Prospect",
          description: src ? `Imported person ${fullName} from prospect search` : `Imported company ${coName}`,
        });
      }

      toast.success("Saved to CRM");
      onSaved?.(companyId ?? "ok");
      onClose();
    } catch (e: any) {
      const msg = e?.message || e?.details || e?.hint || (typeof e === "string" ? e : JSON.stringify(e));
      console.error("Save to CRM failed", e);
      toast.error(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="psp-drawer-backdrop" onClick={onClose} />
      <div className="psp-scrm-modal" role="dialog" aria-modal="true">
        <div className="psp-scrm-head">
          <div>
            <div className="psp-scrm-title">Save to CRM</div>
            <div className="psp-scrm-sub">{src ? src.fullName : coName || "New record"}{src ? ` · ${src.companyName}` : ""}</div>
            {photoUrl && (
              <img src={photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginTop: 6 }} />
            )}
          </div>
          <button className="psp-drawer-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {dupWarn && <div className="psp-scrm-warn">{dupWarn}</div>}

        <div className="psp-scrm-body">
          <Section title="Contact Info">
            <div className="psp-scrm-grid">
              <Field label="Full Name" required auto={!!src?.fullName}><input className="psp-input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
              <Field label="Email" required auto={!!src?.email}><input className="psp-input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="Additional Email" auto={!!src?.secondaryEmail}><input className="psp-input" value={secondaryEmail} onChange={(e) => setSecondaryEmail(e.target.value)} /></Field>
              <Field label="Phone" auto={!!src?.phone}><input className="psp-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label="Mobile" auto={!!src?.mobile}><input className="psp-input" value={mobile} onChange={(e) => setMobile(e.target.value)} /></Field>
              <Field label="WhatsApp"><input className="psp-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></Field>
              <Field label="WeChat"><input className="psp-input" value={wechat} onChange={(e) => setWechat(e.target.value)} /></Field>
              <Field label="LinkedIn (Work)" auto={!!src?.linkedin}><input className="psp-input" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} /></Field>
              <Field label="Personal LinkedIn" auto={!!src?.personalLinkedin}><input className="psp-input" value={personalLinkedin} onChange={(e) => setPersonalLinkedin(e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Professional">
            <div className="psp-scrm-grid">
              <Field label="Job Title" auto={!!src?.jobTitle}><input className="psp-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></Field>
              <Field label="Department"><select className="psp-input" value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">—</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Seniority"><select className="psp-input" value={seniority} onChange={(e) => setSeniority(e.target.value)}><option value="">—</option>{SENIORITIES.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Decision Level"><select className="psp-input" value={decisionLevel} onChange={(e) => setDecisionLevel(e.target.value)}><option value="">—</option>{DECISION_LEVELS.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Role"><input className="psp-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Purchaser, Export Manager" /></Field>
            </div>
          </Section>

          <Section title="Lead Info">
            <div className="psp-scrm-grid">
              <Field label="Lead Type" required><select className="psp-input" value={leadType} onChange={(e) => setLeadType(e.target.value)}>{LEAD_TYPES.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Lead Status"><select className="psp-input" value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)}>{LEAD_STATUSES.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Lead Source" auto><input className="psp-input" value="Mundus Prospect Search" disabled /></Field>
              <Field label="Buyer Type">
                <select
                  className="psp-input"
                  value={buyerType}
                  disabled={buyerTypeDisabled}
                  onChange={(e) => setBuyerType(e.target.value)}
                  title={buyerTypeDisabled ? "Only available for Buyer lead types" : undefined}
                >
                  <option value="">{buyerTypeDisabled ? "N/A" : "—"}</option>
                  {BUYER_TYPES.map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Preferred Language"><select className="psp-input" value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGES.map((d) => <option key={d}>{d}</option>)}</select></Field>
            </div>
            <Field label="Products of Interest">
              <div className="psp-chip-row">
                {PRODUCTS.map((p) => (
                  <span key={p} className={`psp-chip ${productsOfInterest.includes(p) ? "is-active" : ""}`} onClick={() => toggleIn(productsOfInterest, p, setProductsOfInterest)}>{p}</span>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Location" defaultOpen={false}>
            <div className="psp-scrm-grid">
              <Field label="Country" auto={!!src?.country}><input className="psp-input" value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
              <Field label="City" auto={!!src?.city}><input className="psp-input" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
              <Field label="State" auto={!!src?.state}><input className="psp-input" value={state} onChange={(e) => setState(e.target.value)} /></Field>
              <Field label="Timezone"><input className="psp-input" value={timezone} onChange={(e) => setTimezone(e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Notes & Tags" defaultOpen={false}>
            <Field label="Notes"><textarea className="psp-input" style={{ height: 70, padding: 8 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <Field label="Tags">
              <input className="psp-input" placeholder="Add tag + Enter" value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { setTags([...tags, tagInput.trim()]); setTagInput(""); e.preventDefault(); } }} />
              <div className="psp-chip-row" style={{ marginTop: 6 }}>
                {tags.map((t) => (
                  <span key={t} className="psp-chip is-active" onClick={() => setTags(tags.filter((x) => x !== t))}>{t} ×</span>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Company" defaultOpen={false}>
            <div className="psp-scrm-grid">
              <Field label="Company Name" required auto={!!srcCompany?.name || !!src?.companyName}><input className="psp-input" value={coName} onChange={(e) => setCoName(e.target.value)} /></Field>
              <Field label="Domain / Website" auto={!!srcCompany?.domain}><input className="psp-input" value={coDomain} onChange={(e) => setCoDomain(e.target.value)} /></Field>
              <Field label="Industry" auto={!!srcCompany?.industry}><input className="psp-input" value={coIndustry} onChange={(e) => setCoIndustry(e.target.value)} /></Field>
              <Field label="Company Category"><select className="psp-input" value={coCategory} onChange={(e) => setCoCategory(e.target.value)}><option value="">—</option>{COMPANY_CATEGORIES.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Company Type"><select className="psp-input" value={coType} onChange={(e) => setCoType(e.target.value)}>{COMPANY_TYPES.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Street Address">
                <AddressAutocomplete
                  className="psp-input"
                  value={coStreet}
                  onChange={setCoStreet}
                  onAddressSelect={(addr) => {
                    setCoStreet(addr.street || addr.formatted);
                    if (addr.city) setCoCity(addr.city);
                    if (addr.state) setCoState(addr.state);
                    if (addr.zip) setCoZip(addr.zip);
                    if (addr.country) setCoCountry(addr.country);
                  }}
                />
              </Field>
              <Field label="City" auto={!!srcCompany?.city}><input className="psp-input" value={coCity} onChange={(e) => setCoCity(e.target.value)} /></Field>
              <Field label="State"><input className="psp-input" value={coState} onChange={(e) => setCoState(e.target.value)} /></Field>
              <Field label="Zip Code"><input className="psp-input" value={coZip} onChange={(e) => setCoZip(e.target.value)} /></Field>
              <Field label="Country" auto={!!srcCompany?.country}><input className="psp-input" value={coCountry} onChange={(e) => setCoCountry(e.target.value)} /></Field>
              <Field label="Phone (HQ)"><input className="psp-input" value={coPhone} onChange={(e) => setCoPhone(e.target.value)} /></Field>
              <Field label="Company LinkedIn" auto={!!srcCompany?.linkedin}><input className="psp-input" value={coLinkedin} onChange={(e) => setCoLinkedin(e.target.value)} /></Field>
              <Field label="Website" auto={!!srcCompany?.website}><input className="psp-input" value={coWebsite} onChange={(e) => setCoWebsite(e.target.value)} /></Field>
              <Field label="Tax ID"><input className="psp-input" value={coTaxId} onChange={(e) => setCoTaxId(e.target.value)} /></Field>
              <Field label="Employees" auto={!!srcCompany?.employees}><input className="psp-input" type="number" value={coEmployees} onChange={(e) => setCoEmployees(e.target.value ? +e.target.value : "")} /></Field>
              <Field label="Revenue (USD)" auto={!!srcCompany?.revenue}><input className="psp-input" type="number" value={coRevenue} onChange={(e) => setCoRevenue(e.target.value ? +e.target.value : "")} /></Field>
              <Field label="Founded Year" auto={!!srcCompany?.founded}><input className="psp-input" type="number" value={coFounded} onChange={(e) => setCoFounded(e.target.value ? +e.target.value : "")} /></Field>
              <Field label="Market Region"><select className="psp-input" value={coMarketRegion} onChange={(e) => setCoMarketRegion(e.target.value)}><option value="">—</option>{MARKET_REGIONS.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Public Company"><label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}><input type="checkbox" checked={coIsPublic} onChange={(e) => setCoIsPublic(e.target.checked)} /> Publicly traded</label></Field>
            </div>
            <Field label="Product Categories">
              <div className="psp-chip-row">
                {PRODUCT_CATEGORIES.map((p) => (
                  <span key={p} className={`psp-chip ${coProductCats.includes(p) ? "is-active" : ""}`} onClick={() => toggleIn(coProductCats, p, setCoProductCats)}>{p}</span>
                ))}
              </div>
            </Field>
          </Section>

          <Section title={`Additional Contacts (${additional.length})`} defaultOpen={false}>
            <div className="psp-scrm-addtl">
              {additional.map((a, i) => (
                <div className="psp-scrm-addtl-row" key={i}>
                  <input className="psp-input" placeholder="Name" value={a.full_name} onChange={(e) => patchAdditional(i, { full_name: e.target.value })} />
                  <input className="psp-input" placeholder="Role" value={a.role} onChange={(e) => patchAdditional(i, { role: e.target.value })} />
                  <input className="psp-input" placeholder="Email" value={a.email} onChange={(e) => patchAdditional(i, { email: e.target.value })} />
                  <input className="psp-input" placeholder="Addt'l Email" value={a.secondary_email} onChange={(e) => patchAdditional(i, { secondary_email: e.target.value })} />
                  <input className="psp-input" placeholder="Phone" value={a.phone} onChange={(e) => patchAdditional(i, { phone: e.target.value })} />
                  <input className="psp-input" placeholder="Mobile" value={a.mobile} onChange={(e) => patchAdditional(i, { mobile: e.target.value })} />
                  <input className="psp-input" placeholder="LinkedIn" value={a.linkedin} onChange={(e) => patchAdditional(i, { linkedin: e.target.value })} />
                  <button type="button" className="psp-btn ghost" onClick={() => removeAdditional(i)} aria-label="Remove"><Trash2 size={12} /></button>
                </div>
              ))}
              <button type="button" className="psp-btn" onClick={addAdditional}><Plus size={12} /> Add Contact</button>
            </div>
          </Section>
        </div>

        <div className="psp-scrm-foot">
          <button className="psp-btn ghost" onClick={onClose}>Cancel</button>
          <button className="psp-btn solid" disabled={saving} onClick={handleSave}>{saving ? "Saving…" : "Save to CRM"}</button>
        </div>
      </div>
    </>
  );
}
