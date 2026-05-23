import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardIcon,
  SearchIcon,
  FilterIcon,
  MoreVerticalIcon,
} from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { Modal } from "@/components/mundus/Modal";
import { Pagination } from "@/components/mundus/Pagination";
import { ListCard, ListCardList } from "@/components/mundus/ListCard";
import {
  MOCK_OFFER_REQUESTS,
  type OfferRequest,
  type RequestStatus,
} from "@/data/mockOfferRequests";

const PAGE_SIZE = 10;

const STATUS_CLASS: Record<RequestStatus, string> = {
  new: "pill-pending",
  with_responses: "pill-active",
  offer_sent: "pill-sent",
  not_interested: "pill-neutral",
};

function formatKg(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value);
}

export default function SupplierRequests() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<OfferRequest[]>(MOCK_OFFER_REQUESTS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [dismissTarget, setDismissTarget] = useState<OfferRequest | null>(null);

  const visible = useMemo(
    () => requests.filter((r) => r.status !== "not_interested"),
    [requests]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((r) => {
      const hay = `${r.id} ${r.client} ${r.product} ${r.destinationCountry}`.toLowerCase();
      return hay.includes(q);
    });
  }, [visible, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const to = Math.min(pageSafe * PAGE_SIZE, total);
  const slice = filtered.slice(from === 0 ? 0 : from - 1, to);

  const handleCreateOffer = (req: OfferRequest) => {
    setOpenMenu(null);
    navigate(`/supplier/offers/new?from=${req.id}`, {
      state: {
        fromRequest: {
          requestId: req.id,
          requestNumber: req.id,
          client: req.client,
          product: req.product,
          category: req.category,
          specification: req.specification,
          quantity: req.quantityKg,
          targetPrice: req.targetPriceUsd,
          destinationCountry: req.destinationCountry,
          destinationPort: req.destinationPort,
          incoterms: req.incoterms,
          containerSize: req.containerSize,
          containerCount: req.numberOfContainers,
          temperature: req.productTemperature,
          shipmentDate: req.shipmentDate,
          additionalInfo: req.additionalInfo,
        },
      },
    });
  };

  const handleConfirmDismiss = () => {
    if (!dismissTarget) return;
    setRequests((prev) =>
      prev.map((r) =>
        r.id === dismissTarget.id ? { ...r, status: "not_interested" } : r
      )
    );
    setDismissTarget(null);
  };

  return (
    <>
      <Crumbs
        items={[
          { label: t("supplier.requests.crumbHome"), to: "/supplier" },
          { label: t("supplier.requests.title") },
        ]}
      />

      <PageTitle
        icon={ClipboardIcon}
        title={t("supplier.requests.title")}
        subtitle={t("supplier.requests.subtitle")}
      />

      <div className="table-toolbar">
        <div className="left">
          <div className="search-input">
            <span className="ic">
              <SearchIcon size={16} />
            </span>
            <input
              placeholder={t("supplier.requests.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="right">
          <span className="result-count">
            {t("supplier.requests.showing", { from, to, total })}
          </span>
        </div>
      </div>

      <div className="data-table-wrap has-mobile-cards">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("supplier.requests.col.requestNumber")} <span className="filt"><FilterIcon size={12} /></span></th>
              <th>{t("supplier.requests.col.client")}</th>
              <th>{t("supplier.requests.col.product")} <span className="filt"><FilterIcon size={12} /></span></th>
              <th>{t("supplier.requests.col.destinationCountry")} <span className="filt"><FilterIcon size={12} /></span></th>
              <th>{t("supplier.requests.col.incoterms")}</th>
              <th>{t("supplier.requests.col.quantity")}</th>
              <th>{t("supplier.requests.col.container")}</th>
              <th>{t("supplier.requests.col.status")} <span className="filt"><FilterIcon size={12} /></span></th>
              <th>{t("supplier.requests.col.createdAt")}</th>
              <th aria-label={t("supplier.requests.col.actions")} />
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id}>
                <td>
                  <button
                    type="button"
                    className="link-action"
                    onClick={() => navigate(`/supplier/requests/${r.id}`)}
                  >
                    {r.id}
                  </button>
                </td>
                <td>{r.client}</td>
                <td>{r.product}</td>
                <td>{r.destinationCountry}</td>
                <td>{r.incoterms}</td>
                <td>{formatKg(r.quantityKg)} kg</td>
                <td>{r.containerSize} ({r.numberOfContainers})</td>
                <td>
                  <span className={`pill ${STATUS_CLASS[r.status]}`}>
                    {t(`supplier.requests.status.${r.status}`)}
                  </span>
                </td>
                <td>{r.createdAt}</td>
                <td>
                  <div className="row-actions">
                    {r.status === "offer_sent" ? (
                      <button
                        type="button"
                        className="btn-tb"
                        onClick={() => navigate(`/supplier/requests/${r.id}`)}
                      >
                        {t("supplier.requests.actions.view")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-tb is-primary"
                        onClick={() => handleCreateOffer(r)}
                      >
                        {t("supplier.requests.actions.createOffer")}
                      </button>
                    )}
                    <div className="row-kebab-wrap">
                      <button
                        type="button"
                        className="action-icon-btn"
                        aria-label="More actions"
                        onClick={() =>
                          setOpenMenu(openMenu === r.id ? null : r.id)
                        }
                      >
                        <MoreVerticalIcon size={16} />
                      </button>
                      {openMenu === r.id && (
                        <>
                          <div
                            className="row-menu-backdrop"
                            onClick={() => setOpenMenu(null)}
                          />
                          <div className="row-menu">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenu(null);
                                navigate(`/supplier/requests/${r.id}`);
                              }}
                            >
                              {t("supplier.requests.actions.view")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenu(null);
                                setDismissTarget(r);
                              }}
                            >
                              {t("supplier.requests.actions.notInterested")}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10}>{t("supplier.requests.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ListCardList>
        {slice.length === 0 ? (
          <div className="empty-state">{t("supplier.requests.empty")}</div>
        ) : (
          slice.map((r) => (
            <ListCard
              key={r.id}
              onClick={() => navigate(`/supplier/requests/${r.id}`)}
              title={r.product}
              subtitle={`${r.id} · ${r.client}`}
              chip={{
                label: t(`supplier.requests.status.${r.status}`),
                className: `pill-status ${STATUS_CLASS[r.status]}`,
              }}
              meta={[
                { label: t("supplier.requests.col.destinationCountry"), value: r.destinationCountry },
                { label: t("supplier.requests.col.incoterms"), value: r.incoterms },
                { label: t("supplier.requests.col.quantity"), value: `${formatKg(r.quantityKg)} kg` },
                { label: t("supplier.requests.col.container"), value: `${r.containerSize} (${r.numberOfContainers})` },
              ]}
            />
          ))
        )}
      </ListCardList>

      <div className="table-footer">
        <Pagination
          page={pageSafe}
          totalPages={totalPages}
          onChange={(p) => setPage(p)}
        />
      </div>

      <Modal
        open={dismissTarget !== null}
        onClose={() => setDismissTarget(null)}
        width={460}
        ariaLabel={t("supplier.requests.notInterestedModal.title")}
      >
        <h2>{t("supplier.requests.notInterestedModal.title")}</h2>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--fg)" }}>
            {t("supplier.requests.notInterestedModal.body", {
              requestNumber: dismissTarget?.id ?? "",
            })}
          </p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDismissTarget(null)}
          >
            {t("supplier.requests.notInterestedModal.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmDismiss}
          >
            {t("supplier.requests.notInterestedModal.confirm")}
          </button>
        </div>
      </Modal>
    </>
  );
}