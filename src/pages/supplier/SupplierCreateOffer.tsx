import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Crumbs } from "@/components/mundus/Crumbs";

type QuickFillTab = "pdf" | "excel" | "image" | "voice" | "text";

export default function SupplierCreateOffer() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [progress] = useState(0);
  const [aiOpen, setAiOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<QuickFillTab>("text");
  const [textPrompt, setTextPrompt] = useState("");
  const [extracting, setExtracting] = useState(false);

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

      <div className="co-form-placeholder">
        <p>{t("supplier.createOffer.placeholder")}</p>
      </div>

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