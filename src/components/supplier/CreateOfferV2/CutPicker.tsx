import { useMemo, useState } from "react";
import { Check, ChevronDown, ImageOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CutItem } from "@/hooks/useCutsCatalog";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export type CutPickerProps = {
  catalog: CutItem[];
  loading?: boolean;
  disabled?: boolean;
  /** Currently selected cut id (may not be in catalog → orphan) */
  value: string | null;
  /** Saved cut name (used when orphan / before catalog loads) */
  valueName: string;
  /** Called with the picked catalog entry (or null on clear) */
  onChange: (cut: CutItem | null) => void;
  /** Placeholder for the trigger when nothing is picked yet */
  placeholder?: string;
  /** Placeholder shown when protein not chosen yet */
  pickProteinHint?: string;
  /** Override search input placeholder */
  searchPlaceholder?: string;
  invalid?: boolean;
  className?: string;
  /** Compact = desktop table row height (h-8 text-xs); large = mobile (h-11 text-base) */
  size?: "compact" | "large";
};

export function CutPicker({
  catalog,
  loading = false,
  disabled = false,
  value,
  valueName,
  onChange,
  placeholder = "Pick cut…",
  pickProteinHint = "Pick protein first",
  searchPlaceholder = "Search by name or IMPS #…",
  invalid = false,
  className,
  size = "compact",
}: CutPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return catalog;
    const tokens = q.split(/\s+/).filter(Boolean);
    return catalog.filter((c) => {
      const hay = normalize(`${c.displayName} ${c.imps_number ?? ""} ${c.bone_spec ?? ""}`);
      return tokens.every((tok) => hay.includes(tok));
    });
  }, [catalog, query]);

  const selected = value ? catalog.find((c) => c.id === value) ?? null : null;
  const label = selected?.displayName || valueName || "";

  const triggerCls =
    size === "large"
      ? "h-11 text-base px-3"
      : "h-8 text-xs px-2";

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(o) => {
        if (disabled) return;
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={label || placeholder}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-border bg-card text-left",
            "min-w-0 disabled:cursor-not-allowed disabled:opacity-60",
            invalid && "border-destructive/60",
            triggerCls,
            className,
          )}
        >
          {selected?.image_url ? (
            <img
              src={selected.image_url}
              alt=""
              className={cn(
                "shrink-0 rounded object-cover",
                size === "large" ? "h-8 w-8" : "h-6 w-6",
              )}
            />
          ) : (
            <div
              className={cn(
                "shrink-0 rounded bg-muted",
                size === "large" ? "h-8 w-8" : "h-6 w-6",
              )}
              aria-hidden
            />
          )}
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              !label && "text-muted-foreground",
            )}
          >
            {loading
              ? "Loading…"
              : !catalog.length && !value
              ? pickProteinHint
              : label || placeholder}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(420px,90vw)] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 text-sm"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              <span className="italic">Clear selection</span>
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-xs text-muted-foreground">
              <ImageOff className="h-3.5 w-3.5" /> No cuts match "{query}"
            </div>
          ) : (
            filtered.map((c) => {
              const isSel = c.id === value;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted",
                    isSel && "bg-primary/5",
                  )}
                >
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 shrink-0 rounded bg-muted" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium leading-tight">
                      {c.displayName}
                    </div>
                    {(c.bone_spec || c.imps_number) && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {[c.imps_number ? `IMPS ${c.imps_number}` : null, c.bone_spec]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                  {isSel && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}