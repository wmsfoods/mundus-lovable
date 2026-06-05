import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

type Props = { activeNegotiations: number };

export function EditModeWarningBanner({ activeNegotiations }: Props) {
  const { t } = useTranslation();
  if (activeNegotiations <= 0) return null;
  const msg = t("supplier.createOfferV2.editMode.activeNegotiationsWarning", {
    count: activeNegotiations,
    defaultValue:
      activeNegotiations === 1
        ? "{{count}} active negotiation — changes won't affect ongoing chats"
        : "{{count}} active negotiations — changes won't affect ongoing chats",
  }) as string;
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span className="font-medium">{msg}</span>
    </div>
  );
}