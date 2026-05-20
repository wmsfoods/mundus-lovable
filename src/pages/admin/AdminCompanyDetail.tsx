import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save, X, CheckCircle2, Info, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAdminCompany, type CompanyPatch } from "@/hooks/useAdminCompany";
import CompanyProfileSections from "@/components/company/CompanyProfileSections";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import "@/styles/mundus-company.css";

type Props = { mode?: "edit" | "new" };

const PROTEINS = ["Beef", "Pork", "Poultry", "Ovine"] as const;
type Protein = (typeof PROTEINS)[number];

const CUTS_BY_PROTEIN: Record<Protein, string[]> = {
  Beef: [
    "Forequarter", "Topside", "Brisket", "Knuckle", "Striploin", "Ribeye",
    "Bones", "Sangria 90VL", "Trim 80CL", "Chuck Roll", "Hindquarter",
    "Tenderloin", "Short Ribs", "Flank",
  ],
  Pork: ["Loin", "Belly", "Ribs", "Shoulder", "Ham", "Trim 80CL"],
  Poultry: ["Whole Chicken", "Breast", "Thigh", "Wings", "Drumstick", "Liver", "Gizzard"],
  Ovine: ["Leg", "Rack", "Shoulder", "Loin", "Shank"],
};

const EMPTY: CompanyPatch = {
  name: "",
  tax_id: "",
  country: "",
  state: "",
  city: "",
  address: "",
  zip_code: "",
  phone: "",
  website: "",
  is_buyer: false,
  is_supplier: false,
  is_verified: false,
  rating: 0,
  protein_profiles: [],
  preferred_cuts: [],
  status: "active",
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "M";
}

function cutKey(protein: Protein, cut: string) {
  return `${protein}: ${cut}`;
}

