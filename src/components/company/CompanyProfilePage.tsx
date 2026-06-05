import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Beef,
  ClipboardList,
  ShoppingCart,
  Plus,
  X,
  Copy,
  Star,
  Users as UsersIcon,
  Shield,
  Trash2,
  CheckCircle2,
  Camera,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Crumbs } from "@/components/mundus/Crumbs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { usePaymentTerms } from "@/hooks/usePaymentTerms";
import { countryFlag } from "@/lib/countryFlags";
import { AddressAutocomplete } from "@/components/mundus/AddressAutocomplete";
import CompanyUsersPage from "@/components/users/CompanyUsersPage";
import { auditLog } from "@/lib/auditLog";
import { BillingSection } from "@/components/billing/BillingSection";
import SupplierBrandsManager from "@/components/company/SupplierBrandsManager";
import "@/styles/mundus-address.css";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import { useIsCompanyMaster } from "@/hooks/useIsCompanyMaster";

type Role = "buyer" | "supplier" | "admin";

type LocationRow = {
  id: string;
  _isNew?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
  parent_company_id: string | null; // null = HQ stored on companies row; else company_id (location row)
  office_type: string | null; // headquarters | office | factory | warehouse
  office_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  est_number: string | null;
  plant_numbers: string[];
};

type CompanyRow = {
  id: string;
  name: string;
  tax_id: string | null;
  phone: string | null;
  website: string | null;
  protein_profiles: string[] | null;
  buyer_protein_profile: string[] | null;
  preferred_cuts: string[] | null;
  preferred_payment_terms: string | null;
  preferred_incoterms: string[] | null;
  countries_of_operation: string[] | null;
  ports_of_shipment: string[] | null;
  is_buyer: boolean | null;
  is_supplier: boolean | null;
};

const PROTEINS = ["Beef", "Pork", "Poultry", "Ovine"];
const INCOTERMS = ["FOB", "CFR", "CIF", "EXW", "DAP", "DDP"];

