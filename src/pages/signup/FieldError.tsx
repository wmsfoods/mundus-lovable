import { AlertCircle } from "lucide-react";

/** Inline error message shown beneath a form field. */
export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Class fragment to apply red border to inputs when invalid. */
export const errorInputCls =
  "border-red-500 focus:border-red-500 focus:ring-red-500";