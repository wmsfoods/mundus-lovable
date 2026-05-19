import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminComingSoon({ section }: { section?: string }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const label = section ?? pathname.replace(/^\/admin\/?/, "") ?? "";
  return (
    <div className="adm-body">
      <div className="adm-coming-soon">
        <h1>{t("admin.comingSoon.title")}</h1>
        <p>{t("admin.comingSoon.body")}</p>
        {label && <span className="section">/{label}</span>}
      </div>
    </div>
  );
}