import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileTextIcon, FilterIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { Pagination } from "@/components/mundus/Pagination";
import { ListCard, ListCardList } from "@/components/mundus/ListCard";
import { MOCK_SALES, type Sale, type SaleStatus } from "@/data/mockSales";

const PAGE_SIZE = 10;

const STATUS_CLASS: Record<SaleStatus, string> = {
  AWAITING_SUPPLIER_ACCEPTANCE: "pill-pending",
  AWAITING_PRE_PAYMENT: "pill-info",
};

export default function SupplierSales() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [sales] = useState<Sale[]>(MOCK_SALES);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  const sorted = useMemo(() => {
    const copy = [...sales];
    copy.sort((a, b) => {
      const av = a.dealId.localeCompare(b.dealId);
      return sortBy === "newest" ? -av : av;
    });
    return copy;
  }, [sales, sortBy]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const to = Math.min(pageSafe * PAGE_SIZE, total);
  const slice = sorted.slice(from === 0 ? 0 : from - 1, to);

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
              <th>
                {t("supplier.sales.col.status")}{" "}
                <span className="filt"><FilterIcon size={12} /></span>
              </th>
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
