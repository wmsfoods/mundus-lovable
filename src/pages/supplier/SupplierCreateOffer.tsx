import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Crumbs } from "@/components/mundus/Crumbs";

type QuickFillTab = "pdf" | "excel" | "image" | "voice" | "text";
type Species = "beef" | "pork" | "poultry" | "lamb";
type LoadType = "full_container" | "mixed_load";

type Cut = {
  id: string;
  product: string;
  pack: string;
  weightPerCutKg: number;
  qtyCartons: number;
  pricePerKgUsd: number;
};

type Route = {
  id: string;
  destPortId: string;
  destPortLabel: string;
  freightUsdPerFcl: number;
};

const CONTAINER_CAPACITY_KG = 25000;

const ORIGIN_PORTS = [
  { value: "santos-br", label: "Santos, Brazil" },
  { value: "buenos-aires-ar", label: "Buenos Aires, Argentina" },
  { value: "montevideo-uy", label: "Montevideo, Uruguay" },
  { value: "houston-us", label: "Houston, USA" },
];
const DEST_PORTS = [
  { value: "busan-kr", label: "Busan, South Korea" },
  { value: "tokyo-jp", label: "Tokyo, Japan" },
  { value: "hong-kong-hk", label: "Kwai Tsing, Hong Kong" },
  { value: "singapore-sg", label: "Singapore" },
  { value: "jeddah-sa", label: "Jeddah, Saudi Arabia" },
  { value: "shanghai-cn", label: "Shanghai, China" },
  { value: "ho-chi-minh-vn", label: "Ho Chi Minh, Vietnam" },
  { value: "tema-gh", label: "Tema, Ghana" },
  { value: "luanda-ao", label: "Luanda, Angola" },
  { value: "veracruz-mx", label: "Veracruz, Mexico" },
];

