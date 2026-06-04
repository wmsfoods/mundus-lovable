import { useState, type CSSProperties, type InputHTMLAttributes } from "react";
import { fromDisplay, toDisplay, type WeightUnit } from "@/lib/units";
import { formatPlain, formatUS, parseUS, sanitizeNumericTyping } from "@/lib/numberFormat";

type BaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
>;

export type NumberInputProps = BaseProps & {
  /** Canonical value persisted in kg (string). Empty string = unset. */
  valueKg: string;
  /** Display unit (kg or lbs). Affects conversion only when kind requires it. */
  unit: WeightUnit;
  /** Whether the field represents a price or a weight (drives conversion). */
  kind: "price" | "weight";
  /** Override decimal places. Defaults: price=2, weight=0. */
  decimals?: number;
  /** Emits the new canonical kg value (or "" when cleared). */
  onChangeKg: (kgStr: string) => void;
  className?: string;
  style?: CSSProperties;
};

/**
 * Standardized numeric input used across offer/auction creation.
 * Fixes the "$7 jumps to $7.00 and locks the caret on decimals" bug by:
 *  - using type="text" + inputMode="decimal" (no browser auto-formatting),
 *  - keeping the raw text the user types in local state during focus,
 *  - only converting / reformatting on blur.
 */
export function NumberInput({
  valueKg,
  unit,
  kind,
  decimals,
  onChangeKg,
  className,
  style,
  placeholder,
  ...rest
}: NumberInputProps) {
  const d = decimals ?? (kind === "price" ? 2 : 0);
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  const kgNum = parseUS(valueKg);
  const displayNum = kgNum === null ? null : toDisplay(kgNum, kind, unit);

  const blurredValue = displayNum === null ? "" : formatUS(displayNum, d);
  const focusSeed = displayNum === null ? "" : formatPlain(displayNum, d);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      style={style}
      placeholder={placeholder}
      value={focused ? raw : blurredValue}
      onFocus={(e) => {
        setRaw(focusSeed);
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        setRaw(sanitizeNumericTyping(e.target.value, d));
      }}
      onBlur={(e) => {
        setFocused(false);
        const trimmed = raw.replace(/\.$/, "");
        if (trimmed === "" || trimmed === ".") {
          if (valueKg !== "") onChangeKg("");
        } else {
          const n = parseUS(trimmed);
          if (n === null) {
            if (valueKg !== "") onChangeKg("");
          } else {
            const factor = Math.pow(10, d);
            const rounded = Math.round(n * factor) / factor;
            const kg = fromDisplay(rounded, kind, unit);
            onChangeKg(String(kg));
          }
        }
        rest.onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        rest.onKeyDown?.(e);
      }}
    />
  );
}