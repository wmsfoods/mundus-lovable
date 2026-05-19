import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileTextIcon, FilterIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { useBuyerOrders, type BuyerOrderStatus } from "@/hooks/useBuyerOrders";

const STATUS_CLASS: Record<BuyerOrderStatus, string> = {
  awaiting_supplier_acceptance: "pill-pending",
  awaiting_pre_payment: "pill-info",
  pre_payment_confirmed: "pill-info",
  in_production: "pill-info",
  awaiting_balance_payment: "pill-pending",
  shipped: "pill-info",
  delivered: "pill-info",
  completed: "pill-active",
  rejected: "pill-inactive",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

type SortKey = "recent" | "oldest" | "status";

export default function BuyerOrders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: orders } = useBuyerOrders();
  const [sortBy, setSortBy] = useState<SortKey>("recent");

  const sorted = useMemo(() => {
    const copy = [...orders];
    if (sortBy === "status") {
      copy.sort((a, b) => a.status.localeCompare(b.status));
    } else {
      copy.sort((a, b) => {
        const av = new Date(a.orderDate).getTime();
        const bv = new Date(b.orderDate).getTime();
        return sortBy === "recent" ? bv - av : av - bv;
      });
    }
    return copy;
  }, [orders, sortBy]);

  const total = sorted.length;
  const from = total === 0 ? 0 : 1;
  const to = total;

  return (
    <>
      <section className="hero" style={{ marginBottom: 24 }}>
        <h2>{t("buyer.orders.heroTitle")}</h2>
        <div className="hero-photo" aria-hidden="true" />
      </section>

      <Crumbs
        items={[
          { label: t("buyer.offers.crumbHome"), to: "/buyer" },
          { label: t("buyer.orders.title") },
        ]}
      />

      <PageTitle icon={FileTextIcon} title={t("buyer.orders.title")} />

      <div className="sales-toolbar">
        <span className="result-count">
          {t("buyer.orders.showing", { from, to, total })}
        </span>
        <div className="mini-select-wrap">
          <select
            className="mini-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            aria-label={t("buyer.orders.sortBy")}
          >
            <option value="recent">{t("buyer.orders.sort.recent")}</option>
            <option value="oldest">{t("buyer.orders.sort.oldest")}</option>
            <option value="status">{t("buyer.orders.sort.status")}</option>
          </select>
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("buyer.orders.col.orderId")}</th>
              <th>
                {t("buyer.orders.col.status")}{" "}
                <span className="filt"><FilterIcon size={12} /></span>
              </th>
              <th>{t("buyer.orders.col.supplier")}</th>
              <th>{t("buyer.orders.col.orderDate")}</th>
              <th>{t("buyer.orders.col.origin")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id}>
                <td>
                  <button
                    type="button"
                    className="link-action"
                    onClick={() => navigate(`/buyer/orders/${o.orderNumber}`)}
                  >
                    {o.orderNumber}
                  </button>
                </td>
                <td>
                  <span className={`pill pill-status ${STATUS_CLASS[o.status]}`}>
                    {t(`buyer.orders.status.${o.status}`)}
                  </span>
                </td>
                <td>{o.supplierName}</td>
                <td>{fmtDate(o.orderDate)}</td>
                <td>{o.origin}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr className="empty-row">
                <td colSpan={5}>{t("buyer.orders.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}