function newLocalId() {
  return `new-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CompanyProfilePage({
  role,
  companyIdOverride,
  isAdminView = false,
}: {
  role: Role;
  companyIdOverride?: string | null;
  isAdminView?: boolean;
}) {
  const { company: cur } = useCurrentCompany();
  const navigate = useNavigate();
  const companyId = companyIdOverride ?? cur?.id ?? null;
  const { terms: PAYMENT_TERMS } = usePaymentTerms({ scope: "international" });
  const { isAdmin: isMundusAdmin } = useIsMundusAdmin();
  const { isMaster } = useIsCompanyMaster(companyId);
  const canEdit = isAdminView || isMundusAdmin || isMaster;
  const readOnly = !canEdit;
  // In admin view we resolve the profile-role from the company itself.
  const [adminFlags, setAdminFlags] = useState<{
    is_verified: boolean;
    status: string;
    mundus_managed_supplier: boolean;
    mundus_managed_buyer: boolean;
    logo_url: string | null;
  }>({ is_verified: false, status: "active", mundus_managed_supplier: false, mundus_managed_buyer: false, logo_url: null });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const uploadLogo = async (file: File) => {
    if (!file || !companyId) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingLogo(true);
    try {
      let blob: Blob = file;
      let ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      try {
        const { processLogo, dataUrlToBlob } = await import("@/lib/logoProcessor");
        const processed = await processLogo(file, { size: 400 });
        blob = await dataUrlToBlob(processed);
        ext = "png";
      } catch (procErr) {
        console.warn("Logo processing failed, uploading original", procErr);
      }
      const path = `companies/${companyId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
        cacheControl: "3600", upsert: true, contentType: ext === "png" ? "image/png" : file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await (supabase as any).from("companies").update({ logo_url: url }).eq("id", companyId);
      if (updErr) throw updErr;
      setAdminFlags((s) => ({ ...s, logo_url: url }));
      toast.success("Logo updated");
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message ?? "unknown"));
    } finally {
      setUploadingLogo(false);
    }
  };

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"profile" | "locations" | "team">("profile");

  // Reference data from DB
  const [marketCountries, setMarketCountries] = useState<
    { id: string; name: string; flag: string }[]
  >([]);
  const [allPorts, setAllPorts] = useState<
    { id: string; name: string; code: string | null; country_id: string; country_name: string; flag: string }[]
  >([]);
  const [allCuts, setAllCuts] = useState<{ id: string; name: string; category: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [mRes, cRes, pRes, cutsRes] = await Promise.all([
        (supabase as any).from("markets").select("id, country_id, is_active").eq("is_active", true),
        (supabase as any).from("countries").select("id, english_name, flag_emoji"),
        (supabase as any).from("ports").select("id, name, code, country_id, is_active").eq("is_active", true).order("name"),
        (supabase as any).from("cuts").select("id, name, category, is_active").eq("is_active", true).order("name"),
      ]);
      if (cancelled) return;
      const countriesById = new Map<string, any>();
      for (const c of cRes.data ?? []) countriesById.set(c.id, c);
      const mc = ((mRes.data ?? []) as any[])
        .map((m) => {
          const c = countriesById.get(m.country_id);
          if (!c) return null;
          return { id: c.id, name: c.english_name as string, flag: (c.flag_emoji ?? "") as string };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setMarketCountries(mc as any);
      setAllPorts(
        ((pRes.data ?? []) as any[]).map((p) => {
          const c = countriesById.get(p.country_id);
          return {
            id: p.id,
            name: p.name,
            code: p.code,
            country_id: p.country_id,
            country_name: (c?.english_name ?? "") as string,
            flag: (c?.flag_emoji ?? "") as string,
          };
        }),
      );
      setAllCuts(((cutsRes.data ?? []) as any[]).map((c) => ({ id: c.id, name: c.name, category: c.category })));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: hqRows }, { data: locRows }] = await Promise.all([
        (supabase as any)
        .from("companies")
        .select(
          "id, name, tax_id, phone, website, protein_profiles, buyer_protein_profile, preferred_cuts, preferred_payment_terms, preferred_incoterms, countries_of_operation, ports_of_shipment, is_buyer, is_supplier, office_name, address, city, state, country, zip_code, est_number, is_verified, status, mundus_managed_supplier, mundus_managed_buyer, logo_url"
        )
          .eq("id", companyId),
        (supabase as any)
          .from("company_locations")
          .select("id, company_id, location_type, name, address, city, state, country, zip_code, est_number, plant_numbers")
          .eq("company_id", companyId)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      const hq = (hqRows || [])[0];
      const children = (locRows || []) as any[];
      if (hq) {
        setCompany({
          id: hq.id,
          name: hq.name,
          tax_id: hq.tax_id,
          phone: hq.phone,
          website: hq.website,
          protein_profiles: hq.protein_profiles || [],
          buyer_protein_profile: hq.buyer_protein_profile || [],
          preferred_cuts: hq.preferred_cuts || [],
          preferred_payment_terms: hq.preferred_payment_terms,
          preferred_incoterms: hq.preferred_incoterms || [],
          countries_of_operation: hq.countries_of_operation || [],
          ports_of_shipment: hq.ports_of_shipment || [],
          is_buyer: hq.is_buyer,
          is_supplier: hq.is_supplier,
        });
        setAdminFlags({
          is_verified: !!(hq as any).is_verified,
          status: (hq as any).status ?? "active",
          mundus_managed_supplier: !!(hq as any).mundus_managed_supplier,
          mundus_managed_buyer: !!(hq as any).mundus_managed_buyer,
          logo_url: (hq as any).logo_url ?? null,
        });
        const hqLoc: LocationRow = {
          id: hq.id,
          parent_company_id: null,
          office_type: "headquarters",
          office_name: hq.office_name || "Headquarters",
          address: hq.address,
          city: hq.city,
          state: hq.state,
          country: hq.country,
          zip_code: hq.zip_code,
          est_number: hq.est_number,
          plant_numbers: [],
        };
        const childLocs: LocationRow[] = children.map((c) => ({
          id: c.id,
          parent_company_id: c.company_id,
          office_type: c.location_type || "office",
          office_name: c.name,
          address: c.address,
          city: c.city,
          state: c.state,
          country: c.country,
          zip_code: c.zip_code,
          est_number: c.est_number,
          plant_numbers: (c.plant_numbers as string[] | null) ?? [],
        }));
        setLocations([hqLoc, ...childLocs]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function patchCompany(p: Partial<CompanyRow>) {
    setCompany((c) => (c ? { ...c, ...p } : c));
    setDirty(true);
  }

  function patchLocation(id: string, p: Partial<LocationRow>) {
    setLocations((arr) =>
      arr.map((l) => (l.id === id ? { ...l, ...p, _dirty: true } : l)),
    );
    setDirty(true);
  }

  function addLocation(type: "office" | "factory") {
    const nl: LocationRow = {
      id: newLocalId(),
      _isNew: true,
      _dirty: true,
      parent_company_id: companyId,
      office_type: type,
      office_name: type === "factory" ? "New Factory" : "New Office",
      address: "",
      city: "",
      state: "",
      country: "",
      zip_code: "",
      est_number: null,
      plant_numbers: [],
    };
    setLocations((arr) => [...arr, nl]);
    setDirty(true);
  }

  function duplicateLocation(src: LocationRow) {
    const nl: LocationRow = {
      ...src,
      id: newLocalId(),
      _isNew: true,
      _dirty: true,
      parent_company_id: companyId,
      office_name: `${src.office_name || "Location"} (copy)`,
      est_number: null,
      plant_numbers: [...(src.plant_numbers || [])],
    };
    setLocations((arr) => [...arr, nl]);
    setDirty(true);
  }

  function removeLocation(id: string) {
    const loc = locations.find((l) => l.id === id);
    if (!loc) return;
    if (loc.office_type === "headquarters") {
      toast.error("Headquarters cannot be removed.");
      return;
    }
    if (loc._isNew) {
      setLocations((arr) => arr.filter((l) => l.id !== id));
    } else {
      setLocations((arr) =>
        arr.map((l) => (l.id === id ? { ...l, _deleted: true } : l)),
      );
    }
    setDirty(true);
  }

  async function handleSave() {
    if (!company || !companyId) return;
    setSaving(true);
    try {
      const hq = locations.find((l) => l.office_type === "headquarters");
      // Validate
      for (const l of locations) {
        if (l._deleted) continue;
        if (l.office_type === "factory" && !(l.est_number && l.est_number.trim())) {
          toast.error(`EST number is required for factory "${l.office_name || "—"}"`);
          setSaving(false);
          return;
        }
      }
      // Update HQ + company fields together
      const { error: e1 } = await (supabase as any)
        .from("companies")
        .update({
          name: company.name,
          tax_id: company.tax_id,
          phone: company.phone,
          website: company.website,
          protein_profiles: company.protein_profiles,
          buyer_protein_profile: company.buyer_protein_profile,
          preferred_cuts: company.preferred_cuts,
          preferred_payment_terms: company.preferred_payment_terms,
          preferred_incoterms: company.preferred_incoterms,
          countries_of_operation: company.countries_of_operation,
          ports_of_shipment: company.ports_of_shipment,
          address: hq?.address ?? null,
          city: hq?.city ?? null,
          state: hq?.state ?? null,
          country: hq?.country ?? null,
          zip_code: hq?.zip_code ?? null,
          office_name: hq?.office_name ?? null,
          est_number: hq?.est_number ?? null,
        })
        .eq("id", companyId);
      if (e1) throw e1;

      for (const l of locations) {
        if (l.office_type === "headquarters") continue;
        if (l._deleted && !l._isNew) {
          const { error } = await (supabase as any).from("company_locations").delete().eq("id", l.id);
          if (error) throw error;
          continue;
        }
        if (l._isNew && !l._deleted) {
          const { error } = await (supabase as any).from("company_locations").insert({
            company_id: companyId,
            location_type: l.office_type,
            name: l.office_name,
            address: l.address,
            city: l.city,
            state: l.state,
            country: l.country,
            zip_code: l.zip_code,
            est_number: l.est_number,
            plant_numbers: l.plant_numbers || [],
          });
          if (error) throw error;
          continue;
        }
        if (l._dirty) {
          const { error } = await (supabase as any)
            .from("company_locations")
            .update({
              location_type: l.office_type,
              name: l.office_name,
              address: l.address,
              city: l.city,
              state: l.state,
              country: l.country,
              zip_code: l.zip_code,
              est_number: l.est_number,
              plant_numbers: l.plant_numbers || [],
            })
            .eq("id", l.id);
          if (error) throw error;
        }
      }
      toast.success("Company saved");
      setDirty(false);
      // refresh locations to drop _isNew flags
      setLocations((arr) =>
        arr
          .filter((l) => !l._deleted)
          .map((l) => ({ ...l, _isNew: false, _dirty: false })),
      );
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const countryOptions = useMemo(
    () => marketCountries.map((c) => `${c.flag} ${c.name}`.trim()),
    [marketCountries],
  );
  const cutOptions = useMemo(() => allCuts.map((c) => c.name), [allCuts]);
  const portOptions = useMemo(() => {
    const fmt = (p: { name: string; code: string | null; flag: string }) =>
      `${p.flag} ${p.code ? `${p.name} (${p.code})` : p.name}`.trim();
    if (role === "buyer") return allPorts.map(fmt);
    const supplierCountries = new Set(
      locations
        .filter((l) => !l._deleted)
        .map((l) => (l.country || "").trim().toLowerCase())
        .filter(Boolean),
    );
    return allPorts
      .filter((p) => supplierCountries.has(p.country_name.toLowerCase()))
      .map(fmt);
  }, [allPorts, locations, role]);

  if (loading || !company) {
    return (
      <div className="cprofile-page">
        <Crumbs items={[{ label: "Home", to: `/${role}` }, { label: "My Company" }]} />
        <div className="cprofile-empty">Loading…</div>
      </div>
    );
  }

  const visibleLocations = locations.filter((l) => !l._deleted);

  // Pick the most relevant profile-role for the "Buyer/Supplier profile" cards in admin view.
  const effectiveRole: Exclude<Role, "admin"> =
    role !== "admin"
      ? role
      : company.is_supplier
        ? "supplier"
        : "buyer";
  const showBuyerCard = role === "admin" ? !!company.is_buyer : role === "buyer";
  const showSupplierCard = role === "admin" ? !!company.is_supplier : role === "supplier";
  const homePath = role === "admin" ? "/admin" : `/${role}`;
  const breadcrumbs = role === "admin"
    ? [{ label: "Admin", to: "/admin" }, { label: "Companies", to: "/admin/companies" }, { label: company.name || "Company" }]
    : [{ label: "Home", to: homePath }, { label: "My Company" }];

  return (
    <div className="cprofile-page">
      <Crumbs items={breadcrumbs} />

      {/* Header */}
      <div className="cprofile-header-bar">
        <div>
          <h1 className="cprofile-title">{role === "admin" ? company.name || "Company" : "My Company"}</h1>
          <p className="cprofile-sub">
            Update your company details, locations and plant numbers.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="cprofile-save"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>

      {readOnly && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            margin: "0 0 12px",
            borderRadius: 10,
            border: "1px solid #FCD34D",
            background: "#FFFBEB",
            color: "#92400E",
            fontSize: 13,
          }}
        >
          <Shield size={16} />
          <span>
            You are in read-only mode. Ask a master admin of this company to edit company
            details, locations or the logo.
          </span>
        </div>
      )}

      <fieldset
        disabled={readOnly}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
      <div className="cprofile-card cprofile-namecard">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo || !companyId || !canEdit}
            title="Upload company logo"
            style={{
              position: "relative", width: 96, height: 96, borderRadius: 999,
              border: "1px solid #e5e7eb", background: adminFlags.logo_url ? "#f3f4f6" : "#fdf2f8",
              overflow: "hidden", padding: 0, cursor: uploadingLogo ? "wait" : "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            {adminFlags.logo_url ? (
              <img src={adminFlags.logo_url} alt={company.name || "logo"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <span style={{ fontWeight: 700, color: "#8B2252", fontSize: 28 }}>
                {(company.name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"}
              </span>
            )}
            <span
              aria-hidden
              style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "#fff", opacity: uploadingLogo ? 1 : 0, transition: "opacity 0.15s",
              }}
              className="cprofile-logo-overlay"
            >
              {uploadingLogo ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
            </span>
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo || !companyId || !canEdit}
              style={{
                alignSelf: "flex-start", padding: "6px 12px", borderRadius: 8,
                border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600,
                cursor: uploadingLogo ? "wait" : "pointer", color: "#111827",
              }}
            >
              {uploadingLogo ? "Uploading…" : adminFlags.logo_url ? "Replace logo" : "Upload logo"}
            </button>
            <span style={{ fontSize: 12, color: "#6b7280" }}>PNG/JPG up to 5MB. Square works best.</span>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); e.currentTarget.value = ""; }}
          />
        </div>
        <div className="cprofile-namecard-top">
          <input
            className="cprofile-name-input"
            value={company.name || ""}
            onChange={(e) => patchCompany({ name: e.target.value })}
            placeholder="Company name"
          />
          {company.is_supplier && (
            <span className="cprofile-role-pill supplier">SUPPLIER</span>
          )}
          {company.is_buyer && (
            <span className="cprofile-role-pill buyer">BUYER</span>
          )}
        </div>
        <div className="cprofile-taxid">
          <span className="cprofile-tax-label">Tax ID:</span>
          <input
            className="cprofile-tax-input"
            value={company.tax_id || ""}
            onChange={(e) => patchCompany({ tax_id: e.target.value })}
            placeholder="—"
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Company sections"
        style={{
          display: "flex",
          gap: 4,
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          padding: 4,
          borderRadius: 12,
          margin: "16px 0",
          flexWrap: "wrap",
        }}
      >
        {([
          { id: "profile", label: "Profile" },
          { id: "locations", label: `Offices & factories (${visibleLocations.length})` },
          { id: "team", label: "Team" },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: "1 1 auto",
              minWidth: 120,
              padding: "10px 14px",
              borderRadius: 8,
              border: 0,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#8B2252" : "#475569",
              boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === LOCATIONS TAB === */}
      {tab === "locations" && (
        <>
      <OfficesOverview locations={visibleLocations} />
      <Section
        icon={<MapPin size={18} />}
        title="Locations"
        subtitle="Offices and factories — each factory needs an EST number."
        action={
          <button
            type="button"
            className="cprofile-add-btn"
            onClick={() => addLocation("office")}
          >
            <Plus size={14} /> Add location
          </button>
        }
      >
        <div className="cprofile-locations">
          {visibleLocations.map((loc) => (
            <LocationCard
              key={loc.id}
              loc={loc}
              onChange={(p) => patchLocation(loc.id, p)}
              onDuplicate={() => duplicateLocation(loc)}
              onRemove={() => removeLocation(loc.id)}
            />
          ))}
        </div>
      </Section>
        </>
      )}

      {/* === PROFILE TAB === */}
      {tab === "profile" && (
        <>
      <Section
        icon={<Phone size={18} />}
        title="Contact & website"
        subtitle="Phone and website for your profile."
      >
        <div className="cprofile-row2">
          <FieldLabel label="Phone">
            <PhoneInput
              value={company.phone || ""}
              onChange={(v) => patchCompany({ phone: v })}
            />
          </FieldLabel>
          <FieldLabel label="Website">
            <div className="cprofile-url">
              <span className="cprofile-url-prefix">
                <Globe size={13} /> https://
              </span>
              <input
                className="cprofile-url-input"
                value={(company.website || "").replace(/^https?:\/\//, "")}
                onChange={(e) =>
                  patchCompany({
                    website: e.target.value.replace(/^https?:\/\//, ""),
                  })
                }
                placeholder="example.com"
              />
            </div>
          </FieldLabel>
        </div>
      </Section>

      {/* Supplier profile */}
      {showSupplierCard && (
        <Section
          icon={<Beef size={18} />}
          title="Supplier profile"
          subtitle="What protein(s) do you trade?"
        >
          <FieldLabel label="Supplier protein profile">
            <ChipToggleGroup
              options={PROTEINS}
              value={company.protein_profiles || []}
              onChange={(v) => patchCompany({ protein_profiles: v })}
            />
          </FieldLabel>
        </Section>
      )}

      {/* Buyer profile */}
      {showBuyerCard && (
        <Section
          icon={<ShoppingCart size={18} />}
          title="Buyer profile"
          subtitle="What protein(s) do you buy?"
        >
          <FieldLabel label="Buyer protein profile">
            <ChipToggleGroup
              options={PROTEINS}
              value={company.buyer_protein_profile || []}
              onChange={(v) => patchCompany({ buyer_protein_profile: v })}
            />
          </FieldLabel>
          <FieldLabel label="Preferred Product / Cuts">
            <SearchableChipInput
              value={company.preferred_cuts || []}
              onChange={(v) => patchCompany({ preferred_cuts: v })}
              placeholder="Add cut…"
              options={cutOptions}
              allowCustom
            />
          </FieldLabel>
        </Section>
      )}

      {/* Trade Preferences */}
      <Section icon={<ClipboardList size={18} />} title="Trade Preferences">
        <FieldLabel label="Preferred Payment Terms">
          <select
            className="cprofile-select"
            value={company.preferred_payment_terms || ""}
            onChange={(e) =>
              patchCompany({ preferred_payment_terms: e.target.value })
            }
          >
            <option value="">Select…</option>
            {PAYMENT_TERMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Preferred Incoterms">
          <ChipToggleGroup
            options={INCOTERMS}
            value={company.preferred_incoterms || []}
            onChange={(v) => patchCompany({ preferred_incoterms: v })}
          />
        </FieldLabel>
        <FieldLabel label="Countries of Operation">
          <SearchableChipInput
            value={company.countries_of_operation || []}
            onChange={(v) => patchCompany({ countries_of_operation: v })}
            placeholder="Add country…"
            options={countryOptions}
            allowCustom={role === "buyer"}
          />
        </FieldLabel>
        <FieldLabel label="Ports of Shipment">
          <SearchableChipInput
            value={company.ports_of_shipment || []}
            onChange={(v) => patchCompany({ ports_of_shipment: v })}
            placeholder={
              effectiveRole === "supplier" && portOptions.length === 0
                ? "Add an office/factory location first…"
                : "Add port…"
            }
            options={portOptions}
            allowCustom={effectiveRole === "buyer"}
          />
        </FieldLabel>
      </Section>

        </>
      )}

      {/* === TEAM TAB === */}
      {tab === "team" && (
      <Section
        icon={<UsersIcon size={18} />}
        title="Team members"
        subtitle="People with access to this company. Masters can invite, edit and disable."
      >
        <CompanyUsersPage
          context={company.is_supplier ? "supplier" : "buyer"}
          companyIdOverride={companyId!}
        />
      </Section>
      )}

      {tab === "profile" && (
        <>
      {/* Brands — supplier-only manager, shown for admin or supplier of a supplier company */}
      {company.is_supplier && companyId && (role === "admin" || role === "supplier") && (
        <Section
          icon={<Star size={18} />}
          title="Brands"
          subtitle="Brands you can attach to each cut on your offers."
        >
          <SupplierBrandsManager companyId={companyId} canEdit={true} />
        </Section>
      )}

      {/* Mundus Admin Controls — visible only when admin team views this record */}
      {isAdminView && (
        <Section
          icon={<Shield size={18} />}
          title="Mundus admin controls"
          subtitle="These actions are only visible to the Mundus team."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <AdminToggle
              label={`Verified ${adminFlags.is_verified ? "✓" : ""}`}
              description="Marks the company as verified by Mundus."
              checked={adminFlags.is_verified}
              onChange={async (v) => {
                const { error } = await (supabase as any).from("companies").update({ is_verified: v }).eq("id", companyId);
                if (error) return toast.error(error.message);
                setAdminFlags((s) => ({ ...s, is_verified: v }));
                toast.success(v ? "Marked as verified" : "Verification removed");
              }}
            />
            <AdminToggle
              label="Active"
              description="Inactive companies cannot transact on the platform."
              checked={adminFlags.status === "active"}
              onChange={async (v) => {
                const next = v ? "active" : "inactive";
                const { error } = await (supabase as any).from("companies").update({ status: next }).eq("id", companyId);
                if (error) return toast.error(error.message);
                setAdminFlags((s) => ({ ...s, status: next }));
                toast.success(`Status set to ${next}`);
              }}
            />
            {company.is_supplier && (
              <AdminToggle
                label="Mundus manages offers"
                description="Allows the Mundus team to create and manage offers on behalf of this supplier."
                checked={adminFlags.mundus_managed_supplier}
                onChange={async (v) => {
                  const { error } = await (supabase as any).from("companies").update({ mundus_managed_supplier: v }).eq("id", companyId);
                  if (error) return toast.error(error.message);
                  setAdminFlags((s) => ({ ...s, mundus_managed_supplier: v }));
                  auditLog({ action: "company.mundus_managed_supplier_toggled", category: "company", entityType: "company", entityId: companyId!, details: { value: v } });
                  toast.success(v ? "Mundus now manages offers for this supplier" : "Supplier manages their own offers");
                }}
              />
            )}
            {company.is_buyer && (
              <AdminToggle
                label="Mundus manages requests"
                description="Allows the Mundus team to create and manage requests on behalf of this buyer."
                checked={adminFlags.mundus_managed_buyer}
                onChange={async (v) => {
                  const { error } = await (supabase as any).from("companies").update({ mundus_managed_buyer: v }).eq("id", companyId);
                  if (error) return toast.error(error.message);
                  setAdminFlags((s) => ({ ...s, mundus_managed_buyer: v }));
                  auditLog({ action: "company.mundus_managed_buyer_toggled", category: "company", entityType: "company", entityId: companyId!, details: { value: v } });
                  toast.success(v ? "Mundus now manages requests for this buyer" : "Buyer manages their own requests");
                }}
              />
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
              {company.is_supplier && adminFlags.mundus_managed_supplier && (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/create-offer?as_company=${companyId}`)}
                  style={{ padding: "10px 16px", background: "#8B2252", color: "#fff", border: 0, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  📝 Create Offer as {company.name}
                </button>
              )}
              {company.is_buyer && adminFlags.mundus_managed_buyer && (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/create-request?as_company=${companyId}`)}
                  style={{ padding: "10px 16px", background: "#2563EB", color: "#fff", border: 0, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  📝 Create Request as {company.name}
                </button>
              )}
            </div>

            <div style={{ height: 1, background: "#f1f5f9", margin: "8px 0" }} />

            <button
              type="button"
              onClick={async () => {
                if (!companyId) return;
                const ok = window.confirm(`Delete ${company.name}? This cannot be undone.`);
                if (!ok) return;
                const { error } = await (supabase as any).from("companies").delete().eq("id", companyId);
                if (error) return toast.error(error.message);
                auditLog({ action: "company.deleted", category: "company", entityType: "company", entityId: companyId, entityLabel: company.name, severity: "warn" });
                toast.success("Company deleted");
                navigate("/admin/companies");
              }}
              style={{
                alignSelf: "flex-start",
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 8, border: "1px solid #fecaca",
                background: "#fff", color: "#b91c1c", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              <Trash2 size={14} /> Delete company
            </button>
          </div>
        </Section>
      )}

      {role !== "admin" && companyId && (
        <div style={{ marginTop: 16 }}>
          <BillingSection side={role as "supplier" | "buyer"} />
        </div>
      )}
        </>
      )}
    </div>
  );
}

/* ------------ Pieces ------------ */

function Section({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="cprofile-section">
      <header className="cprofile-section-head">
        <div className="cprofile-section-title">
          <span className="cprofile-section-icon">{icon}</span>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="cprofile-section-body">{children}</div>
    </section>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cprofile-field">
      <label className="cprofile-label">{label}</label>
      {children}
    </div>
  );
}

function OfficesOverview({ locations }: { locations: LocationRow[] }) {
  if (!locations.length) return null;
  const hqCount = locations.filter((l) => l.office_type === "headquarters").length;
  const officeCount = locations.filter((l) => l.office_type === "office").length;
  const factoryCount = locations.filter((l) => l.office_type === "factory").length;
  return (
    <section
      style={{
        background: "linear-gradient(135deg, #FDF2F8 0%, #FFF 100%)",
        border: "1px solid #F9D0E0",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
            Network overview
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>
            {hqCount} HQ · {officeCount} office{officeCount === 1 ? "" : "s"} · {factoryCount} factor{factoryCount === 1 ? "y" : "ies"}
          </p>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {locations.map((loc) => {
          const isHQ = loc.office_type === "headquarters";
          const isFactory = loc.office_type === "factory";
          const pillBg = isHQ ? "#8B2252" : isFactory ? "#F59E0B" : "#3B82F6";
          const pillLabel = isHQ ? "HQ" : isFactory ? "FACTORY" : "OFFICE";
          return (
            <div
              key={loc.id}
              style={{
                background: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minHeight: 92,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{countryFlag(loc.country)}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color: "#fff",
                    background: pillBg,
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {pillLabel}
                </span>
                {loc.est_number && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#92400E",
                      background: "#FEF3C7",
                      padding: "2px 6px",
                      borderRadius: 4,
                      marginLeft: "auto",
                    }}
                  >
                    EST {loc.est_number}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.2 }}>
                {loc.office_name || "—"}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                {[loc.city, loc.country].filter(Boolean).join(", ") || "No address yet"}
              </div>
              {isFactory && loc.plant_numbers && loc.plant_numbers.length > 0 && (
                <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                  +{loc.plant_numbers.length} plant{loc.plant_numbers.length === 1 ? "" : "s"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AdminToggle({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => unknown | Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#FDF2F8", borderRadius: 12, border: "1px solid #F9D0E0" }}>
      <label style={{ position: "relative", display: "inline-block", width: 36, height: 20, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={busy}
          onChange={async (e) => { setBusy(true); try { await onChange(e.target.checked); } finally { setBusy(false); } }}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{ position: "absolute", inset: 0, cursor: busy ? "wait" : "pointer", background: checked ? "#8B2252" : "#cbd5e1", borderRadius: 999, transition: "background 0.2s" }} />
        <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
      </label>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>{description}</div>
      </div>
    </div>
  );
}

function LocationCard({
  loc,
  onChange,
  onDuplicate,
  onRemove,
}: {
  loc: LocationRow;
  onChange: (p: Partial<LocationRow>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const isHQ = loc.office_type === "headquarters";
  const isFactory = loc.office_type === "factory";
  return (
    <div className={`cprofile-loc-card ${isFactory ? "factory" : "office"}`}>
      <div className="cprofile-loc-head">
        <div className="cprofile-loc-badges">
          <span className={`cprofile-loc-type-pill ${isFactory ? "factory" : "office"}`}>
            {isFactory ? <Building2 size={11} /> : <Building2 size={11} />}
            {isFactory ? "FACTORY" : "OFFICE"}
          </span>
          {isHQ && (
            <span className="cprofile-loc-primary">
              <Star size={11} /> PRIMARY
            </span>
          )}
          <input
            className="cprofile-loc-name"
            value={loc.office_name || ""}
            onChange={(e) => onChange({ office_name: e.target.value })}
            placeholder="Location name"
          />
        </div>
        <div className="cprofile-loc-actions">
          <div className="cprofile-type-toggle" role="tablist" aria-label="Location type">
            <button
              type="button"
              className={!isFactory ? "is-active office" : ""}
              onClick={() => onChange({ office_type: isHQ ? "headquarters" : "office", est_number: null })}
              disabled={isHQ}
            >
              Office
            </button>
            <button
              type="button"
              className={isFactory ? "is-active factory" : ""}
              onClick={() => onChange({ office_type: "factory" })}
              disabled={isHQ}
            >
              Factory
            </button>
          </div>
          {!isHQ && (
            <>
              <button
                type="button"
                className="cprofile-icon-btn"
                onClick={onDuplicate}
                aria-label="Duplicate"
                title="Duplicate"
              >
                <Copy size={14} />
              </button>
              <button
                type="button"
                className="cprofile-icon-btn danger"
                onClick={onRemove}
                aria-label="Remove"
                title="Remove"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <FieldLabel label="Address Line">
        <AddressAutocomplete
          className="cprofile-input"
          value={loc.address || ""}
          onChange={(v) => onChange({ address: v })}
          onAddressSelect={(p) =>
            onChange({
              address: p.street || p.formatted,
              city: p.city || loc.city || "",
              state: p.state || loc.state || "",
              country: p.country || loc.country || "",
              zip_code: p.zip || loc.zip_code || "",
            })
          }
          placeholder="Start typing the address…"
        />
      </FieldLabel>
      <div className="cprofile-row2">
        <FieldLabel label="City">
          <input
            className="cprofile-input"
            value={loc.city || ""}
            onChange={(e) => onChange({ city: e.target.value })}
            autoComplete="address-level2"
          />
        </FieldLabel>
        <FieldLabel label="State">
          <input
            className="cprofile-input"
            value={loc.state || ""}
            onChange={(e) => onChange({ state: e.target.value })}
            autoComplete="address-level1"
          />
        </FieldLabel>
      </div>
      <div className="cprofile-row2">
        <FieldLabel label="Country">
          <input
            className="cprofile-input"
            value={loc.country || ""}
            onChange={(e) => onChange({ country: e.target.value })}
            autoComplete="country-name"
          />
        </FieldLabel>
        <FieldLabel label="ZIP / Postal Code">
          <input
            className="cprofile-input"
            value={loc.zip_code || ""}
            onChange={(e) => onChange({ zip_code: e.target.value })}
            autoComplete="postal-code"
          />
        </FieldLabel>
      </div>

      {isFactory && (
        <div className="cprofile-est">
          <label className="cprofile-est-label">
            EST Number / Plant Code
            <span className="cprofile-est-required">REQUIRED FOR FACTORY</span>
          </label>
          <input
            className="cprofile-est-input"
            value={loc.est_number || ""}
            onChange={(e) => onChange({ est_number: e.target.value })}
            placeholder="e.g. 2872"
          />
          <label className="cprofile-est-label" style={{ marginTop: 12 }}>
            Additional Plant Numbers (comma-separated)
          </label>
          <input
            className="cprofile-est-input"
            value={(loc.plant_numbers || []).join(", ")}
            onChange={(e) =>
              onChange({
                plant_numbers: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="e.g. 1234, 5678"
          />
        </div>
      )}
    </div>
  );
}

/* ------------ Inputs ------------ */

export function ChipToggleGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const set = useMemo(() => new Set(value), [value]);
  return (
    <div className="cprofile-chips">
      {options.map((opt) => {
        const on = set.has(opt);
        return (
          <button
            key={opt}
            type="button"
            className={`cprofile-chip ${on ? "is-on" : ""}`}
            onClick={() => {
              const next = new Set(value);
              if (on) next.delete(opt);
              else next.add(opt);
              onChange(Array.from(next));
            }}
          >
            {opt}
            {on && <span className="cprofile-chip-check">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ChipTagInput({
  value,
  onChange,
  placeholder,
  renderTag,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  renderTag?: (t: string) => string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const t = draft.trim();
    if (!t) return;
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  }
  return (
    <div className="cprofile-tags">
      {value.map((t) => (
        <span key={t} className="cprofile-tag">
          {renderTag ? renderTag(t) : t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            aria-label={`Remove ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <span className="cprofile-tag-input-wrap">
        <input
          className="cprofile-tag-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" className="cprofile-tag-add" onClick={add}>
          <Plus size={12} /> Add
        </button>
      </span>
    </div>
  );
}

const PHONE_FLAGS = [
  { code: "+55", flag: "🇧🇷", label: "Brazil" },
  { code: "+1", flag: "🇺🇸", label: "USA" },
  { code: "+86", flag: "🇨🇳", label: "China" },
  { code: "+44", flag: "🇬🇧", label: "UK" },
  { code: "+54", flag: "🇦🇷", label: "Argentina" },
  { code: "+34", flag: "🇪🇸", label: "Spain" },
  { code: "+33", flag: "🇫🇷", label: "France" },
  { code: "+49", flag: "🇩🇪", label: "Germany" },
];

export function PhoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const matched =
    PHONE_FLAGS.find((p) => value.startsWith(p.code)) || PHONE_FLAGS[0];
  const rest = value.startsWith(matched.code)
    ? value.slice(matched.code.length).trimStart()
    : value;
  return (
    <div className="cprofile-phone">
      <select
        className="cprofile-phone-cc"
        value={matched.code}
        onChange={(e) => {
          const next = PHONE_FLAGS.find((p) => p.code === e.target.value)!;
          onChange(`${next.code} ${rest}`.trim());
        }}
      >
        {PHONE_FLAGS.map((p) => (
          <option key={p.code} value={p.code}>
            {p.flag} {p.code}
          </option>
        ))}
      </select>
      <input
        className="cprofile-phone-input"
        value={rest}
        onChange={(e) => onChange(`${matched.code} ${e.target.value}`.trim())}
        placeholder="(11) 99888-1010"
        autoComplete="tel-national"
      />
    </div>
  );
}

/* ------------ Searchable Chip Input ------------ */

export function SearchableChipInput({
  value,
  onChange,
  options,
  placeholder,
  allowCustom = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = new Set(value);
  const term = draft.trim().toLowerCase();
  const filtered = options
    .filter((o) => !selected.has(o))
    .filter((o) => !term || o.toLowerCase().includes(term))
    .slice(0, 100);

  function add(v: string) {
    const t = v.trim();
    if (!t || selected.has(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  }

  return (
    <div className="cprofile-tags" ref={wrapRef} style={{ position: "relative" }}>
      {value.map((t) => (
        <span key={t} className="cprofile-tag">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
            ×
          </button>
        </span>
      ))}
      <span className="cprofile-tag-input-wrap">
        <input
          className="cprofile-tag-input"
          value={draft}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) add(filtered[0]);
              else if (allowCustom) add(draft);
            }
          }}
          placeholder={placeholder}
        />
      </span>
      {open && (filtered.length > 0 || (allowCustom && term)) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 30,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,.08)",
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                add(o);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontSize: 13,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fdf2f8")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
            >
              {o}
            </button>
          ))}
          {allowCustom && term && !filtered.some((o) => o.toLowerCase() === term) && (
            <button
              type="button"
              onClick={() => {
                add(draft);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                border: 0,
                borderTop: filtered.length ? "1px solid #f1f5f9" : 0,
                background: "transparent",
                cursor: "pointer",
                fontSize: 13,
                color: "#8B2252",
                fontWeight: 600,
              }}
            >
              + Add "{draft.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}