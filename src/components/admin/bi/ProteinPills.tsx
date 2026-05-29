import { ALL_PROTEINS } from "@/lib/proteins";

export type ProteinFilter = "All" | (typeof ALL_PROTEINS)[number];

const ALL_OPTIONS: ProteinFilter[] = ["All", ...ALL_PROTEINS];

export function ProteinPills({
  value,
  onChange,
  available,
}: {
  value: ProteinFilter;
  onChange: (v: ProteinFilter) => void;
  available?: string[]; // only show pills for proteins present in the dataset
}) {
  const opts = available && available.length
    ? (["All", ...ALL_OPTIONS.filter((p) => p !== "All" && available.includes(p))] as ProteinFilter[])
    : ALL_OPTIONS;
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md border bg-card p-0.5">
      {opts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`px-2.5 py-1 text-xs rounded-sm transition ${
            value === p
              ? "bg-[#B64769] text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}