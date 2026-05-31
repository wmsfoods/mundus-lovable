import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, CheckIcon } from "@/components/icons";
import { useActiveOffice } from "@/hooks/useActiveOffice";
import { countryFlag } from "@/lib/countryFlags";

export function OfficeSwitcher() {
  const {
    activeOffice,
    setActiveOffice,
    offices,
    hasMultipleOffices,
    isAllOffices,
    showAllOfficesOption,
    isGlobalDirector,
  } = useActiveOffice();
  const { t } = useTranslation();
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

  const hq = sorted.find((o) => !o.parent_company_id);
  const familyName = hq?.name || hq?.office_name || "";
  const allOfficesLabel = isGlobalDirector && familyName
    ? t("shell.officeSwitcher.allOfficesFamily", {
        defaultValue: "All Offices · {{family}}",
        family: familyName,
      })
    : t("shell.officeSwitcher.allOffices", { defaultValue: "All Offices" });
  const consolidatedLabel = t("shell.officeSwitcher.allOfficesConsolidated", {
    defaultValue: "All Offices (Consolidated)",
  });
  const currentLabel = isAllOffices
    ? allOfficesLabel
    : activeOffice?.office_name || activeOffice?.name || "Office";

  return (
    <div ref={ref} className="office-switcher">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="office-switcher-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ minHeight: 44 }}
      >
        <span>🌐</span>
        <span className="office-switcher-label">{currentLabel}</span>
        {isGlobalDirector && (
          <span
            className="office-switcher-director-badge"
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              background: "hsl(var(--primary) / 0.12)",
              color: "hsl(var(--primary))",
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            {t("shell.officeSwitcher.directorBadge", { defaultValue: "Director" })}
          </span>
        )}
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
                style={{ minHeight: 44 }}
              >
                <span>🌐</span>
                <span style={{ flex: 1 }}>
                  {isGlobalDirector && familyName ? allOfficesLabel : consolidatedLabel}
                </span>
                {isAllOffices && <CheckIcon size={14} />}
              </button>
              <hr />
            </>
          )}
          {sorted.map((o) => {
            const isHQ = !o.parent_company_id;
            const icon = isHQ ? "🏛️" : o.office_type === "branch" ? "🏢" : "🌏";
            const flag = countryFlag(o.office_country || o.country);
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
                style={{ minHeight: 44 }}
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