import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Sparkles, ArrowRight, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useCompanySubscription } from "@/hooks/useCompanySubscription";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import {
  PRO_PRICE_MONTHLY,
  planForFeature,
  startProCheckout,
} from "@/lib/proSubscription";
import type { UpsellFeature } from "@/components/supplier/InsightsUpsellPanel";

type Props = {
  feature: UpsellFeature | "cut-comparison" | "market-intelligence";
  side?: "supplier" | "buyer";
  children: ReactNode;
};

export function RequirePro({ feature, side = "supplier", children }: Props) {
  const { t } = useTranslation();
  const { isPro, loading } = useCompanySubscription();
  const { company } = useCurrentCompany();
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="ins-page" style={{ display: "grid", placeItems: "center", minHeight: 320 }}>
        <Loader2 className="animate-spin opacity-50" size={24} />
      </div>
    );
  }
  if (isPro) return <>{children}</>;

  const plan = planForFeature(feature as any, side);
  const price = PRO_PRICE_MONTHLY[plan];

  const onUpgrade = async () => {
    if (!company?.id) {
      toast.error(t("billing.errors.noCompany"));
      return;
    }
    try {
      setSubmitting(true);
      const url = await startProCheckout({
        company_id: company.id,
        plan,
        success_url: `${window.location.origin}/${side}/subscription-success`,
        cancel_url: window.location.href,
      });
      window.location.href = url;
    } catch (e) {
      console.error(e);
      toast.error(t("billing.errors.checkoutFailed"));
      setSubmitting(false);
    }
  };

  const handleContactSales = () => {
    toast.success(t("billing.salesConfirmation"));
  };

  return (
    <div className="require-pro">
      <div className="require-pro__card">
        <div className="require-pro__icon">
          <Lock size={20} />
        </div>
        <span className="require-pro__pill">
          <Sparkles size={12} /> {t("billing.requirePro.eyebrow")}
        </span>
        <h1 className="require-pro__title">{t("billing.requirePro.title")}</h1>
        <p className="require-pro__lede">{t("billing.requirePro.lede")}</p>
        <div className="require-pro__price">
          <span className="require-pro__amount">${price.toLocaleString()}</span>
          <span className="require-pro__per">/ {t("billing.requirePro.perMonth")}</span>
        </div>
        <div className="require-pro__actions">
          <button
            type="button"
            className="require-pro__btn require-pro__btn--primary"
            onClick={onUpgrade}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("billing.upgrade.redirecting")}
              </>
            ) : (
              <>
                {t("billing.upgrade.cta", { price })}
                <ArrowRight size={14} />
              </>
            )}
          </button>
          <button
            type="button"
            className="require-pro__btn require-pro__btn--secondary"
            onClick={handleContactSales}
          >
            <Mail size={14} />
            {t("billing.requirePro.contactSales")}
          </button>
        </div>
        <p className="require-pro__small">
          {t("billing.upgrade.billedMonthly")} · {t("billing.upgrade.cancelAnytime")}
        </p>
      </div>

      <style>{`
        .require-pro {
          min-height: 60vh;
          display: grid;
          place-items: center;
          padding: 32px 16px;
        }
        .require-pro__card {
          width: 100%;
          max-width: 520px;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          padding: 32px 28px;
          text-align: center;
          box-shadow: 0 12px 40px -20px hsl(var(--foreground) / 0.25);
        }
        .require-pro__icon {
          display: inline-grid; place-items: center;
          width: 48px; height: 48px;
          border-radius: 12px;
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
          margin: 0 auto 12px;
        }
        .require-pro__pill {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 10px; border-radius: 999px;
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          margin-bottom: 12px;
        }
        .require-pro__title { font-size: 24px; font-weight: 700; margin: 0 0 8px; color: hsl(var(--foreground)); }
        .require-pro__lede { color: hsl(var(--muted-foreground)); margin: 0 0 20px; line-height: 1.5; }
        .require-pro__price { display: flex; align-items: baseline; justify-content: center; gap: 6px; margin-bottom: 20px; }
        .require-pro__amount { font-size: 36px; font-weight: 700; color: hsl(var(--foreground)); }
        .require-pro__per { color: hsl(var(--muted-foreground)); }
        .require-pro__actions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
        .require-pro__btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 16px; border-radius: 10px; font-weight: 600; font-size: 14px;
          border: 1px solid transparent; cursor: pointer; text-decoration: none;
        }
        .require-pro__btn--primary { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
        .require-pro__btn--primary:disabled { opacity: 0.7; cursor: wait; }
        .require-pro__btn--secondary { background: transparent; border-color: hsl(var(--border)); color: hsl(var(--foreground)); }
        .require-pro__small { color: hsl(var(--muted-foreground)); font-size: 12px; margin: 0; }
        @media (min-width: 540px) { .require-pro__actions { flex-direction: row; } .require-pro__btn { flex: 1; } }
      `}</style>
    </div>
  );
}