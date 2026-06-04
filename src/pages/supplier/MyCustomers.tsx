import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { UsersIcon } from "@/components/icons";
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

  const rows = useMemo(() => customers, [customers]);

  return (
    <div className="page">
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
          <label className="field-label" htmlFor="scl-status-filter">
            {t("supplier.myCustomers.statusFilter.all")}
          </label>
          <select
            id="scl-status-filter"
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | SclStatus)}
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

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("supplier.myCustomers.empty")}</p>
      ) : (
        <ListCardList>
          {rows.map((c) => (
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
                { label: t("supplier.myCustomers.modal.country"), value: c.country ?? "—" },
                { label: t("supplier.myCustomers.modal.taxId"), value: c.tax_id ?? "—" },
                {
                  label:
                    c.status === "accepted"
                      ? t("buyer.connectedSuppliers.table.invitedAt")
                      : t("buyer.connectedSuppliers.table.invitedAt"),
                  value: formatDate(c.responded_at ?? c.invited_at),
                },
              ]}
            />
          ))}
        </ListCardList>
      )}

      <InviteCustomerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}