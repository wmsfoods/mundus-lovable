import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (next: number) => void;
  className?: string;
  min?: number;
};

/**
 * Numeric input for FCL container count that allows the field to be
 * temporarily empty while editing. Without this, a value fallback of `1`
 * causes typing "2" to produce "12" because the leading "1" never clears.
 */
export function FclCountInput({ value, onChange, className, min = 1 }: Props) {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      className={cn(className)}
      value={draft}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/\D/g, "");
        setDraft(cleaned);
        const n = parseInt(cleaned, 10);
        if (!Number.isNaN(n) && n >= min) onChange(n);
      }}
      onBlur={() => {
        const n = parseInt(draft, 10);
        const normalized = !n || n < min ? min : n;
        setDraft(String(normalized));
        if (normalized !== value) onChange(normalized);
      }}
    />
  );
}