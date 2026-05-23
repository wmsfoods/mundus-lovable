import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "@/components/icons";
import { useActiveOffice } from "@/hooks/useActiveOffice";

function flagFor(country: string | null | undefined): string {
  if (!country) return "";
  const c = country.toLowerCase();
  if (/brazil|brasil/.test(c)) return "🇧🇷";
  if (/china/.test(c)) return "🇨🇳";
  if (/united states|usa|u\.s\./.test(c)) return "🇺🇸";
  if (/uae|emirates/.test(c)) return "🇦🇪";
  if (/argentina/.test(c)) return "🇦🇷";
  if (/uruguay/.test(c)) return "🇺🇾";
  if (/mexico/.test(c)) return "🇲🇽";
  if (/japan/.test(c)) return "🇯🇵";
  if (/korea/.test(c)) return "🇰🇷";
  if (/germany/.test(c)) return "🇩🇪";
  if (/france/.test(c)) return "🇫🇷";
  if (/spain/.test(c)) return "🇪🇸";
  if (/italy/.test(c)) return "🇮🇹";
  if (/united kingdom|uk/.test(c)) return "🇬🇧";
  if (/netherlands/.test(c)) return "🇳🇱";
  if (/saudi/.test(c)) return "🇸🇦";
  if (/singapore/.test(c)) return "🇸🇬";
  if (/canada/.test(c)) return "🇨🇦";
  return "🌐";
}

export function OfficeSwitcher() {
  const {
    activeOffice,
    setActiveOffice,
    offices,
    hasMultipleOffices,
    isAllOffices,
    showAllOfficesOption,
  } = useActiveOffice();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!hasMultipleOffices) return null;

  const sorted = [...offices].sort((a, b) => {
    const aHQ = !a.parent_company_id ? 0 : 1;
    const bHQ = !b.parent_company_id ? 0 : 1;
    if (aHQ !== bHQ) return aHQ - bHQ;
    return (a.office_name || a.name || "").localeCompare(b.office_name || b.name || "");
  });

  const currentLabel = isAllOffices
    ? "All Offices"
    : activeOffice?.office_name || activeOffice?.name || "Office";

  return (
    <div ref={ref} className="office-switcher">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="office-switcher-btn"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>🌐</span>
        <span className="office-switcher-label">{currentLabel}</span>
        <ChevronDownIcon size={14} />
      </button>

      {open && (
        <div className="office-switcher-dropdown" role="menu">
          {showAllOfficesOption && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveOffice(null);
                  setOpen(false);
                }}
              >
                <span>🌐</span>
                <span style={{ flex: 1 }}>All Offices (Consolidated)</span>
                {isAllOffices && <CheckIcon size={14} />}
              </button>
              <hr />
            </>
          )}
          {sorted.map((o) => {
            const isHQ = !o.parent_company_id;
            const icon = isHQ ? "🏛️" : o.office_type === "branch" ? "🏢" : "🌏";
            const flag = flagFor(o.office_country || o.country);
            const label = isHQ
              ? `HQ ${o.office_country || o.country || ""}`.trim()
              : o.office_name || o.name;
            const isActive = activeOffice?.id === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setActiveOffice(o.id);
                  setOpen(false);
                }}
              >
                <span>{icon}</span>
                {flag && <span>{flag}</span>}
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && <CheckIcon size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}