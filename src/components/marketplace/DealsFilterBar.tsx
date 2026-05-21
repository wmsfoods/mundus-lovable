import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  Filter as FilterIcon,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  countActiveFilters,
  type DealsFilterState,
} from "@/hooks/useDealsFilter";

type Option = string;

type StatusOption = {
  value: string;
  label: string;
};

export type DealsFilterBarProps = {
  value: DealsFilterState;
  onChange: (next: DealsFilterState) => void;
  options: {
    products: Option[];
    parties: Option[];
    origins: Option[];
    destinations: Option[];
  };
  statusOptions: StatusOption[];
  statusCounts: Map<string, number>;
  totalCount: number;
  labels: {
    party: string; // "Buyer" or "Supplier"
    origin: string; // "Origin port" or "Origin"
    destination: string; // "Destination port" or "Destination"
  };
};

export function DealsFilterBar({
  value,
  onChange,
  options,
  statusOptions,
  statusCounts,
  totalCount,
  labels,
}: DealsFilterBarProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobileShell();
  const [advOpen, setAdvOpen] = useState(false);
  const active = countActiveFilters(value);

  const update = (patch: Partial<DealsFilterState>) =>
    onChange({ ...value, ...patch });

  const clearAll = () =>
    onChange({
      q: "",
      status: null,
      dealId: "",
      products: [],
      parties: [],
      origins: [],
      destinations: [],
      dateFrom: null,
      dateTo: null,
    });

  const dateFromObj = value.dateFrom ? new Date(value.dateFrom) : undefined;
  const dateToObj = value.dateTo ? new Date(value.dateTo) : undefined;

  const advancedPanel = (
    <div className="dfb-adv">
      <FieldText
        label={t("filters.dealId")}
        value={value.dealId}
        onChange={(v) => update({ dealId: v })}
        placeholder={t("filters.dealIdPlaceholder")}
      />
      <FieldMulti
        label={t("filters.product")}
        options={options.products}
        selected={value.products}
        onChange={(v) => update({ products: v })}
      />
      <FieldMulti
        label={labels.party}
        options={options.parties}
        selected={value.parties}
        onChange={(v) => update({ parties: v })}
      />
      <FieldMulti
        label={labels.origin}
        options={options.origins}
        selected={value.origins}
        onChange={(v) => update({ origins: v })}
      />
      <FieldMulti
        label={labels.destination}
        options={options.destinations}
        selected={value.destinations}
        onChange={(v) => update({ destinations: v })}
      />
      <FieldDate
        label={t("filters.dateFrom")}
        value={dateFromObj}
        onChange={(d) =>
          update({ dateFrom: d ? format(d, "yyyy-MM-dd") : null })
        }
      />
      <FieldDate
        label={t("filters.dateTo")}
        value={dateToObj}
        onChange={(d) =>
          update({ dateTo: d ? format(d, "yyyy-MM-dd") : null })
        }
      />
    </div>
  );

  return (
    <div className="dfb">
      {/* Search + Filter button */}
      <div className="dfb-row">
        <div className="dfb-search">
          <Search size={16} aria-hidden />
          <input
            type="text"
            value={value.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder={t("filters.searchPlaceholder")}
            aria-label={t("filters.searchPlaceholder")}
          />
          {value.q && (
            <button
              type="button"
              className="dfb-search-clear"
              onClick={() => update({ q: "" })}
              aria-label={t("filters.clear")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isMobile ? (
          <button
            type="button"
            className="dfb-btn"
            onClick={() => setAdvOpen(true)}
          >
            <FilterIcon size={14} />
            {t("filters.filters")}
            {active > 0 && <span className="dfb-count">{active}</span>}
          </button>
        ) : (
          <Popover open={advOpen} onOpenChange={setAdvOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="dfb-btn">
                <FilterIcon size={14} />
                {t("filters.filters")}
                {active > 0 && <span className="dfb-count">{active}</span>}
                <ChevronDown size={14} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="dfb-pop" align="end" sideOffset={6}>
              <div className="dfb-pop-head">
                <strong>{t("filters.advanced")}</strong>
                {active > 0 && (
                  <button
                    type="button"
                    className="dfb-link"
                    onClick={clearAll}
                  >
                    {t("filters.clearAll")}
                  </button>
                )}
              </div>
              {advancedPanel}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Status chips */}
      <div className="dfb-chips" role="tablist">
        <button
          type="button"
          className={cn("dfb-chip", value.status === null && "is-active")}
          onClick={() => update({ status: null })}
        >
          {t("filters.all")} <span className="dfb-chip-n">{totalCount}</span>
        </button>
        {statusOptions.map((s) => {
          const n = statusCounts.get(s.value) ?? 0;
          return (
            <button
              key={s.value}
              type="button"
              className={cn(
                "dfb-chip",
                value.status === s.value && "is-active",
              )}
              onClick={() =>
                update({ status: value.status === s.value ? null : s.value })
              }
            >
              {s.label} <span className="dfb-chip-n">{n}</span>
            </button>
          );
        })}
      </div>

      {/* Active filter chips */}
      {active > 0 && (
        <div className="dfb-active">
          {value.dealId && (
            <ActiveChip
              label={`${t("filters.dealId")}: ${value.dealId}`}
              onRemove={() => update({ dealId: "" })}
            />
          )}
          {value.products.map((p) => (
            <ActiveChip
              key={`p-${p}`}
              label={p}
              onRemove={() =>
                update({ products: value.products.filter((x) => x !== p) })
              }
            />
          ))}
          {value.parties.map((p) => (
            <ActiveChip
              key={`b-${p}`}
              label={p}
              onRemove={() =>
                update({ parties: value.parties.filter((x) => x !== p) })
              }
            />
          ))}
          {value.origins.map((p) => (
            <ActiveChip
              key={`o-${p}`}
              label={`${labels.origin}: ${p}`}
              onRemove={() =>
                update({ origins: value.origins.filter((x) => x !== p) })
              }
            />
          ))}
          {value.destinations.map((p) => (
            <ActiveChip
              key={`d-${p}`}
              label={`${labels.destination}: ${p}`}
              onRemove={() =>
                update({
                  destinations: value.destinations.filter((x) => x !== p),
                })
              }
            />
          ))}
          {(value.dateFrom || value.dateTo) && (
            <ActiveChip
              label={`${value.dateFrom ?? "…"} → ${value.dateTo ?? "…"}`}
              onRemove={() => update({ dateFrom: null, dateTo: null })}
            />
          )}
          <button type="button" className="dfb-link" onClick={clearAll}>
            {t("filters.clearAll")}
          </button>
        </div>
      )}

      {/* Mobile bottom sheet for advanced filters */}
      {isMobile && (
        <Sheet open={advOpen} onOpenChange={setAdvOpen}>
          <SheetContent side="bottom" className="dfb-sheet">
            <SheetHeader>
              <SheetTitle>{t("filters.advanced")}</SheetTitle>
            </SheetHeader>
            <div className="dfb-sheet-body">{advancedPanel}</div>
            <div className="dfb-sheet-foot">
              <Button variant="ghost" onClick={clearAll}>
                {t("filters.clearAll")}
              </Button>
              <Button onClick={() => setAdvOpen(false)}>
                {t("filters.apply")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/* ---- sub-components ---- */

function ActiveChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="dfb-active-chip">
      {label}
      <button type="button" onClick={onRemove} aria-label="Remove">
        <X size={12} />
      </button>
    </span>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="dfb-field">
      <span className="dfb-label">{label}</span>
      <input
        type="text"
        className="dfb-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function FieldMulti({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => o.toLowerCase().includes(qq));
  }, [options, q]);

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((x) => x !== val));
    else onChange([...selected, val]);
  };

  const summary =
    selected.length === 0
      ? t("filters.any")
      : selected.length === 1
        ? selected[0]
        : t("filters.nSelected", { count: selected.length });

  return (
    <div className="dfb-field">
      <span className="dfb-label">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="dfb-select">
            <span className="dfb-select-val">{summary}</span>
            <ChevronDown size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="dfb-multi" align="start" sideOffset={4}>
          <input
            type="text"
            className="dfb-input"
            placeholder={t("filters.searchEllipsis")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="dfb-multi-list">
            {filtered.length === 0 && (
              <div className="dfb-empty">{t("filters.noOptions")}</div>
            )}
            {filtered.map((opt) => {
              const on = selected.includes(opt);
              return (
                <button
                  type="button"
                  key={opt}
                  className={cn("dfb-multi-item", on && "is-on")}
                  onClick={() => toggle(opt)}
                >
                  <span className="dfb-check">
                    {on && <Check size={12} />}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              className="dfb-link"
              onClick={() => onChange([])}
            >
              {t("filters.clear")}
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FieldDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="dfb-field">
      <span className="dfb-label">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="dfb-select">
            <span className="dfb-select-val">
              {value ? format(value, "PP") : t("filters.any")}
            </span>
            <CalendarIcon size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
          {value && (
            <div className="dfb-cal-foot">
              <button
                type="button"
                className="dfb-link"
                onClick={() => onChange(undefined)}
              >
                {t("filters.clear")}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}