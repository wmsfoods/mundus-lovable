import { useState } from "react";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";
import { LogoUploader } from "./LogoUploader";
import { CountrySelect } from "./CountrySelect";

const schema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(120),
  country: z.string().trim().min(1, "Country is required").max(80),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  taxId: z.string().trim().max(80).optional().or(z.literal("")),
  website: z.string().trim().max(255).url("Invalid URL").optional().or(z.literal("")),
  logoUrl: z.string().trim().max(500).url("Invalid URL").optional().or(z.literal("")),
  contactName: z.string().trim().min(1, "Contact name is required").max(120),
  contactEmail: z.string().trim().email("Invalid email").max(255),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  role: z.string().trim().max(60).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const empty: FormData = {
  companyName: "", country: "", city: "", taxId: "", website: "", logoUrl: "",
  contactName: "", contactEmail: "", contactPhone: "", role: "master_supplier",
};

export function CreateSupplierProfileModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (companyId: string) => void;
}) {
  const [form, setForm] = useState<FormData>(empty);
  const [addMundusAdmin, setAddMundusAdmin] = useState(true);
  const [mundusManaged, setMundusManaged] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  if (!open) return null;

  const upd = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const e: Partial<Record<keyof FormData, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormData;
        if (!e[k]) e[k] = issue.message;
      }
      setErrors(e);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const f = parsed.data;
      const { data: company, error: cErr } = await supabase
        .from("companies")
        .insert({
          name: f.companyName,
          country: f.country,
          city: f.city || null,
          tax_id: f.taxId || null,
          phone: f.contactPhone || "-",
          address: "-",
          state: "-",
          website: f.website || null,
          logo_url: f.logoUrl || null,
          office_type: "headquarters",
          is_supplier: true,
          is_buyer: false,
          mundus_managed_supplier: mundusManaged,
        })
        .select("id")
        .single();
      if (cErr || !company) throw cErr ?? new Error("Failed to create company");

      const { error: tiErr } = await supabase.from("team_invitations").insert({
        company_id: company.id,
        email: f.contactEmail.toLowerCase(),
        full_name: f.contactName,
        phone: f.contactPhone || null,
        profile_type: f.role || "master_supplier",
        role: (f.role || "").includes("master") ? "master" : "member",
        account_status: "pending",
      });
      if (tiErr) throw tiErr;

      if (addMundusAdmin) {
        const { data: auth } = await supabase.auth.getUser();
        const adminId = auth?.user?.id;
        if (adminId) {
          const { data: existing } = await supabase
            .from("user_offices")
            .select("id")
            .eq("user_id", adminId)
            .eq("company_id", company.id)
            .maybeSingle();
          if (!existing) {
            await supabase.from("user_offices").insert({
              user_id: adminId,
              company_id: company.id,
              role: "office_admin",
              is_primary: false,
            });
          }
        }
      }

      toast.success("Supplier profile created");
      auditLog({
        action: "company.supplier_created",
        category: "company",
        entityType: "company",
        entityId: company.id,
        entityLabel: f.companyName,
        details: { mundus_managed: mundusManaged },
      });
      setForm(empty);
      onCreated?.(company.id);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to create supplier: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="adm-panel create-profile-modal"
        style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>🏢 Create Supplier Profile</h2>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Company Name *" error={errors.companyName}>
            <input style={inputStyle} value={form.companyName} onChange={(e) => upd("companyName", e.target.value)} maxLength={120} />
          </Field>
          <div className="field-row" style={twoCol}>
            <Field label="Country *" error={errors.country}>
              <CountrySelect
                style={inputStyle}
                value={form.country}
                onChange={(v) => upd("country", v)}
              />
            </Field>
            <Field label="City" error={errors.city}>
              <input style={inputStyle} value={form.city} onChange={(e) => upd("city", e.target.value)} maxLength={80} />
            </Field>
          </div>
          <div className="field-row" style={twoCol}>
            <Field label="Tax ID / Registration" error={errors.taxId}>
              <input style={inputStyle} value={form.taxId} onChange={(e) => upd("taxId", e.target.value)} maxLength={80} />
            </Field>
            <Field label="Website" error={errors.website}>
              <input style={inputStyle} value={form.website} onChange={(e) => upd("website", e.target.value)} placeholder="https://..." maxLength={255} />
            </Field>
          </div>
          <LogoUploader value={form.logoUrl} onChange={(url) => upd("logoUrl", url)} />

          <div style={{ borderTop: "1px solid #e5e7eb", margin: "8px 0 0", paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>Primary Contact</div>
            <Field label="Full Name *" error={errors.contactName}>
              <input style={inputStyle} value={form.contactName} onChange={(e) => upd("contactName", e.target.value)} maxLength={120} />
            </Field>
            <div className="field-row" style={twoCol}>
              <Field label="Email *" error={errors.contactEmail}>
                <input style={inputStyle} type="email" value={form.contactEmail} onChange={(e) => upd("contactEmail", e.target.value)} maxLength={255} />
              </Field>
              <Field label="Phone" error={errors.contactPhone}>
                <input style={inputStyle} value={form.contactPhone} onChange={(e) => upd("contactPhone", e.target.value)} maxLength={40} />
              </Field>
            </div>
            <Field label="Role">
              <select style={inputStyle} value={form.role} onChange={(e) => upd("role", e.target.value)}>
                <option value="master_supplier">Master Supplier</option>
                <option value="supplier_user">Supplier User</option>
                <option value="office_admin">Office Admin</option>
              </select>
            </Field>
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 12 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={mundusManaged}
                onChange={(e) => { setMundusManaged(e.target.checked); setAddMundusAdmin(e.target.checked); }}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong>Mundus manages offers for this supplier</strong>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  Allows the Mundus team to create and manage offers on behalf of this supplier.
                </div>
              </span>
            </label>
          </div>
        </div>

        <div className="actions" style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={submitting} style={btnGhost}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={submitting} style={btnPrimary}>
            {submitting ? "Creating…" : "Create Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 11, color: "#b91c1c" }}>{error}</span>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13, background: "white", width: "100%",
};
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const btnGhost: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "white", fontSize: 13, cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, border: "1px solid #8B2252", background: "#8B2252", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
