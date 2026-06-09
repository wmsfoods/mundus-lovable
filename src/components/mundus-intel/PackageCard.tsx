import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, ArrowUpRight, Check, Loader2, Sparkles } from "lucide-react";
import type { MundusIntelPackage } from "@/lib/mundusIntelPackages";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useCompanySubscription } from "@/hooks/useCompanySubscription";
import { startProCheckout } from "@/lib/proSubscription";

type Props = {
  pkg: MundusIntelPackage;
  side: "supplier" | "buyer";
};

export function PackageCard({ pkg, side }: Props) {
  const { t } = useTranslation();
  const { company } = useCurrentCompany();
  const { subscription, isPro, loading } = useCompanySubscription();
  const [submitting, setSubmitting] = useState(false);

  const subscribed = isPro && subscription?.plan === pkg.plan;

  const onSubscribe = async () => {
    if (!company?.id) {
      toast.error(t("billing.errors.noCompany", { defaultValue: "No company found" }));
      return;
    }
    try {
      setSubmitting(true);
      const url = await startProCheckout({
        company_id: company.id,
        plan: pkg.plan,
        success_url: `${window.location.origin}/${side}/subscription-success`,
        cancel_url: window.location.href,
      });
      window.location.href = url;
    } catch (e) {
      console.error(e);
      toast.error(t("billing.errors.checkoutFailed", { defaultValue: "Checkout failed" }));
      setSubmitting(false);
    }
  };

  return (
    <article className="mi-card">
      <header className="mi-card__head">
        <span className="mi-card__pill">
          <Sparkles size={12} /> PRO
        </span>
        {subscribed && (
          <span className="mi-card__active">
            <Check size={12} /> {t("mundusIntel.active", { defaultValue: "Active" })}
          </span>
        )}
      </header>

      <h2 className="mi-card__title">{pkg.name}</h2>
      <p className="mi-card__tagline">{pkg.tagline}</p>

      <div className="mi-card__price">
        <span className="mi-card__amount">${pkg.price.toLocaleString()}</span>
        <span className="mi-card__per">/ {t("billing.requirePro.perMonth", { defaultValue: "month" })}</span>
      </div>

      <ul className="mi-card__features">
        {pkg.features.map((f) => {
          const I = f.icon;
          const inner = (
            <>
              <span className="mi-feat__icon"><I size={16} /></span>
              <div className="mi-feat__body">
                <div className="mi-feat__label">{f.label}</div>
                <div className="mi-feat__desc">{f.description}</div>
              </div>
              {subscribed && (
                <span className="mi-feat__cta">
                  {f.externalUrl ? <ArrowUpRight size={14} /> : <ArrowRight size={14} />}
                </span>
              )}
            </>
          );

          if (subscribed && f.to) {
            return (
              <li key={f.key}>
                <Link to={f.to} className="mi-feat mi-feat--link">{inner}</Link>
              </li>
            );
          }
          if (subscribed && f.externalUrl) {
            return (
              <li key={f.key}>
                <a href={f.externalUrl} target="_blank" rel="noreferrer" className="mi-feat mi-feat--link">
                  {inner}
                </a>
              </li>
            );
          }
          return (
            <li key={f.key}>
              <div className="mi-feat">{inner}</div>
            </li>
          );
        })}
      </ul>

      <footer className="mi-card__foot">
        {subscribed ? (
          <div className="mi-card__note">
            {t("mundusIntel.includedNote", { defaultValue: "All features above are included in your plan." })}
          </div>
        ) : (
          <button
            type="button"
            className="mi-card__btn"
            onClick={onSubscribe}
            disabled={submitting || loading}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("billing.upgrade.redirecting", { defaultValue: "Redirecting…" })}
              </>
            ) : (
              <>
                {t("mundusIntel.subscribeCta", {
                  defaultValue: "Subscribe — ${{price}}/mo",
                  price: pkg.price.toLocaleString(),
                })}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        )}
        <p className="mi-card__small">
          {t("billing.upgrade.billedMonthly", { defaultValue: "Billed monthly" })} ·{" "}
          {t("billing.upgrade.cancelAnytime", { defaultValue: "Cancel anytime" })}
        </p>
      </footer>
    </article>
  );
}