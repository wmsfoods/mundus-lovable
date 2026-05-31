import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useCountriesList } from "@/hooks/useCountriesList";
import { countryFlag } from "@/lib/countryFlags";

type Props = {
  /** Selected canonical country names. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Restrict the list to country names present in this set (e.g. countries that have rows). */
  available?: Set<string>;
  placeholder?: string;
};

/** Multi-select popover for countries, with flags and search. */
export function CountryMultiFilter({ value, onChange, available, placeholder }: Props) {
  const { countries } = useCountriesList();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const list = useMemo(() => {
    const base = available
      ? countries.filter((c) => available.has(c.english_name))
      : countries;
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((c) => c.english_name.toLowerCase().includes(needle) || c.iso_code.toLowerCase().includes(needle));
  }, [countries, available, q]);

  function toggle(name: string) {
    if (value.includes(name)) onChange(value.filter((n) => n !== name));
    else onChange([...value, name]);
  }

  const label = value.length === 0
    ? (placeholder ?? "All countries")
    : value.length === 1
      ? `${countryFlag(value[0])} ${value[0]}`
      : `${value.length} countries`;

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 180 }}>
      <button
        type="button"
        className="crm-select"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        {value.length > 0 ? (
          <X
            size={14}
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            style={{ opacity: 0.6, cursor: "pointer" }}
          />
        ) : (
          <ChevronDown size={14} style={{ opacity: 0.6 }} />
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 40,
            background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 280, maxHeight: 360,
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 6 }}>
            <Search size={13} style={{ opacity: 0.5 }} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search countries…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent" }}
            />
          </div>
          {value.length > 0 && (
            <div style={{ padding: "6px 10px", display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid #f1f5f9" }}>
              {value.map((n) => (
                <span key={n} className="adm-chip" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {countryFlag(n)} {n}
                  <X size={11} style={{ cursor: "pointer", opacity: 0.6 }} onClick={() => toggle(n)} />
                </span>
              ))}
            </div>
          )}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {list.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: "#6b7280", textAlign: "center" }}>No countries</div>
            ) : list.map((c) => {
              const selected = value.includes(c.english_name);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.english_name)}
                  style={{
                    width: "100%", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8,
                    border: "none", background: selected ? "#FDF2F8" : "transparent",
                    cursor: "pointer", fontSize: 13, textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{c.flag_emoji ?? countryFlag(c.english_name)}</span>
                  <span style={{ flex: 1 }}>{c.english_name}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{c.iso_code}</span>
                  {selected && <Check size={13} style={{ color: "#8B2252" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}