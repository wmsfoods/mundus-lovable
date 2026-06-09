import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { PackageCard } from "@/components/mundus-intel/PackageCard";
import { getSupplierPackages } from "@/lib/mundusIntelPackages";

export default function SupplierMundusIntel() {
  const { t } = useTranslation();
  const packages = getSupplierPackages();
  return (
    <div className="mi-page">
      <header className="mi-page__header">
        <span className="mi-page__eyebrow">
          <Sparkles size={12} /> {t("shell.nav.mundusIntel", { defaultValue: "Mundus Intel" })}
        </span>
        <h1 className="mi-page__title">
          {t("mundusIntel.supplier.title", { defaultValue: "Add-on packages" })}
        </h1>
        <p className="mi-page__subtitle">
          {t("mundusIntel.supplier.subtitle", {
            defaultValue: "Unlock advanced market data, performance analytics and benchmarking with a single subscription.",
          })}
        </p>
      </header>
      <div className="mi-grid">
        {packages.map((pkg) => (
          <PackageCard key={pkg.key} pkg={pkg} side="supplier" />
        ))}
      </div>
    </div>
  );
}