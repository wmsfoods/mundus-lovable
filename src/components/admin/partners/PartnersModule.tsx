import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CountryFilterPopover } from "@/components/admin/CountryFilterPopover";
import { ScanCardButton } from "@/components/admin/ScanCardButton";
import { countryFlag } from "@/lib/countryFlags";
import { auditLog } from "@/lib/auditLog";

export const PARTNER_TYPES = [
  { value: "financial", label: "Financial", icon: "🏦", services: ["Trade Finance", "Letter of Credit", "Payment Processing", "FX Exchange", "Credit Insurance"] },
  { value: "logistics", label: "Logistics", icon: "🚛", services: ["Inland Transport", "Cold Chain", "Warehouse", "Distribution", "Last Mile"] },
  { value: "freight_forwarder", label: "Freight Forwarder", icon: "🚢", services: ["Ocean Freight", "Air Freight", "Multimodal", "Booking", "Documentation"] },
  { value: "insurance", label: "Insurance", icon: "🛡", services: ["Cargo Insurance", "Credit Insurance", "Marine Insurance", "Product Liability"] },
  { value: "customs_broker", label: "Customs Broker", icon: "📋", services: ["Import Clearance", "Export Clearance", "Duty Calculation", "Compliance"] },
  { value: "cold_storage", label: "Cold Storage", icon: "❄️", services: ["Frozen Storage", "Chilled Storage", "Blast Freezing", "Thawing"] },
  { value: "port_terminal", label: "Port Terminal", icon: "⚓", services: ["Container Handling", "Reefer Plugs", "Fumigation", "Inspection"] },
  { value: "inspection", label: "Inspection", icon: "🔍", services: ["Quality Inspection", "Loading Supervision", "Lab Testing", "Certification"] },
  { value: "legal", label: "Legal", icon: "⚖️", services: ["Trade Law", "Contracts", "Dispute Resolution", "Compliance"] },
  { value: "technology", label: "Technology", icon: "💻", services: ["ERP", "TMS", "Track & Trace", "Marketplace", "Analytics"] },
  { value: "other", label: "Other", icon: "📦", services: [] },
];

const REGIONS = [
  "Latin America", "North America", "Europe", "Middle East",
  "Asia Pacific", "Africa", "Oceania", "Central America", "Caribbean",
];

const TYPE_MAP = Object.fromEntries(PARTNER_TYPES.map(t => [t.value, t]));

type Contact = {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  mobile: string;
  job_title: string;
  linkedin: string;
  is_primary: boolean;
};

type Partner = {
  id: string;
  company_name: string;
  partner_type: string;
  country: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  postal_code: string | null;
  website: string | null;
  logo_url: string | null;
  notes: string | null;
  status: string;
  partnership_since: string | null;
  services_offered: string[];
  coverage_regions: string[];
  mundus_partner_contacts: Array<{
    id: string; partner_id: string; full_name: string; email: string | null;
    phone: string | null; mobile: string | null; job_title: string | null;
    linkedin: string | null; is_primary: boolean | null;
  }>;
};

