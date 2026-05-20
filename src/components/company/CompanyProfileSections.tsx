import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircleIcon, UploadCloudIcon, FileTextIcon, PhoneIcon,
  MessageIcon, FlagSVG, EditIcon,
} from "@/components/icons";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

/* ============================================================ ABOUT */
function AboutSection({ data, profile, canEdit }: { data: CompanyAbout | null; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<CompanyAbout>>(data ?? {});
  const start = () => { setForm(data ?? {}); setOpen(true); };
  const save = async () => {
    const r = await profile.saveAbout(form);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("supplier.company.toasts.saved", "Saved"));
    setOpen(false);
  };
  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.about.title", "About")}</h2>
        {canEdit && <button type="button" className="btn-tb" onClick={start}><EditIcon size={12} /> {t("common.edit", "Edit")}</button>}
      </header>
      <div className="cp-about-grid">
        <div>
          <p className="cp-description">{data?.description || <span style={{ color: "#9ca3af" }}>{t("supplier.company.about.empty", "No description yet.")}</span>}</p>
          <div className="cp-kv"><span className="cp-kv-l">{t("supplier.company.about.tradeMarkets", "Trade markets")}</span><span className="cp-kv-v">{csv(data?.trade_markets) || "—"}</span></div>
          <div className="cp-kv"><span className="cp-kv-l">{t("supplier.company.about.mainSpecies", "Main species")}</span>
            <span className="cp-kv-v cp-chips">
              {(data?.main_species ?? []).length > 0
                ? data!.main_species.map((s) => <span key={s} className="cp-chip">{s}</span>)
                : "—"}
            </span>
          </div>
          {data?.trade_name && <div className="cp-kv"><span className="cp-kv-l">{t("supplier.company.about.tradeName", "Trade name")}</span><span className="cp-kv-v">{data.trade_name}</span></div>}
        </div>
        <div className="cp-stat-grid">
          <div className="cp-stat"><span className="cp-stat-v">{data?.years_exporting ?? "—"}</span><span className="cp-stat-l">{t("supplier.company.about.yearsExporting", "Years exporting")}</span></div>
          <div className="cp-stat"><span className="cp-stat-v">{data?.fcls_delivered?.toLocaleString() ?? "—"}</span><span className="cp-stat-l">{t("supplier.company.about.fclsDelivered", "FCLs delivered")}</span></div>
          <div className="cp-stat"><span className="cp-stat-v">{data?.countries_served ?? "—"}</span><span className="cp-stat-l">{t("supplier.company.about.countriesServed", "Countries served")}</span></div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t("supplier.company.about.edit", "Edit about")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label={t("supplier.company.about.tradeName", "Trade name")}><Input value={form.trade_name ?? ""} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} /></Field>
            <Field label={t("supplier.company.about.description", "Description")}><Textarea rows={4} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label={t("supplier.company.about.tradeMarkets", "Trade markets") + " (csv)"}><Input value={csv(form.trade_markets)} onChange={(e) => setForm({ ...form, trade_markets: csvParse(e.target.value) })} /></Field>
            <Field label={t("supplier.company.about.mainSpecies", "Main species") + " (csv)"}><Input value={csv(form.main_species)} placeholder={SPECIES.join(", ")} onChange={(e) => setForm({ ...form, main_species: csvParse(e.target.value) })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("supplier.company.about.yearsExporting", "Years exporting")}><Input type="number" value={form.years_exporting ?? ""} onChange={(e) => setForm({ ...form, years_exporting: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label={t("supplier.company.about.fclsDelivered", "FCLs delivered")}><Input type="number" value={form.fcls_delivered ?? ""} onChange={(e) => setForm({ ...form, fcls_delivered: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label={t("supplier.company.about.countriesServed", "Countries served")}><Input type="number" value={form.countries_served ?? ""} onChange={(e) => setForm({ ...form, countries_served: e.target.value ? Number(e.target.value) : null })} /></Field>
            </div>
          </div>
          <DialogFooter>
            <button type="button" className="btn-tb" onClick={() => setOpen(false)}>{t("common.cancel", "Cancel")}</button>
            <button type="button" className="btn-tb is-primary" onClick={save}>{t("common.save", "Save")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ============================================================ PLANTS */
function PlantsSection({ data, profile, canEdit }: { data: CompanyPlant[]; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Partial<CompanyPlant> | null>(null);
  const save = async () => {
    if (!editing) return;
    const { id, company_id, ...rest } = editing;
    const payload = { ...rest, sort_order: rest.sort_order ?? 0 };
    const r = id ? await profile.updateRow("company_plants", id, payload) : await profile.insertRow("company_plants", payload);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("supplier.company.toasts.saved", "Saved"));
    setEditing(null);
  };
  const remove = async (id: string) => {
    if (!confirm(t("common.deleteConfirm", "Delete?"))) return;
    const r = await profile.deleteRow("company_plants", id);
    if (!r.ok) toast.error(r.error); else toast.success(t("common.deleted", "Deleted"));
  };
  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.plants.title", "Plants")}</h2>
        {canEdit && <button type="button" className="btn-tb" onClick={() => setEditing({ name: "", certifications: [] })}><Plus size={12} /> {t("supplier.company.plants.addPlant", "Add plant")}</button>}
      </header>
      {data.length === 0 ? (
        <EmptyState text={t("supplier.company.plants.empty", "No plants registered yet.")} />
      ) : (
        <div className="cp-plants">
          {data.map((p) => (
            <div key={p.id} className="cp-plant">
              <div className="cp-plant-head">
                <h3>{p.name}</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="cp-plant-loc">
                    {p.country_code && <FlagSVG code={p.country_code} size={14} />} {p.city}{p.city && p.country ? ", " : ""}{p.country}
                  </span>
                  {canEdit && (
                    <>
                      <button type="button" className="cp-link" onClick={() => setEditing(p)}>{t("common.edit", "Edit")}</button>
                      <button type="button" className="cp-link" style={{ color: "#b91c1c" }} onClick={() => remove(p.id)}>{t("common.delete", "Delete")}</button>
                    </>
                  )}
                </div>
              </div>
              {p.capacity && <div className="cp-kv"><span className="cp-kv-l">{t("supplier.company.plants.capacity", "Capacity")}</span><span className="cp-kv-v">{p.capacity}</span></div>}
              {p.certifications?.length > 0 && (
                <div className="cp-kv"><span className="cp-kv-l">{t("supplier.company.plants.certifications", "Certifications")}</span>
                  <span className="cp-kv-v cp-chips">{p.certifications.map((c) => <span key={c} className="cp-chip">{c}</span>)}</span>
                </div>
              )}
              {p.vet_registrations && <div className="cp-kv"><span className="cp-kv-l">{t("supplier.company.plants.vetRegistrations", "Vet registrations")}</span><span className="cp-kv-v">{p.vet_registrations}</span></div>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? t("supplier.company.plants.edit", "Edit plant") : t("supplier.company.plants.addPlant", "Add plant")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <Field label={t("common.name", "Name") + " *"}><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t("supplier.company.plants.city", "City")}><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
                <Field label={t("supplier.company.plants.country", "Country")}><Input value={editing.country ?? ""} onChange={(e) => setEditing({ ...editing, country: e.target.value })} /></Field>
                <Field label={t("supplier.company.plants.countryCode", "ISO code") + " (BR, AR…)"}><Input maxLength={2} value={editing.country_code ?? ""} onChange={(e) => setEditing({ ...editing, country_code: e.target.value.toUpperCase() })} /></Field>
              </div>
              <Field label={t("supplier.company.plants.capacity", "Capacity")}><Input value={editing.capacity ?? ""} onChange={(e) => setEditing({ ...editing, capacity: e.target.value })} placeholder="Beef 2,800 MT/month" /></Field>
              <Field label={t("supplier.company.plants.certifications", "Certifications") + " (csv)"}><Input value={csv(editing.certifications)} onChange={(e) => setEditing({ ...editing, certifications: csvParse(e.target.value) })} placeholder="USDA, Halal, HACCP" /></Field>
              <Field label={t("supplier.company.plants.vetRegistrations", "Vet registrations")}><Input value={editing.vet_registrations ?? ""} onChange={(e) => setEditing({ ...editing, vet_registrations: e.target.value })} placeholder="SIF 2154 · China-approved" /></Field>
            </div>
          )}
          <DialogFooter>
            <button type="button" className="btn-tb" onClick={() => setEditing(null)}>{t("common.cancel", "Cancel")}</button>
            <button type="button" className="btn-tb is-primary" onClick={save} disabled={!editing?.name?.trim()}>{t("common.save", "Save")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ============================================================ PREFERENCES */
function PreferencesSection({ data, profile, canEdit }: { data: CompanyPreferences | null; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<CompanyPreferences>>(data ?? {});
  const start = () => { setForm(data ?? {}); setOpen(true); };
  const save = async () => {
    const r = await profile.savePreferences(form);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("supplier.company.toasts.saved", "Saved"));
    setOpen(false);
  };
  const row = (label: string, value: any) => (
    <div><dt>{label}</dt><dd>{value || "—"}</dd></div>
  );
  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.preferences.title", "Trade preferences")}</h2>
        {canEdit && <button type="button" className="btn-tb" onClick={start}><EditIcon size={12} /> {t("common.edit", "Edit")}</button>}
      </header>
      <dl className="cp-prefs">
        {row(t("supplier.company.preferences.defaultIncoterm", "Default incoterm"), data?.default_incoterm)}
        {row(t("supplier.company.preferences.defaultPaymentTerms", "Default payment terms"), data?.default_payment_terms)}
        {row(t("supplier.company.preferences.currencies", "Currencies"), csv(data?.currencies))}
        {row(t("supplier.company.preferences.leadTime", "Lead time"), data?.lead_time)}
        {row(t("supplier.company.preferences.fclSize", "FCL size"), data?.fcl_size)}
        {row(t("supplier.company.preferences.originPorts", "Origin ports"), csv(data?.origin_ports))}
      </dl>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{t("supplier.company.preferences.edit", "Edit trade preferences")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("supplier.company.preferences.defaultIncoterm", "Default incoterm")}><Input value={form.default_incoterm ?? ""} onChange={(e) => setForm({ ...form, default_incoterm: e.target.value })} placeholder="CFR, FOB…" /></Field>
              <Field label={t("supplier.company.preferences.defaultPaymentTerms", "Default payment terms")}><Input value={form.default_payment_terms ?? ""} onChange={(e) => setForm({ ...form, default_payment_terms: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("supplier.company.preferences.currencies", "Currencies") + " (csv)"}><Input value={csv(form.currencies)} onChange={(e) => setForm({ ...form, currencies: csvParse(e.target.value) })} placeholder="USD, EUR" /></Field>
              <Field label={t("supplier.company.preferences.leadTime", "Lead time")}><Input value={form.lead_time ?? ""} onChange={(e) => setForm({ ...form, lead_time: e.target.value })} placeholder="30–45 days from PO" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("supplier.company.preferences.fclSize", "FCL size")}><Input value={form.fcl_size ?? ""} onChange={(e) => setForm({ ...form, fcl_size: e.target.value })} placeholder="25 MT (40' reefer)" /></Field>
              <Field label={t("supplier.company.preferences.originPorts", "Origin ports") + " (csv)"}><Input value={csv(form.origin_ports)} onChange={(e) => setForm({ ...form, origin_ports: csvParse(e.target.value) })} /></Field>
            </div>
          </div>
          <DialogFooter>
            <button type="button" className="btn-tb" onClick={() => setOpen(false)}>{t("common.cancel", "Cancel")}</button>
            <button type="button" className="btn-tb is-primary" onClick={save}>{t("common.save", "Save")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ============================================================ CERTIFICATIONS */
function CertificationsSection({ data, profile, canEdit, locale }: { data: CompanyCertification[]; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean; locale: string }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Partial<CompanyCertification> | null>(null);
  const save = async () => {
    if (!editing) return;
    const { id, company_id, ...rest } = editing;
    const r = id ? await profile.updateRow("company_certifications", id, rest) : await profile.insertRow("company_certifications", rest);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("supplier.company.toasts.saved", "Saved"));
    setEditing(null);
  };
  const remove = async (id: string) => {
    if (!confirm(t("common.deleteConfirm", "Delete?"))) return;
    const r = await profile.deleteRow("company_certifications", id);
    if (!r.ok) toast.error(r.error); else toast.success(t("common.deleted", "Deleted"));
  };
  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.compliance.title", "Compliance & certifications")}</h2>
        {canEdit && <button type="button" className="btn-tb" onClick={() => setEditing({ name: "" })}><Plus size={12} /> {t("common.add", "Add")}</button>}
      </header>
      {data.length === 0 ? <EmptyState text={t("supplier.company.compliance.empty", "No certifications yet.")} /> : (
        <div className="cp-cert-grid">
          {data.map((c) => (
            <div key={c.id} className="cp-cert">
              <span className="cp-cert-icon" aria-hidden="true"><CheckCircleIcon size={18} /></span>
              <div className="cp-cert-body">
                <strong>{c.name}</strong>
                {c.valid_until && <span className="cp-cert-valid">{t("supplier.company.compliance.validUntil", "Valid until")} {fmtDate(c.valid_until, locale)}</span>}
                {c.issuer && <span className="cp-cert-valid">{c.issuer}</span>}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  {c.certificate_url && <a className="cp-link" href={c.certificate_url} target="_blank" rel="noreferrer">{t("supplier.company.compliance.viewCertificate", "View certificate")}</a>}
                  {canEdit && <button type="button" className="cp-link" onClick={() => setEditing(c)}>{t("common.edit", "Edit")}</button>}
                  {canEdit && <button type="button" className="cp-link" style={{ color: "#b91c1c" }} onClick={() => remove(c.id)}>{t("common.delete", "Delete")}</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? t("supplier.company.compliance.edit", "Edit certification") : t("supplier.company.compliance.add", "Add certification")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <Field label={t("common.name", "Name") + " *"}><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label={t("supplier.company.compliance.issuer", "Issuer")}><Input value={editing.issuer ?? ""} onChange={(e) => setEditing({ ...editing, issuer: e.target.value })} /></Field>
              <Field label={t("supplier.company.compliance.validUntil", "Valid until")}><Input type="date" value={editing.valid_until ?? ""} onChange={(e) => setEditing({ ...editing, valid_until: e.target.value })} /></Field>
              <Field label={t("supplier.company.compliance.certificateUrl", "Certificate URL")}><Input value={editing.certificate_url ?? ""} onChange={(e) => setEditing({ ...editing, certificate_url: e.target.value })} placeholder="https://…" /></Field>
            </div>
          )}
          <DialogFooter>
            <button type="button" className="btn-tb" onClick={() => setEditing(null)}>{t("common.cancel", "Cancel")}</button>
            <button type="button" className="btn-tb is-primary" onClick={save} disabled={!editing?.name?.trim()}>{t("common.save", "Save")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ============================================================ DOCUMENTS */
function DocumentsSection({ data, profile, canEdit, locale }: { data: CompanyDocument[]; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean; locale: string }) {
  const { t } = useTranslation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("Brochure");
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);

  const doUpload = async () => {
    if (!file) return;
    setUploading(true);
    const r = await profile.uploadDocument(file, docType, displayName || undefined);
    setUploading(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("supplier.company.documents.uploaded", "Document uploaded"));
    setUploadOpen(false); setFile(null); setDisplayName(""); setDocType("Brochure");
  };
  const remove = async (doc: CompanyDocument) => {
    if (!confirm(t("common.deleteConfirm", "Delete?"))) return;
    const r = await profile.deleteDocument(doc);
    if (!r.ok) toast.error(r.error); else toast.success(t("common.deleted", "Deleted"));
  };

  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.documents.title", "Documents")}</h2>
        {canEdit && <button type="button" className="btn-tb is-primary" onClick={() => setUploadOpen(true)}><UploadCloudIcon size={14} /> {t("supplier.company.documents.uploadDocument", "Upload document")}</button>}
      </header>
      {data.length === 0 ? <EmptyState text={t("supplier.company.documents.empty", "No documents yet.")} /> : (
        <div className="cp-docs">
          {data.map((d) => (
            <div key={d.id} className="cp-doc">
              <span className="cp-doc-icon" aria-hidden="true"><FileTextIcon size={18} /></span>
              <div className="cp-doc-body">
                <span className="cp-doc-name">{d.name}</span>
                <span className="cp-doc-meta">{d.doc_type} {d.file_size ? `· ${fmtSize(d.file_size)}` : ""} · {t("supplier.company.documents.lastUpdated", "Last updated")} {fmtDate(d.updated_at, locale)}</span>
              </div>
              {d.file_url && <a className="cp-link" href={d.file_url} target="_blank" rel="noreferrer">{t("supplier.company.documents.view", "View")}</a>}
              {canEdit && <button type="button" className="cp-link" style={{ color: "#b91c1c", marginLeft: 8 }} onClick={() => remove(d)}><Trash2 size={12} /></button>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("supplier.company.documents.uploadDocument", "Upload document")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label={t("supplier.company.documents.docType", "Type")}>
              <select className="w-full h-10 px-3 border rounded-md text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
              </select>
            </Field>
            <Field label={t("supplier.company.documents.displayName", "Display name (optional)")}><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={file?.name} /></Field>
            <Field label={t("supplier.company.documents.file", "File") + " (max 20MB)"}>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
          </div>
          <DialogFooter>
            <button type="button" className="btn-tb" onClick={() => setUploadOpen(false)}>{t("common.cancel", "Cancel")}</button>
            <button type="button" className="btn-tb is-primary" onClick={doUpload} disabled={!file || uploading}>{uploading ? t("common.uploading", "Uploading…") : t("common.upload", "Upload")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ============================================================ TEAM */
function TeamSection({ data, profile, canEdit }: { data: CompanyTeamMember[]; profile: ReturnType<typeof useCompanyProfile>; canEdit: boolean }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Partial<CompanyTeamMember> | null>(null);
  const save = async () => {
    if (!editing) return;
    const { id, company_id, ...rest } = editing;
    const r = id ? await profile.updateRow("company_team_members", id, rest) : await profile.insertRow("company_team_members", rest);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("supplier.company.toasts.saved", "Saved"));
    setEditing(null);
  };
  const remove = async (id: string) => {
    if (!confirm(t("common.deleteConfirm", "Delete?"))) return;
    const r = await profile.deleteRow("company_team_members", id);
    if (!r.ok) toast.error(r.error); else toast.success(t("common.deleted", "Deleted"));
  };
  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>{t("supplier.company.team.title", "Team")}</h2>
        {canEdit && <button type="button" className="btn-tb" onClick={() => setEditing({ name: "" })}><Plus size={12} /> {t("common.add", "Add")}</button>}
      </header>
      {data.length === 0 ? <EmptyState text={t("supplier.company.team.empty", "No team members yet.")} /> : (
        <div className="cp-team">
          {data.map((c) => (
            <div key={c.id} className="cp-contact">
              <div className="cp-avatar" aria-hidden="true">{initials(c.name)}</div>
              <div className="cp-contact-body" style={{ flex: 1 }}>
                <strong>{c.name} {c.is_primary && <span style={{ fontSize: 10, color: "#16a34a", marginLeft: 4 }}>★</span>}</strong>
                {c.title && <span className="cp-contact-title">{c.title}</span>}
                {c.email && <a className="cp-contact-link" href={`mailto:${c.email}`}><MessageIcon size={12} /> {c.email}</a>}
                {c.whatsapp && <span className="cp-contact-link"><PhoneIcon size={12} /> {c.whatsapp}</span>}
                {canEdit && (
                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button type="button" className="cp-link" onClick={() => setEditing(c)}>{t("common.edit", "Edit")}</button>
                    <button type="button" className="cp-link" style={{ color: "#b91c1c" }} onClick={() => remove(c.id)}>{t("common.delete", "Delete")}</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? t("supplier.company.team.edit", "Edit team member") : t("supplier.company.team.add", "Add team member")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <Field label={t("common.name", "Name") + " *"}><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label={t("supplier.company.team.titleField", "Title")}><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Sales Director" /></Field>
              <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="WhatsApp"><Input value={editing.whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} placeholder="+55 11 98000-0000" /></Field>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" checked={!!editing.is_primary} onChange={(e) => setEditing({ ...editing, is_primary: e.target.checked })} style={{ accentColor: "#8B2252" }} />
                {t("supplier.company.team.primary", "Primary contact")}
              </label>
            </div>
          )}
          <DialogFooter>
            <button type="button" className="btn-tb" onClick={() => setEditing(null)}>{t("common.cancel", "Cancel")}</button>
            <button type="button" className="btn-tb is-primary" onClick={save} disabled={!editing?.name?.trim()}>{t("common.save", "Save")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ============================================================ Helpers */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</Label>
      {children}
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