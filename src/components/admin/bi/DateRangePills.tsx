import { useTranslation } from "react-i18next";

export type BIDateRange = "7d" | "30d" | "90d" | "12m";

const PILLS: Array<{ value: BIDateRange; label: string }> = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "12m", label: "12m" },
];

export function rangeToDays(r: BIDateRange): number {
  return r === "7d" ? 7 : r === "30d" ? 30 : r === "90d" ? 90 : 365;
}

export function DateRangePills({
  value,
  onChange,
}: {
  value: BIDateRange;
  onChange: (v: BIDateRange) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex rounded-md border bg-card p-0.5">
      {PILLS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 text-xs rounded-sm transition ${
            value === p.value
              ? "bg-[#B64769] text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t(`admin.bi.range.${p.value}`, p.label)}
        </button>
      ))}
    </div>
  );
}