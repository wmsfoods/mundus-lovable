import { useTranslation } from "react-i18next";
import { HomeIcon, CheckCircleIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import CompanyProfileSections from "@/components/company/CompanyProfileSections";
import TradePreferencesSection from "@/components/company/TradePreferencesSection";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "M";
}

export default function SupplierCompany() {
  const { t } = useTranslation();
  const { company, loading } = useCurrentCompany();

  return (
    <div className="cp-page">
      <Crumbs
        items={[
          { label: t("shell.home", { defaultValue: "Home" }), to: "/supplier" },
          { label: t("supplier.company.title") },
        ]}
      />

      <PageTitle icon={HomeIcon} title={t("supplier.company.title")} />

      {/* Header card */}
      <section className="cp-card cp-header">
        <div className="cp-logo" aria-hidden="true">{initials(company?.name || "")}</div>
        <div className="cp-header-text">
          <h1 className="cp-legal-name">{company?.name || (loading ? "…" : "—")}</h1>
          <div className="cp-header-meta">
            <span className="cp-verified"><CheckCircleIcon size={14} /> {t("supplier.company.verified", "Verified supplier")}</span>
          </div>
        </div>
      </section>

      {company?.id && <CompanyProfileSections companyId={company.id} canEdit />}
      {company?.id && <TradePreferencesSection companyId={company.id} canEdit />}
    </div>
  );
}
