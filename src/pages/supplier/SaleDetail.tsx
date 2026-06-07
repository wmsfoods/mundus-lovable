import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DealDetailView } from "@/components/mundus/DealDetailView";
import { supplierSaleToDeal } from "@/lib/dealDetailAdapters";
import { useSupplierSales } from "@/hooks/useSupplierSales";
import { OrderNegotiationLink } from "@/components/negotiation/OrderNegotiationLink";
import { MessageViaMundusButton } from "@/components/messageViaMundus/MessageViaMundusButton";
import { useOrderNegotiationId } from "@/hooks/useOrderNegotiationId";

export default function SupplierSaleDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: sales, isLoading } = useSupplierSales();

  if (isLoading) return null;

  const sale = sales.find((s) => s.dealId === id || s.id === id);
  // hook order must be stable; call before any conditional return below
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
  return (
    <>
      <OrderNegotiationLink orderId={sale.id} role="supplier" />
      <SaleViaMundus saleId={sale.id} dealId={sale.dealId} />
      <DealDetailView data={data} />
    </>
  );
}

function SaleViaMundus({ saleId, dealId }: { saleId: string; dealId: string }) {
  const { negotiationId } = useOrderNegotiationId(saleId);
  if (!negotiationId) return null;
  return (
    <div className="flex justify-end px-4 pt-3">
      <MessageViaMundusButton
        negotiationId={negotiationId}
        recordType="sale"
        recordDisplayId={`SALE-${dealId}`}
        currentSide="supplier"
        variant="compact"
      />
    </div>
  );
}
