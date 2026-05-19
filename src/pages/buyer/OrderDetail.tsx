import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DealDetailView } from "@/components/mundus/DealDetailView";
import { buyerOrderToDeal } from "@/lib/dealDetailAdapters";
import { useBuyerOrder } from "@/hooks/useBuyerOrders";

export default function BuyerOrderDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: order } = useBuyerOrder(id);

  if (!order) {
    return (
      <div className="detail-empty">
        <h1>{t("buyer.orderDetail.notFound")}</h1>
        <Link to="/buyer/orders" className="btn-tb is-primary">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const data = buyerOrderToDeal(order, (k, fb) => t(k, { defaultValue: fb }) as string);
  return <DealDetailView data={data} />;
}