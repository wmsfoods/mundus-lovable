import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileTextIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { ListCard, ListCardList } from "@/components/mundus/ListCard";
import {
  useBuyerOrders,
  type BuyerOrder,
} from "@/hooks/useBuyerOrders";
import { StatusBadge, getStatusLabel } from "@/lib/orderStatus";
import { DealsFilterBar } from "@/components/marketplace/DealsFilterBar";
import {
  EMPTY_FILTER,
  useDealsFilter,
  type DealsFilterState,
} from "@/hooks/useDealsFilter";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";

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
  const isMobile = useIsMobileShell();
  const { data: orders } = useBuyerOrders();
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [filter, setFilter] = useState<DealsFilterState>(EMPTY_FILTER);

  const accessors = useMemo(
    () => ({
      dealId: (o: BuyerOrder) => o.orderNumber,
      product: (o: BuyerOrder) => o.product,
      party: (o: BuyerOrder) => o.supplierName,
      origin: (o: BuyerOrder) => o.origin,
      destination: (o: BuyerOrder) => o.destination,
      status: (o: BuyerOrder) => o.status as string,
      date: (o: BuyerOrder) => {
        const d = new Date(o.orderDate);
        return isNaN(d.getTime()) ? null : d;
      },
    }),
    [],
  );

  const { filtered, statusCounts, options, totalBeforeStatus } = useDealsFilter(
    orders,
    filter,
    accessors,
  );

  const sorted = useMemo(() => {
    const copy = [...filtered];
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
  }, [filtered, sortBy]);

  const total = sorted.length;
  const from = total === 0 ? 0 : 1;
  const to = total;

  const statusOptions = options.statuses.map((s) => ({
    value: s,
    label: getStatusLabel(s),
  }));

  return (
    <>
      {!isMobile && (
        <section className="hero" style={{ marginBottom: 24 }}>
          <h2>{t("buyer.orders.heroTitle")}</h2>
          <div className="hero-photo" aria-hidden="true" />
        </section>
      )}

      {!isMobile && (
        <Crumbs
          items={[
            { label: t("buyer.offers.crumbHome"), to: "/buyer" },
            { label: t("buyer.orders.title") },
          ]}
        />
      )}

      {!isMobile && (
        <PageTitle icon={FileTextIcon} title={t("buyer.orders.title")} />
      )}

      <DealsFilterBar
        value={filter}
        onChange={setFilter}
        options={options}
        statusOptions={statusOptions}
        statusCounts={statusCounts}
        totalCount={totalBeforeStatus}
        labels={{
          party: t("filters.supplier"),
          origin: t("filters.origin"),
          destination: t("filters.destination"),
        }}
      />

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

      <div className="data-table-wrap has-mobile-cards">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("buyer.orders.col.orderId")}</th>
              <th>{t("buyer.orders.col.status")}</th>
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
                  <StatusBadge status={o.status} />
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

      <ListCardList>
        {sorted.length === 0 ? (
          <div className="empty-state">{t("buyer.orders.empty")}</div>
        ) : (
          sorted.map((o) => (
            <ListCard
              key={o.id}
              onClick={() => navigate(`/buyer/orders/${o.orderNumber}`)}
              title={o.orderNumber}
              subtitle={o.supplierName}
              chip={{
                label: getStatusLabel(o.status),
                className: "pill-status",
              }}
              meta={[
                { label: t("buyer.orders.col.orderDate"), value: fmtDate(o.orderDate) },
                { label: t("buyer.orders.col.origin"), value: o.origin },
              ]}
            />
          ))
        )}
      </ListCardList>
    </>
  );
}