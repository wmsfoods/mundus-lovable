import { Check, CircleX } from "lucide-react";
import { PwdRules } from "./passwordRules";

export function PasswordRequirements({ rules }: { rules: PwdRules }) {
  const items: { key: keyof PwdRules; label: string }[] = [
    { key: "length", label: "8 characters or more;" },
    { key: "lower", label: "One lowercase letter;" },
    { key: "upper", label: "One uppercase letter;" },
    { key: "special", label: "One special character." },
  ];
  return (
    <div className="text-sm text-gray-600">
      <p className="mb-2">The password must contain:</p>
      <ul className="space-y-1">
        {items.map((it) => {
          const met = rules[it.key];
          return (
            <li key={it.key} className="flex items-center gap-2">
              {met ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <CircleX className="h-4 w-4" style={{ color: "#9B2251" }} />
              )}
              <span className={met ? "text-gray-700" : "text-gray-500"}>{it.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}