import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircleIcon, UploadCloudIcon, FileTextIcon, PhoneIcon,
  MessageIcon, FlagSVG,
} from "@/components/icons";
import { Plus, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useCompanyProfile,
  type CompanyAbout, type CompanyPlant, type CompanyCertification,
  type CompanyTeamMember, type CompanyPreferences, type CompanyDocument,
} from "@/hooks/useCompanyProfile";

type Props = { companyId: string; canEdit: boolean };

const SPECIES = ["Beef", "Pork", "Poultry", "Lamb"];
const DOC_TYPES = ["Brochure", "Video", "Manual", "SOP", "Insurance", "Certificate", "Other"];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "—";
}
function fmtDate(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit" }).format(new Date(iso)); }
  catch { return iso; }
}
function fmtSize(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function csv(v: string[] | null | undefined) { return (v ?? []).join(", "); }
function csvParse(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

/* ========================================================== Inline primitives */

type SaveFn<T> = (value: T) => Promise<void> | void;

function InlineText({
  value, onSave, placeholder, canEdit, type = "text", className,
}: {
  value: string | number | null | undefined;
  onSave: SaveFn<string>;
  placeholder?: string;
  canEdit: boolean;
  type?: "text" | "email" | "url" | "number" | "date";
  className?: string;
}) {
  const initial = value == null ? "" : String(value);
  const [v, setV] = useState(initial);
  useEffect(() => { setV(initial); }, [initial]);

  if (!canEdit) {
    return <span className={className}>{initial || <span style={{ color: "#9ca3af" }}>—</span>}</span>;
  }

  return (
    <input
      type={type}
      className={`cp-inline ${className ?? ""}`}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== initial) onSave(v); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setV(initial); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}

function InlineTextarea({
  value, onSave, placeholder, canEdit, rows = 3,
}: {
  value: string | null | undefined;
  onSave: SaveFn<string>;
  placeholder?: string;
  canEdit: boolean;
  rows?: number;
}) {
  const initial = value ?? "";
  const [v, setV] = useState(initial);
  useEffect(() => { setV(initial); }, [initial]);

  if (!canEdit) {
    return <p className="cp-description">{initial || <span style={{ color: "#9ca3af" }}>{placeholder}</span>}</p>;
  }
  return (
    <textarea
      rows={rows}
      className="cp-inline cp-inline-area"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== initial) onSave(v); }}
    />
  );
}

