import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileTextIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { OfficeIndicator } from "@/components/mundus/OfficeIndicator";
import { Pagination } from "@/components/mundus/Pagination";
import { ListCard, ListCardList } from "@/components/mundus/ListCard";
import type { Sale, SaleStatus } from "@/data/mockSales";
import { useSupplierSales } from "@/hooks/useSupplierSales";
import { DealsFilterBar } from "@/components/marketplace/DealsFilterBar";
import {
  EMPTY_FILTER,
  useDealsFilter,
  type DealsFilterState,
} from "@/hooks/useDealsFilter";

const PAGE_SIZE = 10;

const STATUS_CLASS: Record<SaleStatus, string> = {
  AWAITING_SUPPLIER_ACCEPTANCE: "pill-pending",
  AWAITING_PRE_PAYMENT: "pill-info",
};

export default function SupplierSales() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: sales } = useSupplierSales();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [filter, setFilter] = useState<DealsFilterState>(EMPTY_FILTER);

  const accessors = useMemo(
    () => ({
      dealId: (s: Sale) => s.dealId,
      product: (s: Sale) => s.product,
      party: (s: Sale) => s.buyer,
      origin: (s: Sale) => s.originPort,
      destination: (s: Sale) => s.destinationPort,
      status: (s: Sale) => s.status as string,
      date: (s: Sale) => {
        // orderDate is mm/dd/yyyy
        const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.orderDate);
        if (!m) return null;
        return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
      },
    }),
    [],
  );

  const { filtered, statusCounts, options, totalBeforeStatus } = useDealsFilter(
    sales,
    filter,
    accessors,
  );

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a.dealId.localeCompare(b.dealId);
      return sortBy === "newest" ? -av : av;
    });
    return copy;
  }, [filtered, sortBy]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const to = Math.min(pageSafe * PAGE_SIZE, total);
  const slice = sorted.slice(from === 0 ? 0 : from - 1, to);

  const statusOptions = options.statuses.map((s) => ({
    value: s,
    label: t(`supplier.sales.status.${s}`, { defaultValue: s }),
  }));

  return (
    <>
      <section className="hero" style={{ marginBottom: 24 }}>
        <h2>{t("supplier.sales.heroTitle")}</h2>
        <div className="hero-photo" aria-hidden="true" />
      </section>

      <Crumbs
        items={[
          { label: t("supplier.sales.crumbHome"), to: "/supplier" },
          { label: t("supplier.sales.title") },
        ]}
      />

      <PageTitle icon={FileTextIcon} title={t("supplier.sales.title")} />

      <OfficeIndicator />

      <DealsFilterBar
        value={filter}
        onChange={(next) => {
          setFilter(next);
          setPage(1);
        }}
        options={options}
        statusOptions={statusOptions}
        statusCounts={statusCounts}
        totalCount={totalBeforeStatus}
        labels={{
          party: t("filters.buyer"),
          origin: t("filters.originPort"),
          destination: t("filters.destinationPort"),
        }}
      />

      <div className="sales-toolbar">
        <span className="result-count">
          {t("supplier.sales.showing", { from, to, total })}
        </span>
        <div className="mini-select-wrap">
          <select
            className="mini-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
            aria-label={t("supplier.sales.sortBy")}
          >
            <option value="newest">{t("supplier.sales.sort.newest")}</option>
            <option value="oldest">{t("supplier.sales.sort.oldest")}</option>
          </select>
        </div>
        <button
          type="button"
          className="btn-tb is-primary"
          onClick={() => alert(t("supplier.sales.createOfferComingSoon"))}
        >
          {t("supplier.sales.createOffer")}
        </button>
      </div>

      <div className="data-table-wrap has-mobile-cards">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("supplier.sales.col.dealId")}</th>
              <th>{t("supplier.sales.col.status")}</th>
              <th>{t("supplier.sales.col.buyer")}</th>
              <th>{t("supplier.sales.col.orderDate")}</th>
              <th>{t("supplier.sales.col.destination")}</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((s) => (
              <tr key={s.id}>
                <td>
                  <button
                    type="button"
                    className="link-action"
                    onClick={() => navigate(`/supplier/sales/${s.dealId}`)}
                  >
                    {s.dealId}
                  </button>
                </td>
                <td>
                  <span className={`pill pill-status ${STATUS_CLASS[s.status]}`}>
                    {t(`supplier.sales.status.${s.status}`)}
                  </span>
                </td>
                <td>{s.buyer}</td>
                <td>{s.orderDate}</td>
                <td>{s.destination}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr className="empty-row">
                <td colSpan={5}>{t("supplier.sales.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ListCardList>
        {slice.length === 0 ? (
          <div className="empty-state">{t("supplier.sales.empty")}</div>
        ) : (
          slice.map((s) => (
            <ListCard
              key={s.id}
              onClick={() => navigate(`/supplier/sales/${s.dealId}`)}
              title={s.dealId}
              subtitle={s.buyer}
              chip={{
                label: t(`supplier.sales.status.${s.status}`),
                className: `pill-status ${STATUS_CLASS[s.status]}`,
              }}
              meta={[
                { label: t("supplier.sales.col.orderDate"), value: s.orderDate },
                { label: t("supplier.sales.col.destination"), value: s.destination },
              ]}
            />
          ))
        )}
      </ListCardList>

      <div className="table-footer">
        <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
      </div>
    </>
  );
}
