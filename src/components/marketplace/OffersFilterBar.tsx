import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { FlagSVG } from "@/components/icons";
import { countryToCode } from "@/lib/countryCodes";

export type TempValue = "all" | "Frozen" | "Chilled";
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
  extraSheetSections?: ReactNode;
};

const ALL_TEMPS: TempValue[] = ["Frozen", "Chilled"];
const TRI: TriValue[] = ["any", "yes", "no"];

export function OffersFilterBar({
  value,
  onChange,
  options,
  proteinNode,
  rightSlot,
  showHalalKosher = true,
  searchPlaceholder = "Search products, ports...",
  extraSheetSections,
}: Props) {
  const isMobile = useIsMobileShell();
  const update = (patch: Partial<OffersFilterState>) =>
    onChange({ ...value, ...patch });

  const active = countActiveOfferFilters(value);
  const tempsList = options.temps ?? ALL_TEMPS;

  const clearAll = () => onChange({ ...DEFAULT_OFFERS_FILTER });

  // --- Mobile bottom sheet (draft state, commit on Apply) ---
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<OffersFilterState>(value);
  useEffect(() => {
    if (sheetOpen) setDraft(value);
  }, [sheetOpen, value]);
  const draftActive = countActiveOfferFilters(draft);
  const updateDraft = (patch: Partial<OffersFilterState>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const applyDraft = () => {
    onChange(draft);
    setSheetOpen(false);
  };
  const resetDraft = () => setDraft({ ...DEFAULT_OFFERS_FILTER, search: draft.search });

  if (isMobile) {
    // Filters that move into the sheet (everything except search & protein)
    const sheetActive =
      (value.temp !== "all" ? 1 : 0) +
      value.origins.length +
      value.incoterms.length +
      value.markets.length +
      (value.halal !== "any" ? 1 : 0) +
      (value.kosher !== "any" ? 1 : 0);

    return (
      <div className="ofb ofb-mobile">
        <div className="ofb-mobile-row">
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
          <button
            type="button"
            className={cn("ofb-mobile-trigger", sheetActive > 0 && "is-active")}
            onClick={() => setSheetOpen(true)}
            aria-label="Open filters"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {sheetActive > 0 && (
              <span className="ofb-mobile-badge">{sheetActive}</span>
            )}
          </button>
        </div>
        {proteinNode && <div className="ofb-mobile-protein">{proteinNode}</div>}
        {rightSlot && <div className="ofb-mobile-right">{rightSlot}</div>}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="ofb-sheet">
            <div className="ofb-sheet-handle" aria-hidden />
            <SheetHeader className="ofb-sheet-head">
              <SheetTitle>Filters</SheetTitle>
              {draftActive > 0 && (
                <button
                  type="button"
                  className="ofb-sheet-clear"
                  onClick={resetDraft}
                >
                  Clear
                </button>
              )}
            </SheetHeader>

            <div className="ofb-sheet-body">
              {extraSheetSections}
              <Section title="Temperature">
                <PillGroup
                  value={draft.temp}
                  options={[
                    { v: "all", label: "All" },
                    ...tempsList.map((t) => ({ v: t, label: t })),
                  ]}
                  onChange={(v) => updateDraft({ temp: v as TempValue })}
                />
              </Section>

              <Section title="Origins">
                <CheckList
                  selected={draft.origins}
                  options={options.origins}
                  onChange={(v) => updateDraft({ origins: v })}
                  withFlags
                />
              </Section>

              <Section title="Incoterms">
                <CheckList
                  selected={draft.incoterms}
                  options={options.incoterms}
                  onChange={(v) => updateDraft({ incoterms: v })}
                />
              </Section>

              <Section title="Markets">
                <CheckList
                  selected={draft.markets}
                  options={options.markets}
                  onChange={(v) => updateDraft({ markets: v })}
                  withFlags
                />
              </Section>

              {showHalalKosher && (
                <>
                  <Section title="Halal">
                    <PillGroup
                      value={draft.halal}
                      options={TRI.map((v) => ({ v, label: v[0].toUpperCase() + v.slice(1) }))}
                      onChange={(v) => updateDraft({ halal: v as TriValue })}
                    />
                  </Section>
                  <Section title="Kosher">
                    <PillGroup
                      value={draft.kosher}
                      options={TRI.map((v) => ({ v, label: v[0].toUpperCase() + v.slice(1) }))}
                      onChange={(v) => updateDraft({ kosher: v as TriValue })}
                    />
                  </Section>
                </>
              )}
            </div>

            <div className="ofb-sheet-foot">
              <button
                type="button"
                className="ofb-sheet-btn is-ghost"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ofb-sheet-btn is-primary"
                onClick={applyDraft}
              >
                Apply{draftActive > 0 ? ` (${draftActive})` : ""}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

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

/* ---- Mobile sheet sub-components ---- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ofb-sheet-section">
      <div className="ofb-sheet-section-title">{title}</div>
      {children}
    </div>
  );
}

function PillGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { v: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="ofb-sheet-pills">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          className={cn("ofb-sheet-pill", value === o.v && "is-active")}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CheckList({
  selected,
  options,
  onChange,
  withFlags = false,
}: {
  selected: string[];
  options: string[];
  onChange: (v: string[]) => void;
  withFlags?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const sorted = [...options].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const qq = q.trim().toLowerCase();
    if (!qq) return sorted;
    return sorted.filter((o) => o.toLowerCase().includes(qq));
  }, [options, q]);
  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((x) => x !== val));
    else onChange([...selected, val]);
  };
  return (
    <div className="ofb-sheet-checklist">
      {options.length > 6 && (
        <input
          type="search"
          className="ofb-sheet-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
        />
      )}
      <div className="ofb-sheet-checks">
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
              className={cn("ofb-sheet-check", on && "is-on")}
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
    </div>
  );
}