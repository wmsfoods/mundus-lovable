import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  UsersIcon,
  SearchIcon,
  ChevronDownIcon,
  DownloadIcon,
  UploadIcon,
  PlusIcon,
  EditIcon,
  FilterIcon,
} from "@/components/icons";
import { TextField } from "@/components/mundus/TextField";
import { SelectField } from "@/components/mundus/SelectField";
import { Toggle } from "@/components/mundus/Toggle";
import { Modal } from "@/components/mundus/Modal";

/* =========================================================================
   My Customers — buyer-side customer list.
   Backend not yet wired: starts with seed mock and persists in-memory only
   for the session (gradual plug-in per project plan D4).
   ========================================================================= */

type Customer = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  country: string;
  email: string;
  active: boolean;
  invitedAt: string;
};

type FilterValue = "all" | "active" | "inactive";

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "seed-1",
    company: "Mundus 2",
    contact: "Fernando X",
    phone: "+17864431584",
    country: "United States",
    email: "fn@mundustrade.com",
    active: false,
    invitedAt: "2/19/2026",
  },
  {
    id: "seed-2",
    company: "XXXX",
    contact: "XXXX da Silva",
    phone: "+5517917014444",
    country: "Brazil",
    email: "xx@123.com",
    active: false,
    invitedAt: "2/19/2026",
  },
];

const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Select" },
  { value: "United States", label: "United States" },
  { value: "Brazil", label: "Brazil" },
  { value: "Argentina", label: "Argentina" },
  { value: "Uruguay", label: "Uruguay" },
  { value: "Mexico", label: "Mexico" },
  { value: "Australia", label: "Australia" },
  { value: "China", label: "China" },
  { value: "Hong Kong", label: "Hong Kong" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
];

