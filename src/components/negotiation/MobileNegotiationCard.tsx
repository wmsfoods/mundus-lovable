import type { ReactNode } from "react";

/**
 * Pure presentational mobile card for the Negotiations list.
 * No business logic — purely renders the data it is given.
 * Used on Supplier + Buyer mobile views to mirror the
 * "Negotiations (mobile)" reference design (tabs + grouped cards
 * + 3-stat row + round dots).
 */

export type MobileNegoStat = {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "bid" | "counter" | "gap-pos" | "gap-neg";
};

export type MobileNegoStatusTone =
  | "action_required"
  | "awaiting"
  | "final_round"
  | "accepted"
  | "rejected"
  | "expired";

const TONE_CLASS: Record<MobileNegoStatusTone, string> = {
  action_required: "mnc-status--action",
  awaiting: "mnc-status--awaiting",
  final_round: "mnc-status--final",
  accepted: "mnc-status--accepted",
  rejected: "mnc-status--rejected",
  expired: "mnc-status--expired",
};

const TOP_BAR_CLASS: Record<MobileNegoStatusTone, string> = {
  action_required: "mnc-topbar--action",
  awaiting: "mnc-topbar--awaiting",
  final_round: "mnc-topbar--final",
  accepted: "mnc-topbar--accepted",
  rejected: "mnc-topbar--rejected",
  expired: "mnc-topbar--expired",
};

export type MobileNegoBidCardProps = {
  initials: string;
  initialsTone?: "indigo" | "blue" | "green" | "rose" | "amber" | "slate";
  partyName: string;
  countryCode?: string;
  subtitle?: ReactNode;
  status: { tone: MobileNegoStatusTone; label: ReactNode };
  stats: MobileNegoStat[];
  round?: { current: number; total: number };
  dateLabel?: ReactNode;
  timerLabel?: ReactNode;
  onClick?: () => void;
};

export function MobileNegoBidCard({
  initials,
  initialsTone = "slate",
  partyName,
  countryCode,
  subtitle,
  status,
  stats,
  round,
  dateLabel,
  timerLabel,
  onClick,
}: MobileNegoBidCardProps) {
  return (
    <article
      className="mnc-card"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={`mnc-topbar ${TOP_BAR_CLASS[status.tone]}`} />
      <div className="mnc-head">
        <div className={`mnc-avatar mnc-avatar--${initialsTone}`}>{initials}</div>
        <div className="mnc-head-text">
          <div className="mnc-party">
            <span className="mnc-party-name">{partyName}</span>
            {countryCode && <span className="mnc-flag">{countryCode}</span>}
          </div>
          {subtitle && <div className="mnc-subtitle">{subtitle}</div>}
        </div>
        <span className={`mnc-status ${TONE_CLASS[status.tone]}`}>
          {status.tone === "action_required" && <span className="mnc-status-dot" />}
          {status.tone === "awaiting" && <span className="mnc-status-dot mnc-status-dot--blue" />}
          {status.tone === "accepted" && <span className="mnc-status-dot mnc-status-dot--green" />}
          {status.label}
        </span>
      </div>

      {stats.length > 0 && (
        <div className="mnc-stats">
          {stats.map((s, i) => (
            <div key={i} className="mnc-stat">
              <div className="mnc-stat-label">{s.label}</div>
              <div className={`mnc-stat-value mnc-stat--${s.tone ?? "default"}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {(round || dateLabel || timerLabel) && (
        <div className="mnc-foot">
          {round && (
            <div className="mnc-round">
              <span className="mnc-dots">
                {Array.from({ length: round.total }).map((_, i) => (
                  <span
                    key={i}
                    className={`mnc-dot ${i < round.current ? "is-on" : ""}`}
                  />
                ))}
              </span>
              <span>Round {round.current} of {round.total}</span>
            </div>
          )}
          {(dateLabel || timerLabel) && (
            <div className="mnc-time">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
              <span>{timerLabel ?? dateLabel}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export type MobileNegoGroupProps = {
  title: ReactNode;
  refNumber?: ReactNode;
  bidCount: number;
  needActionLabel?: ReactNode;
  children: ReactNode;
};

export function MobileNegoGroup({
  title,
  refNumber,
  bidCount,
  needActionLabel,
  children,
}: MobileNegoGroupProps) {
  return (
    <section className="mnc-group">
      <header className="mnc-group-head">
        <span className="mnc-group-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 2 7l10 5 10-5-10-5Z" />
            <path d="m2 17 10 5 10-5" />
            <path d="m2 12 10 5 10-5" />
          </svg>
        </span>
        <div className="mnc-group-text">
          <div className="mnc-group-title">{title}</div>
          <div className="mnc-group-sub">
            {refNumber && <span className="mnc-group-ref">{refNumber}</span>}
            <span>· {bidCount} {bidCount === 1 ? "bid" : "bids"}</span>
            {needActionLabel && (
              <>
                <span> · </span>
                <span className="mnc-group-need">{needActionLabel}</span>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="mnc-group-body">{children}</div>
    </section>
  );
}

export function MobileNegoTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; count: number }[];
}) {
  return (
    <div className="mnc-tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          className={`mnc-tab ${value === o.key ? "is-active" : ""}`}
          onClick={() => onChange(o.key)}
        >
          <span>{o.label}</span>
          <span className="mnc-tab-count">{o.count}</span>
        </button>
      ))}
    </div>
  );
}

export function MobileNegoHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="mnc-page-head">
      <div className="mnc-page-text">
        <h1 className="mnc-page-title">{title}</h1>
        {subtitle && <p className="mnc-page-sub">{subtitle}</p>}
      </div>
      {right && <div className="mnc-page-right">{right}</div>}
    </header>
  );
}