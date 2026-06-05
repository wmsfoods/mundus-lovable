import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { usePaymentTerms } from "@/hooks/usePaymentTerms";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function PaymentTermsCard({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { terms, loading } = usePaymentTerms({ scope: "international" });

  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.payment.${k}`, { defaultValue: fb }) as string;

  // Auto-pick first term once available — mirrors wizard default behavior.
  useEffect(() => {
    if (!value && terms.length > 0) onChange(terms[0]);
  }, [value, terms, onChange]);

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

      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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

      <p className="mt-2 text-[11px] text-muted-foreground">
        {tk("hint", "Defines advance/balance split agreed with buyer. Editable per offer.")}
      </p>
    </section>
  );
}