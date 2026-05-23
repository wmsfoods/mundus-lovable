import { useActiveOffice } from "@/hooks/useActiveOffice";

/**
 * Small inline indicator showing the currently active office filter.
 * - Masters see a 🏢 icon and a "Show all" reset button.
 * - Non-masters see a 🔒 icon and "(your assigned office)" hint.
 * - Renders nothing when in "All Offices" mode.
 */
export function OfficeIndicator() {
  const { activeOffice, isAllOffices, isMaster, setActiveOffice } = useActiveOffice();
  if (isAllOffices || !activeOffice) return null;
  return (
    <div
      style={{
        fontSize: 12,
        color: "var(--fg-muted)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "0 0 12px",
      }}
    >
      {isMaster ? "🏢" : "🔒"} Viewing: {activeOffice.office_name || activeOffice.name}
      {isMaster ? (
        <button
          type="button"
          onClick={() => setActiveOffice(null)}
          style={{
            fontSize: 11,
            color: "var(--brand)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ✕ Show all
        </button>
      ) : (
        <span style={{ fontSize: 11, opacity: 0.7 }}>(your assigned office)</span>
      )}
    </div>
  );
}