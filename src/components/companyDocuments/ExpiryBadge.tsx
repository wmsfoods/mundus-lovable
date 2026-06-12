import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { daysUntil } from "./types";

export function ExpiryBadge({ expiresAt }: { expiresAt: string | null | undefined }) {
  const { t, i18n } = useTranslation();
  if (!expiresAt) return null;
  const d = daysUntil(expiresAt);
  if (d === null) return null;
  const dateStr = new Date(expiresAt).toLocaleDateString(i18n.language || undefined, {
    year: "numeric", month: "short", day: "2-digit",
  });
  if (d < 0) {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
        {t("companyDocuments.badge.expired", { date: dateStr, defaultValue: `Expired ${dateStr}` })}
      </Badge>
    );
  }
  if (d < 60) {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
        {t("companyDocuments.badge.expiresIn", { n: d, defaultValue: `Expires in ${d} days` })}
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
      {t("companyDocuments.badge.validUntil", { date: dateStr, defaultValue: `Valid until ${dateStr}` })}
    </Badge>
  );
}