import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type MspOption = {
  value: string;
  label: string;
  /** Optional leading element (flag, logo, etc.) */
  leading?: ReactNode;
  /** Optional trailing hint (country code, count, etc.) */
  hint?: string;
};

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  options: MspOption[];
  placeholder?: string;
  /** Show search input above the list */
  searchable?: boolean;
  /** Min width of the popover */
  width?: number;
  /** Min width of the trigger */
  triggerMinWidth?: number;
};

/** Generic multi-select dropdown with optional search, matching admin filter style. */
export function MultiSelectPopover({
  value,
  onChange,
  options,
  placeholder = "All",
  searchable = false,
  width = 260,
  triggerMinWidth = 140,
}: Props) {
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
    if (!searchable) return options;
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.label.toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle));
  }, [options, q, searchable]);

  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((n) => n !== v));
    else onChange([...value, v]);
  }

  const label = (() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const found = options.find((o) => o.value === value[0]);
      return found?.label ?? value[0];
    }
    return `${value.length} selected`;
  })();

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: triggerMinWidth }}>
      <button
        type="button"
        className="crm-select"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {value.length > 0 ? (
          <X
            size={14}
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            style={{ opacity: 0.6, cursor: "pointer", flexShrink: 0 }}
          />
        ) : (
          <ChevronDown size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 40,
            background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width, maxHeight: 360,
            display: "flex", flexDirection: "column",
          }}
        >
          {searchable && (
            <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 6 }}>
              <Search size={13} style={{ opacity: 0.5 }} />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent" }}
              />
            </div>
          )}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {list.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: "#6b7280", textAlign: "center" }}>No options</div>
            ) : list.map((o) => {
              const selected = value.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  style={{
                    width: "100%", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8,
                    border: "none", background: selected ? "#FDF2F8" : "transparent",
                    cursor: "pointer", fontSize: 13, textAlign: "left",
                  }}
                >
                  {o.leading}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
                  {o.hint && <span style={{ fontSize: 10, color: "#9ca3af" }}>{o.hint}</span>}
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