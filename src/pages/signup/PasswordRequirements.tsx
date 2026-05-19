import { Check, CircleX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PwdRules } from "./passwordRules";

export function PasswordRequirements({ rules }: { rules: PwdRules }) {
  const { t } = useTranslation();
  const items: { key: keyof PwdRules; label: string }[] = [
    { key: "length", label: t("signup.passwordRules.length") },
    { key: "lower", label: t("signup.passwordRules.lower") },
    { key: "upper", label: t("signup.passwordRules.upper") },
    { key: "special", label: t("signup.passwordRules.special") },
  ];
  return (
    <div className="text-sm text-gray-600">
      <p className="mb-2">{t("signup.passwordRules.title")}</p>
      <ul className="space-y-1">
        {items.map((it) => {
          const met = rules[it.key];
          return (
            <li key={it.key} className="flex items-center gap-2">
              {met ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <CircleX className="h-4 w-4" style={{ color: "#B64769" }} />
              )}
              <span className={met ? "text-gray-700" : "text-gray-500"}>{it.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}