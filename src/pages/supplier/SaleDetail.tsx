import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crumbs } from "@/components/mundus/Crumbs";
import { Tabs, TabPanel } from "@/components/mundus/Tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MOCK_SALES, type Sale } from "@/data/mockSales";

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

export default function SupplierSaleDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("overview");
  const [fclTab, setFclTab] = useState<number>(0);

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

  const orderDateFormatted = sale.orderDate;
  const fclTabs = sale.shipmentInfo.map((_, i) => ({
    value: String(i),
    label: t("supplier.sales.detail.shipment.fclLabel", { n: i + 1 }),
  }));

  return (
    <>
      <Crumbs
        items={[
          { label: t("supplier.sales.crumbHome"), to: "/supplier" },
          { label: t("supplier.sales.title"), to: "/supplier/sales" },
          { label: t("supplier.sales.detail.crumb") },
        ]}
      />

      <div className="sd-page-head">
        <div className="sd-thumb" aria-hidden="true" />
        <div className="sd-page-head-meta">
          <h1>{sale.product}</h1>
          <span className="sd-page-head-sub">
            {t("supplier.sales.detail.orderNumberLabel", { id: sale.dealId })}
            <a href="#specifications">{t("supplier.sales.detail.specifications")}</a>
          </span>
          <span className="sd-page-head-brand">
            {sale.supplierBrand}<span className="star">★</span>
          </span>
        </div>
      </div>

      <Tabs
        items={[
          { value: "overview",  label: t("supplier.sales.detail.tabs.overview") },
          { value: "documents", label: t("supplier.sales.detail.tabs.documents") },
          { value: "shipment",  label: t("supplier.sales.detail.tabs.shipment") },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TabKey)}
        ariaLabel={t("supplier.sales.detail.tabs.ariaLabel")}
      />

      <div className="sd-layout">
        <div>
          <TabPanel active={tab === "overview"}>
            <div className="sd-card">
              <span className="sd-banner-pill">
                {t("supplier.sales.detail.banner.newOrderReceived")}
              </span>
              <h2>{t("supplier.sales.detail.overview.title")}</h2>
              <p className="sub">{t("supplier.sales.detail.overview.subtitle")}</p>

              <div className="sd-order-data-head">
                <span className="lbl">{t("supplier.sales.detail.overview.orderData")}</span>
                <span className="date">{orderDateFormatted}</span>
              </div>

              <div className="sd-table">
                <div className="sd-row">
                  <span className="k">{t("supplier.sales.detail.fields.paymentTerms")}</span>
                  <span className="v">{sale.paymentTerms}</span>
                </div>
                <div className="sd-row">
                  <span className="k">
                    {t("supplier.sales.detail.fields.advance", { pct: Math.round(sale.advancePct * 100) })}
                  </span>
                  <span className="v">{fmtUsd(sale.advanceUsd)}</span>
                </div>
                <div className="sd-row">
                  <span className="k">
                    {t("supplier.sales.detail.fields.balance", { pct: Math.round((1 - sale.advancePct) * 100) })}
                  </span>
                  <span className="v">{fmtUsd(sale.balanceUsd)}</span>
                </div>
                <div className="sd-row">
                  <span className="k">{t("supplier.sales.detail.fields.incoterm")}</span>
                  <span className="v">{sale.incoterm}</span>
                </div>
                <div className="sd-row">
                  <span className="k">{t("supplier.sales.detail.fields.originCountry")}</span>
                  <span className="v">{sale.originCountry}</span>
                </div>
                <div className="sd-row">
                  <span className="k">{t("supplier.sales.detail.fields.originPort")}</span>
                  <span className="v">{sale.originPort}</span>
                </div>
              </div>

              <div className="sd-cuts">
                <div className="sd-cuts-head">
                  <span>{t("supplier.sales.detail.cuts.cut")}</span>
                  <span className="num">{t("supplier.sales.detail.cuts.weight")}</span>
                  <span className="num">{t("supplier.sales.detail.cuts.pricePerKg")}</span>
                  <span className="num">{t("supplier.sales.detail.cuts.totalPrice")}</span>
                </div>
                {sale.cuts.map((c, i) => (
                  <div key={i} className="sd-cuts-row">
                    <span>{c.name}</span>
                    <span className="num">{fmtKg(c.weightKg)} kg</span>
                    <span className="num">{fmtUsdPerKg(c.pricePerKgUsd)}</span>
                    <span className="num">{fmtUsd(c.weightKg * c.pricePerKgUsd)}</span>
                  </div>
                ))}
              </div>

              <div className="sd-faq">
                <Accordion type="single" collapsible>
                  <AccordionItem value="negotiation">
                    <AccordionTrigger>{t("supplier.sales.detail.faq.howNegotiation")}</AccordionTrigger>
                    <AccordionContent>{t("supplier.sales.detail.faq.howNegotiationAnswer")}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="min">
                    <AccordionTrigger>{t("supplier.sales.detail.faq.minAmount")}</AccordionTrigger>
                    <AccordionContent>{t("supplier.sales.detail.faq.minAmountAnswer")}</AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </TabPanel>

          <TabPanel active={tab === "documents"}>
            <div className="sd-card">
              <div className="sd-docs-empty">
                {t("supplier.sales.detail.documents.empty")}
              </div>
            </div>
          </TabPanel>

          <TabPanel active={tab === "shipment"}>
            <div className="sd-card">
              {fclTabs.length > 1 && (
                <Tabs
                  items={fclTabs}
                  value={String(fclTab)}
                  onChange={(v) => setFclTab(Number(v))}
                  variant="nested"
                  ariaLabel="FCL"
                />
              )}
              <div className="sd-warning">
                <span aria-hidden="true">ⓘ</span>
                {t("supplier.sales.detail.shipment.warning")}
              </div>

              <div className="sd-section">
                <h3>{t("supplier.sales.detail.shipment.shippingDetails")}</h3>
                <div className="sd-section-grid">
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.shippingLine")}</span>
                    <span className="sd-field-value">{sale.shipmentInfo[fclTab]?.shippingLine ?? "TBI"}</span>
                  </div>
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.vessel")}</span>
                    <span className="sd-field-value">{sale.shipmentInfo[fclTab]?.vessel ?? "TBI"}</span>
                  </div>
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.etd")}</span>
                    <span className="sd-field-value">{sale.shipmentInfo[fclTab]?.etd ?? "TBI"}</span>
                  </div>
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.eta")}</span>
                    <span className="sd-field-value">{sale.shipmentInfo[fclTab]?.eta ?? "TBI"}</span>
                  </div>
                </div>
              </div>

              <div className="sd-section">
                <h3>{t("supplier.sales.detail.shipment.cargoInfo")}</h3>
                <div className="sd-section-grid is-2">
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.booking")}</span>
                    <span className="sd-field-value">{sale.shipmentInfo[fclTab]?.booking ?? "TBI"}</span>
                  </div>
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.container")}</span>
                    <span className="sd-field-value">{sale.shipmentInfo[fclTab]?.container ?? "TBI"}</span>
                  </div>
                </div>
              </div>

              <div className="sd-section">
                <div className="sd-section-grid is-2" style={{ marginBottom: 16 }}>
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.containerSize")}</span>
                    <span className="sd-field-value">{sale.fclSize}</span>
                  </div>
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.availableContainer")}</span>
                    <span className="sd-field-value">{sale.fclCount} {t("supplier.sales.detail.shipment.unit")}</span>
                  </div>
                </div>
                <div className="sd-section-grid is-3">
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.portOfOrigin")}</span>
                    <span className="sd-field-value">{sale.originPort}</span>
                  </div>
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.portOfDestination")}</span>
                    <span className="sd-field-value">{sale.destinationPort}</span>
                  </div>
                  <div className="sd-field">
                    <span className="sd-field-label">{t("supplier.sales.detail.shipment.freightCost")}</span>
                    <span className="sd-field-value">{fmtUsd(sale.oceanFreightUsd)}</span>
                  </div>
                </div>
              </div>

              <div className="sd-faq">
                <Accordion type="single" collapsible>
                  <AccordionItem value="negotiation">
                    <AccordionTrigger>{t("supplier.sales.detail.faq.howNegotiation")}</AccordionTrigger>
                    <AccordionContent>{t("supplier.sales.detail.faq.howNegotiationAnswer")}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="min">
                    <AccordionTrigger>{t("supplier.sales.detail.faq.minAmount")}</AccordionTrigger>
                    <AccordionContent>{t("supplier.sales.detail.faq.minAmountAnswer")}</AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </TabPanel>
        </div>

        <aside className="sd-side">
          <h3>{t("supplier.sales.detail.side.title")}</h3>
          <span className="order-no">{t("supplier.sales.detail.side.orderNumber", { id: sale.dealId })}</span>
          <div className="divider" />
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.quantity")}</span><span className="v">{fmtKg(sale.totalWeightKg)} kg</span></div>
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.oceanFreight")}</span><span className="v">{fmtUsd(sale.oceanFreightUsd)}</span></div>
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.fclCount")}</span><span className="v">{sale.fclCount}</span></div>
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.destination")}</span><span className="v">{sale.destinationPort}</span></div>
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.origin")}</span><span className="v">{sale.originCountry}</span></div>
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.shipment")}</span><span className="v">{sale.shipment}</span></div>
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.companyName")}</span><span className="v">{sale.buyer}</span></div>
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.buyer")}</span><span className="v">{sale.buyerContact}</span></div>
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.valuePerFcl")}</span><span className="v">{fmtUsd(sale.valuePerFclUsd)}</span></div>
          <div className="sd-side-row"><span className="k">{t("supplier.sales.detail.side.totalValue")}</span><span className="v">{fmtUsd(sale.totalValueUsd)}</span></div>

          {sale.status === "AWAITING_SUPPLIER_ACCEPTANCE" && (
            <div className="cta-stack">
              <button type="button" className="btn-tb is-primary" onClick={() => alert(t("supplier.sales.detail.side.acceptComingSoon"))}>
                {t("supplier.sales.detail.side.accept")}
              </button>
              <button type="button" className="btn-tb" onClick={() => alert(t("supplier.sales.detail.side.rejectComingSoon"))}>
                {t("supplier.sales.detail.side.reject")}
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