export default function SupplierCreateOffer() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [aiOpen, setAiOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<QuickFillTab>("text");
  const [textPrompt, setTextPrompt] = useState("");
  const [extracting, setExtracting] = useState(false);

  // Form state (C16b)
  const [offerName, setOfferName] = useState("");
  const [species, setSpecies] = useState<Species>("beef");
  const [loadType, setLoadType] = useState<LoadType>("mixed_load");
  const [cuts, setCuts] = useState<Cut[]>([
    { id: crypto.randomUUID(), product: "", pack: "Vacuum 4×CTN", weightPerCutKg: 25, qtyCartons: 0, pricePerKgUsd: 0 },
  ]);
  const [originPort, setOriginPort] = useState("santos-br");
  const [routes, setRoutes] = useState<Route[]>([
    { id: crypto.randomUUID(), destPortId: "", destPortLabel: "", freightUsdPerFcl: 0 },
  ]);

  // Logistics & Terms sidebar state (C16c)
  const [containerSize, setContainerSize] = useState<"20ft" | "40ft">("40ft");
  const [temperature, setTemperature] = useState<"frozen" | "chilled">("frozen");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [incoterms, setIncoterms] = useState<string[]>(["CFR"]);
  const [paymentTerms, setPaymentTerms] = useState("30% Advance, Balance TT");
  const [shipmentMonth, setShipmentMonth] = useState("");
  const [distribution, setDistribution] = useState<"marketplace" | "all_customers" | "specific">("marketplace");

  const CERTIFICATION_OPTIONS = ["Halal", "Kosher", "USDA", "HACCP", "BRC", "Organic"];
  const INCOTERM_OPTIONS = ["CFR", "CIF", "FOB", "EXW", "DAP", "DDP"];

  const toggleCert = (cert: string) => {
    setCertifications((prev) => (prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]));
  };
  const toggleIncoterm = (term: string) => {
    setIncoterms((prev) => (prev.includes(term) ? prev.filter((t) => t !== term) : [...prev, term]));
  };

  // Pre-fill from request detection
  const [searchParams] = useSearchParams();
  const fromRequestId = searchParams.get("from");
  useEffect(() => {
    if (fromRequestId) {
      setOfferName(`Offer for request #${fromRequestId}`);
      setIncoterms(["CFR"]);
      toast.success(
        t("supplier.createOffer.prefill.toast", { requestId: fromRequestId }),
        { duration: 5000 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromRequestId]);

  const SPECIES_OPTIONS: { value: Species; label: string }[] = [
    { value: "beef", label: t("supplier.createOffer.form.species.beef") },
    { value: "pork", label: t("supplier.createOffer.form.species.pork") },
    { value: "poultry", label: t("supplier.createOffer.form.species.poultry") },
    { value: "lamb", label: t("supplier.createOffer.form.species.lamb") },
  ];

  const cutWeightKg = (c: Cut) => c.weightPerCutKg * c.qtyCartons;
  const totalCutsWeightKg = cuts.reduce((sum, c) => sum + cutWeightKg(c), 0);
  const capacityPct = Math.min(100, (totalCutsWeightKg / CONTAINER_CAPACITY_KG) * 100);
  const capacityRemaining = Math.max(0, CONTAINER_CAPACITY_KG - totalCutsWeightKg);
  const capacityOver = totalCutsWeightKg > CONTAINER_CAPACITY_KG;

  const addCut = () => {
    setCuts((prev) => [...prev, { id: crypto.randomUUID(), product: "", pack: "Vacuum 4×CTN", weightPerCutKg: 25, qtyCartons: 0, pricePerKgUsd: 0 }]);
  };
  const removeCut = (id: string) => {
    if (cuts.length <= 1) return;
    setCuts((prev) => prev.filter((c) => c.id !== id));
  };
  const updateCut = (id: string, patch: Partial<Cut>) => {
    setCuts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const addRoute = () => {
    setRoutes((prev) => [...prev, { id: crypto.randomUUID(), destPortId: "", destPortLabel: "", freightUsdPerFcl: 0 }]);
  };
  const removeRoute = (id: string) => {
    if (routes.length <= 1) return;
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };
  const updateRoute = (id: string, patch: Partial<Route>) => {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const applyFreightToAll = () => {
    const first = routes[0];
    if (!first || first.freightUsdPerFcl <= 0) {
      toast.error(t("supplier.createOffer.routes.applyAllError"));
      return;
    }
    setRoutes((prev) => prev.map((r) => ({ ...r, freightUsdPerFcl: first.freightUsdPerFcl })));
    toast.success(t("supplier.createOffer.routes.applyAllSuccess"));
  };

  const basicFilled = offerName.trim() && species ? 1 : 0;
  const cutsFilled = cuts.some((c) => c.product.trim() && c.qtyCartons > 0 && c.pricePerKgUsd > 0) ? 1 : 0;
  const routesFilled = routes.some((r) => r.destPortId && r.freightUsdPerFcl > 0) ? 1 : 0;
  const progress = Math.round((basicFilled * 25) + (cutsFilled * 50) + (routesFilled * 25));

  const handleExtract = () => {
    if (!textPrompt.trim() && activeTab === "text") {
      toast.error(t("supplier.createOffer.ai.emptyError"));
      return;
    }
    setExtracting(true);
    setTimeout(() => {
      setExtracting(false);
      toast.success(t("supplier.createOffer.ai.extractedMock"));
    }, 1500);
  };

  const handleCancel = () => {
    if (confirm(t("supplier.createOffer.confirmCancel"))) {
      navigate("/supplier/offers");
    }
  };
  const handleSaveDraft = () => {
    console.log("save draft");
    toast(t("supplier.createOffer.draftSaved"));
  };
  const handlePublish = () => {
    console.log("publish");
    toast.error(t("supplier.createOffer.notReadyToPublish"));
  };

  return (
    <div className="co-page">
      <Crumbs
        items={[
          { label: t("shell.home", { defaultValue: "Home" }), to: "/supplier" },
          { label: t("supplier.createOffer.title") },
        ]}
      />

      <div className="co-header">
        <div className="co-title-row">
          <div className="co-title-icon" aria-hidden="true">+</div>
          <div className="co-title-text">
            <h1>{t("supplier.createOffer.title")}</h1>
            <p>{t("supplier.createOffer.subtitle")}</p>
          </div>
          <div className="co-header-right">
            <div className="co-unit-toggle" role="group" aria-label={t("supplier.createOffer.unitToggle")}>
              <button
                type="button"
                className={`co-unit ${unit === "kg" ? "active" : ""}`}
                onClick={() => setUnit("kg")}
              >
                kg
              </button>
              <button
                type="button"
                className={`co-unit ${unit === "lbs" ? "active" : ""}`}
                onClick={() => setUnit("lbs")}
              >
                lbs
              </button>
            </div>
            <div className="co-progress-chip">
              <span className="co-progress-dot" />
              <span className="co-progress-label">{t("supplier.createOffer.inProgress")}</span>
              <span className="co-progress-value">· {progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <section className={`co-ai-card ${aiOpen ? "open" : "closed"}`}>
        <header className="co-ai-head">
          <span className="co-ai-icon" aria-hidden="true">✦</span>
          <div className="co-ai-text">
            <strong>{t("supplier.createOffer.ai.title")}</strong>
            <p>{t("supplier.createOffer.ai.subtitle")}</p>
          </div>
          <button
            type="button"
            className="co-ai-toggle"
            onClick={() => setAiOpen((v) => !v)}
          >
            {aiOpen ? t("supplier.createOffer.ai.minimize") : t("supplier.createOffer.ai.tryIt")}
          </button>
        </header>

        {aiOpen && (
          <div className="co-ai-body">
            <div className="co-ai-tabs" role="tablist">
              {(["pdf", "excel", "image", "voice", "text"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`co-ai-tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {t(`supplier.createOffer.ai.tab.${tab}`)}
                </button>
              ))}
            </div>

            {activeTab === "text" && (
              <div className="co-ai-text-input">
                <label className="co-ai-label">{t("supplier.createOffer.ai.pasteLabel")}</label>
                <textarea
                  className="co-ai-textarea"
                  rows={5}
                  placeholder={t("supplier.createOffer.ai.placeholder")}
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                />
              </div>
            )}

            {(activeTab === "pdf" || activeTab === "excel" || activeTab === "image") && (
              <div className="co-ai-dropzone">
                <p>{t(`supplier.createOffer.ai.dropzone.${activeTab}`)}</p>
                <span className="co-ai-stub">{t("supplier.createOffer.ai.stubNote")}</span>
              </div>
            )}

            {activeTab === "voice" && (
              <div className="co-ai-dropzone">
                <p>{t("supplier.createOffer.ai.voicePrompt")}</p>
                <span className="co-ai-stub">{t("supplier.createOffer.ai.stubNote")}</span>
              </div>
            )}

            <footer className="co-ai-footer">
              <span className="co-ai-powered">✦ {t("supplier.createOffer.ai.poweredBy")}</span>
              <button
                type="button"
                className="co-ai-extract"
                onClick={handleExtract}
                disabled={extracting || (activeTab === "text" && !textPrompt.trim())}
              >
                {extracting ? t("supplier.createOffer.ai.extracting") : t("supplier.createOffer.ai.extract")}
              </button>
            </footer>
          </div>
        )}
      </section>

      <div className="co-layout">
      <div className="co-main-col">
      <div className="co-form">
        {/* SECTION 1: Basic info */}
        <section className="co-section">
          <header className="co-section-head">
            <h2>{t("supplier.createOffer.form.basicInfo.title")}</h2>
            <p>{t("supplier.createOffer.form.basicInfo.subtitle")}</p>
          </header>
          <div className="co-section-body">
            <div className="co-field">
              <label className="co-field-label" htmlFor="offer-name">
                {t("supplier.createOffer.form.offerName.label")}
              </label>
              <input
                id="offer-name"
                type="text"
                className="co-input"
                placeholder={t("supplier.createOffer.form.offerName.placeholder")}
                value={offerName}
                onChange={(e) => setOfferName(e.target.value)}
              />
            </div>
            <div className="co-field">
              <label className="co-field-label">{t("supplier.createOffer.form.species.label")}</label>
              <div className="co-segmented" role="group">
                {SPECIES_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`co-seg-btn ${species === opt.value ? "active" : ""}`}
                    onClick={() => setSpecies(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Container & cuts */}
        <section className="co-section">
          <header className="co-section-head">
            <h2>{t("supplier.createOffer.form.cuts.title")}</h2>
            <p>{t("supplier.createOffer.form.cuts.subtitle")}</p>
          </header>
          <div className="co-section-body">
            <div className="co-field">
              <label className="co-field-label">{t("supplier.createOffer.form.cuts.loadType")}</label>
              <div className="co-segmented" role="group">
                <button type="button" className={`co-seg-btn ${loadType === "full_container" ? "active" : ""}`} onClick={() => setLoadType("full_container")}>
                  {t("supplier.createOffer.form.cuts.fullContainer")}
                </button>
                <button type="button" className={`co-seg-btn ${loadType === "mixed_load" ? "active" : ""}`} onClick={() => setLoadType("mixed_load")}>
                  {t("supplier.createOffer.form.cuts.mixedLoad")}
                </button>
              </div>
            </div>

            <div className="co-capacity">
              <div className="co-capacity-head">
                <span className="co-capacity-label">{t("supplier.createOffer.form.cuts.capacity")}</span>
                <span className={`co-capacity-value ${capacityOver ? "over" : ""}`}>
                  {totalCutsWeightKg.toLocaleString()} / {CONTAINER_CAPACITY_KG.toLocaleString()} kg
                  {capacityOver && <span className="co-capacity-warn"> · {t("supplier.createOffer.form.cuts.overCapacity")}</span>}
                  {!capacityOver && capacityRemaining > 0 && <span className="co-capacity-muted"> · {capacityRemaining.toLocaleString()} kg {t("supplier.createOffer.form.cuts.remaining")}</span>}
                </span>
              </div>
              <div className="co-capacity-bar">
                <div
                  className={`co-capacity-fill ${capacityOver ? "over" : ""}`}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
            </div>

            <div className="co-cuts-table-wrap">
              <table className="co-cuts-table">
                <thead>
                  <tr>
                    <th>{t("supplier.createOffer.form.cuts.col.product")}</th>
                    <th>{t("supplier.createOffer.form.cuts.col.pack")}</th>
                    <th className="num">{t("supplier.createOffer.form.cuts.col.weightPerCut")}</th>
                    <th className="num">{t("supplier.createOffer.form.cuts.col.qty")}</th>
                    <th className="num">{t("supplier.createOffer.form.cuts.col.totalWeight")}</th>
                    <th className="num">{t("supplier.createOffer.form.cuts.col.pricePerKg")}</th>
                    <th aria-label="actions" />
                  </tr>
                </thead>
                <tbody>
                  {cuts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="text"
                          className="co-input co-input-sm"
                          placeholder={t("supplier.createOffer.form.cuts.placeholder.product")}
                          value={c.product}
                          onChange={(e) => updateCut(c.id, { product: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="co-input co-input-sm"
                          value={c.pack}
                          onChange={(e) => updateCut(c.id, { pack: e.target.value })}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="co-input co-input-sm co-input-num"
                          value={c.weightPerCutKg || ""}
                          onChange={(e) => updateCut(c.id, { weightPerCutKg: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="co-input co-input-sm co-input-num"
                          value={c.qtyCartons || ""}
                          onChange={(e) => updateCut(c.id, { qtyCartons: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="num co-cuts-derived">
                        {cutWeightKg(c).toLocaleString()} kg
                      </td>
                      <td className="num">
                        <div className="co-price-input">
                          <span className="co-price-prefix">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="co-input co-input-sm co-input-num"
                            value={c.pricePerKgUsd || ""}
                            onChange={(e) => updateCut(c.id, { pricePerKgUsd: Number(e.target.value) || 0 })}
                          />
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="co-row-remove"
                          onClick={() => removeCut(c.id)}
                          disabled={cuts.length <= 1}
                          aria-label={t("supplier.createOffer.form.cuts.removeRow")}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="co-add-btn" onClick={addCut}>
              + {t("supplier.createOffer.form.cuts.addCut")}
            </button>
          </div>
        </section>

        {/* SECTION 3: Routes & freight */}
        <section className="co-section">
          <header className="co-section-head">
            <h2>{t("supplier.createOffer.form.routes.title")}</h2>
            <p>{t("supplier.createOffer.form.routes.subtitle")}</p>
          </header>
          <div className="co-section-body">
            <div className="co-field">
              <label className="co-field-label" htmlFor="origin-port">
                {t("supplier.createOffer.form.routes.originPort")}
              </label>
              <select
                id="origin-port"
                className="co-input"
                value={originPort}
                onChange={(e) => setOriginPort(e.target.value)}
              >
                {ORIGIN_PORTS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="co-field">
              <div className="co-field-row">
                <label className="co-field-label">{t("supplier.createOffer.form.routes.destinations")}</label>
                {routes.length > 1 && (
                  <button type="button" className="co-link-btn" onClick={applyFreightToAll}>
                    {t("supplier.createOffer.form.routes.applyFreightAll")}
                  </button>
                )}
              </div>

              <div className="co-routes">
                {routes.map((r) => (
                  <div key={r.id} className="co-route-row">
                    <select
                      className="co-input co-route-port"
                      value={r.destPortId}
                      onChange={(e) => {
                        const selected = DEST_PORTS.find((p) => p.value === e.target.value);
                        updateRoute(r.id, {
                          destPortId: e.target.value,
                          destPortLabel: selected?.label ?? "",
                        });
                      }}
                    >
                      <option value="">{t("supplier.createOffer.form.routes.selectPort")}</option>
                      {DEST_PORTS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <div className="co-price-input co-route-freight">
                      <span className="co-price-prefix">$</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        className="co-input co-input-num"
                        placeholder={t("supplier.createOffer.form.routes.freightPlaceholder")}
                        value={r.freightUsdPerFcl || ""}
                        onChange={(e) => updateRoute(r.id, { freightUsdPerFcl: Number(e.target.value) || 0 })}
                      />
                      <span className="co-price-suffix">{t("supplier.createOffer.form.routes.perFcl")}</span>
                    </div>
                    <button
                      type="button"
                      className="co-row-remove"
                      onClick={() => removeRoute(r.id)}
                      disabled={routes.length <= 1}
                      aria-label={t("supplier.createOffer.form.routes.removeRow")}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className="co-add-btn" onClick={addRoute}>
                + {t("supplier.createOffer.form.routes.addMarket")}
              </button>
            </div>
          </div>
        </section>
      </div>
      </div>

      <aside className="co-side-col">
        <div className="co-sidebar">
          <header className="co-sidebar-head">
            <h2>{t("supplier.createOffer.sidebar.title")}</h2>
            <p>{t("supplier.createOffer.sidebar.subtitle")}</p>
          </header>

          <div className="co-sb-field">
            <label className="co-sb-label">{t("supplier.createOffer.sidebar.containerSize")}</label>
            <div className="co-segmented co-segmented-sm">
              <button type="button" className={`co-seg-btn ${containerSize === "20ft" ? "active" : ""}`} onClick={() => setContainerSize("20ft")}>20' FCL</button>
              <button type="button" className={`co-seg-btn ${containerSize === "40ft" ? "active" : ""}`} onClick={() => setContainerSize("40ft")}>40' FCL</button>
            </div>
          </div>

          <div className="co-sb-field">
            <label className="co-sb-label">{t("supplier.createOffer.sidebar.temperature")}</label>
            <div className="co-segmented co-segmented-sm">
              <button type="button" className={`co-seg-btn ${temperature === "frozen" ? "active" : ""}`} onClick={() => setTemperature("frozen")}>
                ❄ {t("supplier.createOffer.sidebar.frozen")}
              </button>
              <button type="button" className={`co-seg-btn ${temperature === "chilled" ? "active" : ""}`} onClick={() => setTemperature("chilled")}>
                {t("supplier.createOffer.sidebar.chilled")}
              </button>
            </div>
          </div>

          <div className="co-sb-field">
            <label className="co-sb-label">{t("supplier.createOffer.sidebar.certifications")}</label>
            <div className="co-tag-list">
              {CERTIFICATION_OPTIONS.map((cert) => (
                <button
                  key={cert}
                  type="button"
                  className={`co-tag ${certifications.includes(cert) ? "active" : ""}`}
                  onClick={() => toggleCert(cert)}
                >
                  {cert}
                </button>
              ))}
            </div>
          </div>

          <div className="co-sb-field">
            <label className="co-sb-label">{t("supplier.createOffer.sidebar.incoterms")}</label>
            <div className="co-tag-list">
              {INCOTERM_OPTIONS.map((term) => (
                <button
                  key={term}
                  type="button"
                  className={`co-tag ${incoterms.includes(term) ? "active" : ""}`}
                  onClick={() => toggleIncoterm(term)}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          <div className="co-sb-field">
            <label className="co-sb-label" htmlFor="payment-terms">{t("supplier.createOffer.sidebar.paymentTerms")}</label>
            <input
              id="payment-terms"
              type="text"
              className="co-input"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder={t("supplier.createOffer.sidebar.paymentTermsPlaceholder")}
            />
          </div>

          <div className="co-sb-field">
            <label className="co-sb-label" htmlFor="shipment-month">{t("supplier.createOffer.sidebar.shipment")}</label>
            <input
              id="shipment-month"
              type="month"
              className="co-input"
              value={shipmentMonth}
              onChange={(e) => setShipmentMonth(e.target.value)}
            />
          </div>

          <div className="co-sb-field">
            <label className="co-sb-label">{t("supplier.createOffer.sidebar.distribution")}</label>
            <div className="co-radio-list">
              {(["marketplace", "all_customers", "specific"] as const).map((opt) => (
                <label key={opt} className={`co-radio ${distribution === opt ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="distribution"
                    value={opt}
                    checked={distribution === opt}
                    onChange={() => setDistribution(opt)}
                  />
                  <div>
                    <strong>{t(`supplier.createOffer.sidebar.dist.${opt}`)}</strong>
                    <span>{t(`supplier.createOffer.sidebar.dist.${opt}Hint`)}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="co-sb-field">
            <label className="co-sb-label">{t("supplier.createOffer.sidebar.attachments")}</label>
            <div className="co-dropzone-sm">
              <p>{t("supplier.createOffer.sidebar.attachmentsHint")}</p>
              <span className="co-ai-stub">{t("supplier.createOffer.sidebar.attachmentsStub")}</span>
            </div>
          </div>
        </div>
      </aside>
      </div>

      <section className="co-preview">
        <header className="co-preview-head">
          <h2>
            <span className="co-preview-icon">👁</span> {t("supplier.createOffer.preview.title")}
          </h2>
          <span className="co-preview-hint">{t("supplier.createOffer.preview.hint")}</span>
        </header>
        <div className="co-preview-card">
          <div className="co-preview-card-head">
            <span className="co-preview-chip">
              {t(`supplier.createOffer.form.species.${species}`)} · {temperature === "frozen" ? t("supplier.createOffer.sidebar.frozen") : t("supplier.createOffer.sidebar.chilled")}
            </span>
            {cuts.filter((c) => c.product.trim()).length > 1 && (
              <span className="co-preview-badge">
                {cuts.filter((c) => c.product.trim()).length} {t("supplier.createOffer.preview.cuts")}
              </span>
            )}
          </div>
          <h3>{offerName.trim() || t("supplier.createOffer.preview.placeholderTitle")}</h3>
          <div className="co-preview-meta">
            <div>
              <span className="co-preview-meta-l">{t("supplier.createOffer.preview.destinations")}</span>
              <span className="co-preview-meta-v">
                {routes.filter((r) => r.destPortLabel).length > 0
                  ? routes.filter((r) => r.destPortLabel).map((r) => r.destPortLabel.split(",")[0]).join(", ")
                  : "—"}
              </span>
            </div>
            <div>
              <span className="co-preview-meta-l">{t("supplier.createOffer.preview.incoterm")}</span>
              <span className="co-preview-meta-v">{incoterms.length > 0 ? incoterms.join(" / ") : "—"}</span>
            </div>
            <div>
              <span className="co-preview-meta-l">{t("supplier.createOffer.preview.shipment")}</span>
              <span className="co-preview-meta-v">{shipmentMonth || "—"}</span>
            </div>
            <div>
              <span className="co-preview-meta-l">{t("supplier.createOffer.preview.volume")}</span>
              <span className="co-preview-meta-v">{totalCutsWeightKg > 0 ? `${totalCutsWeightKg.toLocaleString()} kg` : "—"}</span>
            </div>
          </div>
          <div className="co-preview-price">
            <span className="co-preview-price-l">{t("supplier.createOffer.preview.from")}</span>
            <span className="co-preview-price-v">
              ${cuts.length > 0 && cuts.some((c) => c.pricePerKgUsd > 0)
                ? Math.min(...cuts.filter((c) => c.pricePerKgUsd > 0).map((c) => c.pricePerKgUsd)).toFixed(2)
                : "0.00"}
              <small>/kg</small>
            </span>
          </div>
        </div>
      </section>

      <footer className="co-footer">
        <button type="button" className="co-btn co-btn-ghost" onClick={handleCancel}>
          {t("supplier.createOffer.cancel")}
        </button>
        <div className="co-footer-progress">
          <div className="co-progress-bar">
            <div className="co-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="co-progress-text">
            {progress}% {t("supplier.createOffer.complete")}
            {progress < 100 && <span className="co-progress-missing"> · {t("supplier.createOffer.missingCutsRoutes")}</span>}
          </span>
        </div>
        <button type="button" className="co-btn co-btn-ghost" onClick={handleSaveDraft}>
          {t("supplier.createOffer.saveDraft")}
        </button>
        <button
          type="button"
          className="co-btn co-btn-primary"
          onClick={handlePublish}
          disabled={progress < 100}
        >
          {t("supplier.createOffer.publish")}
        </button>
      </footer>
    </div>
  );
}