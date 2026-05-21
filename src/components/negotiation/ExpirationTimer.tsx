import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getExpirationInfo } from "@/lib/negotiationEngine";

/** Live countdown chip; ticks every minute. */
export function ExpirationTimer({ expiresAt }: { expiresAt: string | null | undefined }) {
  const { t } = useTranslation();
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const info = getExpirationInfo(expiresAt);
  if (!info) return null;
  if (info.expired) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
        style={{ background: "#fee2e2", color: "#b91c1c" }}
      >
        ⏱ {t("engine.expired", "Expired")}
      </span>
    );
  }
  const warn = info.msLeft < 3 * 3600_000;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
      style={{
        background: warn ? "#fef3c7" : "#f1f5f9",
        color: warn ? "#92400e" : "#334155",
      }}
    >
      ⏱ {t("engine.expiresIn", "Expires in")} {info.label}
    </span>
  );
}

export default ExpirationTimer;