function InlineSelect({
  value, options, onSave, canEdit,
}: { value: string | null | undefined; options: string[]; onSave: SaveFn<string>; canEdit: boolean }) {
  if (!canEdit) return <span>{value || "—"}</span>;
  return (
    <select
      className="cp-inline"
      value={value ?? ""}
      onChange={(e) => onSave(e.target.value)}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function InlineCheckbox({
  checked, onSave, label, canEdit,
}: { checked: boolean; onSave: SaveFn<boolean>; label: string; canEdit: boolean }) {
  if (!canEdit) return checked ? <span style={{ fontSize: 12, color: "#16a34a" }}>★ {label}</span> : null;
  return (
    <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onSave(e.target.checked)} style={{ accentColor: "#8B2252" }} />
      {label}
    </label>
  );
}

/* ========================================================== Main */

export default function CompanyProfileSections({ companyId, canEdit }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const profile = useCompanyProfile(companyId);
  const { data, loading } = profile;

  if (loading && !data.about && data.plants.length === 0) {
    return <div className="cp-card" style={{ padding: 16 }}>{t("common.loading", "Loading…")}</div>;
  }

  return (
    <div className="cp-page" style={{ padding: 0 }}>
      <AboutSection data={data.about} profile={profile} canEdit={canEdit} />
      <PlantsSection data={data.plants} profile={profile} canEdit={canEdit} />
      <PreferencesSection data={data.preferences} profile={profile} canEdit={canEdit} />
      <CertificationsSection data={data.certifications} profile={profile} canEdit={canEdit} locale={locale} />
      <DocumentsSection data={data.documents} profile={profile} canEdit={canEdit} locale={locale} />
      <TeamSection data={data.team} profile={profile} canEdit={canEdit} />
    </div>
  );
}

/* ========================================================== ABOUT */
function AboutSection({ data, profile, canEdit }: { data: CompanyAbout | null; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean }) {
  const { t } = useTranslation();
  const save = async (patch: Partial<CompanyAbout>) => {
    const r = await profile.saveAbout({ ...(data ?? {}), ...patch });
    if (!r.ok) toast.error(r.error);
  };
  return (
    <section className="cp-card">
      <header className="cp-section-head"><h2>{t("supplier.company.about.title", "About")}</h2></header>
      <div className="cp-about-grid">
        <div>
          <InlineTextarea
            value={data?.description}
            canEdit={canEdit}
            placeholder={t("supplier.company.about.empty", "No description yet.")}
            onSave={(v) => save({ description: v })}
          />
          <FieldRow label={t("supplier.company.about.tradeName", "Trade name")}>
            <InlineText canEdit={canEdit} value={data?.trade_name} onSave={(v) => save({ trade_name: v })} />
          </FieldRow>
          <FieldRow label={t("supplier.company.about.tradeMarkets", "Trade markets")}>
            <InlineText canEdit={canEdit} value={csv(data?.trade_markets)} placeholder="MERCOSUR, EU…" onSave={(v) => save({ trade_markets: csvParse(v) })} />
          </FieldRow>
          <FieldRow label={t("supplier.company.about.mainSpecies", "Main PROTEINS")}>
            {canEdit ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SPECIES.map((s) => {
                  const on = (data?.main_species ?? []).includes(s);
                  return (
                    <button
                      key={s} type="button"
                      className={`cp-chip-btn ${on ? "is-on" : ""}`}
                      onClick={() => {
                        const cur = data?.main_species ?? [];
                        save({ main_species: on ? cur.filter((x) => x !== s) : [...cur, s] });
                      }}
                    >{s}</button>
                  );
                })}
              </div>
            ) : (
              <span className="cp-chips">
                {(data?.main_species ?? []).length > 0
                  ? data!.main_species.map((s) => <span key={s} className="cp-chip">{s}</span>)
                  : "—"}
              </span>
            )}
          </FieldRow>
        </div>
        <div className="cp-stat-grid">
          <StatInline label={t("supplier.company.about.yearsExporting", "Years exporting")} value={data?.years_exporting} canEdit={canEdit} onSave={(n) => save({ years_exporting: n })} />
          <StatInline label={t("supplier.company.about.fclsDelivered", "FCLs delivered")} value={data?.fcls_delivered} canEdit={canEdit} onSave={(n) => save({ fcls_delivered: n })} />
          <StatInline label={t("supplier.company.about.countriesServed", "Countries served")} value={data?.countries_served} canEdit={canEdit} onSave={(n) => save({ countries_served: n })} />
        </div>
      </div>
    </section>
  );
}

function StatInline({ label, value, canEdit, onSave }: { label: string; value: number | null | undefined; canEdit: boolean; onSave: (n: number | null) => void }) {
  return (
    <div className="cp-stat">
      {canEdit ? (
        <input
          type="number"
          className="cp-inline cp-stat-v"
          defaultValue={value ?? ""}
          onBlur={(e) => {
            const v = e.target.value;
            const n = v === "" ? null : Number(v);
            if (n !== (value ?? null)) onSave(n);
          }}
        />
      ) : (
        <span className="cp-stat-v">{value?.toLocaleString() ?? "—"}</span>
      )}
      <span className="cp-stat-l">{label}</span>
    </div>
  );
}

