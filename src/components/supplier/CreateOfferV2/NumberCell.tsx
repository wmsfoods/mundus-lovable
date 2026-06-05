import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  value: number;
  onCommit: (raw: string) => void;
  fractionDigits?: number;
  minFractionDigits?: number;
  className?: string;
  title?: string;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * Numeric input that:
 *  - while focused: shows raw editable string (no truncation, no thousands sep)
 *  - while blurred: shows formatted number with locale separators + capped decimals
 *  - commits parsed value to parent on every change (no debounce; preserves existing UX)
 */
export function NumberCell({
  value,
  onCommit,
  fractionDigits = 2,
  minFractionDigits = 0,
  className,
  title,
  placeholder,
  disabled,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>("");

  // Sync incoming value when not focused
  useEffect(() => {
    if (!focused) {
      setDraft(value > 0 ? String(roundTo(value, fractionDigits)) : "");
    }
  }, [value, focused, fractionDigits]);

  const formatted =
    value > 0
      ? value.toLocaleString(undefined, {
          minimumFractionDigits: minFractionDigits,
          maximumFractionDigits: fractionDigits,
        })
      : "";

  if (!focused) {
    return (
      <Input
        type="text"
        inputMode="decimal"
        className={className}
        value={formatted}
        placeholder={placeholder}
        title={title}
        disabled={disabled}
        onFocus={() => {
          setDraft(value > 0 ? String(roundTo(value, fractionDigits)) : "");
          setFocused(true);
        }}
        onChange={() => {
          // ignored; real edits happen in focused mode
        }}
      />
    );
  }

  return (
    <Input
      type="number"
      inputMode="decimal"
      className={className}
      value={draft}
      placeholder={placeholder}
      title={title}
      disabled={disabled}
      autoFocus
      onChange={(e) => {
        setDraft(e.target.value);
        onCommit(e.target.value);
      }}
      onBlur={() => setFocused(false)}
    />
  );
}

function roundTo(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}