export default function AdminCompanyDetail({ mode = "edit" }: Props) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const activeTab = search.get("tab") || "profile";
  const setTab = (tab: string) => {
    const next = new URLSearchParams(search);
    if (tab === "profile") next.delete("tab"); else next.set("tab", tab);
    setSearch(next, { replace: true });
  };
  const isNew = mode === "new";
  const { data, loading, error, save, create, remove } = useAdminCompany(isNew ? undefined : id);

  const [form, setForm] = useState<CompanyPatch>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        tax_id: data.tax_id,
        country: data.country,
        state: data.state,
        city: data.city ?? "",
        address: data.address,
        zip_code: data.zip_code ?? "",
        phone: data.phone,
        website: data.website ?? "",
        is_buyer: !!data.is_buyer,
        is_supplier: !!data.is_supplier,
        is_verified: !!data.is_verified,
        rating: data.rating ?? 0,
        protein_profiles: data.protein_profiles ?? [],
        preferred_cuts: data.preferred_cuts ?? [],
        status: data.status ?? "active",
      });
      setDirty(false);
    }
  }, [data]);

  const setField = <K extends keyof CompanyPatch>(k: K, v: CompanyPatch[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const proteins = (form.protein_profiles ?? []) as Protein[];
  const cuts = form.preferred_cuts ?? [];

  const toggleProtein = (p: Protein) => {
    const has = proteins.includes(p);
    const next = has ? proteins.filter((x) => x !== p) : [...proteins, p];
    // When unselecting a protein, remove its cuts
    let nextCuts = cuts;
    if (has) {
      const prefix = `${p}:`;
      nextCuts = cuts.filter((c) => !c.startsWith(prefix));
    }
    setForm((f) => ({ ...f, protein_profiles: next, preferred_cuts: nextCuts }));
    setDirty(true);
  };

  const toggleCut = (p: Protein, cut: string) => {
    const key = cutKey(p, cut);
    const next = cuts.includes(key) ? cuts.filter((c) => c !== key) : [...cuts, key];
    setField("preferred_cuts", next);
  };

  const validate = (): string | null => {
    if (!form.name?.trim()) return t("admin.companies.validation.name");
    if (!form.tax_id?.trim()) return t("admin.companies.validation.taxId");
    if (!form.country?.trim()) return t("admin.companies.validation.country");
    if (!form.state?.trim()) return t("admin.companies.validation.state");
    if (!form.address?.trim()) return t("admin.companies.validation.address");
    if (!form.phone?.trim()) return t("admin.companies.validation.phone");
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      if (isNew) {
        const res = await create(form);
        if (!res.ok) { toast.error(res.error ?? t("admin.companies.toast.error")); return; }
        toast.success(t("admin.companies.detail.saved"));
        if (res.id) navigate(`/admin/companies/${res.id}`, { replace: true });
      } else {
        const res = await save(form);
        if (!res.ok) { toast.error(res.error ?? t("admin.companies.toast.error")); return; }
        toast.success(t("admin.companies.detail.saved"));
        setDirty(false);
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleteOpen(false);
    setSaving(true);
    const res = await remove();
    setSaving(false);
    if (!res.ok) { toast.error(res.error ?? t("admin.companies.toast.error")); return; }
    toast.success(t("admin.companies.detail.deleted"));
    navigate("/admin/companies");
  };

  const bothChecked = !!form.is_buyer && !!form.is_supplier;
  const isActive = (form.status ?? "active") === "active";

  const onboardedDisplay = useMemo(() => {
    const v = data?.onboarded_at ?? data?.created_at;
    if (!v) return "—";
    try { return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(new Date(v)); } catch { return v; }
  }, [data]);

  if (!isNew && loading) return <div className="adm-body"><div className="adm-panel" style={{ padding: 16 }}>{t("common.loading")}</div></div>;
  if (!isNew && error) return <div className="adm-body"><div className="adm-panel" style={{ padding: 16, color: "#b91c1c" }}>{error}</div></div>;

  const tabs = [
    { key: "profile", label: t("admin.companies.tabs.profile", "Profile") },
    { key: "about", label: t("admin.companies.tabs.about", "About") },
    { key: "plants", label: t("admin.companies.tabs.plants", "Plants") },
    { key: "certifications", label: t("admin.companies.tabs.certifications", "Certifications") },
    { key: "documents", label: t("admin.companies.tabs.documents", "Documents") },
    { key: "team", label: t("admin.companies.tabs.team", "Team") },
    { key: "preferences", label: t("admin.companies.tabs.preferences", "Preferences") },
  ];

  return (
    <div className="adm-body" style={{ paddingBottom: 96 }}>
      {/* Header */}
      <div className="adm-page-header" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => navigate("/admin/companies")} className="adm-btn-ghost" aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <span style={{ width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg,#8B2252,#7f1d3a)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
          {initials(form.name || "")}
        </span>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <strong style={{ fontSize: 16 }}>{isNew ? t("admin.companies.detail.newTitle") : (form.name || t("admin.companies.detail.title"))}</strong>
          {data && <span style={{ fontSize: 11, color: "#6b7280" }}>#{data.company_number}</span>}
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: 8, flexWrap: "wrap" }}>
          {form.is_buyer && <span className="adm-chip is-buyer">{t("admin.companies.fields.buyer")}</span>}
          {form.is_supplier && <span className="adm-chip is-supplier">{t("admin.companies.fields.supplier")}</span>}
          {form.is_verified && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontSize: 12, fontWeight: 600 }}>
              <CheckCircle2 size={14} /> {t("admin.companies.fields.verified")}
            </span>
          )}
          {!isNew && (
            <span className={`adm-chip ${isActive ? "is-buyer" : ""}`}>{isActive ? t("admin.companies.filters.active") : t("admin.companies.filters.inactive")}</span>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" className="adm-btn-ghost" onClick={() => navigate("/admin/companies")}>
            <X size={14} style={{ marginRight: 4 }} /> {t("admin.companies.actions.cancel")}
          </button>
          {activeTab === "profile" && (
          <button type="button" className="crm-btn-primary" onClick={handleSave} disabled={saving || (!dirty && !isNew)} style={{ background: "#8B2252" }}>
            <Save size={14} style={{ marginRight: 4 }} /> {saving ? t("admin.companies.detail.saving") : t("admin.companies.detail.save")}
          </button>)}
        </div>
      </div>

      {/* Tab bar (only when editing existing company) */}
      {!isNew && (
        <div className="adm-company-tabs">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              className={`adm-company-tab ${activeTab === tb.key ? "is-active" : ""}`}
              onClick={() => setTab(tb.key)}
            >
              {tb.label}
            </button>
          ))}
        </div>
      )}

      {/* Profile tab — original form */}
      {(activeTab === "profile" || isNew) && (
      <div className="adm-form-grid">
        {/* Section 1: Business role */}
        <Section title={t("admin.companies.sections.role")} full>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: "4px 0 12px" }}>
            <Check label={t("admin.companies.fields.buyer")} checked={!!form.is_buyer} onChange={(v) => setField("is_buyer", v)} />
            <Check label={t("admin.companies.fields.supplier")} checked={!!form.is_supplier} onChange={(v) => setField("is_supplier", v)} />
          </div>
          {bothChecked && (
            <div style={{ display: "flex", gap: 8, padding: 12, borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1E40AF" }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{t("admin.companies.fields.bothRoleNote")}</span>
            </div>
          )}
        </Section>

        {/* Section 2: Protein + Cuts */}
        <Section title={t("admin.companies.sections.protein")} full>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              {t("admin.companies.fields.proteinProfile")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PROTEINS.map((p) => {
                const active = proteins.includes(p);
                return (
                  <button key={p} type="button" onClick={() => toggleProtein(p)} className="adm-chip" style={{ cursor: "pointer", background: active ? "#8B2252" : "#fff", color: active ? "#fff" : "#374151", borderColor: active ? "#8B2252" : "#e5e7eb" }}>
                    {t(`admin.companies.proteins.${p.toLowerCase()}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {proteins.length > 0 && (
            <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                {t("admin.companies.fields.preferredCuts")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {proteins.map((p) => (
                  <div key={p}>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                      {t(`admin.companies.proteins.${p.toLowerCase()}`)}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {CUTS_BY_PROTEIN[p].map((cut) => {
                        const active = cuts.includes(cutKey(p, cut));
                        return (
                          <button key={cut} type="button" onClick={() => toggleCut(p, cut)} className="adm-chip" style={{ cursor: "pointer", fontSize: 11, background: active ? "#8B2252" : "#fff", color: active ? "#fff" : "#374151", borderColor: active ? "#8B2252" : "#e5e7eb" }}>
                            {cut}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Section 3: Company info */}
        <Section title={t("admin.companies.sections.company")}>
          <Field label={t("admin.companies.fields.companyName") + " *"}>
            <input value={form.name ?? ""} onChange={(e) => setField("name", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.taxId") + " *"}>
            <input value={form.tax_id ?? ""} onChange={(e) => setField("tax_id", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.licenses")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px dashed #d1d5db", borderRadius: 6, color: "#6b7280", fontSize: 12, background: "#f9fafb" }}>
              <Upload size={14} />
              {t("admin.companies.fields.licensesHint")}
            </div>
          </Field>
        </Section>

        {/* Section 4: Business contact */}
        <Section title={t("admin.companies.sections.contact")}>
          <Field label={t("admin.companies.fields.country") + " *"}>
            <input value={form.country ?? ""} onChange={(e) => setField("country", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.state") + " *"}>
            <input value={form.state ?? ""} onChange={(e) => setField("state", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.city")}>
            <input value={form.city ?? ""} onChange={(e) => setField("city", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.address") + " *"}>
            <input value={form.address ?? ""} onChange={(e) => setField("address", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.zipCode")}>
            <input value={form.zip_code ?? ""} onChange={(e) => setField("zip_code", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.phone") + " *"}>
            <input value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} placeholder="+1 555 555 5555" />
          </Field>
          <Field label={t("admin.companies.fields.website")}>
            <input value={form.website ?? ""} onChange={(e) => setField("website", e.target.value)} placeholder="https://…" />
          </Field>
        </Section>

        {/* Section 5: Admin (only edit) */}
        {!isNew && data && (
          <Section title={t("admin.companies.sections.admin")} full>
            <Field label={t("admin.companies.fields.verified")}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.is_verified} onChange={(e) => setField("is_verified", e.target.checked)} style={{ accentColor: "#8B2252" }} />
                {form.is_verified ? t("common.yes") : "—"}
              </label>
            </Field>
            <Field label={t("admin.companies.fields.status")}>
              <select value={form.status ?? "active"} onChange={(e) => setField("status", e.target.value)}>
                <option value="active">{t("admin.companies.filters.active")}</option>
                <option value="inactive">{t("admin.companies.filters.inactive")}</option>
              </select>
            </Field>
            <Field label={t("admin.companies.fields.rating")}>
              <input type="number" min={0} max={5} step={0.1} value={form.rating ?? 0} onChange={(e) => setField("rating", Number(e.target.value))} />
            </Field>
            <ReadOnly label={t("admin.companies.fields.onboarded")} value={onboardedDisplay} />
            <ReadOnly label={t("admin.companies.fields.companyNumber")} value={`#${data.company_number}`} />
          </Section>
        )}
      </div>
      )}

      {/* Profile-related sub-tabs use shared component */}
      {!isNew && id && activeTab !== "profile" && (
        <div style={{ marginTop: 16 }}>
          <ProfileTabContent tab={activeTab} companyId={id} />
        </div>
      )}

      {!isNew && (
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => setDeleteOpen(true)} className="adm-btn-ghost" style={{ color: "#b91c1c", borderColor: "#fecaca" }}>
            <Trash2 size={14} style={{ marginRight: 6 }} /> {t("admin.companies.detail.deleteTitle")}
          </button>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.companies.detail.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.companies.detail.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.companies.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: "#b91c1c" }}>
              {t("admin.companies.detail.deleteTitle")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

function Section({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className="adm-panel" style={{ padding: 16, gridColumn: full ? "1 / -1" : undefined }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b7280" }}>{title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="adm-field">
      <span>{label}</span>
      <div style={{ padding: "8px 10px", background: "#f9fafb", borderRadius: 6, fontSize: 12, color: "#374151", border: "1px solid #e5e7eb", wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#8B2252", width: 16, height: 16 }} />
      {label}
    </label>
  );
}

function ProfileTabContent({ tab, companyId }: { tab: string; companyId: string }) {
  // The shared component renders all 6 sections; we hide via CSS using a data-attribute scope per tab.
  // Simpler: just render the full sections; admin can scroll to the active one. Each section is independent.
  // But to keep tabs meaningful, we scope visibility with a wrapper class.
  return (
    <div className={`adm-profile-scope adm-profile-scope-${tab}`}>
      <CompanyProfileSections companyId={companyId} canEdit />
    </div>
  );
}