import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { usePaymentTerms } from "@/hooks/usePaymentTerms";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** Only used to look up `company_preferences.default_payment_terms` as a smart default. */
  supplierContextId?: string | null;
  /** Only "create" triggers the supplier-default prefill. */
  mode?: "create" | "edit" | "clone" | "fromRequest";
  /** When false, the surrounding chrome (card border / header) is hidden — used in compact mobile cards. */
  showChrome?: boolean;
};

export function PaymentTermsCard({
  value,
  onChange,
  supplierContextId,
  mode = "create",
  showChrome = true,
}: Props) {
  const { t } = useTranslation();
  const { terms, loading } = usePaymentTerms({ scope: "international" });
  const triedDefault = useRef(false);

  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.payment.${k}`, { defaultValue: fb }) as string;

  // 1) Try supplier default (company_preferences.default_payment_terms) — only in "create" mode.
  useEffect(() => {
    if (mode !== "create") return;
    if (value) return;
    if (!supplierContextId) return;
    if (terms.length === 0) return;
    if (triedDefault.current) return;
    triedDefault.current = true;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("company_preferences")
        .select("default_payment_terms")
        .eq("company_id", supplierContextId)
        .maybeSingle();
      if (!alive) return;
      const def = (data?.default_payment_terms ?? "").trim();
      if (def && terms.includes(def)) onChange(def);
    })();
    return () => {
      alive = false;
    };
  }, [mode, value, supplierContextId, terms, onChange]);

  // 2) Fallback: auto-pick first term once available — original behavior.
  useEffect(() => {
    if (!value && terms.length > 0 && (mode !== "create" || !supplierContextId)) {
      onChange(terms[0]);
    }
  }, [value, terms, onChange, mode, supplierContextId]);

  const selectEl = (
    <select
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-base md:text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
        {loading && <option value="">{tk("loading", "Loading…")}</option>}
        {!loading && terms.length === 0 && (
          <option value="">{tk("empty", "No payment terms available")}</option>
        )}
        {terms.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
    </select>
  );

  if (!showChrome) return selectEl;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Wallet size={14} />
        </span>
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-foreground">
            {tk("title", "Payment terms")}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {tk("subtitle", "Advance / balance split agreed with the buyer")}
          </p>
        </div>
      </header>
      {selectEl}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {tk("hint", "Defines advance/balance split agreed with buyer. Editable per offer.")}
      </p>
    </section>
  );
}