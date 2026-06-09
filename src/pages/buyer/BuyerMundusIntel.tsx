import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { PackageCard } from "@/components/mundus-intel/PackageCard";
import { getBuyerPackages } from "@/lib/mundusIntelPackages";

export default function BuyerMundusIntel() {
  const { t } = useTranslation();
  const packages = getBuyerPackages();
  return (
    <div className="mi-page">
      <header className="mi-page__header">
        <span className="mi-page__eyebrow">
          <Sparkles size={12} /> {t("shell.nav.mundusIntel", { defaultValue: "Mundus Intel" })}
        </span>
        <h1 className="mi-page__title">
          {t("mundusIntel.buyer.title", { defaultValue: "Add-on packages" })}
        </h1>
        <p className="mi-page__subtitle">
          {t("mundusIntel.buyer.subtitle", {
            defaultValue: "Unlock procurement intelligence and live market data with a single subscription.",
          })}
        </p>
      </header>
      <div className="mi-grid">
        {packages.map((pkg) => (
          <PackageCard key={pkg.key} pkg={pkg} side="buyer" />
        ))}
      </div>
    </div>
  );
}