/* ========================================================== PLANTS */
function PlantsSection({ data, profile, canEdit }: { data: CompanyPlant[]; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Partial<CompanyPlant> | null>(null);

  const update = async (id: string, patch: Partial<CompanyPlant>) => {
    const r = await profile.updateRow("company_plants", id, patch);
    if (!r.ok) toast.error(r.error);
  };
  const remove = async (id: string) => {
    if (!confirm(t("common.deleteConfirm", "Delete?"))) return;
    const r = await profile.deleteRow("company_plants", id);
    if (!r.ok) toast.error(r.error);
  };
  const saveDraft = async () => {
    if (!draft?.name?.trim()) { toast.error(t("common.nameRequired", "Name is required")); return; }
    const r = await profile.insertRow("company_plants", { ...draft, sort_order: 0 });
    if (!r.ok) { toast.error(r.error); return; }
    setDraft(null);
  };

  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.plants.title", "Plants")}</h2>
        {canEdit && !draft && <button type="button" className="btn-tb" onClick={() => setDraft({ name: "", certifications: [] })}><Plus size={12} /> {t("supplier.company.plants.addPlant", "Add plant")}</button>}
      </header>
      {data.length === 0 && !draft ? (
        <EmptyState text={t("supplier.company.plants.empty", "No plants registered yet.")} />
      ) : (
        <div className="cp-plants">
          {data.map((p) => (
            <div key={p.id} className="cp-plant">
              <div className="cp-plant-head">
                <InlineText canEdit={canEdit} value={p.name} onSave={(v) => update(p.id, { name: v })} className="cp-plant-name" />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {p.country_code && <FlagSVG code={p.country_code} size={14} />}
                  <InlineText canEdit={canEdit} value={p.city} placeholder={t("supplier.company.plants.city", "City")} onSave={(v) => update(p.id, { city: v })} />
                  <InlineText canEdit={canEdit} value={p.country} placeholder={t("supplier.company.plants.country", "Country")} onSave={(v) => update(p.id, { country: v })} />
                  <InlineText canEdit={canEdit} value={p.country_code} placeholder="ISO" onSave={(v) => update(p.id, { country_code: v.toUpperCase() })} className="cp-inline-sm" />
                  {canEdit && <button type="button" className="cp-icon-btn" onClick={() => remove(p.id)} aria-label="Delete"><Trash2 size={14} /></button>}
                </div>
              </div>
              <FieldRow label={t("supplier.company.plants.capacity", "Capacity")}>
                <InlineText canEdit={canEdit} value={p.capacity} placeholder="Beef 2,800 MT/month" onSave={(v) => update(p.id, { capacity: v })} />
              </FieldRow>
              <FieldRow label={t("supplier.company.plants.certifications", "Certifications")}>
                <InlineText canEdit={canEdit} value={csv(p.certifications)} placeholder="USDA, Halal, HACCP" onSave={(v) => update(p.id, { certifications: csvParse(v) })} />
              </FieldRow>
              <FieldRow label={t("supplier.company.plants.vetRegistrations", "Vet registrations")}>
                <InlineText canEdit={canEdit} value={p.vet_registrations} placeholder="SIF 2154 · China-approved" onSave={(v) => update(p.id, { vet_registrations: v })} />
              </FieldRow>
            </div>
          ))}

          {draft && (
            <div className="cp-plant cp-plant-draft">
              <div className="cp-plant-head">
                <input className="cp-inline cp-plant-name" autoFocus placeholder={t("common.name", "Name") + " *"} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input className="cp-inline" placeholder={t("supplier.company.plants.city", "City")} value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                  <input className="cp-inline" placeholder={t("supplier.company.plants.country", "Country")} value={draft.country ?? ""} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
                  <input className="cp-inline cp-inline-sm" placeholder="ISO" maxLength={2} value={draft.country_code ?? ""} onChange={(e) => setDraft({ ...draft, country_code: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <FieldRow label={t("supplier.company.plants.capacity", "Capacity")}>
                <input className="cp-inline" placeholder="Beef 2,800 MT/month" value={draft.capacity ?? ""} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} />
              </FieldRow>
              <FieldRow label={t("supplier.company.plants.certifications", "Certifications")}>
                <input className="cp-inline" placeholder="USDA, Halal, HACCP" value={csv(draft.certifications)} onChange={(e) => setDraft({ ...draft, certifications: csvParse(e.target.value) })} />
              </FieldRow>
              <FieldRow label={t("supplier.company.plants.vetRegistrations", "Vet registrations")}>
                <input className="cp-inline" placeholder="SIF 2154" value={draft.vet_registrations ?? ""} onChange={(e) => setDraft({ ...draft, vet_registrations: e.target.value })} />
              </FieldRow>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" className="btn-tb is-primary" onClick={saveDraft}><Check size={12} /> {t("common.save", "Save")}</button>
                <button type="button" className="btn-tb" onClick={() => setDraft(null)}>{t("common.cancel", "Cancel")}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ========================================================== PREFERENCES */
const INCOTERM_OPTIONS = [
  { code: "FOB", label: "FOB - Free on Board" },
  { code: "CFR", label: "CFR - Cost and Freight" },
  { code: "CIF", label: "CIF - Cost, Insurance & Freight" },
  { code: "EXW", label: "EXW - Ex Works" },
  { code: "DDP", label: "DDP - Delivered Duty Paid" },
  { code: "DAP", label: "DAP - Delivered at Place" },
];
const PAYMENT_TERM_OPTIONS = [
  "30% Advance, Balance TT - Against finalized doc copies",
  "50% Advance, 50% Against BL copy",
  "100% TT in advance",
  "L/C at sight",
  "L/C 30 days",
  "10% Advance, Balance TT - Against finalized doc copies",
  "Open account 30 days",
];
const FCL_OPTIONS = [
  { code: "20", label: "20' FCL (14,000 kg)" },
  { code: "40", label: "40' FCL (28,000 kg)" },
];

function PreferencesSection({ data, profile, canEdit }: { data: CompanyPreferences | null; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean }) {
  const { t } = useTranslation();
  const [ports, setPorts] = useState<Array<{ id: string; name: string; code: string | null; country: string }>>([]);
  const companyId = profile.data.preferences?.company_id ?? (profile as any).companyId;
  const plants = profile.data.plants;

  const save = async (patch: Partial<CompanyPreferences>) => {
    const r = await profile.savePreferences({ ...(data ?? {}), ...patch });
    if (!r.ok) toast.error(r.error);
  };

  // Load ports limited to the supplier's relevant countries (company country + plant countries)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) collect candidate country identifiers from plants
      const plantCodes = Array.from(new Set(plants.map((p) => p.country_code).filter(Boolean))) as string[];
      const plantNames = Array.from(new Set(plants.map((p) => p.country).filter(Boolean))) as string[];

      // 2) also include the main company country (need to fetch from companies)
      let companyCountry: string | null = null;
      if (data?.company_id) {
        const { data: c } = await supabase.from("companies").select("country").eq("id", data.company_id).maybeSingle();
        companyCountry = (c as any)?.country ?? null;
      }
      if (companyCountry) plantNames.push(companyCountry);

      if (plantCodes.length === 0 && plantNames.length === 0) {
        if (!cancelled) setPorts([]);
        return;
      }

      // 3) resolve country ids
      const { data: ctrs } = await supabase
        .from("countries")
        .select("id, english_name, iso_code")
        .or(
          [
            plantCodes.length ? `iso_code.in.(${plantCodes.map((c) => `"${c}"`).join(",")})` : null,
            plantNames.length ? `english_name.in.(${plantNames.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(",")})` : null,
          ].filter(Boolean).join(",")
        );
      const countryMap = new Map<string, string>();
      (ctrs ?? []).forEach((c: any) => countryMap.set(c.id, c.english_name));
      const ids = Array.from(countryMap.keys());
      if (ids.length === 0) { if (!cancelled) setPorts([]); return; }

      const { data: pts } = await supabase
        .from("ports")
        .select("id,name,code,country_id")
        .in("country_id", ids)
        .order("name");
      if (cancelled) return;
      setPorts(
        (pts ?? []).map((p: any) => ({
          id: p.id, name: p.name, code: p.code, country: countryMap.get(p.country_id) ?? "",
        }))
      );
    })();
    return () => { cancelled = true; };
  }, [plants, data?.company_id]);

  // Multi-value helpers (stored as CSV in existing text columns)
  const incotermsSel = csvParse(data?.default_incoterm ?? "");
  const paymentsSel = csvParse(data?.default_payment_terms ?? "");
  const fclSel = csvParse(data?.fcl_size ?? "");

  const toggleCsv = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const row = (label: string, node: React.ReactNode) => (
    <div><dt>{label}</dt><dd>{node}</dd></div>
  );

  return (
    <section className="cp-card">
      <header className="cp-section-head"><h2>{t("supplier.company.preferences.title", "Trade preferences")}</h2></header>
      <dl className="cp-prefs">
        {row(t("supplier.company.preferences.defaultIncoterm", "Default incoterms"),
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {INCOTERM_OPTIONS.map((i) => {
              const on = incotermsSel.includes(i.code);
              return (
                <button
                  key={i.code}
                  type="button"
                  disabled={!canEdit}
                  title={i.label}
                  className={`cp-chip-btn ${on ? "is-on" : ""}`}
                  onClick={() => save({ default_incoterm: toggleCsv(incotermsSel, i.code).join(", ") })}
                >
                  {on ? "✓ " : ""}{i.code}
                </button>
              );
            })}
          </div>
        )}

        {row(t("supplier.company.preferences.defaultPaymentTerms", "Default payment terms"),
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PAYMENT_TERM_OPTIONS.map((p) => {
              const on = paymentsSel.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  disabled={!canEdit}
                  className={`cp-chip-btn ${on ? "is-on" : ""}`}
                  onClick={() => save({ default_payment_terms: toggleCsv(paymentsSel, p).join(", ") })}
                  style={{ maxWidth: 320, textAlign: "left" }}
                >
                  {on ? "✓ " : ""}{p}
                </button>
              );
            })}
          </div>
        )}

        {row(t("supplier.company.preferences.currencies", "Currencies"),
          <InlineText canEdit={canEdit} value={csv(data?.currencies)} placeholder="USD, EUR" onSave={(v) => save({ currencies: csvParse(v) })} />)}

        {row(t("supplier.company.preferences.leadTime", "Lead time"),
          <InlineText canEdit={canEdit} value={data?.lead_time} placeholder="30–45 days from PO" onSave={(v) => save({ lead_time: v })} />)}

        {row(t("supplier.company.preferences.fclSize", "Typical FCL size"),
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {FCL_OPTIONS.map((f) => {
              const on = fclSel.includes(f.code);
              return (
                <button
                  key={f.code}
                  type="button"
                  disabled={!canEdit}
                  className={`cp-chip-btn ${on ? "is-on" : ""}`}
                  onClick={() => save({ fcl_size: toggleCsv(fclSel, f.code).join(", ") })}
                >
                  {on ? "✓ " : ""}{f.label}
                </button>
              );
            })}
          </div>
        )}

        {row(t("supplier.company.preferences.originPorts", "Origin ports"),
          <div>
            {ports.length === 0 ? (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                {t("supplier.company.preferences.originPortsEmpty", "Add plants with a country to choose origin ports.")}
              </span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ports.map((p) => {
                  const label = p.code ? `${p.name} (${p.code})` : p.name;
                  const on = (data?.origin_ports ?? []).includes(label);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!canEdit}
                      className={`cp-chip-btn ${on ? "is-on" : ""}`}
                      title={p.country}
                      onClick={() => {
                        const cur = data?.origin_ports ?? [];
                        save({ origin_ports: on ? cur.filter((x) => x !== label) : [...cur, label] });
                      }}
                    >
                      {on ? "✓ " : ""}{label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </dl>
    </section>
  );
}

/* ========================================================== CERTIFICATIONS */
function CertificationsSection({ data, profile, canEdit, locale }: { data: CompanyCertification[]; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean; locale: string }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Partial<CompanyCertification> | null>(null);
  const update = async (id: string, patch: Partial<CompanyCertification>) => {
    const r = await profile.updateRow("company_certifications", id, patch);
    if (!r.ok) toast.error(r.error);
  };
  const remove = async (id: string) => {
    if (!confirm(t("common.deleteConfirm", "Delete?"))) return;
    const r = await profile.deleteRow("company_certifications", id);
    if (!r.ok) toast.error(r.error);
  };
  const saveDraft = async () => {
    if (!draft?.name?.trim()) { toast.error(t("common.nameRequired", "Name is required")); return; }
    const r = await profile.insertRow("company_certifications", draft);
    if (!r.ok) { toast.error(r.error); return; }
    setDraft(null);
  };
  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.compliance.title", "Compliance & certifications")}</h2>
        {canEdit && !draft && <button type="button" className="btn-tb" onClick={() => setDraft({ name: "" })}><Plus size={12} /> {t("common.add", "Add")}</button>}
      </header>
      {data.length === 0 && !draft ? <EmptyState text={t("supplier.company.compliance.empty", "No certifications yet.")} /> : (
        <div className="cp-cert-grid">
          {data.map((c) => (
            <div key={c.id} className="cp-cert">
              <span className="cp-cert-icon" aria-hidden="true"><CheckCircleIcon size={18} /></span>
              <div className="cp-cert-body" style={{ flex: 1 }}>
                <InlineText canEdit={canEdit} value={c.name} className="cp-cert-name" onSave={(v) => update(c.id, { name: v })} />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "#6b7280" }}>
                  <span>{t("supplier.company.compliance.validUntil", "Valid until")}:</span>
                  <InlineText canEdit={canEdit} type="date" value={c.valid_until} onSave={(v) => update(c.id, { valid_until: v || null })} />
                  <InlineText canEdit={canEdit} value={c.issuer} placeholder={t("supplier.company.compliance.issuer", "Issuer")} onSave={(v) => update(c.id, { issuer: v })} />
                </div>
                <InlineText canEdit={canEdit} type="url" value={c.certificate_url} placeholder="https://… certificate URL" onSave={(v) => update(c.id, { certificate_url: v })} />
                {!canEdit && c.certificate_url && <a className="cp-link" href={c.certificate_url} target="_blank" rel="noreferrer">{t("supplier.company.compliance.viewCertificate", "View certificate")}</a>}
              </div>
              {canEdit && <button type="button" className="cp-icon-btn" onClick={() => remove(c.id)} aria-label="Delete"><Trash2 size={14} /></button>}
            </div>
          ))}
          {draft && (
            <div className="cp-cert cp-plant-draft">
              <span className="cp-cert-icon" aria-hidden="true"><CheckCircleIcon size={18} /></span>
              <div className="cp-cert-body" style={{ flex: 1, display: "grid", gap: 6 }}>
                <input className="cp-inline cp-cert-name" autoFocus placeholder={t("common.name", "Name") + " *"} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input className="cp-inline" type="date" value={draft.valid_until ?? ""} onChange={(e) => setDraft({ ...draft, valid_until: e.target.value })} />
                  <input className="cp-inline" placeholder={t("supplier.company.compliance.issuer", "Issuer")} value={draft.issuer ?? ""} onChange={(e) => setDraft({ ...draft, issuer: e.target.value })} />
                </div>
                <input className="cp-inline" placeholder="https://… certificate URL" value={draft.certificate_url ?? ""} onChange={(e) => setDraft({ ...draft, certificate_url: e.target.value })} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn-tb is-primary" onClick={saveDraft}><Check size={12} /> {t("common.save", "Save")}</button>
                  <button type="button" className="btn-tb" onClick={() => setDraft(null)}>{t("common.cancel", "Cancel")}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ========================================================== DOCUMENTS */
function DocumentsSection({ data, profile, canEdit, locale }: { data: CompanyDocument[]; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean; locale: string }) {
  const { t } = useTranslation();
  const [docType, setDocType] = useState("Brochure");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const r = await profile.uploadDocument(f, docType);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("supplier.company.documents.uploaded", "Document uploaded"));
  };
  const renameDoc = async (id: string, name: string) => {
    const r = await profile.updateRow("company_documents", id, { name });
    if (!r.ok) toast.error(r.error);
  };
  const retypeDoc = async (id: string, doc_type: string) => {
    const r = await profile.updateRow("company_documents", id, { doc_type });
    if (!r.ok) toast.error(r.error);
  };
  const remove = async (doc: CompanyDocument) => {
    if (!confirm(t("common.deleteConfirm", "Delete?"))) return;
    const r = await profile.deleteDocument(doc);
    if (!r.ok) toast.error(r.error);
  };

  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.documents.title", "Documents")}</h2>
        {canEdit && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="cp-inline" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
            </select>
            <input ref={fileRef} type="file" style={{ display: "none" }} onChange={onPick} />
            <button type="button" className="btn-tb is-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <UploadCloudIcon size={14} /> {uploading ? t("common.uploading", "Uploading…") : t("supplier.company.documents.uploadDocument", "Upload document")}
            </button>
          </div>
        )}
      </header>
      {data.length === 0 ? <EmptyState text={t("supplier.company.documents.empty", "No documents yet.")} /> : (
        <div className="cp-docs">
          {data.map((d) => (
            <div key={d.id} className="cp-doc">
              <span className="cp-doc-icon" aria-hidden="true"><FileTextIcon size={18} /></span>
              <div className="cp-doc-body" style={{ flex: 1 }}>
                <InlineText canEdit={canEdit} value={d.name} onSave={(v) => renameDoc(d.id, v)} className="cp-doc-name" />
                <span className="cp-doc-meta">
                  {canEdit ? (
                    <select className="cp-inline cp-inline-xs" value={d.doc_type ?? "Other"} onChange={(e) => retypeDoc(d.id, e.target.value)}>
                      {DOC_TYPES.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
                    </select>
                  ) : d.doc_type}
                  {d.file_size ? ` · ${fmtSize(d.file_size)}` : ""} · {t("supplier.company.documents.lastUpdated", "Last updated")} {fmtDate(d.updated_at, locale)}
                </span>
              </div>
              {(d.file_path || d.file_url) && (
                <button
                  type="button"
                  className="cp-link"
                  onClick={async () => {
                    let path = d.file_path || "";
                    if (!path && d.file_url) {
                      const m = d.file_url.match(/company-files\/(.+)$/);
                      path = m ? m[1] : "";
                    }
                    if (!path) return;
                    const { data: sg, error } = await supabase.storage
                      .from("company-files")
                      .createSignedUrl(path, 300);
                    if (error || !sg?.signedUrl) { toast.error("Unable to open document"); return; }
                    window.open(sg.signedUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  {t("supplier.company.documents.view", "View")}
                </button>
              )}
              {canEdit && <button type="button" className="cp-icon-btn" style={{ marginLeft: 8 }} onClick={() => remove(d)} aria-label="Delete"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ========================================================== TEAM */
function TeamSection({ data, profile, canEdit }: { data: CompanyTeamMember[]; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Partial<CompanyTeamMember> | null>(null);
  const update = async (id: string, patch: Partial<CompanyTeamMember>) => {
    const r = await profile.updateRow("company_team_members", id, patch);
    if (!r.ok) toast.error(r.error);
  };
  const remove = async (id: string) => {
    if (!confirm(t("common.deleteConfirm", "Delete?"))) return;
    const r = await profile.deleteRow("company_team_members", id);
    if (!r.ok) toast.error(r.error);
  };
  const saveDraft = async () => {
    if (!draft?.name?.trim()) { toast.error(t("common.nameRequired", "Name is required")); return; }
    const r = await profile.insertRow("company_team_members", draft);
    if (!r.ok) { toast.error(r.error); return; }
    setDraft(null);
  };
  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.team.title", "Team")}</h2>
        {canEdit && !draft && <button type="button" className="btn-tb" onClick={() => setDraft({ name: "" })}><Plus size={12} /> {t("common.add", "Add")}</button>}
      </header>
      {data.length === 0 && !draft ? <EmptyState text={t("supplier.company.team.empty", "No team members yet.")} /> : (
        <div className="cp-team">
          {data.map((c) => (
            <div key={c.id} className="cp-contact">
              <div className="cp-avatar" aria-hidden="true">{initials(c.name)}</div>
              <div className="cp-contact-body" style={{ flex: 1 }}>
                <InlineText canEdit={canEdit} value={c.name} className="cp-contact-name" onSave={(v) => update(c.id, { name: v })} />
                <InlineText canEdit={canEdit} value={c.title} placeholder={t("supplier.company.team.titleField", "Title")} onSave={(v) => update(c.id, { title: v })} />
                <InlineText canEdit={canEdit} type="email" value={c.email} placeholder="email@company.com" onSave={(v) => update(c.id, { email: v })} />
                <InlineText canEdit={canEdit} value={c.whatsapp} placeholder="+55 11 98000-0000" onSave={(v) => update(c.id, { whatsapp: v })} />
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                  <InlineCheckbox canEdit={canEdit} checked={!!c.is_primary} label={t("supplier.company.team.primary", "Primary contact")} onSave={(v) => update(c.id, { is_primary: v })} />
                </div>
              </div>
              {canEdit && <button type="button" className="cp-icon-btn" onClick={() => remove(c.id)} aria-label="Delete"><Trash2 size={14} /></button>}
            </div>
          ))}
          {draft && (
            <div className="cp-contact cp-plant-draft">
              <div className="cp-avatar" aria-hidden="true">{initials(draft.name ?? "")}</div>
              <div className="cp-contact-body" style={{ flex: 1, display: "grid", gap: 6 }}>
                <input className="cp-inline cp-contact-name" autoFocus placeholder={t("common.name", "Name") + " *"} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <input className="cp-inline" placeholder={t("supplier.company.team.titleField", "Title")} value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <input className="cp-inline" type="email" placeholder="email@company.com" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                <input className="cp-inline" placeholder="+55 11 98000-0000" value={draft.whatsapp ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })} />
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                  <input type="checkbox" checked={!!draft.is_primary} onChange={(e) => setDraft({ ...draft, is_primary: e.target.checked })} style={{ accentColor: "#8B2252" }} />
                  {t("supplier.company.team.primary", "Primary contact")}
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn-tb is-primary" onClick={saveDraft}><Check size={12} /> {t("common.save", "Save")}</button>
                  <button type="button" className="btn-tb" onClick={() => setDraft(null)}>{t("common.cancel", "Cancel")}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ========================================================== Helpers */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="cp-kv">
      <span className="cp-kv-l">{label}</span>
      <span className="cp-kv-v">{children}</span>
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: "32px 16px", textAlign: "center", border: "1px dashed var(--border)",
      borderRadius: 10, color: "var(--fg-muted)", fontSize: 13, background: "var(--bg-subtle, #f7f7f8)",
    }}>{text}</div>
  );
}