export default function Customers() {
  const { t, i18n } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (q) {
        const hay = `${c.company} ${c.contact} ${c.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "active" && !c.active) return false;
      if (filter === "inactive" && c.active) return false;
      return true;
    });
  }, [customers, search, filter]);

  const allSelected =
    filtered.length > 0 && filtered.every((c) => selected.includes(c.id));

  const toggleAll = () =>
    setSelected(allSelected ? [] : filtered.map((c) => c.id));
  const toggleOne = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  const toggleActive = (id: string) =>
    setCustomers((cs) =>
      cs.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );

  const handleInvite = (data: {
    company: string;
    contact: string;
    email: string;
    phone: string;
    country: string;
  }) => {
    const locale = i18n.resolvedLanguage === "pt" ? "pt-BR"
      : i18n.resolvedLanguage === "es" ? "es-ES"
      : "en-US";
    setCustomers((cs) => [
      ...cs,
      {
        id: `c-${Date.now()}`,
        company: data.company,
        contact: data.contact,
        email: data.email,
        phone: data.phone,
        country: data.country,
        active: false,
        invitedAt: new Date().toLocaleDateString(locale),
      },
    ]);
    setInviteOpen(false);
  };

  return (
    <>
      <div className="crumbs">
        <Link to="/buyer">{t("buyer.customers.crumbHome")}</Link>
        <span className="sep">/</span>
        <b>{t("buyer.customers.title")}</b>
      </div>

      <div className="page-title">
        <span className="chip">
          <UsersIcon size={20} />
        </span>
        <h1>{t("buyer.customers.title")}</h1>
      </div>

      <div className="table-toolbar">
        <div className="left">
          <span className="result-count">
            {t("buyer.customers.showing", {
              shown: filtered.length,
              total: customers.length,
            })}
          </span>
        </div>
        <div className="right">
          <div className="search-input">
            <span className="ic">
              <SearchIcon size={16} />
            </span>
            <input
              placeholder={t("buyer.customers.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mini-select-wrap">
            <select
              className="mini-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterValue)}
              aria-label={t("buyer.customers.filterLabel")}
            >
              <option value="all">{t("buyer.customers.filter.all")}</option>
              <option value="active">{t("buyer.customers.filter.active")}</option>
              <option value="inactive">{t("buyer.customers.filter.inactive")}</option>
            </select>
            <ChevronDownIcon size={14} />
          </div>
          <button className="link-action" type="button" onClick={toggleAll}>
            {t("buyer.customers.selectAll")}
          </button>
          <button
            className="link-action"
            type="button"
            disabled={selected.length === 0}
            onClick={() => setSelected([])}
          >
            {t("buyer.customers.clearSelection")}
          </button>
          <button className="btn-tb" type="button">
            <DownloadIcon size={16} />
            {t("buyer.customers.export")}
          </button>
          <button
            className="btn-tb"
            type="button"
            onClick={() => setImportOpen(true)}
          >
            <UploadIcon size={16} />
            {t("buyer.customers.importCsv")}
          </button>
          <button
            className="btn-tb is-primary"
            type="button"
            onClick={() => setInviteOpen(true)}
          >
            <PlusIcon size={16} />
            {t("buyer.customers.inviteCustomer")}
          </button>
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={t("buyer.customers.selectAll")}
                />
              </th>
              <th>
                {t("buyer.customers.col.company")}{" "}
                <span className="filt">
                  <FilterIcon size={12} />
                </span>
              </th>
              <th>
                {t("buyer.customers.col.contact")}{" "}
                <span className="filt">
                  <FilterIcon size={12} />
                </span>
              </th>
              <th>{t("buyer.customers.col.phone")}</th>
              <th>
                {t("buyer.customers.col.country")}{" "}
                <span className="filt">
                  <FilterIcon size={12} />
                </span>
              </th>
              <th>{t("buyer.customers.col.email")}</th>
              <th>
                {t("buyer.customers.col.status")}{" "}
                <span className="filt">
                  <FilterIcon size={12} />
                </span>
              </th>
              <th>{t("buyer.customers.col.invitedAt")}</th>
              <th>{t("buyer.customers.col.active")}</th>
              <th>{t("buyer.customers.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggleOne(c.id)}
                    aria-label={c.company}
                  />
                </td>
                <td>{c.company}</td>
                <td>{c.contact}</td>
                <td>{c.phone}</td>
                <td>{c.country}</td>
                <td>{c.email}</td>
                <td>
                  <span
                    className={`pill ${c.active ? "pill-active" : "pill-inactive"}`}
                  >
                    {c.active
                      ? t("buyer.customers.status.active")
                      : t("buyer.customers.status.inactive")}
                  </span>
                </td>
                <td>{c.invitedAt}</td>
                <td>
                  <Toggle
                    checked={c.active}
                    onChange={() => toggleActive(c.id)}
                  />
                </td>
                <td>
                  <button
                    className="action-icon-btn"
                    aria-label={t("buyer.customers.edit")}
                    type="button"
                  >
                    <EditIcon size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10}>{t("buyer.customers.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <InviteCustomerModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSend={handleInvite}
      />
      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}

type InviteData = {
  company: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
};

function InviteCustomerModal({
  open,
  onClose,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (data: InviteData) => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<InviteData>({
    company: "",
    contact: "",
    email: "",
    phone: "",
    country: "",
  });

  useEffect(() => {
    if (open) {
      setData({ company: "", contact: "", email: "", phone: "", country: "" });
    }
  }, [open]);

  const canSend = data.country.trim().length > 0;
  const set = <K extends keyof InviteData>(k: K, v: InviteData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const countryOptions = [
    { value: "", label: t("buyer.customers.invite.selectPlaceholder") },
    ...COUNTRY_OPTIONS.slice(1),
  ];

  return (
    <Modal open={open} onClose={onClose} width={460} ariaLabel={t("buyer.customers.invite.title")}>
      <h2>{t("buyer.customers.invite.title")}</h2>
      <div className="modal-body">
        <TextField
          label={t("buyer.customers.invite.company")}
          placeholder={t("buyer.customers.invite.companyPlaceholder")}
          value={data.company}
          onChange={(v) => set("company", v)}
        />
        <TextField
          label={t("buyer.customers.invite.contact")}
          placeholder={t("buyer.customers.invite.contactPlaceholder")}
          value={data.contact}
          onChange={(v) => set("contact", v)}
        />
        <TextField
          type="email"
          label={t("buyer.customers.invite.email")}
          placeholder={t("buyer.customers.invite.emailPlaceholder")}
          value={data.email}
          onChange={(v) => set("email", v)}
        />
        <TextField
          label={t("buyer.customers.invite.phone")}
          placeholder={t("buyer.customers.invite.phonePlaceholder")}
          value={data.phone}
          onChange={(v) => set("phone", v)}
        />
        <SelectField
          label={t("buyer.customers.invite.country")}
          required
          value={data.country}
          onChange={(v) => set("country", v)}
          options={countryOptions}
        />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSend}
          onClick={() => onSend(data)}
        >
          {t("buyer.customers.invite.send")}
        </button>
      </div>
    </Modal>
  );
}

function ImportCsvModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) setFile(null);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} width={520} ariaLabel={t("buyer.customers.import.title")}>
      <h2>{t("buyer.customers.import.title")}</h2>
      <div className="modal-body">
        <p
          style={{
            margin: 0,
            fontSize: "var(--fs-sm)",
            color: "var(--fg)",
          }}
        >
          {t("buyer.customers.import.body")}
        </p>
        <div>
          <button type="button" className="btn-tb" style={{ height: 36 }}>
            <DownloadIcon size={14} />
            {t("buyer.customers.import.template")}
          </button>
        </div>
        <div
          className="dropzone-csv"
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="ic">
            <UploadIcon size={28} />
          </div>
          <div style={{ fontWeight: "var(--weight-medium)" }}>
            {file ? file.name : t("buyer.customers.import.clickToUpload")}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!file}
          onClick={() => onClose()}
        >
          {t("buyer.customers.import.import")}
        </button>
      </div>
    </Modal>
  );
}
