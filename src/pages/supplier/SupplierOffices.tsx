import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { GlobeIcon, HomeIcon, PlusIcon, MoreVerticalIcon, EditIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { Modal } from "@/components/mundus/Modal";
import { AddressAutocomplete } from "@/components/mundus/AddressAutocomplete";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useCompanyOffices, type Office, type OfficeInput } from "@/hooks/useCompanyOffices";
import { ManageOfficeUsersModal } from "@/components/supplier/ManageOfficeUsersModal";
import { toast } from "sonner";

const REGIONS = ["Asia Pacific", "Americas", "Europe", "Middle East & Africa", "Latin America"];

function regionFromCountry(country: string): string {
  const c = country.toLowerCase();
  if (/(china|japan|korea|india|singapore|vietnam|thailand|indonesia|malaysia|philippines|australia|new zealand|taiwan|hong kong)/.test(c)) return "Asia Pacific";
  if (/(brazil|argentina|chile|colombia|peru|mexico|uruguay|paraguay)/.test(c)) return "Latin America";
  if (/(united states|usa|canada)/.test(c)) return "Americas";
  if (/(germany|france|spain|italy|netherlands|belgium|poland|portugal|united kingdom|uk|ireland|sweden|norway|denmark|finland)/.test(c)) return "Europe";
  if (/(saudi|emirates|uae|qatar|kuwait|israel|egypt|south africa|nigeria|morocco)/.test(c)) return "Middle East & Africa";
  return "";
}

type FormState = {
  officeName: string;
  officeType: "regional_office" | "branch";
  country: string;
  region: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  plantNumbersText: string;
};

const EMPTY_FORM: FormState = {
  officeName: "",
  officeType: "regional_office",
  country: "",
  region: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  plantNumbersText: "",
};

