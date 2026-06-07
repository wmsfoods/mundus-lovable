import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  decodeShipmentReady,
  encodeShipmentReady,
  type ShipmentMode,
  type ShipmentParts,
} from "@/lib/shipmentReady";

type Props = {
  /** Encoded form value, e.g. "month:2026-06" / "week:2026-W25" / "custom:Q3 2026" / "" */
  value: string;
  onChange: (next: string) => void;
  /** Compact (mobile sheet) vs default sizing */
  size?: "default" | "compact";
  className?: string;
};

const MODES: { id: ShipmentMode; key: string; fb: string }[] = [
  { id: "month", key: "shipmentReady.mode.month", fb: "Month" },
  { id: "week", key: "shipmentReady.mode.week", fb: "Week" },
  { id: "custom", key: "shipmentReady.mode.custom", fb: "Custom" },
];

const MONTH_LABEL_KEYS = [
  ["shipmentReady.months.jan", "January"],
  ["shipmentReady.months.feb", "February"],
  ["shipmentReady.months.mar", "March"],
  ["shipmentReady.months.apr", "April"],
  ["shipmentReady.months.may", "May"],
  ["shipmentReady.months.jun", "June"],
  ["shipmentReady.months.jul", "July"],
  ["shipmentReady.months.aug", "August"],
  ["shipmentReady.months.sep", "September"],
  ["shipmentReady.months.oct", "October"],
  ["shipmentReady.months.nov", "November"],
  ["shipmentReady.months.dec", "December"],
];

export function ShipmentReadyPicker({ value, onChange, size = "default", className }: Props) {
  const { t } = useTranslation();
  const parts: ShipmentParts = useMemo(() => decodeShipmentReady(value), [value]);
  const inputH = size === "compact" ? "h-11 text-base" : "h-9 text-sm";

  const currentYear = new Date().getFullYear();
  const year = parts.year ?? currentYear;

  const setMode = (mode: ShipmentMode) => {
    if (mode === parts.mode) return;
    // Preserve year across modes when sensible
    const carry: ShipmentParts =
      mode === "month"
        ? { mode, year, monthIdx: parts.monthIdx ?? new Date().getMonth() + 1 }
        : mode === "week"
          ? { mode, year, week: parts.week ?? 1 }
          : { mode, custom: parts.custom ?? "" };
    onChange(encodeShipmentReady(carry));
  };

  const setMonth = (mIdx: number) =>
    onChange(encodeShipmentReady({ mode: "month", year, monthIdx: mIdx }));
  const setYear = (y: number) => {
    if (parts.mode === "week") {
      onChange(encodeShipmentReady({ mode: "week", year: y, week: parts.week ?? 1 }));
    } else {
      onChange(
        encodeShipmentReady({
          mode: "month",
          year: y,
          monthIdx: parts.monthIdx ?? new Date().getMonth() + 1,
        }),
      );
    }
  };
  const setWeek = (w: number) =>
    onChange(encodeShipmentReady({ mode: "week", year, week: Math.min(53, Math.max(1, w)) }));
  const setCustom = (c: string) =>
    onChange(encodeShipmentReady({ mode: "custom", custom: c }));

  return (
    <div className={cn("space-y-2", className)}>
      {/* Mode pills */}
      <div className="inline-flex rounded-lg bg-muted p-0.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium",
              size === "compact" && "min-h-[36px] px-4 text-sm",
              parts.mode === m.id
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(m.key, { defaultValue: m.fb })}
          </button>
        ))}
      </div>

      {/* Inputs per mode */}
      {parts.mode === "month" && (
        <div className="flex gap-2">
          <select
            className={cn(
              "flex-1 rounded-md border border-border bg-card px-2",
              inputH,
            )}
            value={parts.monthIdx ?? ""}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            <option value="">—</option>
            {MONTH_LABEL_KEYS.map(([k, fb], i) => (
              <option key={k} value={i + 1}>
                {t(k, { defaultValue: fb })}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min={2024}
            max={2099}
            className={cn("w-28", inputH)}
            value={parts.year ?? ""}
            onChange={(e) => setYear(Number(e.target.value) || currentYear)}
          />
        </div>
      )}

      {parts.mode === "week" && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("shipmentReady.weekNumber", { defaultValue: "Week (1–53)" })}
            </label>
            <Input
              type="number"
              min={1}
              max={53}
              className={inputH}
              value={parts.week ?? ""}
              onChange={(e) => setWeek(Number(e.target.value) || 1)}
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("shipmentReady.year", { defaultValue: "Year" })}
            </label>
            <Input
              type="number"
              min={2024}
              max={2099}
              className={inputH}
              value={parts.year ?? ""}
              onChange={(e) => setYear(Number(e.target.value) || currentYear)}
            />
          </div>
        </div>
      )}

      {parts.mode === "custom" && (
        <Input
          placeholder={t("shipmentReady.customPh", {
            defaultValue: "e.g. End of June 2026, Q3 2026",
          })}
          className={inputH}
          value={parts.custom ?? ""}
          onChange={(e) => setCustom(e.target.value)}
        />
      )}
    </div>
  );
}