export function PartnersModule() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);

  async function loadPartners() {
    setLoading(true);
    const { data, error } = await supabase
      .from("mundus_partners")
      .select("*, mundus_partner_contacts(*)")
      .order("company_name");
    if (error) toast.error(error.message);
    setPartners((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadPartners(); }, []);

  const countries = useMemo(() => {
    const map = new Map<string, number>();
    partners.forEach(p => { if (p.country) map.set(p.country, (map.get(p.country) ?? 0) + 1); });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [partners]);

  const filtered = useMemo(() => {
    let list = partners;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(p =>
        p.company_name?.toLowerCase().includes(s) ||
        p.mundus_partner_contacts?.some((c) =>
          c.full_name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s)
        )
      );
    }
    if (typeFilter !== "all") list = list.filter(p => p.partner_type === typeFilter);
    if (countryFilter.length > 0) list = list.filter(p => p.country && countryFilter.includes(p.country));
    return list;
  }, [partners, search, typeFilter, countryFilter]);

  const kpis = [
    { label: "Total Partners", value: partners.length, color: "#8B2252" },
    { label: "Financial", value: partners.filter(p => p.partner_type === "financial").length, color: "#2563EB" },
    { label: "Logistics", value: partners.filter(p => p.partner_type === "logistics" || p.partner_type === "freight_forwarder").length, color: "#059669" },
    { label: "Insurance", value: partners.filter(p => p.partner_type === "insurance").length, color: "#D97706" },
    { label: "Active", value: partners.filter(p => p.status === "active").length, color: "#10B981" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{ padding: "14px 16px", background: "white", borderRadius: 12, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", fontWeight: 600 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, marginTop: 4 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partner, contact..."
            style={{ width: "100%", padding: "7px 10px 7px 32px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13 }} />
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, background: "white" }}>
          <option value="all">All types</option>
          {PARTNER_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>

        <CountryFilterPopover countries={countries} selected={countryFilter} onChange={setCountryFilter} />

        <button onClick={() => setShowCreate(true)} style={{
          padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: "#8B2252", color: "white", border: "none", cursor: "pointer",
          marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6,
        }}><Plus size={14} /> Add Partner</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>Loading partners…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", background: "white", borderRadius: 12, border: "1px dashed #E5E7EB" }}>
          No partners found. {partners.length === 0 ? "Click \"Add Partner\" to create the first one." : "Try adjusting filters."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {filtered.map(partner => (
            <PartnerCard key={partner.id} partner={partner} onClick={() => setEditPartner(partner)} />
          ))}
        </div>
      )}

      {(showCreate || editPartner) && (
        <PartnerModal
          partner={editPartner}
          onClose={() => { setShowCreate(false); setEditPartner(null); }}
          onSaved={() => { loadPartners(); }}
        />
      )}
    </div>
  );
}

function PartnerCard({ partner, onClick }: { partner: Partner; onClick: () => void }) {
  const primaryContact = partner.mundus_partner_contacts?.find((c) => c.is_primary)
    || partner.mundus_partner_contacts?.[0];
  const contactCount = partner.mundus_partner_contacts?.length ?? 0;
  const meta = TYPE_MAP[partner.partner_type];

  return (
    <div onClick={onClick} style={{
      background: "white", borderRadius: 14, border: "1px solid #E5E7EB",
      padding: 20, cursor: "pointer", transition: "box-shadow 0.2s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: "#F3F4F6",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0, overflow: "hidden",
        }}>
          {partner.logo_url
            ? <img src={partner.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            : (meta?.icon ?? "🤝")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {partner.company_name}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{countryFlag(partner.country || "")} {partner.country || "—"}</span>
            {partner.city && <span>· {partner.city}</span>}
          </div>
        </div>
        <span style={{
          padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600,
          background: partner.status === "active" ? "#D1FAE5" : "#F3F4F6",
          color: partner.status === "active" ? "#065F46" : "#6B7280",
          textTransform: "capitalize",
        }}>{partner.status}</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <span style={{
          padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "#F5F3FF", color: "#7C3AED",
        }}>
          {meta?.icon} {meta?.label ?? partner.partner_type}
        </span>
      </div>

      {primaryContact && (
        <div style={{ padding: "10px 12px", background: "#F9FAFB", borderRadius: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{primaryContact.full_name}</div>
          {primaryContact.job_title && <div style={{ fontSize: 12, color: "#6B7280" }}>{primaryContact.job_title}</div>}
          {primaryContact.email && <div style={{ fontSize: 12, color: "#2563EB", marginTop: 2 }}>{primaryContact.email}</div>}
          {primaryContact.phone && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}>{primaryContact.phone}</div>}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#9CA3AF" }}>
        <span>{contactCount} contact{contactCount !== 1 ? "s" : ""}</span>
        {partner.partnership_since && <span>Since {new Date(partner.partnership_since).getFullYear()}</span>}
      </div>
    </div>
  );
}

function emptyContact(isPrimary = false): Contact {
  return { full_name: "", email: "", phone: "", mobile: "", job_title: "", linkedin: "", is_primary: isPrimary };
}

function PartnerModal({ partner, onClose, onSaved }: { partner: Partner | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!partner;
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState(partner?.company_name || "");
  const [partnerType, setPartnerType] = useState(partner?.partner_type || "logistics");
  const [country, setCountry] = useState(partner?.country || "");
  const [city, setCity] = useState(partner?.city || "");
  const [stateField, setStateField] = useState(partner?.state || "");
  const [address, setAddress] = useState(partner?.address || "");
  const [postalCode, setPostalCode] = useState(partner?.postal_code || "");
  const [website, setWebsite] = useState(partner?.website || "");
  const [notes, setNotes] = useState(partner?.notes || "");
  const [status, setStatus] = useState(partner?.status || "active");
  const [partnershipSince, setPartnershipSince] = useState(partner?.partnership_since || "");
  const [servicesOffered, setServicesOffered] = useState<string[]>(partner?.services_offered || []);
  const [coverageRegions, setCoverageRegions] = useState<string[]>(partner?.coverage_regions || []);

  const [contacts, setContacts] = useState<Contact[]>(
    partner?.mundus_partner_contacts?.length
      ? partner.mundus_partner_contacts.map((c) => ({
          id: c.id, full_name: c.full_name, email: c.email || "",
          phone: c.phone || "", mobile: c.mobile || "",
          job_title: c.job_title || "", linkedin: c.linkedin || "",
          is_primary: !!c.is_primary,
        }))
      : [emptyContact(true)]
  );

  const typeMeta = TYPE_MAP[partnerType];
  const suggestedServices = typeMeta?.services ?? [];

  function toggleArr(arr: string[], val: string, setter: (v: string[]) => void) {
    if (arr.includes(val)) setter(arr.filter(x => x !== val));
    else setter([...arr, val]);
  }

  function updateContact(i: number, patch: Partial<Contact>) {
    setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function removeContact(i: number) {
    setContacts(prev => prev.filter((_, idx) => idx !== i));
  }

  function setPrimary(i: number) {
    setContacts(prev => prev.map((c, idx) => ({ ...c, is_primary: idx === i })));
  }

  async function handleSave() {
    if (!companyName.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      const partnerData = {
        company_name: companyName.trim(),
        partner_type: partnerType,
        country: country || null,
        city: city || null,
        state: stateField || null,
        address: address || null,
        postal_code: postalCode || null,
        website: website || null,
        notes: notes || null,
        status,
        partnership_since: partnershipSince || null,
        services_offered: servicesOffered,
        coverage_regions: coverageRegions,
      };

      let partnerId: string;
      if (isEdit && partner) {
        const { error } = await supabase.from("mundus_partners").update(partnerData).eq("id", partner.id);
        if (error) throw error;
        partnerId = partner.id;
      } else {
        const { data, error } = await supabase.from("mundus_partners").insert(partnerData).select("id").single();
        if (error) throw error;
        partnerId = data!.id;
      }

      if (isEdit) {
        const keptIds = contacts.map(c => c.id).filter(Boolean) as string[];
        let del = supabase.from("mundus_partner_contacts").delete().eq("partner_id", partnerId);
        if (keptIds.length > 0) del = del.not("id", "in", `(${keptIds.join(",")})`);
        await del;
      }

      const validContacts = contacts.filter(c => c.full_name.trim());
      for (const c of validContacts) {
        const contactData = {
          partner_id: partnerId,
          full_name: c.full_name.trim(),
          email: c.email || null,
          phone: c.phone || null,
          mobile: c.mobile || null,
          job_title: c.job_title || null,
          linkedin: c.linkedin || null,
          is_primary: c.is_primary,
        };
        if (c.id) {
          await supabase.from("mundus_partner_contacts").update(contactData).eq("id", c.id);
        } else {
          await supabase.from("mundus_partner_contacts").insert(contactData);
        }
      }

      toast.success(isEdit ? "Partner updated" : "Partner created");
      auditLog({
        action: isEdit ? "partner.updated" : "partner.created",
        category: "company",
        entityType: "mundus_partner",
        entityId: partnerId,
        entityLabel: companyName,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save partner");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!partner) return;
    if (!confirm(`Delete partner "${partner.company_name}"? This will remove all contacts. This cannot be undone.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("mundus_partners").delete().eq("id", partner.id);
      if (error) throw error;
      toast.success("Partner deleted");
      auditLog({
        action: "partner.deleted",
        category: "company",
        entityType: "mundus_partner",
        entityId: partner.id,
        entityLabel: partner.company_name,
        severity: "warn",
      });
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, background: "white" };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "white", borderRadius: 16, padding: 24, maxWidth: 720, width: "100%",
        position: "relative", marginTop: 20, marginBottom: 40,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            🤝 {isEdit ? "Edit Partner" : "Add Partner"}
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <ScanCardButton onScanned={(data) => {
          if (data.company) setCompanyName(data.company);
          if (data.country) setCountry(data.country);
          if (data.city) setCity(data.city);
          if (data.website) setWebsite(data.website);
          if (data.fullName) {
            setContacts(prev => {
              const next = prev.length ? [...prev] : [emptyContact(true)];
              next[0] = {
                ...next[0],
                full_name: data.fullName || next[0].full_name,
                email: data.email || next[0].email,
                phone: data.phone || next[0].phone,
                mobile: data.mobile || next[0].mobile,
                job_title: data.jobTitle || next[0].job_title,
                linkedin: data.linkedin || next[0].linkedin,
              };
              return next;
            });
          }
        }} />

        <Section title="Company">
          <Row>
            <Field label="Company Name *" style={{ flex: 2 }}>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Partner Type *" style={{ flex: 1, minWidth: 180 }}>
              <select value={partnerType} onChange={(e) => setPartnerType(e.target.value)} style={inputStyle}>
                {PARTNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle} /></Field>
            <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} /></Field>
            <Field label="State / Region"><input value={stateField} onChange={(e) => setStateField(e.target.value)} style={inputStyle} /></Field>
          </Row>
          <Row>
            <Field label="Address" style={{ flex: 2 }}>
              <input value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Postal Code"><input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={inputStyle} /></Field>
          </Row>
          <Row>
            <Field label="Website" style={{ flex: 2 }}>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" style={inputStyle} />
            </Field>
            <Field label="Partnership Since">
              <input type="date" value={partnershipSince} onChange={(e) => setPartnershipSince(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </Row>

          {suggestedServices.length > 0 && (
            <Field label="Services Offered">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {suggestedServices.map(s => (
                  <Pill key={s} active={servicesOffered.includes(s)} onClick={() => toggleArr(servicesOffered, s, setServicesOffered)}>{s}</Pill>
                ))}
                {servicesOffered.filter(s => !suggestedServices.includes(s)).map(s => (
                  <Pill key={s} active onClick={() => toggleArr(servicesOffered, s, setServicesOffered)}>{s}</Pill>
                ))}
              </div>
            </Field>
          )}

          <Field label="Coverage Regions">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REGIONS.map(r => (
                <Pill key={r} active={coverageRegions.includes(r)} onClick={() => toggleArr(coverageRegions, r, setCoverageRegions)}>{r}</Pill>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Contacts">
          {contacts.map((c, i) => (
            <div key={i} style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: 12, marginBottom: 10, background: c.is_primary ? "#FDF2F8" : "#F9FAFB" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                  <input type="radio" checked={c.is_primary} onChange={() => setPrimary(i)} />
                  Primary contact
                </label>
                {contacts.length > 1 && (
                  <button type="button" onClick={() => removeContact(i)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <Row>
                <Field label="Full Name *" style={{ flex: 2 }}>
                  <input value={c.full_name} onChange={(e) => updateContact(i, { full_name: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="Job Title"><input value={c.job_title} onChange={(e) => updateContact(i, { job_title: e.target.value })} style={inputStyle} /></Field>
              </Row>
              <Row>
                <Field label="Email"><input value={c.email} onChange={(e) => updateContact(i, { email: e.target.value })} style={inputStyle} /></Field>
                <Field label="Phone"><input value={c.phone} onChange={(e) => updateContact(i, { phone: e.target.value })} style={inputStyle} /></Field>
                <Field label="Mobile"><input value={c.mobile} onChange={(e) => updateContact(i, { mobile: e.target.value })} style={inputStyle} /></Field>
              </Row>
              <Field label="LinkedIn">
                <input value={c.linkedin} onChange={(e) => updateContact(i, { linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." style={inputStyle} />
              </Field>
            </div>
          ))}
          <button type="button" onClick={() => setContacts(prev => [...prev, emptyContact(prev.length === 0)])}
            style={{ padding: "6px 12px", border: "1px dashed #9CA3AF", borderRadius: 8, background: "white", fontSize: 12, cursor: "pointer", color: "#374151" }}>
            + Add contact
          </button>
        </Section>

        <Section title="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
        </Section>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <div>
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={saving}
                style={{ padding: "8px 14px", borderRadius: 8, background: "white", color: "#DC2626", border: "1px solid #FECACA", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Trash2 size={14} /> Delete Partner
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ padding: "8px 16px", borderRadius: 8, background: "white", color: "#374151", border: "1px solid #D1D5DB", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ padding: "8px 16px", borderRadius: 8, background: "#8B2252", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
              💾 {saving ? "Saving…" : "Save Partner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #E5E7EB" }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>{children}</div>;
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ flex: 1, minWidth: 140, ...style }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
      border: active ? "1px solid #8B2252" : "1px solid #D1D5DB",
      background: active ? "#FDF2F8" : "white",
      color: active ? "#8B2252" : "#374151",
    }}>{children}</button>
  );
}