import { useEffect, useState } from "react";

function formatDelta(ms: number): { d: string; h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s) };
}

type Props = {
  closesAt: number | null;
  /** When provided, used together with closesAt to render a progress bar (0..1 = elapsed). */
  openedAt?: number | null;
  compact?: boolean;
  showProgress?: boolean;
};

/** Live ticking countdown used in auction cards. */
export function AuctionCountdown({ closesAt, openedAt, compact, showProgress }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (closesAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [closesAt]);

  if (closesAt === null) return null;
  const remaining = closesAt - now;
  const expired = remaining <= 0;
  const { d, h, m, s } = formatDelta(remaining);

  const progressPct =
    showProgress && openedAt
      ? Math.min(100, Math.max(0, ((now - openedAt) / (closesAt - openedAt)) * 100))
      : null;

  return (
    <div className={`auct-countdown ${compact ? "is-compact" : ""}`}>
      <div className="auct-countdown-row">
        <span className="auct-countdown-label">{expired ? "CLOSED" : "CLOSES IN"}</span>
        <span className="auct-countdown-value" aria-live="polite">
          {d}:{h}:{m}:{s}
        </span>
      </div>
      {progressPct !== null && (
        <div className="auct-progress" role="progressbar" aria-valuenow={Math.round(progressPct)}>
          <div className="auct-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}
    </div>
  );
}

export default AuctionCountdown;