export default function SupplierOffices() {
  const { company } = useCurrentCompany();
  const { offices, userCounts, offerCounts, loading, refetch, createOffice, updateOffice, deleteOffice } = useCompanyOffices(company?.id ?? null);
  const location = useLocation();
  const homeHref = location.pathname.startsWith("/buyer") ? "/buyer" : "/supplier";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [usersModalOffice, setUsersModalOffice] = useState<Office | null>(null);

  const hq = useMemo(() => offices.find((o) => o.id === company?.id) ?? null, [offices, company?.id]);
  const branches = useMemo(
    () => offices.filter((o) => o.id !== company?.id).sort((a, b) => (a.office_name || "").localeCompare(b.office_name || "")),
    [offices, company?.id]
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(o: Office) {
    setEditingId(o.id);
    setForm({
      officeName: o.office_name ?? "",
      officeType: (o.office_type === "branch" ? "branch" : "regional_office") as FormState["officeType"],
      country: o.office_country ?? o.country ?? "",
      region: o.office_region ?? "",
      address: o.address ?? "",
      city: o.city ?? "",
      state: o.state ?? "",
      zip: o.zip_code ?? "",
      phone: o.phone ?? "",
      plantNumbersText: (o.plant_numbers ?? []).join(", "),
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!company?.id || !hq) return;
    if (!form.officeName.trim() || !form.country.trim()) {
      toast.error("Office name and country are required");
      return;
    }
    setSaving(true);
    const plant_numbers = form.plantNumbersText
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: OfficeInput = {
      parent_company_id: company.id,
      name: hq.name,
      office_type: form.officeType,
      office_name: form.officeName.trim(),
      office_country: form.country,
      office_region: form.region || regionFromCountry(form.country),
      country: form.country,
      city: form.city,
      state: form.state,
      zip_code: form.zip,
      address: form.address,
      phone: form.phone,
      plant_numbers,
      is_buyer: hq.is_buyer,
      is_supplier: hq.is_supplier,
    };
    try {
      if (editingId) {
        await updateOffice(editingId, payload);
        toast.success("Office updated");
      } else {
        // Required NOT NULL fields on companies table when inserting fresh row:
        const fullPayload = {
          ...payload,
          tax_id: `${hq.id}-${Date.now()}`,
          phone: form.phone || hq.phone || "—",
          state: form.state || "—",
          address: form.address || "—",
        };
        await createOffice(fullPayload);
        toast.success("Office created");
      }
      setModalOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(o: Office) {
    if (!confirm(`Delete "${o.office_name}"? This will reassign all offers and users to headquarters.`)) return;
    try {
      await deleteOffice(o.id);
      toast.success("Office deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="cp-page" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Crumbs items={[{ label: "Home", to: homeHref }, { label: "International Offices" }]} />
      <PageTitle
        icon={GlobeIcon}
        title="🌐 International Offices"
        subtitle="Manage your company's regional offices and branches worldwide"
        right={
          branches.length > 0 ? (
            <button className="btn primary" onClick={openCreate}>
              <PlusIcon size={16} /> Add Office
            </button>
          ) : null
        }
      />

      {loading && <div className="cp-card" style={{ padding: 24 }}>Loading…</div>}

      {!loading && branches.length === 0 && (
        <div className="cp-card" style={{ padding: 32, textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <div style={{ fontSize: 40 }}>🏢</div>
          <div style={{ maxWidth: 480 }}>
            <h3 style={{ margin: 0, marginBottom: 8 }}>Your company is set up as a single entity</h3>
            <p style={{ margin: 0, color: "var(--fg-muted)" }}>
              Add international offices to manage operations by region.
            </p>
          </div>
          <button className="btn primary" onClick={openCreate}>
            <PlusIcon size={16} /> Add International Office
          </button>
        </div>
      )}

      {!loading && hq && (
        <OfficeCard
          office={hq}
          isHQ
          userCount={userCounts[hq.id] || 0}
          offerCount={offerCounts[hq.id] || 0}
          onManageUsers={() => setUsersModalOffice(hq)}
        />
      )}

      {!loading && branches.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {branches.map((o) => (
            <OfficeCard
              key={o.id}
              office={o}
              userCount={userCounts[o.id] || 0}
              offerCount={offerCounts[o.id] || 0}
              onEdit={() => openEdit(o)}
              onDelete={() => handleDelete(o)}
              onManageUsers={() => setUsersModalOffice(o)}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} width={560} ariaLabel="Add office">
        <div className="modal-title" style={{ padding: "20px 24px 8px", fontWeight: 600, fontSize: 18 }}>
          {editingId ? "Edit Office" : "Add International Office"}
        </div>
        <div className="modal-body" style={{ padding: "8px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="field-label">Office Name <span className="req">*</span></label>
            <input className="input" value={form.officeName} placeholder="e.g. China Office"
              onChange={(e) => setForm({ ...form, officeName: e.target.value })} />
          </div>

          <div className="field">
            <label className="field-label">Office Type</label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input type="radio" checked={form.officeType === "regional_office"}
                  onChange={() => setForm({ ...form, officeType: "regional_office" })} />
                Regional Office
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input type="radio" checked={form.officeType === "branch"}
                  onChange={() => setForm({ ...form, officeType: "branch" })} />
                Branch
              </label>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field-label">Country <span className="req">*</span></label>
              <input className="input" value={form.country} placeholder="e.g. China"
                onChange={(e) => {
                  const country = e.target.value;
                  setForm({ ...form, country, region: form.region || regionFromCountry(country) });
                }} />
            </div>
            <div className="field">
              <label className="field-label">Region</label>
              <select className="input" value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}>
                <option value="">—</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Address</label>
            <AddressAutocomplete
              className="input"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              onAddressSelect={(a) => setForm((f) => ({
                ...f,
                address: a.street || a.formatted,
                city: a.city,
                state: a.state,
                zip: a.zip,
                country: a.country || f.country,
                region: f.region || regionFromCountry(a.country),
              }))}
              placeholder="Search address"
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field-label">City</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">State</label>
              <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">ZIP</label>
              <input className="input" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Phone</label>
            <input className="input" value={form.phone} placeholder="+86 ..."
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div className="field">
            <label className="field-label">Plant Numbers</label>
            <input className="input" value={form.plantNumbersText}
              placeholder="1234, 5678"
              onChange={(e) => setForm({ ...form, plantNumbersText: e.target.value })} />
            <span className="field-hint">Comma-separated SIF / establishment numbers</span>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: "12px 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
          <button className="btn primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : editingId ? "Save changes" : "Create office"}
          </button>
        </div>
      </Modal>

      {usersModalOffice && company?.id && (
        <ManageOfficeUsersModal
          open={!!usersModalOffice}
          onClose={() => setUsersModalOffice(null)}
          officeId={usersModalOffice.id}
          officeLabel={
            usersModalOffice.id === company.id
              ? `Headquarters — ${usersModalOffice.name}`
              : usersModalOffice.office_name || usersModalOffice.name
          }
          parentCompanyId={company.id}
          onChanged={refetch}
        />
      )}
    </div>
  );
}

function OfficeCard({
  office,
  isHQ,
  userCount,
  offerCount,
  onEdit,
  onDelete,
  onManageUsers,
}: {
  office: Office;
  isHQ?: boolean;
  userCount: number;
  offerCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onManageUsers?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const title = isHQ ? "Headquarters" : office.office_type === "branch" ? "Branch" : "Regional Office";
  const icon = isHQ ? "🏛️" : "🌏";
  const subtitle = isHQ ? office.name : `${office.name}${office.office_name ? ` — ${office.office_name}` : ""}`;
  const location = [office.office_country || office.country, office.city].filter(Boolean).join(" · ");

  return (
    <div
      className="cp-card"
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        borderColor: isHQ ? "var(--brand)" : undefined,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <span style={{ fontSize: 20 }}>{icon}</span> {title}
        </div>
        {isHQ ? (
          <span style={{ fontSize: 12, padding: "2px 8px", background: "var(--brand)", color: "white", borderRadius: 999 }}>
            ⭐ Primary
          </span>
        ) : onEdit ? (
          <div style={{ position: "relative" }}>
            <button className="btn ghost" onClick={() => setMenuOpen((v) => !v)} aria-label="menu">
              <MoreVerticalIcon size={16} />
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, minWidth: 160, zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                <button className="btn ghost" style={{ width: "100%", justifyContent: "flex-start" }}
                  onClick={() => { setMenuOpen(false); onEdit(); }}>
                  <EditIcon size={14} /> Edit
                </button>
                {onDelete && (
                  <button className="btn ghost" style={{ width: "100%", justifyContent: "flex-start", color: "var(--danger)" }}
                    onClick={() => { setMenuOpen(false); onDelete(); }}>
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500 }}>{subtitle}</div>
      {location && <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>📍 {location}</div>}
      <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>
        👥 {userCount} user{userCount !== 1 ? "s" : ""} · 📦 {offerCount ?? 0} offer{(offerCount ?? 0) !== 1 ? "s" : ""}
      </div>
      {office.plant_numbers && office.plant_numbers.length > 0 && (
        <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>🏭 Plants: {office.plant_numbers.join(", ")}</div>
      )}
      {onManageUsers && (
        <div style={{ marginTop: 4 }}>
          <button className="btn ghost" onClick={onManageUsers} style={{ padding: "6px 10px", fontSize: 13 }}>
            👥 Manage Users
          </button>
        </div>
      )}
    </div>
  );
}