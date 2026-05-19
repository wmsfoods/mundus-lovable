import type { ReactNode } from "react";

export type TabItem = { value: string; label: string };

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  variant?: "primary" | "nested";
};

export function Tabs({ items, value, onChange, ariaLabel, variant = "primary" }: TabsProps) {
  return (
    <div
      className={`mt-tabs ${variant === "nested" ? "is-nested" : ""}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={it.value === value}
          className={`mt-tab ${it.value === value ? "is-active" : ""}`.trim()}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return null;
  return <div role="tabpanel">{children}</div>;
}