import { useState, useMemo } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X } from "lucide-react";
import { countryFlag } from "@/lib/countryFlags";

interface Props {
  countries: Array<{ name: string; count: number }>;
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function CountryFilterPopover({ countries, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return countries
      .filter((c) => c.name.toLowerCase().includes(s))
      .sort((a, b) => b.count - a.count);
  }, [countries, search]);

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((s) => s !== name)
        : [...selected, name],
    );
  };

  const label = selected.length === 0
    ? "🌐 All countries"
    : selected.length <= 2
      ? selected.map((c) => `${countryFlag(c)} ${c}`).join(", ")
      : `${selected.slice(0, 2).map((c) => countryFlag(c)).join("")} ${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{
            padding: "7px 12px", borderRadius: 8, fontSize: 13,
            border: selected.length > 0 ? "2px solid #8B2252" : "1px solid #D1D5DB",
            background: selected.length > 0 ? "#FDF2F8" : "white",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            fontWeight: selected.length > 0 ? 600 : 400,
            color: selected.length > 0 ? "#8B2252" : "#374151",
            whiteSpace: "nowrap",
          }}
        >
          {label}
          {selected.length > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
              style={{ cursor: "pointer", marginLeft: 4, display: "inline-flex" }}
            >
              <X size={12} />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        style={{ width: 280, maxHeight: 400, padding: 0, borderRadius: 12, overflow: "hidden" }}
      >
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #E5E7EB", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search countries..."
            autoFocus
            style={{ width: "100%", padding: "6px 8px 6px 28px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13, outline: "none" }}
          />
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto", padding: "4px 0" }}>
          {filtered.map((c) => (
            <label
              key={c.name}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "6px 12px",
                cursor: "pointer", fontSize: 13,
                background: selected.includes(c.name) ? "#FDF2F8" : "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = selected.includes(c.name) ? "#FDF2F8" : "transparent")}
            >
              <Checkbox checked={selected.includes(c.name)} onCheckedChange={() => toggle(c.name)} />
              <span style={{ fontSize: 16 }}>{countryFlag(c.name)}</span>
              <span style={{ flex: 1 }}>{c.name}</span>
              <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{c.count}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 16, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              No countries found
            </div>
          )}
        </div>
        {selected.length > 0 && (
          <div style={{ padding: "8px 12px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6B7280" }}>{selected.length} selected</span>
            <button
              type="button"
              onClick={() => onChange([])}
              style={{ fontSize: 12, color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}