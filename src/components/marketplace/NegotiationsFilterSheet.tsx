import { useEffect, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";

export type NegoSortKey = "recent" | "oldest" | "priority";

export type NegoChip<K extends string> = {
  key: K | "all";
  label: string;
  count: number;
};

type Props<K extends string> = {
  query: string;
  onQueryChange: (v: string) => void;
  sortBy: NegoSortKey;
  onSortChange: (v: NegoSortKey) => void;
  filter: K | "all";
  onFilterChange: (v: K | "all") => void;
  chips: NegoChip<K>[];
  sortLabels: Record<NegoSortKey, string>;
  searchPlaceholder: string;
  i18n: {
    filters: string;
    sort: string;
    status: string;
    clear: string;
    cancel: string;
    apply: string;
  };
};

export function NegotiationsFilterSheet<K extends string>({
  query,
  onQueryChange,
  sortBy,
  onSortChange,
  filter,
  onFilterChange,
  chips,
  sortLabels,
  searchPlaceholder,
  i18n,
}: Props<K>) {
  const isMobile = useIsMobileShell();
  const [open, setOpen] = useState(false);
  const [draftSort, setDraftSort] = useState<NegoSortKey>(sortBy);
  const [draftFilter, setDraftFilter] = useState<K | "all">(filter);

  useEffect(() => {
    if (open) {
      setDraftSort(sortBy);
      setDraftFilter(filter);
    }
  }, [open, sortBy, filter]);

  if (!isMobile) return null;

  const activeCount =
    (sortBy !== "recent" ? 1 : 0) + (filter !== "all" ? 1 : 0);
  const draftActive =
    (draftSort !== "recent" ? 1 : 0) + (draftFilter !== "all" ? 1 : 0);

  const apply = () => {
    onSortChange(draftSort);
    onFilterChange(draftFilter);
    setOpen(false);
  };
  const reset = () => {
    setDraftSort("recent");
    setDraftFilter("all" as K | "all");
  };

  return (
    <div className="ofb ofb-mobile" style={{ marginBottom: 12 }}>
      <div className="ofb-mobile-row">
        <div className="ofb-search">
          <SearchIcon size={15} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {query && (
            <button
              type="button"
              className="ofb-search-clear"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          className={cn("ofb-mobile-trigger", activeCount > 0 && "is-active")}
          onClick={() => setOpen(true)}
          aria-label={i18n.filters}
        >
          <SlidersHorizontal size={16} />
          <span>{i18n.filters}</span>
          {activeCount > 0 && (
            <span className="ofb-mobile-badge">{activeCount}</span>
          )}
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="ofb-sheet">
          <div className="ofb-sheet-handle" aria-hidden />
          <SheetHeader className="ofb-sheet-head">
            <SheetTitle>{i18n.filters}</SheetTitle>
            {draftActive > 0 && (
              <button
                type="button"
                className="ofb-sheet-clear"
                onClick={reset}
              >
                {i18n.clear}
              </button>
            )}
          </SheetHeader>

          <div className="ofb-sheet-body">
            <div className="ofb-sheet-section">
              <div className="ofb-sheet-section-title">{i18n.sort}</div>
              <div className="ofb-sheet-pills">
                {(Object.keys(sortLabels) as NegoSortKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={cn(
                      "ofb-sheet-pill",
                      draftSort === k && "is-active",
                    )}
                    onClick={() => setDraftSort(k)}
                  >
                    {sortLabels[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className="ofb-sheet-section">
              <div className="ofb-sheet-section-title">{i18n.status}</div>
              <div className="ofb-sheet-pills">
                {chips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={cn(
                      "ofb-sheet-pill",
                      draftFilter === c.key && "is-active",
                    )}
                    onClick={() => setDraftFilter(c.key as K | "all")}
                  >
                    {c.label}
                    <span
                      style={{
                        marginLeft: 6,
                        opacity: 0.7,
                        fontWeight: 500,
                      }}
                    >
                      {c.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ofb-sheet-foot">
            <button
              type="button"
              className="ofb-sheet-btn is-ghost"
              onClick={() => setOpen(false)}
            >
              {i18n.cancel}
            </button>
            <button
              type="button"
              className="ofb-sheet-btn is-primary"
              onClick={apply}
            >
              {i18n.apply}
              {draftActive > 0 ? ` (${draftActive})` : ""}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
