import { useMemo } from "react";

export type ProteinKey = "all" | "beef" | "pork" | "poultry" | "ovine";

export const PROTEIN_META: Record<Exclude<ProteinKey, "all">, { label: string; emoji: string }> = {
  beef: { label: "Beef", emoji: "🥩" },
  pork: { label: "Pork", emoji: "🐖" },
  poultry: { label: "Poultry", emoji: "🐓" },
  ovine: { label: "Ovine", emoji: "🐑" },
};

// Normalize any category string from DB/mocks into a ProteinKey.
export function categoryToProtein(category: string | null | undefined): Exclude<ProteinKey, "all"> | null {
  if (!category) return null;
  const c = category.trim().toLowerCase();
  if (c === "beef") return "beef";
  if (c === "pork") return "pork";
  if (c === "poultry" || c === "chicken") return "poultry";
  if (c === "ovine" || c === "lamb" || c === "sheep" || c === "mutton") return "ovine";
  return null;
}

type Props = {
  value: ProteinKey;
  onChange: (v: ProteinKey) => void;
  available: Array<Exclude<ProteinKey, "all">>;
  counts?: Partial<Record<Exclude<ProteinKey, "all">, number>>;
  showAll?: boolean;
  allLabel?: string;
  size?: "md" | "sm";
};

export function ProteinFilter({
  value,
  onChange,
  available,
  counts,
  showAll = true,
  allLabel = "All",
  size = "md",
}: Props) {
  const totalCount = useMemo(
    () => available.reduce((s, k) => s + (counts?.[k] ?? 0), 0),
    [available, counts]
  );

  return (
    <div className={`protein-filter ${size === "sm" ? "is-sm" : ""}`.trim()} role="tablist" aria-label="Protein filter">
      {showAll && (
        <button
          type="button"
          role="tab"
          aria-pressed={value === "all"}
          className={`pf-pill ${value === "all" ? "is-active" : ""}`.trim()}
          onClick={() => onChange("all")}
        >
          <span className="pf-emoji" aria-hidden="true">✨</span>
          <span className="pf-label">{allLabel}</span>
          {counts && <span className="pf-count">{totalCount}</span>}
        </button>
      )}
      {available.map((k) => {
        const meta = PROTEIN_META[k];
        const c = counts?.[k];
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-pressed={value === k}
            className={`pf-pill ${value === k ? "is-active" : ""}`.trim()}
            onClick={() => onChange(k)}
          >
            <span className="pf-emoji" aria-hidden="true">{meta.emoji}</span>
            <span className="pf-label">{meta.label}</span>
            {typeof c === "number" && <span className="pf-count">{c}</span>}
          </button>
        );
      })}
    </div>
  );
}