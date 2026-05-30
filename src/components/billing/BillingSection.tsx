import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CreditCard, ArrowUpRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useCompanySubscription } from "@/hooks/useCompanySubscription";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { PRO_PRICE_MONTHLY, openBillingPortal, startProCheckout } from "@/lib/proSubscription";

type Props = { side: "supplier" | "buyer" };

export function BillingSection({ side }: Props) {
  const { t, i18n } = useTranslation();
  const { subscription, loading } = useCompanySubscription();
  const { company } = useCurrentCompany();
  const [busy, setBusy] = useState(false);

  const plan = side === "supplier" ? "supplier_pro" : "buyer_pro";
  const price = PRO_PRICE_MONTHLY[plan];

  const onPortal = async () => {
    if (!company?.id) return;
    try {
      setBusy(true);
      const url = await openBillingPortal({ company_id: company.id, return_url: window.location.href });
      window.location.href = url;
    } catch {
      toast.error(t("billing.errors.portalFailed"));
      setBusy(false);
    }
  };

  const onUpgrade = async () => {
    if (!company?.id) return;
    try {
      setBusy(true);
      const url = await startProCheckout({
        company_id: company.id,
        plan,
        success_url: `${window.location.origin}/${side}/subscription-success`,
        cancel_url: window.location.href,
      });
      window.location.href = url;
    } catch {
      toast.error(t("billing.errors.checkoutFailed"));
      setBusy(false);
    }
  };

  const status = subscription?.status ?? "inactive";
  const periodEndStr = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(i18n.language)
    : null;
  const stillInPaidPeriod =
    subscription?.current_period_end && new Date(subscription.current_period_end) > new Date();

  return (
    <section className="billing-section">
      <header className="billing-section__head">
        <CreditCard size={18} />
        <h3>{t("billing.section.title")}</h3>
      </header>

      {loading ? (
        <div className="billing-section__row"><Loader2 className="animate-spin" size={16} /> {t("common.loading")}</div>
      ) : status === "active" ? (
        <>
          <div className="billing-section__row">
            <CheckCircle2 size={16} color="hsl(140, 70%, 45%)" />
            <div>
              <strong>{t(`billing.plans.${plan}`)}</strong> · ${price.toLocaleString()} / {t("billing.requirePro.perMonth")}
              {periodEndStr && (
                <div className="billing-section__muted">
                  {subscription?.cancel_at_period_end
                    ? t("billing.section.cancelsOn", { date: periodEndStr })
                    : t("billing.section.renewsOn", { date: periodEndStr })}
                </div>
              )}
            </div>
          </div>
          <button type="button" className="billing-section__btn" onClick={onPortal} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={14} /> : <ArrowUpRight size={14} />}
            {t("billing.section.managePortal")}
          </button>
        </>
      ) : status === "past_due" ? (
        <>
          <div className="billing-section__alert">
            <AlertCircle size={16} />
            <div>{t("billing.section.pastDue")}</div>
          </div>
          <button type="button" className="billing-section__btn billing-section__btn--danger" onClick={onPortal} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={14} /> : <ArrowUpRight size={14} />}
            {t("billing.section.fixPayment")}
          </button>
        </>
      ) : status === "canceled" && stillInPaidPeriod ? (
        <>
          <div className="billing-section__row">{t("billing.section.canceledUntil", { date: periodEndStr })}</div>
          <button type="button" className="billing-section__btn" onClick={onPortal} disabled={busy}>{t("billing.section.managePortal")}</button>
        </>
      ) : (
        <>
          <p className="billing-section__muted" style={{ margin: "0 0 12px" }}>
            {t("billing.section.noSubscription", { price })}
          </p>
          <button type="button" className="billing-section__btn billing-section__btn--primary" onClick={onUpgrade} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={14} /> : <ArrowUpRight size={14} />}
            {t("billing.upgrade.cta", { price })}
          </button>
        </>
      )}

      <style>{`
        .billing-section { border: 1px solid hsl(var(--border)); border-radius: 12px; padding: 18px; background: hsl(var(--card)); }
        .billing-section__head { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .billing-section__head h3 { margin: 0; font-size: 15px; font-weight: 600; }
        .billing-section__row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; font-size: 14px; }
        .billing-section__muted { color: hsl(var(--muted-foreground)); font-size: 12px; margin-top: 4px; }
        .billing-section__alert { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: 8px; background: hsl(0 80% 50% / 0.08); color: hsl(0 80% 40%); margin-bottom: 12px; font-size: 13px; }
        .billing-section__btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border-radius: 8px; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); color: hsl(var(--foreground)); font-weight: 600; font-size: 13px; cursor: pointer; }
        .billing-section__btn:disabled { opacity: 0.7; cursor: wait; }
        .billing-section__btn--primary { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: transparent; }
        .billing-section__btn--danger { background: hsl(0 80% 50%); color: white; border-color: transparent; }
      `}</style>
    </section>
  );
}