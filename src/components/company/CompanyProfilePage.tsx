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
} from "lucide-react";
import { Crumbs } from "@/components/mundus/Crumbs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { countryFlag } from "@/lib/countryFlags";

type Role = "buyer" | "supplier";

type LocationRow = {
  id: string;
  _isNew?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
  parent_company_id: string | null;
  office_type: string | null; // headquarters | office | factory
  office_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  est_number: string | null;
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
const PAYMENT_TERMS = [
  "30% Advance, Balance TT",
  "100% TT in advance",
  "Letter of Credit (L/C) at sight",
  "Letter of Credit (L/C) 30 days",
  "CAD - Cash Against Documents",
  "Net 30",
  "Net 60",
];

function newLocalId() {
  return `new-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CompanyProfilePage({ role }: { role: Role }) {
  const { company: cur } = useCurrentCompany();
  const companyId = cur?.id ?? null;

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("companies")
        .select(
          "id, name, tax_id, phone, website, protein_profiles, buyer_protein_profile, preferred_cuts, preferred_payment_terms, preferred_incoterms, countries_of_operation, ports_of_shipment, is_buyer, is_supplier, parent_company_id, office_type, office_name, address, city, state, country, zip_code, est_number"
        )
        .or(`id.eq.${companyId},parent_company_id.eq.${companyId}`);
      if (cancelled) return;
      const rows = (data || []) as any[];
      const hq = rows.find((r) => r.id === companyId);
      const children = rows.filter((r) => r.id !== companyId);
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
        };
        const childLocs: LocationRow[] = children.map((c) => ({
          id: c.id,
          parent_company_id: c.parent_company_id,
          office_type: c.office_type || "office",
          office_name: c.office_name || c.name,
          address: c.address,
          city: c.city,
          state: c.state,
          country: c.country,
          zip_code: c.zip_code,
          est_number: c.est_number,
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
          await (supabase as any).from("companies").delete().eq("id", l.id);
          continue;
        }
        if (l._isNew && !l._deleted) {
          await (supabase as any).from("companies").insert({
            name: l.office_name || "Office",
            parent_company_id: companyId,
            office_type: l.office_type,
            office_name: l.office_name,
            address: l.address,
            city: l.city,
            state: l.state,
            country: l.country,
            zip_code: l.zip_code,
            est_number: l.est_number,
            tax_id: company.tax_id || "—",
            phone: company.phone || "—",
          });
          continue;
        }
        if (l._dirty) {
          await (supabase as any)
            .from("companies")
            .update({
              office_type: l.office_type,
              office_name: l.office_name,
              address: l.address,
              city: l.city,
              state: l.state,
              country: l.country,
              zip_code: l.zip_code,
              est_number: l.est_number,
            })
            .eq("id", l.id);
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

  if (loading || !company) {
    return (
      <div className="cprofile-page">
        <Crumbs items={[{ label: "Home", to: `/${role}` }, { label: "My Company" }]} />
        <div className="cprofile-empty">Loading…</div>
      </div>
    );
  }

  const visibleLocations = locations.filter((l) => !l._deleted);

  return (
    <div className="cprofile-page">
      <Crumbs items={[{ label: "Home", to: `/${role}` }, { label: "My Company" }]} />

      {/* Header */}
      <div className="cprofile-header-bar">
        <div>
          <h1 className="cprofile-title">My Company</h1>
          <p className="cprofile-sub">
            Update your company details, locations and plant numbers.
          </p>
        </div>
        <button
          type="button"
          className="cprofile-save"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="cprofile-card cprofile-namecard">
        <div className="cprofile-namecard-top">
          <input
            className="cprofile-name-input"
            value={company.name || ""}
            onChange={(e) => patchCompany({ name: e.target.value })}
            placeholder="Company name"
          />
          <span className={`cprofile-role-pill ${role}`}>{role.toUpperCase()}</span>
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

      {/* Locations */}
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

      {/* Contact */}
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
      {role === "supplier" && (
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
      {role === "buyer" && (
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
          <FieldLabel label="Preferred Cuts">
            <ChipTagInput
              value={company.preferred_cuts || []}
              onChange={(v) => patchCompany({ preferred_cuts: v })}
              placeholder="Add cut…"
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
          <ChipTagInput
            value={company.countries_of_operation || []}
            onChange={(v) => patchCompany({ countries_of_operation: v })}
            placeholder="Add country…"
            renderTag={(t) => `${countryFlag(t)} ${t}`}
          />
        </FieldLabel>
        <FieldLabel label="Ports of Shipment">
          <ChipTagInput
            value={company.ports_of_shipment || []}
            onChange={(v) => patchCompany({ ports_of_shipment: v })}
            placeholder="Add port…"
          />
        </FieldLabel>
      </Section>
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
        <input
          className="cprofile-input"
          value={loc.address || ""}
          onChange={(e) => onChange({ address: e.target.value })}
          autoComplete="street-address"
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