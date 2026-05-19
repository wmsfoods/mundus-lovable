import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { Modal } from "@/components/mundus/Modal";
import { TextField } from "@/components/mundus/TextField";
import { SelectField } from "@/components/mundus/SelectField";
import { Toggle } from "@/components/mundus/Toggle";
import {
  UsersIcon,
  SearchIcon,
  ChevronDownIcon,
  FilterIcon,
  DownloadIcon,
  UploadIcon,
  PlusIcon,
  EditIcon,
} from "@/components/icons";
import {
  useBuyerCustomers,
  type BuyerCustomerInput,
} from "@/hooks/useBuyerCustomers";

const COUNTRY_OPTIONS = [
  { value: "", label: "—" },
  { value: "United States", label: "United States" },
  { value: "Brazil", label: "Brazil" },
  { value: "Argentina", label: "Argentina" },
  { value: "Uruguay", label: "Uruguay" },
  { value: "Mexico", label: "Mexico" },
  { value: "Australia", label: "Australia" },
  { value: "China", label: "China" },
  { value: "Hong Kong", label: "Hong Kong" },
  { value: "Japan", label: "Japan" },
  { value: "South Korea", label: "South Korea" },
  { value: "Singapore", label: "Singapore" },
  { value: "Vietnam", label: "Vietnam" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
  { value: "United Kingdom", label: "United Kingdom" },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function Customers() {
  const { t } = useTranslation();
  const { customers, add, toggleActive } = useBuyerCustomers();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendInvite = (data: BuyerCustomerInput) => {
    add(data);
    setInviteOpen(false);
  };

  return (
    <>
      <Crumbs
        items={[
          { label: t("buyer.customers.crumbHome"), to: "/buyer" },
          { label: t("buyer.customers.title") },
        ]}
      />
      <PageTitle icon={UsersIcon} title={t("buyer.customers.title")} />

      <div className="table-toolbar">
        <div className="left">
          <span className="result-count">
            {t("buyer.customers.showing", { shown: filtered.length, total: customers.length })}
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
              onChange={(e) => setFilter(e.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">{t("buyer.customers.filter.all")}</option>
              <option value="active">{t("buyer.customers.filter.active")}</option>
              <option value="inactive">{t("buyer.customers.filter.inactive")}</option>
            </select>
            <ChevronDownIcon size={14} />
          </div>
          <button className="link-action" onClick={toggleAll} type="button">
            {t("buyer.customers.selectAll")}
          </button>
          <button
            className="link-action"
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
            type="button"
          >
            {t("buyer.customers.clearSelection")}
          </button>
          <button className="btn-tb" type="button">
            <DownloadIcon size={16} /> {t("buyer.customers.export")}
          </button>
          <button className="btn-tb" type="button" onClick={() => setImportOpen(true)}>
            <UploadIcon size={16} /> {t("buyer.customers.importCsv")}
          </button>
          <button className="btn-tb is-primary" type="button" onClick={() => setInviteOpen(true)}>
            <PlusIcon size={16} /> {t("buyer.customers.invite")}
          </button>
        </div>
      </div>

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
            <th>{t("buyer.customers.columns.company")}<span className="filt"><FilterIcon size={12} /></span></th>
            <th>{t("buyer.customers.columns.contact")}<span className="filt"><FilterIcon size={12} /></span></th>
            <th>{t("buyer.customers.columns.phone")}</th>
            <th>{t("buyer.customers.columns.country")}<span className="filt"><FilterIcon size={12} /></span></th>
            <th>{t("buyer.customers.columns.email")}</th>
            <th>{t("buyer.customers.columns.status")}<span className="filt"><FilterIcon size={12} /></span></th>
            <th>{t("buyer.customers.columns.invitedAt")}</th>
            <th>{t("buyer.customers.columns.active")}</th>
            <th>{t("buyer.customers.columns.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={10} data-label="" style={{ textAlign: "center", padding: 32, color: "var(--fg-muted)" }}>
                {customers.length === 0
                  ? t("buyer.customers.emptyAll")
                  : t("buyer.customers.emptyFiltered")}
              </td>
            </tr>
          ) : (
            filtered.map((c) => (
              <tr key={c.id}>
                <td data-label="">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    aria-label={`Select ${c.company}`}
                  />
                </td>
                <td data-label={t("buyer.customers.columns.company")}>{c.company}</td>
                <td data-label={t("buyer.customers.columns.contact")}>{c.contact}</td>
                <td data-label={t("buyer.customers.columns.phone")}>{c.phone}</td>
                <td data-label={t("buyer.customers.columns.country")}>{c.country}</td>
                <td data-label={t("buyer.customers.columns.email")}>{c.email}</td>
                <td data-label={t("buyer.customers.columns.status")}>
                  <span className={`pill ${c.active ? "pill-active" : "pill-inactive"}`}>
                    {c.active ? t("buyer.customers.status.active") : t("buyer.customers.status.inactive")}
                  </span>
                </td>
                <td data-label={t("buyer.customers.columns.invitedAt")}>{formatDate(c.invitedAt)}</td>
                <td data-label={t("buyer.customers.columns.active")}>
                  <Toggle checked={c.active} onChange={() => toggleActive(c.id)} />
                </td>
                <td data-label={t("buyer.customers.columns.actions")}>
                  <button className="action-icon-btn" aria-label={t("buyer.customers.edit")} type="button">
                    <EditIcon size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <InviteCustomerModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSend={handleSendInvite}
      />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

type InviteProps = {
  open: boolean;
  onClose: () => void;
  onSend: (data: BuyerCustomerInput) => void;
};

function InviteCustomerModal({ open, onClose, onSend }: InviteProps) {
  const { t } = useTranslation();
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const wasOpen = useRef(false);

  if (open && !wasOpen.current) {
    wasOpen.current = true;
    setCompany("");
    setContact("");
    setEmail("");
    setPhone("");
    setCountry("");
  } else if (!open && wasOpen.current) {
    wasOpen.current = false;
  }

  const canSend = country.trim().length > 0 && company.trim().length > 0 && email.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} width={460}>
      <h2>{t("buyer.customers.invite_modal.title")}</h2>
      <div className="modal-body">
        <TextField
          label={t("buyer.customers.invite_modal.company")}
          placeholder={t("buyer.customers.invite_modal.companyPlaceholder")}
          value={company}
          onChange={setCompany}
        />
        <TextField
          label={t("buyer.customers.invite_modal.contact")}
          placeholder={t("buyer.customers.invite_modal.contactPlaceholder")}
          value={contact}
          onChange={setContact}
        />
        <TextField
          label={t("buyer.customers.invite_modal.email")}
          type="email"
          placeholder={t("buyer.customers.invite_modal.emailPlaceholder")}
          value={email}
          onChange={setEmail}
        />
        <TextField
          label={t("buyer.customers.invite_modal.phone")}
          placeholder={t("buyer.customers.invite_modal.phonePlaceholder")}
          value={phone}
          onChange={setPhone}
        />
        <SelectField
          label={t("buyer.customers.invite_modal.country")}
          required
          value={country}
          onChange={setCountry}
          options={COUNTRY_OPTIONS}
        />
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} type="button">
          {t("common.cancel")}
        </button>
        <button
          className="btn btn-primary"
          disabled={!canSend}
          onClick={() => onSend({ company, contact, email, phone, country })}
          type="button"
        >
          {t("buyer.customers.invite_modal.send")}
        </button>
      </div>
    </Modal>
  );
}

function ImportCsvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wasOpen = useRef(false);

  if (open && !wasOpen.current) {
    wasOpen.current = true;
    setFile(null);
  } else if (!open && wasOpen.current) {
    wasOpen.current = false;
  }

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <h2>{t("buyer.customers.import_modal.title")}</h2>
      <div className="modal-body">
        <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--fg)" }}>
          {t("buyer.customers.import_modal.hint")}
        </p>
        <div>
          <button className="btn-tb" type="button" style={{ height: 36 }}>
            <DownloadIcon size={14} /> {t("buyer.customers.import_modal.downloadTemplate")}
          </button>
        </div>
        <div
          className="dropzone-csv"
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <div className="ic">
            <UploadIcon size={28} />
          </div>
          <div style={{ fontWeight: "var(--weight-medium)" }}>
            {file ? file.name : t("buyer.customers.import_modal.clickUpload")}
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
        <button className="btn btn-ghost" onClick={onClose} type="button">
          {t("common.cancel")}
        </button>
        <button className="btn btn-primary" disabled={!file} onClick={onClose} type="button">
          {t("buyer.customers.import_modal.import")}
        </button>
      </div>
    </Modal>
  );
}
