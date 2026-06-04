import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UsersIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { ListCard, ListCardList } from "@/components/mundus/ListCard";
import { TextField } from "@/components/mundus/TextField";
import { useMyCustomers, type SclStatus } from "@/hooks/useMyCustomers";
import InviteCustomerModal from "@/components/supplier/InviteCustomerModal";

const STATUSES: SclStatus[] = [
  "invited",
  "pending_signup",
  "accepted",
  "declined",
  "revoked",
  "expired",
];

const STATUS_PILL: Record<SclStatus, string> = {
  invited: "pill-pending",
  pending_signup: "pill-info",
  accepted: "pill-active",
  declined: "pill-neutral",
  revoked: "pill-neutral",
  expired: "pill-neutral",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function MyCustomers() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<"all" | SclStatus>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const status = statusFilter === "all" ? undefined : statusFilter;
  const { customers, loading } = useMyCustomers({ status, search });

  return (
    <>
      <Crumbs
        items={[
          { label: t("shell.nav.home"), to: "/supplier" },
          { label: t("supplier.myCustomers.title") },
        ]}
      />

      <PageTitle
        icon={UsersIcon}
        title={t("supplier.myCustomers.title")}
        right={
          <button
            type="button"
            className="btn-tb is-primary"
            onClick={() => setModalOpen(true)}
          >
            {t("supplier.myCustomers.inviteNewCustomer")}
          </button>
        }
      />

      <div className="mt-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            value={search}
            onChange={setSearch}
            placeholder={t("supplier.myCustomers.searchPlaceholder")}
          />
        </div>
        <div className="sm:w-56">
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | SclStatus)}
            aria-label={t("supplier.myCustomers.statusFilter.all")}
          >
            <option value="all">{t("supplier.myCustomers.statusFilter.all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`supplier.myCustomers.statusFilter.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="data-table-wrap has-mobile-cards">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("supplier.myCustomers.modal.companyName")}</th>
              <th>{t("supplier.myCustomers.modal.contactName")}</th>
              <th>{t("supplier.myCustomers.modal.phone")}</th>
              <th>{t("supplier.myCustomers.modal.country")}</th>
              <th>{t("supplier.myCustomers.modal.email")}</th>
              <th>{t("buyer.connectedSuppliers.table.status")}</th>
              <th>{t("buyer.connectedSuppliers.table.invitedAt")}</th>
              <th>{t("buyer.connectedSuppliers.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row">
                <td colSpan={8}>{t("common.loading")}</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={8}>{t("supplier.myCustomers.empty")}</td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.link_id}>
                  <td>{c.company_name}</td>
                  <td>{c.contact_name ?? "—"}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td>{c.country ?? "—"}</td>
                  <td>{c.email ?? "—"}</td>
                  <td>
                    <span className={`lc-chip ${STATUS_PILL[c.status]}`}>
                      {t(`common.statuses.scl.${c.status}`)}
                    </span>
                  </td>
                  <td>{formatDate(c.responded_at ?? c.invited_at)}</td>
                  <td>—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ListCardList>
        {loading ? (
          <div className="empty-state">{t("common.loading")}</div>
        ) : customers.length === 0 ? (
          <div className="empty-state">{t("supplier.myCustomers.empty")}</div>
        ) : (
          customers.map((c) => (
            <ListCard
              key={c.link_id}
              title={c.company_name}
              subtitle={c.contact_name || c.email || undefined}
              chip={{
                label: t(`common.statuses.scl.${c.status}`),
                className: STATUS_PILL[c.status],
              }}
              meta={[
                { label: t("supplier.myCustomers.modal.email"), value: c.email ?? "—" },
                { label: t("supplier.myCustomers.modal.phone"), value: c.phone ?? "—" },
                { label: t("supplier.myCustomers.modal.country"), value: c.country ?? "—" },
                {
                  label: t("buyer.connectedSuppliers.table.invitedAt"),
                  value: formatDate(c.responded_at ?? c.invited_at),
                },
              ]}
            />
          ))
        )}
      </ListCardList>

      <InviteCustomerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
