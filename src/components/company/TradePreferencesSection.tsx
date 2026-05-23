import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { countryFlag } from "@/lib/countryFlags";

const PAYMENT_TERMS = [
  "30% Advance, Balance TT",
  "10% Advance, Balance TT",
  "50% Advance, Balance TT",
  "100% Advance",
  "LC at Sight",
  "LC 30 Days",
  "LC 60 Days",
  "LC 90 Days",
  "CAD",
  "Open Account 30 Days",
  "Open Account 60 Days",
];

const INCOTERMS = ["FOB", "CFR", "CIF", "EXW", "FCA", "DAP", "DDP"];

type PortRow = { id: string; name: string; code: string | null; country_id: string | null };
type CountryRow = { id: string; english_name: string; iso_code: string | null };

export type TradePrefsValue = {
  preferred_payment_terms: string | null;
  preferred_incoterms: string[] | null;
  countries_of_operation: string[] | null;
  ports_of_shipment: string[] | null;
};

type Props = {
  companyId: string;
  canEdit: boolean;
  defaultCountry?: string | null;
};

export default function TradePreferencesSection({ companyId, canEdit, defaultCountry }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [val, setVal] = useState<TradePrefsValue>({
    preferred_payment_terms: null,
    preferred_incoterms: [],
    countries_of_operation: [],
    ports_of_shipment: [],
  });
  const [ports, setPorts] = useState<PortRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: p }, { data: ctr }] = await Promise.all([
        supabase
          .from("companies")
          .select("preferred_payment_terms,preferred_incoterms,countries_of_operation,ports_of_shipment,country")
          .eq("id", companyId)
          .maybeSingle(),
        supabase.from("ports").select("id,name,code,country_id").order("name"),
        supabase.from("countries").select("id,english_name,iso_code").order("english_name"),
      ]);
      if (cancelled) return;
      const cAny = c as any;
      const initialCountries: string[] =
        (cAny?.countries_of_operation as string[] | null) ??
        (defaultCountry || cAny?.country ? [defaultCountry || cAny?.country].filter(Boolean) : []);
      setVal({
        preferred_payment_terms: cAny?.preferred_payment_terms ?? null,
        preferred_incoterms: cAny?.preferred_incoterms ?? [],
        countries_of_operation: initialCountries,
        ports_of_shipment: cAny?.ports_of_shipment ?? [],
      });
      setPorts((p ?? []) as PortRow[]);
      setCountries((ctr ?? []) as CountryRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [companyId, defaultCountry]);

  const persist = async (patch: Partial<TradePrefsValue>) => {
    const next = { ...val, ...patch };
    setVal(next);
    setSaving(true);
    const { error } = await supabase.from("companies").update(patch as any).eq("id", companyId);
    setSaving(false);
    if (error) toast.error(error.message);
  };

  if (loading) {
    return <section className="cp-card" style={{ padding: 16 }}>Loading trade preferences…</section>;
  }

  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>📋 Trade Preferences</h2>
        {saving && <span style={{ fontSize: 12, color: "#9ca3af" }}>Saving…</span>}
      </header>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: -4, marginBottom: 14 }}>
        Configure your default trading terms.
      </p>

      {/* Payment terms */}
      <div style={{ marginBottom: 18 }}>
        <label className="cp-label">Preferred Payment Terms *</label>
        {canEdit ? (
          <select
            className="cp-inline"
            style={{ width: "100%", maxWidth: 520 }}
            value={val.preferred_payment_terms ?? ""}
            onChange={(e) => persist({ preferred_payment_terms: e.target.value || null })}
          >
            <option value="">— Select —</option>
            {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <div>{val.preferred_payment_terms || "—"}</div>
        )}
      </div>

      {/* Incoterms */}
      <div style={{ marginBottom: 18 }}>
        <label className="cp-label">Preferred Incoterms</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {INCOTERMS.map((i) => {
            const on = (val.preferred_incoterms ?? []).includes(i);
            return (
              <button
                key={i}
                type="button"
                disabled={!canEdit}
                className={`cp-chip-btn ${on ? "is-on" : ""}`}
                onClick={() => {
                  const cur = val.preferred_incoterms ?? [];
                  persist({ preferred_incoterms: on ? cur.filter((x) => x !== i) : [...cur, i] });
                }}
              >
                {on ? "✓ " : ""}{i}
              </button>
            );
          })}
        </div>
      </div>

      {/* Countries */}
      <div style={{ marginBottom: 18 }}>
        <label className="cp-label">Countries of Operation</label>
        <TagMultiSelect
          canEdit={canEdit}
          selected={val.countries_of_operation ?? []}
          placeholder="Add country…"
          options={countries.map((c) => ({
            value: c.english_name,
            label: `${countryFlag(c.english_name)} ${c.english_name}`,
            search: c.english_name + " " + (c.iso_code ?? ""),
          }))}
          renderTag={(v) => `${countryFlag(v)} ${v}`}
          onChange={(next) => persist({ countries_of_operation: next })}
        />
      </div>

      {/* Ports */}
      <div>
        <label className="cp-label">Ports of Shipment</label>
        <TagMultiSelect
          canEdit={canEdit}
          selected={val.ports_of_shipment ?? []}
          placeholder="Add port…"
          options={ports.map((p) => ({
            value: p.code ? `${p.name} (${p.code})` : p.name,
            label: p.code ? `${p.name} (${p.code})` : p.name,
            search: `${p.name} ${p.code ?? ""}`,
          }))}
          onChange={(next) => persist({ ports_of_shipment: next })}
        />
      </div>
    </section>
  );
}

/* ====================================================================== */
type Option = { value: string; label: string; search: string };

function TagMultiSelect({
  canEdit, selected, options, placeholder, onChange, renderTag,
}: {
  canEdit: boolean;
  selected: string[];
  options: Option[];
  placeholder: string;
  onChange: (next: string[]) => void;
  renderTag?: (v: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return options
      .filter((o) => !selected.includes(o.value))
      .filter((o) => !term || o.search.toLowerCase().includes(term))
      .slice(0, 50);
  }, [options, selected, q]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {selected.map((v) => (
          <span key={v} className="cp-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {renderTag ? renderTag(v) : v}
            {canEdit && (
              <button
                type="button"
                aria-label={`Remove ${v}`}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "#8B2252", padding: 0, lineHeight: 0 }}
                onClick={() => onChange(selected.filter((x) => x !== v))}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {canEdit && (
          <button
            type="button"
            className="cp-chip-btn"
            onClick={() => setOpen((o) => !o)}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      {canEdit && open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 30,
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,.08)", width: 320, maxHeight: 320, overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}
        >
          <input
            autoFocus
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: 0, borderBottom: "1px solid #f1f5f9", padding: "8px 10px", outline: "none", fontSize: 13 }}
          />
          <div style={{ overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: "#9ca3af" }}>No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange([...selected, o.value]); setQ(""); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "8px 10px",
                    border: 0, background: "transparent", cursor: "pointer", fontSize: 13,
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fdf2f8")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}