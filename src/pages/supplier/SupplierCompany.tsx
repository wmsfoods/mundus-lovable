import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  HomeIcon,
  EditIcon,
  CheckCircleIcon,
  UploadCloudIcon,
  FileTextIcon,
  PhoneIcon,
  MessageIcon,
  FlagSVG,
} from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";

type Plant = {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  capacity: string;
  certs: string[];
  vetRegs: string;
};

type Cert = { id: string; name: string; validUntil: string };
type Doc = { id: string; type: string; name: string; updated: string };
type Contact = { id: string; name: string; title: string; email: string; whatsapp: string };

const PLANTS: Plant[] = [
  { id: "p1", name: "WMS Foods — Goiânia Unit", city: "Goiânia", country: "Brazil", countryCode: "BR", capacity: "Beef 2,800 MT/month", certs: ["USDA", "Halal", "HACCP"], vetRegs: "SIF 2154 · China-approved · Korea-approved" },
  { id: "p2", name: "WMS Foods — Cuiabá Unit", city: "Cuiabá", country: "Brazil", countryCode: "BR", capacity: "Beef 1,200 MT/month", certs: ["USDA", "BRC"], vetRegs: "SIF 3017" },
  { id: "p3", name: "Argentina Partner Plant", city: "Buenos Aires", country: "Argentina", countryCode: "AR", capacity: "Beef 600 MT/month", certs: ["EU-approved", "Halal"], vetRegs: "SENASA 4421 · EU-approved" },
];

const CERTS: Cert[] = [
  { id: "c1", name: "USDA approved", validUntil: "2027-04-30" },
  { id: "c2", name: "Halal (JAKIM / MUI / IFANCA)", validUntil: "2026-12-15" },
  { id: "c3", name: "Kosher (OU)", validUntil: "2026-09-01" },
  { id: "c4", name: "HACCP", validUntil: "2027-02-20" },
  { id: "c5", name: "BRC v9", validUntil: "2026-11-10" },
  { id: "c6", name: "ISO 22000", validUntil: "2027-06-05" },
  { id: "c7", name: "China approved (CNCA)", validUntil: "2027-01-22" },
  { id: "c8", name: "Korea approved (MFDS)", validUntil: "2026-10-30" },
];

const DOCS: Doc[] = [
  { id: "d1", type: "Brochure", name: "Company brochure 2026", updated: "2026-02-10" },
  { id: "d2", type: "Video", name: "Plant tour — Goiânia", updated: "2025-11-22" },
  { id: "d3", type: "Manual", name: "Quality manual v3.2", updated: "2026-01-08" },
  { id: "d4", type: "SOP", name: "Cold chain SOP", updated: "2025-12-04" },
  { id: "d5", type: "Insurance", name: "Cargo insurance policy", updated: "2026-03-15" },
];

const CONTACTS: Contact[] = [
  { id: "t1", name: "Fernando Costa", title: "CEO", email: "fernando@wmsfoods.com", whatsapp: "+55 11 98000-0001" },
  { id: "t2", name: "Maria Silva", title: "Sales Director", email: "maria@wmsfoods.com", whatsapp: "+55 11 98000-0002" },
  { id: "t3", name: "Eduardo Lima", title: "Logistics Lead", email: "eduardo@wmsfoods.com", whatsapp: "+55 11 98000-0003" },
  { id: "t4", name: "Diana Quality", title: "Quality Manager", email: "diana@wmsfoods.com", whatsapp: "+55 11 98000-0004" },
];

const SPECIES = ["Beef", "Pork", "Poultry", "Lamb"];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit" }).format(new Date(iso));
}

