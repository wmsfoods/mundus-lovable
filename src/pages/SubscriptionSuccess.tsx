import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useCompanySubscription } from "@/hooks/useCompanySubscription";

type Props = { side: "supplier" | "buyer" };

export default function SubscriptionSuccess({ side }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refresh } = useCompanySubscription();

  const target = side === "supplier" ? "/supplier/insights/price-benchmark" : "/buyer/procurement-intelligence";

  useEffect(() => {
    refresh();
    const id = setTimeout(() => navigate(target), 5000);
    return () => clearTimeout(id);
  }, [navigate, target, refresh]);

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          padding: 32,
          border: "1px solid hsl(var(--border))",
          borderRadius: 16,
          background: "hsl(var(--card))",
        }}
      >
        <div style={{ display: "grid", placeItems: "center", marginBottom: 16 }}>
          <CheckCircle2 size={48} color="hsl(140, 70%, 45%)" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
          {t("billing.success.title")}
        </h1>
        <p style={{ color: "hsl(var(--muted-foreground))", margin: "0 0 20px" }}>
          {t("billing.success.lede")}
        </p>
        <ul style={{ textAlign: "left", margin: "0 auto 24px", maxWidth: 360, lineHeight: 1.7 }}>
          {(t(`billing.success.unlocks.${side}`, { returnObjects: true }) as string[]).map((s, i) => (
            <li key={i}>✓ {s}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => navigate(target)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 18px", borderRadius: 10, fontWeight: 600,
            background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
            border: "none", cursor: "pointer",
          }}
        >
          {t("billing.success.cta")} <ArrowRight size={14} />
        </button>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, marginTop: 14 }}>
          {t("billing.success.autoRedirect")}
        </p>
      </div>
    </div>
  );
}