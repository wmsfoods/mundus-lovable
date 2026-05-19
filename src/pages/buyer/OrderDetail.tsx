import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crumbs } from "@/components/mundus/Crumbs";
import { Tabs, TabPanel } from "@/components/mundus/Tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useBuyerOrder, type BuyerOrder, type BuyerOrderStatus } from "@/hooks/useBuyerOrders";

type TabKey = "overview" | "documents" | "shipment";

function fmtKg(v: number) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(v);
}
function fmtUsd(v: number) {
  return `US$ ${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
}
function fmtUsdPerKg(v: number) {
  return `US$ ${v.toFixed(3).replace(".", ",")}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function parseAdvancePct(term: string): number {
  const m = term.match(/(\d+)\s*%/);
  if (m) return Number(m[1]) / 100;
  if (/100%/.test(term)) return 1;
  return 0.3;
}

const STATUS_PILL_CLASS: Record<BuyerOrderStatus, string> = {
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

function CtaButtons({
  order,
  setTab,
}: {
  order: BuyerOrder;
  setTab: (t: TabKey) => void;
}) {
  const { t } = useTranslation();
  const s = order.status;
  if (s === "rejected") return null;
  if (s === "awaiting_pre_payment" || s === "awaiting_balance_payment") {
    return (
      <div className="cta-stack">
        <button type="button" className="btn-tb is-primary" onClick={() => console.log("Make payment", order.orderNumber)}>
          {t("buyer.orderDetail.ctas.makePayment")}
        </button>
      </div>
    );
  }
  if (s === "awaiting_supplier_acceptance") {
    return (
      <div className="cta-stack">
        <button type="button" className="btn-tb" onClick={() => console.log("Cancel order", order.orderNumber)}>
          {t("buyer.orderDetail.ctas.cancelOrder")}
        </button>
      </div>
    );
  }
  if (s === "shipped" || s === "in_production") {
    return (
      <div className="cta-stack">
        <button type="button" className="btn-tb" onClick={() => setTab("shipment")}>
          {t("buyer.orderDetail.ctas.trackShipment")}
        </button>
      </div>
    );
  }
  if (s === "completed" || s === "delivered") {
    return (
      <div className="cta-stack">
        <button type="button" className="btn-tb" onClick={() => console.log("View invoice", order.orderNumber)}>
          {t("buyer.orderDetail.ctas.viewInvoice")}
        </button>
      </div>
    );
  }
  return null;
}

export default function BuyerOrderDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("overview");
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

  const advancePct = parseAdvancePct(order.paymentTerm);
  const balancePct = 1 - advancePct;
  const totalValueUsd = order.quantityKg * order.pricePerKg;
  const valuePerFcl = totalValueUsd / Math.max(1, order.fcls);
  const advanceUsd = totalValueUsd * advancePct;
  const balanceUsd = totalValueUsd * balancePct;

  return (
    <>
      <Crumbs
        items={[
          { label: t("buyer.offers.crumbHome"), to: "/buyer" },
          { label: t("buyer.orders.title"), to: "/buyer/orders" },
          { label: `#${order.orderNumber}` },
        ]}
      />

      <div className="sd-page-head">
        <div className="sd-thumb" aria-hidden="true" />
        <div className="sd-page-head-meta">
          <h1>{order.product}</h1>
          <span className="sd-page-head-sub">
            {t("buyer.orderDetail.orderNumber", { n: order.orderNumber })}
            <a href="#specifications">{t("buyer.orderDetail.specifications")}</a>
          </span>
          <span className="sd-page-head-brand">
            {order.supplierName}<span className="star">★</span>
          </span>
        </div>
      </div>

      <Tabs
        items={[
          { value: "overview",  label: t("buyer.orderDetail.tabs.overview") },
          { value: "documents", label: t("buyer.orderDetail.tabs.documents") },
          { value: "shipment",  label: t("buyer.orderDetail.tabs.shipment") },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TabKey)}
      />

      <div className="sd-layout">
        <div>
          <TabPanel active={tab === "overview"}>
            <div className="sd-card">
              <span className={`pill pill-status ${STATUS_PILL_CLASS[order.status]} sd-banner-pill`} style={{ background: "#fff" }}>
                {t(`buyer.orders.status.${order.status}`)}
              </span>
              <h2>{t("buyer.orderDetail.title")}</h2>
              <p className="sub">{t(`buyer.orderDetail.messages.${order.status}`)}</p>

              <div className="sd-order-data-head">
                <span className="lbl">{t("buyer.orderDetail.orderData")}</span>
                <span className="date">{fmtDate(order.orderDate)}</span>
              </div>

              <div className="sd-table">
                <div className="sd-row">
                  <span className="k">{t("buyer.orderDetail.fields.paymentTerms")}</span>
                  <span className="v">{order.paymentTerm}</span>
                </div>
                <div className="sd-row">
                  <span className="k">{t("buyer.orderDetail.fields.advancePayment")} ({Math.round(advancePct * 100)}%)</span>
                  <span className="v">{fmtUsd(advanceUsd)}</span>
                </div>
                <div className="sd-row">
                  <span className="k">{t("buyer.orderDetail.fields.balancePayment")} ({Math.round(balancePct * 100)}%)</span>
                  <span className="v">{fmtUsd(balanceUsd)}</span>
                </div>
                <div className="sd-row">
                  <span className="k">{t("buyer.orderDetail.fields.incoterm")}</span>
                  <span className="v">{order.incoterm}</span>
                </div>
                <div className="sd-row">
                  <span className="k">{t("buyer.orderDetail.fields.originCountry")}</span>
                  <span className="v">{order.origin}</span>
                </div>
                <div className="sd-row">
                  <span className="k">{t("buyer.orderDetail.fields.originPort")}</span>
                  <span className="v">Santos</span>
                </div>
              </div>

              <div className="sd-cuts">
                <div className="sd-cuts-head">
                  <span>{t("buyer.orderDetail.cuts.header")}</span>
                  <span className="num">{t("buyer.orderDetail.cuts.weight")}</span>
                  <span className="num">{t("buyer.orderDetail.cuts.pricePerKg")}</span>
                  <span className="num">{t("buyer.orderDetail.cuts.totalPrice")}</span>
                </div>
                <div className="sd-cuts-row">
                  <span>{order.product}</span>
                  <span className="num">{fmtKg(order.quantityKg)} kg</span>
                  <span className="num">{fmtUsdPerKg(order.pricePerKg)}</span>
                  <span className="num">{fmtUsd(totalValueUsd)}</span>
                </div>
              </div>

              <div className="sd-faq">
                <Accordion type="single" collapsible>
                  <AccordionItem value="negotiation">
                    <AccordionTrigger>{t("buyer.orderDetail.faq.q1")}</AccordionTrigger>
                    <AccordionContent>{t("buyer.orderDetail.faq.q1")}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="min">
                    <AccordionTrigger>{t("buyer.orderDetail.faq.q2")}</AccordionTrigger>
                    <AccordionContent>{t("buyer.orderDetail.faq.q2")}</AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </TabPanel>

          <TabPanel active={tab === "documents"}>
            <div className="sd-card">
              <div className="sd-docs-empty">
                {t("buyer.orderDetail.documentsEmpty")}
              </div>
            </div>
          </TabPanel>

          <TabPanel active={tab === "shipment"}>
            <div className="sd-card">
              <div className="sd-warning">
                <span aria-hidden="true">ⓘ</span>
                {t("buyer.orderDetail.shipmentWarning")}
              </div>

              <div className="sd-section">
                <h3>Shipping Details</h3>
                <div className="sd-section-grid">
                  <div className="sd-field"><span className="sd-field-label">Shipping Line</span><span className="sd-field-value">TBI</span></div>
                  <div className="sd-field"><span className="sd-field-label">Vessel</span><span className="sd-field-value">TBI</span></div>
                  <div className="sd-field"><span className="sd-field-label">ETD</span><span className="sd-field-value">TBI</span></div>
                  <div className="sd-field"><span className="sd-field-label">ETA</span><span className="sd-field-value">TBI</span></div>
                </div>
              </div>

              <div className="sd-section">
                <h3>Cargo Information</h3>
                <div className="sd-section-grid is-2">
                  <div className="sd-field"><span className="sd-field-label">Booking</span><span className="sd-field-value">TBI</span></div>
                  <div className="sd-field"><span className="sd-field-label">Container</span><span className="sd-field-value">TBI</span></div>
                </div>
              </div>

              <div className="sd-section">
                <div className="sd-section-grid is-2" style={{ marginBottom: 16 }}>
                  <div className="sd-field"><span className="sd-field-label">Container Size</span><span className="sd-field-value">{order.fclSize}</span></div>
                  <div className="sd-field"><span className="sd-field-label">Available Container</span><span className="sd-field-value">{order.fcls}</span></div>
                </div>
                <div className="sd-section-grid is-3">
                  <div className="sd-field"><span className="sd-field-label">Port of Origin</span><span className="sd-field-value">Santos</span></div>
                  <div className="sd-field"><span className="sd-field-label">Port of Destination</span><span className="sd-field-value">{order.destination}</span></div>
                  <div className="sd-field"><span className="sd-field-label">Freight Cost</span><span className="sd-field-value">{fmtUsd(order.oceanFreightUsd)}</span></div>
                </div>
              </div>
            </div>
          </TabPanel>
        </div>

        <aside className="sd-side">
          <h3>{t("buyer.orderDetail.title")}</h3>
          <span className="order-no">{t("buyer.orderDetail.orderNumber", { n: order.orderNumber })}</span>
          <div className="divider" />
          <div className="sd-side-row"><span className="k">{t("buyer.orderDetail.fields.quantity")}</span><span className="v">{fmtKg(order.quantityKg)} kg</span></div>
          <div className="sd-side-row"><span className="k">{t("buyer.orderDetail.fields.oceanFreight")}</span><span className="v">{fmtUsd(order.oceanFreightUsd)}</span></div>
          <div className="sd-side-row"><span className="k">{t("buyer.orderDetail.fields.fcls")}</span><span className="v">{order.fcls}</span></div>
          <div className="sd-side-row"><span className="k">{t("buyer.orderDetail.fields.destination")}</span><span className="v">{order.destination}</span></div>
          <div className="sd-side-row"><span className="k">{t("buyer.orderDetail.fields.origin")}</span><span className="v">{order.origin}</span></div>
          <div className="sd-side-row"><span className="k">{t("buyer.orderDetail.fields.shipment")}</span><span className="v">{order.shipmentMonth}</span></div>
          <div className="sd-side-row"><span className="k">{t("buyer.orderDetail.fields.supplier")}</span><span className="v">{order.supplierName}</span></div>
          <div className="sd-side-row"><span className="k">{t("buyer.orderDetail.fields.buyer")}</span><span className="v">Delta Imports</span></div>
          <div className="sd-side-row"><span className="k">{t("buyer.orderDetail.fields.valuePerFcl")}</span><span className="v">{fmtUsd(valuePerFcl)}</span></div>
          <div className="divider" />
          <div className="sd-side-row"><span className="k" style={{ fontWeight: 600 }}>{t("buyer.orderDetail.fields.totalValue")}</span><span className="v" style={{ fontSize: 16 }}>{fmtUsd(totalValueUsd)}</span></div>

          <CtaButtons order={order} setTab={setTab} />
        </aside>
      </div>
    </>
  );
}