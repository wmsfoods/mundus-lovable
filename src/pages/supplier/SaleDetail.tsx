import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DealDetailView } from "@/components/mundus/DealDetailView";
import { supplierSaleToDeal } from "@/lib/dealDetailAdapters";
import { MOCK_SALES, type Sale } from "@/data/mockSales";

export default function SupplierSaleDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const sale: Sale | undefined = useMemo(
    () => MOCK_SALES.find((s) => s.dealId === id),
    [id]
  );

  if (!sale) {
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

  const data = supplierSaleToDeal(sale, (k, fb) => t(k, { defaultValue: fb }) as string);
  return <DealDetailView data={data} />;
}
