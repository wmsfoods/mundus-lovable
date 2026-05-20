import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function FilterAccordion({
  label, icon, hasActive, defaultOpen = true, children,
}: { label: string; icon?: ReactNode; hasActive?: boolean; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`psp-filter-section ${open ? "is-open" : ""}`}>
      <button type="button" className="psp-filter-header" onClick={() => setOpen((o) => !o)}>
        {icon}
        <span className="label">{label}</span>
        {hasActive && <span className="dot" />}
        <ChevronDown size={14} className="chev" />
      </button>
      {open && <div className="psp-filter-body">{children}</div>}
    </div>
  );
}
