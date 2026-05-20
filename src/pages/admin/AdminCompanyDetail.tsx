import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save, X, Power, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminCompany, type CompanyPatch } from "@/hooks/useAdminCompany";
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

type Props = { mode?: "edit" | "new" };

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
  logo_url: "",
  is_buyer: false,
  is_supplier: false,
  is_verified: false,
  rating: 0,
  business_types: "",
  protein_profiles: [],
  status: "active",
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "M";
}

export default function AdminCompanyDetail({ mode = "edit" }: Props) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = mode === "new";
  const { data, loading, error, save, create, setActive, refresh } = useAdminCompany(isNew ? undefined : id);

  const [form, setForm] = useState<CompanyPatch>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
        logo_url: data.logo_url ?? "",
        is_buyer: !!data.is_buyer,
        is_supplier: !!data.is_supplier,
        is_verified: !!data.is_verified,
        rating: data.rating ?? 0,
        business_types: data.business_types ?? "",
        protein_profiles: data.protein_profiles ?? [],
        status: data.status ?? "active",
      });
      setDirty(false);
    }
  }, [data]);

  const isActive = (form.status ?? "active") === "active";

  const setField = <K extends keyof CompanyPatch>(k: K, v: CompanyPatch[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
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
        toast.success(t("admin.companies.toast.created"));
        if (res.id) navigate(`/admin/companies/${res.id}`, { replace: true });
      } else {
        const res = await save(form);
        if (!res.ok) { toast.error(res.error ?? t("admin.companies.toast.error")); return; }
        toast.success(t("admin.companies.toast.saved"));
        setDirty(false);
      }
    } finally { setSaving(false); }
  };

  const handleToggleActive = async () => {
    setConfirmOpen(false);
    setSaving(true);
    const res = await setActive(!isActive);
    setSaving(false);
    if (!res.ok) { toast.error(res.error ?? t("admin.companies.toast.error")); return; }
    toast.success(isActive ? t("admin.companies.toast.deactivated") : t("admin.companies.toast.activated"));
    await refresh();
  };

  const proteinText = useMemo(() => (form.protein_profiles ?? []).join(", "), [form.protein_profiles]);

  if (!isNew && loading) return <div className="adm-body"><div className="adm-panel" style={{ padding: 16 }}>{t("common.loading")}</div></div>;
  if (!isNew && error) return <div className="adm-body"><div className="adm-panel" style={{ padding: 16, color: "#b91c1c" }}>{error}</div></div>;

  return (
    <div className="adm-body" style={{ paddingBottom: 96 }}>
      {/* Header */}
      <div className="adm-page-header" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => navigate("/admin/companies")} className="adm-btn-ghost" aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        {form.logo_url ? (
          <img src={form.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
        ) : (
          <span style={{ width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg,#9b2251,#7f1d3a)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
            {initials(form.name || "")}
          </span>
        )}
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <strong style={{ fontSize: 16 }}>{form.name || t("admin.companies.actions.new")}</strong>
          {data && <span style={{ fontSize: 11, color: "#6b7280" }}>#{data.company_number}</span>}
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
          {form.is_buyer && <span className="adm-chip is-buyer">{t("admin.companies.filters.buyer")}</span>}
          {form.is_supplier && <span className="adm-chip is-supplier">{t("admin.companies.filters.supplier")}</span>}
          {form.is_verified && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontSize: 12, fontWeight: 600 }}>
              <CheckCircle2 size={14} /> {t("admin.companies.fields.isVerified")}
            </span>
          )}
          <span className={`adm-chip ${isActive ? "is-buyer" : ""}`}>{isActive ? t("admin.companies.filters.active") : t("admin.companies.filters.inactive")}</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {!isNew && (
            <button type="button" className="adm-btn-ghost" onClick={() => setConfirmOpen(true)}>
              <Power size={14} style={{ marginRight: 4 }} />
              {isActive ? t("admin.companies.actions.deactivate") : t("admin.companies.actions.activate")}
            </button>
          )}
          <button type="button" className="adm-btn-ghost" onClick={() => navigate("/admin/companies")}>
            <X size={14} style={{ marginRight: 4 }} /> {t("admin.companies.actions.cancel")}
          </button>
          <button type="button" className="crm-btn-primary" onClick={handleSave} disabled={saving || (!dirty && !isNew)}>
            <Save size={14} style={{ marginRight: 4 }} /> {t("admin.companies.actions.save")}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="adm-form-grid">
        <Section title={t("admin.companies.sections.identity")}>
          <Field label={t("admin.companies.fields.name") + " *"}>
            <input value={form.name ?? ""} onChange={(e) => setField("name", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.taxId") + " *"}>
            <input value={form.tax_id ?? ""} onChange={(e) => setField("tax_id", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.website")}>
            <input value={form.website ?? ""} onChange={(e) => setField("website", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label={t("admin.companies.fields.phone") + " *"}>
            <input value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.logoUrl")}>
            <input value={form.logo_url ?? ""} onChange={(e) => setField("logo_url", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label={t("admin.companies.fields.rating")}>
            <input type="number" min={0} max={5} step={0.1} value={form.rating ?? 0} onChange={(e) => setField("rating", Number(e.target.value))} />
          </Field>
        </Section>

        <Section title={t("admin.companies.sections.address")}>
          <Field label={t("admin.companies.fields.address") + " *"}>
            <input value={form.address ?? ""} onChange={(e) => setField("address", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.city")}>
            <input value={form.city ?? ""} onChange={(e) => setField("city", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.state") + " *"}>
            <input value={form.state ?? ""} onChange={(e) => setField("state", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.country") + " *"}>
            <input value={form.country ?? ""} onChange={(e) => setField("country", e.target.value)} />
          </Field>
          <Field label={t("admin.companies.fields.zipCode")}>
            <input value={form.zip_code ?? ""} onChange={(e) => setField("zip_code", e.target.value)} />
          </Field>
        </Section>

        <Section title={t("admin.companies.sections.classification")} full>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
            <Toggle label={t("admin.companies.fields.isBuyer")} checked={!!form.is_buyer} onChange={(v) => setField("is_buyer", v)} />
            <Toggle label={t("admin.companies.fields.isSupplier")} checked={!!form.is_supplier} onChange={(v) => setField("is_supplier", v)} />
            <Toggle label={t("admin.companies.fields.isVerified")} checked={!!form.is_verified} onChange={(v) => setField("is_verified", v)} />
          </div>
          <Field label={t("admin.companies.fields.businessTypes")}>
            <input value={form.business_types ?? ""} onChange={(e) => setField("business_types", e.target.value)} placeholder='e.g. ["processor","exporter"]' />
          </Field>
          <Field label={t("admin.companies.fields.proteinProfiles")}>
            <input
              value={proteinText}
              onChange={(e) => setField("protein_profiles", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="beef, pork, poultry"
            />
          </Field>
        </Section>

        {!isNew && data && (
          <Section title={t("admin.companies.sections.onboarding")} full>
            <ReadOnly label={t("admin.companies.fields.onboardedAt")} value={data.onboarded_at ?? "—"} />
            <ReadOnly label={t("admin.companies.fields.onboardedBy")} value={data.onboarded_by ?? "—"} />
            <ReadOnly label={t("admin.companies.fields.onboardedFromProspect")} value={data.onboarded_from_prospect_id ?? "—"} />
            <ReadOnly label={t("admin.companies.fields.createdAt")} value={data.created_at ?? "—"} />
            <ReadOnly label={t("admin.companies.fields.updatedAt")} value={data.updated_at ?? "—"} />
          </Section>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive ? t("admin.companies.confirmDeactivate.title") : t("admin.companies.confirmActivate.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isActive ? t("admin.companies.confirmDeactivate.body") : t("admin.companies.confirmActivate.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.companies.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive}>
              {isActive ? t("admin.companies.actions.deactivate") : t("admin.companies.actions.activate")}
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#8B2252" }} />
      {label}
    </label>
  );
}