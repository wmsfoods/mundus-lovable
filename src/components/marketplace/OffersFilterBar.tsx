import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FlagSVG } from "@/components/icons";
import { countryToCode } from "@/lib/countryCodes";

export type TempValue = "all" | "Frozen" | "Chilled" | "Fresh";
export type TriValue = "any" | "yes" | "no";

export type OffersFilterState = {
  temp: TempValue;
  origins: string[];
  incoterms: string[];
  markets: string[];
  halal: TriValue;
  kosher: TriValue;
  search: string;
};

export const DEFAULT_OFFERS_FILTER: OffersFilterState = {
  temp: "all",
  origins: [],
  incoterms: [],
  markets: [],
  halal: "any",
  kosher: "any",
  search: "",
};

export function countActiveOfferFilters(s: OffersFilterState): number {
  let n = 0;
  if (s.temp !== "all") n++;
  n += s.origins.length;
  n += s.incoterms.length;
  n += s.markets.length;
  if (s.halal !== "any") n++;
  if (s.kosher !== "any") n++;
  if (s.search.trim()) n++;
  return n;
}

type Options = {
  temps?: TempValue[];
  origins: string[];
  incoterms: string[];
  markets: string[];
};

type Props = {
  value: OffersFilterState;
  onChange: (next: OffersFilterState) => void;
  options: Options;
  proteinNode?: ReactNode;
  rightSlot?: ReactNode;
  showHalalKosher?: boolean;
  searchPlaceholder?: string;
};

const ALL_TEMPS: TempValue[] = ["Frozen", "Chilled", "Fresh"];
const TRI: TriValue[] = ["any", "yes", "no"];

export function OffersFilterBar({
  value,
  onChange,
  options,
  proteinNode,
  rightSlot,
  showHalalKosher = true,
  searchPlaceholder = "Search products, ports...",
}: Props) {
  const update = (patch: Partial<OffersFilterState>) =>
    onChange({ ...value, ...patch });

  const active = countActiveOfferFilters(value);
  const tempsList = options.temps ?? ALL_TEMPS;

  const clearAll = () => onChange({ ...DEFAULT_OFFERS_FILTER });

  return (
    <div className="ofb">
      <div className="ofb-row">
        {proteinNode}

        <SingleSelect
          label="All Temps"
          value={value.temp === "all" ? null : value.temp}
          options={tempsList}
          onPick={(v) => update({ temp: (v as TempValue) ?? "all" })}
          allLabel="All Temps"
        />

        <MultiSelect
          label="All Origins"
          selected={value.origins}
          options={options.origins}
          onChange={(v) => update({ origins: v })}
          withFlags
        />

        <MultiSelect
          label="All Incoterms"
          selected={value.incoterms}
          options={options.incoterms}
          onChange={(v) => update({ incoterms: v })}
        />

        <MultiSelect
          label="All Markets"
          selected={value.markets}
          options={options.markets}
          onChange={(v) => update({ markets: v })}
          withFlags
        />

        <div className="ofb-search">
          <SearchIcon size={15} aria-hidden />
          <input
            type="search"
            value={value.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {value.search && (
            <button
              type="button"
              className="ofb-search-clear"
              onClick={() => update({ search: "" })}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {rightSlot}
      </div>

      {showHalalKosher && (
        <div className="ofb-row ofb-row-sub">
          <Segmented
            label="Halal"
            value={value.halal}
            options={TRI}
            onChange={(v) => update({ halal: v as TriValue })}
          />
          <Segmented
            label="Kosher"
            value={value.kosher}
            options={TRI}
            onChange={(v) => update({ kosher: v as TriValue })}
          />

          {active > 0 && (
            <button type="button" className="ofb-clear" onClick={clearAll}>
              <X size={13} />
              Clear filters
              <span className="ofb-clear-n">{active}</span>
            </button>
          )}
        </div>
      )}

      {!showHalalKosher && active > 0 && (
        <div className="ofb-row ofb-row-sub">
          <button type="button" className="ofb-clear" onClick={clearAll}>
            <X size={13} />
            Clear filters
            <span className="ofb-clear-n">{active}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- subcomponents ---------- */

function SingleSelect({
  label,
  value,
  options,
  onPick,
  allLabel,
}: {
  label: string;
  value: string | null;
  options: string[];
  onPick: (v: string | null) => void;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("ofb-pill", active && "is-active")}
        >
          <span>{active ? value : label}</span>
          <ChevronDown size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="ofb-pop" align="start" sideOffset={6}>
        <button
          type="button"
          className={cn("ofb-pop-item", !active && "is-on")}
          onClick={() => {
            onPick(null);
            setOpen(false);
          }}
        >
          <span className="ofb-pop-check">
            {!active && <Check size={13} />}
          </span>
          <span>{allLabel}</span>
        </button>
        {options.map((opt) => {
          const on = value === opt;
          return (
            <button
              key={opt}
              type="button"
              className={cn("ofb-pop-item", on && "is-on")}
              onClick={() => {
                onPick(opt);
                setOpen(false);
              }}
            >
              <span className="ofb-pop-check">
                {on && <Check size={13} />}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function MultiSelect({
  label,
  selected,
  options,
  onChange,
  withFlags = false,
}: {
  label: string;
  selected: string[];
  options: string[];
  onChange: (v: string[]) => void;
  withFlags?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const active = selected.length > 0;

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const sorted = [...options].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    if (!qq) return sorted;
    return sorted.filter((o) => o.toLowerCase().includes(qq));
  }, [options, q]);

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((x) => x !== val));
    else onChange([...selected, val]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("ofb-pill", active && "is-active")}
        >
          <span>
            {label}
            {active && <span className="ofb-pill-n"> · {selected.length}</span>}
          </span>
          <ChevronDown size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="ofb-pop ofb-pop-multi" align="start" sideOffset={6}>
        <div className="ofb-pop-search">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${label.toLowerCase().replace("all ", "all ")}...`}
            autoFocus
          />
        </div>
        <div className="ofb-pop-section">All</div>
        <div className="ofb-pop-list">
          {filtered.length === 0 && (
            <div className="ofb-pop-empty">No options</div>
          )}
          {filtered.map((opt) => {
            const on = selected.includes(opt);
            const code = withFlags ? countryToCode(opt) : "";
            return (
              <button
                type="button"
                key={opt}
                className={cn("ofb-pop-item", on && "is-on")}
                onClick={() => toggle(opt)}
              >
                <span className={cn("ofb-pop-check is-box", on && "is-on")}>
                  {on && <Check size={12} />}
                </span>
                {code && <FlagSVG code={code} size={14} />}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
        {active && (
          <button
            type="button"
            className="ofb-pop-clear"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="ofb-seg">
      <span className="ofb-seg-label">{label}</span>
      <div className="ofb-seg-track">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={cn("ofb-seg-btn", value === opt && "is-active")}
            onClick={() => onChange(opt)}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}