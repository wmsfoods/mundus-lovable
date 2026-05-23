import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function SupplierSaleDetail() {
  useParams<{ id: string }>();
  const { t } = useTranslation();
  return (
    <div className="detail-empty">
      <h1>{t("supplier.sales.detail.notFoundTitle")}</h1>
      <p>{t("supplier.sales.detail.notFoundBody")}</p>
      <Link to="/supplier/sales" className="btn-tb is-primary">
        {t("supplier.sales.detail.back")}
      </Link>
    </div>
  );
}
