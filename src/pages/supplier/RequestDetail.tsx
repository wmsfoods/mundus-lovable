import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MOCK_OFFER_REQUESTS,
  type OfferRequest,
  type RequestStatus,
} from "@/data/mockOfferRequests";
import { Crumbs } from "@/components/mundus/Crumbs";
import { Modal } from "@/components/mundus/Modal";

const STATUS_CLASS: Record<RequestStatus, string> = {
  new: "pill-pending",
  with_responses: "pill-active",
  offer_sent: "pill-sent",
  not_interested: "pill-neutral",
};

function formatKg(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value);
}

function formatPriceUsd(value: number): string {
  return `US$ ${value.toFixed(2).replace(".", ",")}`;
}

export default function SupplierRequestDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const _navigate = useNavigate();

  const request: OfferRequest | undefined = useMemo(
    () => MOCK_OFFER_REQUESTS.find((r) => r.id === id),
    [id]
  );

  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!request) {
    return (
      <div className="detail-empty">
        <h1>{t("supplier.requests.detail.notFoundTitle")}</h1>
        <p>{t("supplier.requests.detail.notFoundBody")}</p>
        <Link to="/supplier/requests" className="btn-tb is-primary">
          {t("supplier.requests.detail.back")}
        </Link>
      </div>
    );
  }

  const status: RequestStatus = dismissed ? "not_interested" : request.status;
  const isClosed = status === "offer_sent" || status === "not_interested";

  const handleCreateOffer = () => {
    alert(t("supplier.requests.detail.createOfferComingSoon"));
  };

  const handleConfirmDismiss = () => {
    setDismissed(true);
    setDismissOpen(false);
  };

  return (
    <>
      <Crumbs
        items={[
          { label: t("supplier.requests.crumbHome"), to: "/supplier" },
          { label: t("supplier.requests.title"), to: "/supplier/requests" },
          { label: t("supplier.requests.detail.crumb", { requestNumber: request.id }) },
        ]}
      />

      <div className="rd-header">
        <div>
          <h1 className="rd-title">{t("supplier.requests.detail.title")}</h1>
          <p className="rd-subtitle">
            {t("supplier.requests.detail.subtitle", { requestNumber: request.id })}
          </p>
        </div>
        <span className={`pill ${STATUS_CLASS[status]}`}>
          {t(`supplier.requests.status.${status}`)}
        </span>
      </div>

      <div className="rd-meta">
        <span className="rd-meta-label">{t("supplier.requests.detail.createdAt")}</span>
        <span>{request.createdAt}</span>
      </div>

      <section className="rd-section">
        <h2 className="rd-section-title">{t("supplier.requests.detail.productsHeading")}</h2>
        <div className="rd-card">
          <h3 className="rd-card-title">{request.product}</h3>
          <div className="rd-grid">
            <div>
              <div className="rd-field-label">{t("supplier.requests.detail.fields.category")}</div>
              <div className="rd-field-value">{request.category}</div>
            </div>
            <div>
              <div className="rd-field-label">{t("supplier.requests.detail.fields.quantity")}</div>
              <div className="rd-field-value">{formatKg(request.quantityKg)} kg</div>
            </div>
            <div>
              <div className="rd-field-label">{t("supplier.requests.detail.fields.targetPrice")}</div>
              <div className="rd-field-value">{formatPriceUsd(request.targetPriceUsd)}</div>
            </div>
            <div>
              <div className="rd-field-label">{t("supplier.requests.detail.fields.specification")}</div>
              <div className="rd-field-value">{request.specification}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rd-section">
        <h2 className="rd-section-title">{t("supplier.requests.detail.logisticsHeading")}</h2>
        <div className="rd-grid rd-grid-3">
          <div>
            <div className="rd-field-label">{t("supplier.requests.detail.fields.destinationCountry")}</div>
            <div className="rd-field-value">{request.destinationCountry}</div>
          </div>
          <div>
            <div className="rd-field-label">{t("supplier.requests.detail.fields.destinationPort")}</div>
            <div className="rd-field-value">{request.destinationPort}</div>
          </div>
          <div>
            <div className="rd-field-label">{t("supplier.requests.detail.fields.incoterms")}</div>
            <div className="rd-field-value">{request.incoterms}</div>
          </div>
          <div>
            <div className="rd-field-label">{t("supplier.requests.detail.fields.containerSize")}</div>
            <div className="rd-field-value">{request.containerSize}</div>
          </div>
          <div>
            <div className="rd-field-label">{t("supplier.requests.detail.fields.productTemperature")}</div>
            <div className="rd-field-value">{request.productTemperature}</div>
          </div>
          <div>
            <div className="rd-field-label">{t("supplier.requests.detail.fields.numberOfContainers")}</div>
            <div className="rd-field-value">{request.numberOfContainers}</div>
          </div>
          <div>
            <div className="rd-field-label">{t("supplier.requests.detail.fields.shipmentDate")}</div>
            <div className="rd-field-value">{request.shipmentDate}</div>
          </div>
        </div>
      </section>

      <section className="rd-section">
        <h2 className="rd-section-title">{t("supplier.requests.detail.additionalHeading")}</h2>
        <div className="rd-additional">
          {request.additionalInfo ?? t("supplier.requests.detail.noAdditionalInfo")}
        </div>
      </section>

      {!isClosed && (
        <div className="rd-cta-row">
          <button
            type="button"
            className="btn-tb"
            onClick={() => setDismissOpen(true)}
          >
            {t("supplier.requests.detail.notInterestedCta")}
          </button>
          <button
            type="button"
            className="btn-tb is-primary"
            onClick={handleCreateOffer}
          >
            {t("supplier.requests.detail.createOfferCta")}
          </button>
        </div>
      )}

      <Modal
        open={dismissOpen}
        onClose={() => setDismissOpen(false)}
        width={460}
        ariaLabel={t("supplier.requests.notInterestedModal.title")}
      >
        <h2>{t("supplier.requests.notInterestedModal.title")}</h2>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--fg)" }}>
            {t("supplier.requests.notInterestedModal.body", { requestNumber: request.id })}
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={() => setDismissOpen(false)}>
            {t("supplier.requests.notInterestedModal.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirmDismiss}>
            {t("supplier.requests.notInterestedModal.confirm")}
          </button>
        </div>
      </Modal>
    </>
  );
}