export default function SupplierCompany() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";

  const stub = (key: string) => () => toast(t(key));

  return (
    <div className="cp-page">
      <Crumbs
        items={[
          { label: t("shell.home", { defaultValue: "Home" }), to: "/supplier" },
          { label: t("supplier.company.title") },
        ]}
      />

      <PageTitle icon={HomeIcon} title={t("supplier.company.title")} />

      {/* 1. Header card */}
      <section className="cp-card cp-header">
        <div className="cp-logo" aria-hidden="true">WMS</div>
        <div className="cp-header-text">
          <h1 className="cp-legal-name">WMS Foods Indústria e Comércio S.A.</h1>
          <p className="cp-trade-name">WMS Foods</p>
          <div className="cp-header-meta">
            <span className="cp-verified">
              <CheckCircleIcon size={14} /> {t("supplier.company.verified")}
            </span>
            <span className="cp-since">{t("supplier.company.memberSince", { year: 2023 })}</span>
          </div>
        </div>
        <button type="button" className="btn-tb is-primary" onClick={stub("supplier.company.toasts.editComing")}>
          <EditIcon size={14} /> {t("supplier.company.editProfile")}
        </button>
      </section>

      {/* 2. About */}
      <section className="cp-card">
        <header className="cp-section-head">
          <h2>{t("supplier.company.about.title")}</h2>
        </header>
        <div className="cp-about-grid">
          <div>
            <p className="cp-description">{t("supplier.company.about.description")}</p>
            <div className="cp-kv">
              <span className="cp-kv-l">{t("supplier.company.about.tradeMarkets")}</span>
              <span className="cp-kv-v">Brazil → South Korea, Japan, Hong Kong, Singapore, China, Saudi Arabia, Angola, Mexico</span>
            </div>
            <div className="cp-kv">
              <span className="cp-kv-l">{t("supplier.company.about.mainSpecies")}</span>
              <span className="cp-kv-v cp-chips">
                {SPECIES.map((s) => (
                  <span key={s} className="cp-chip">{s}</span>
                ))}
              </span>
            </div>
          </div>
          <div className="cp-stat-grid">
            <div className="cp-stat">
              <span className="cp-stat-v">12</span>
              <span className="cp-stat-l">{t("supplier.company.about.yearsExporting")}</span>
            </div>
            <div className="cp-stat">
              <span className="cp-stat-v">3,420</span>
              <span className="cp-stat-l">{t("supplier.company.about.fclsDelivered")}</span>
            </div>
            <div className="cp-stat">
              <span className="cp-stat-v">28</span>
              <span className="cp-stat-l">{t("supplier.company.about.countriesServed")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Plants */}
      <section className="cp-card">
        <header className="cp-section-head">
          <h2>{t("supplier.company.plants.title")}</h2>
          <button type="button" className="btn-tb" onClick={stub("supplier.company.toasts.editComing")}>
            + {t("supplier.company.plants.addPlant")}
          </button>
        </header>
        <div className="cp-plants">
          {PLANTS.map((p) => (
            <div key={p.id} className="cp-plant">
              <div className="cp-plant-head">
                <h3>{p.name}</h3>
                <span className="cp-plant-loc">
                  <FlagSVG code={p.countryCode} size={14} /> {p.city}, {p.country}
                </span>
              </div>
              <div className="cp-kv">
                <span className="cp-kv-l">{t("supplier.company.plants.capacity")}</span>
                <span className="cp-kv-v">{p.capacity}</span>
              </div>
              <div className="cp-kv">
                <span className="cp-kv-l">{t("supplier.company.plants.certifications")}</span>
                <span className="cp-kv-v cp-chips">
                  {p.certs.map((c) => (
                    <span key={c} className="cp-chip">{c}</span>
                  ))}
                </span>
              </div>
              <div className="cp-kv">
                <span className="cp-kv-l">{t("supplier.company.plants.vetRegistrations")}</span>
                <span className="cp-kv-v">{p.vetRegs}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Trade preferences */}
      <section className="cp-card">
        <header className="cp-section-head">
          <h2>{t("supplier.company.preferences.title")}</h2>
        </header>
        <dl className="cp-prefs">
          <div><dt>{t("supplier.company.preferences.defaultIncoterm")}</dt><dd>CFR</dd></div>
          <div><dt>{t("supplier.company.preferences.defaultPaymentTerms")}</dt><dd>30% Advance, Balance TT</dd></div>
          <div><dt>{t("supplier.company.preferences.currencies")}</dt><dd>USD, EUR</dd></div>
          <div><dt>{t("supplier.company.preferences.leadTime")}</dt><dd>30–45 days from PO</dd></div>
          <div><dt>{t("supplier.company.preferences.fclSize")}</dt><dd>25 MT (40' reefer)</dd></div>
          <div><dt>{t("supplier.company.preferences.originPorts")}</dt><dd>Santos, Paranaguá, Itajaí (BR); Buenos Aires (AR)</dd></div>
        </dl>
      </section>

      {/* 5. Compliance */}
      <section className="cp-card">
        <header className="cp-section-head">
          <h2>{t("supplier.company.compliance.title")}</h2>
        </header>
        <div className="cp-cert-grid">
          {CERTS.map((c) => (
            <div key={c.id} className="cp-cert">
              <span className="cp-cert-icon" aria-hidden="true"><CheckCircleIcon size={18} /></span>
              <div className="cp-cert-body">
                <strong>{c.name}</strong>
                <span className="cp-cert-valid">
                  {t("supplier.company.compliance.validUntil")} {formatDate(c.validUntil, locale)}
                </span>
                <button type="button" className="cp-link" onClick={stub("supplier.company.toasts.viewComing")}>
                  {t("supplier.company.compliance.viewCertificate")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Documents */}
      <section className="cp-card">
        <header className="cp-section-head">
          <h2>{t("supplier.company.documents.title")}</h2>
          <button type="button" className="btn-tb is-primary" onClick={stub("supplier.company.toasts.uploadComing")}>
            <UploadCloudIcon size={14} /> {t("supplier.company.documents.uploadDocument")}
          </button>
        </header>
        <div className="cp-docs">
          {DOCS.map((d) => (
            <div key={d.id} className="cp-doc">
              <span className="cp-doc-icon" aria-hidden="true"><FileTextIcon size={18} /></span>
              <div className="cp-doc-body">
                <span className="cp-doc-name">{d.name}</span>
                <span className="cp-doc-meta">{d.type} · {t("supplier.company.documents.lastUpdated")} {formatDate(d.updated, locale)}</span>
              </div>
              <button type="button" className="cp-link" onClick={stub("supplier.company.toasts.viewComing")}>
                {t("supplier.company.documents.view")}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Team */}
      <section className="cp-card">
        <header className="cp-section-head">
          <h2>{t("supplier.company.team.title")}</h2>
        </header>
        <div className="cp-team">
          {CONTACTS.map((c) => (
            <div key={c.id} className="cp-contact">
              <div className="cp-avatar" aria-hidden="true">{initials(c.name)}</div>
              <div className="cp-contact-body">
                <strong>{c.name}</strong>
                <span className="cp-contact-title">{c.title}</span>
                <a className="cp-contact-link" href={`mailto:${c.email}`}>
                  <MessageIcon size={12} /> {c.email}
                </a>
                <span className="cp-contact-link">
                  <PhoneIcon size={12} /> {c.whatsapp}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
