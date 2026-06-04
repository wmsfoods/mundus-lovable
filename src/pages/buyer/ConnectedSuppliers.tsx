import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UsersIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { ListCard, ListCardList } from "@/components/mundus/ListCard";
import { TextField } from "@/components/mundus/TextField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMyConnectedSuppliers } from "@/hooks/useMyConnectedSuppliers";
import { useAcceptSupplierInvite } from "@/hooks/useAcceptSupplierInvite";
import { useDeclineSupplierInvite } from "@/hooks/useDeclineSupplierInvite";
import { useRevokeSupplierLink } from "@/hooks/useRevokeSupplierLink";
import type { SclStatus } from "@/hooks/useMyCustomers";

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

export default function ConnectedSuppliers() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<"all" | SclStatus>("all");
  const [search, setSearch] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const { suppliers, loading } = useMyConnectedSuppliers();
  const { acceptInvite, isAccepting } = useAcceptSupplierInvite();
  const { declineInvite, isDeclining } = useDeclineSupplierInvite();
  const { revokeLink, isRevoking } = useRevokeSupplierLink();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [s.office_name, s.parent_company_name, s.office_country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [suppliers, statusFilter, search]);

  const pendingCount = useMemo(
    () => suppliers.filter((s) => s.status === "invited").length,
    [suppliers],
  );

  async function handleAccept(linkId: string) {
    try {
      const res = await acceptInvite(linkId);
      if (res?.ok === false) {
        toast.error(t("buyer.connectedSuppliers.toast.error"));
        return;
      }
      toast.success(t("buyer.connectedSuppliers.toast.acceptSuccess"));
    } catch {
      toast.error(t("buyer.connectedSuppliers.toast.error"));
    }
  }

  async function handleDecline(linkId: string) {
    try {
      const res = await declineInvite(linkId);
      if (res?.ok === false) {
        toast.error(t("buyer.connectedSuppliers.toast.error"));
        return;
      }
      toast(t("buyer.connectedSuppliers.toast.declineSuccess"));
    } catch {
      toast.error(t("buyer.connectedSuppliers.toast.error"));
    }
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget) return;
    const id = revokeTarget;
    setRevokeTarget(null);
    try {
      const res = await revokeLink(id);
      if (res?.ok === false) {
        toast.error(t("buyer.connectedSuppliers.toast.error"));
        return;
      }
      toast(t("buyer.connectedSuppliers.toast.revokeSuccess"));
    } catch {
      toast.error(t("buyer.connectedSuppliers.toast.error"));
    }
  }

  const busy = isAccepting || isDeclining || isRevoking;

  return (
    <>
      <Crumbs
        items={[
          { label: t("shell.nav.home"), to: "/buyer" },
          { label: t("buyer.connectedSuppliers.title") },
        ]}
      />

      <PageTitle
        icon={UsersIcon}
        title={t("buyer.connectedSuppliers.title")}
        right={
          pendingCount > 0 ? (
            <span className="lc-chip pill-pending">
              {t("buyer.connectedSuppliers.pendingCount", { n: pendingCount })}
            </span>
          ) : undefined
        }
      />

      <div className="mt-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            value={search}
            onChange={setSearch}
            placeholder={t("buyer.connectedSuppliers.searchPlaceholder")}
          />
        </div>
        <div className="sm:w-56">
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | SclStatus)}
            aria-label={t("buyer.connectedSuppliers.statusFilter.all")}
          >
            <option value="all">{t("buyer.connectedSuppliers.statusFilter.all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`common.statuses.scl.${s}`)}
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
              <th>{t("buyer.connectedSuppliers.table.supplier")}</th>
              <th>{t("buyer.connectedSuppliers.table.office")}</th>
              <th>{t("buyer.connectedSuppliers.table.country")}</th>
              <th>{t("buyer.connectedSuppliers.table.status")}</th>
              <th>{t("buyer.connectedSuppliers.table.invitedAt")}</th>
              <th>{t("buyer.connectedSuppliers.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row">
                <td colSpan={6}>{t("common.loading")}</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={6}>{t("buyer.connectedSuppliers.empty")}</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.link_id}>
                  <td>{s.parent_company_name ?? s.office_name}</td>
                  <td>{s.office_name}</td>
                  <td>{s.office_country ?? "—"}</td>
                  <td>
                    <span className={`lc-chip ${STATUS_PILL[s.status]}`}>
                      {t(`common.statuses.scl.${s.status}`)}
                    </span>
                  </td>
                  <td>{formatDate(s.responded_at ?? s.invited_at)}</td>
                  <td>
                    {s.status === "invited" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-tb is-primary"
                          disabled={busy}
                          onClick={() => handleAccept(s.link_id)}
                        >
                          {t("buyer.connectedSuppliers.accept")}
                        </button>
                        <button
                          type="button"
                          className="btn-tb"
                          disabled={busy}
                          onClick={() => handleDecline(s.link_id)}
                        >
                          {t("buyer.connectedSuppliers.decline")}
                        </button>
                      </div>
                    ) : s.status === "accepted" ? (
                      <button
                        type="button"
                        className="btn-tb is-danger"
                        disabled={busy}
                        onClick={() => setRevokeTarget(s.link_id)}
                      >
                        {t("buyer.connectedSuppliers.revoke")}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
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
        ) : filtered.length === 0 ? (
          <div className="empty-state">{t("buyer.connectedSuppliers.empty")}</div>
        ) : (
          filtered.map((s) => (
            <ListCard
              key={s.link_id}
              title={s.parent_company_name ?? s.office_name}
              subtitle={s.parent_company_name ? s.office_name : undefined}
              chip={{
                label: t(`common.statuses.scl.${s.status}`),
                className: STATUS_PILL[s.status],
              }}
              meta={[
                {
                  label: t("buyer.connectedSuppliers.table.country"),
                  value: s.office_country ?? "—",
                },
                {
                  label: t("buyer.connectedSuppliers.table.invitedAt"),
                  value: formatDate(s.responded_at ?? s.invited_at),
                },
              ]}
              cta={
                s.status === "invited" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-tb is-primary"
                      disabled={busy}
                      onClick={() => handleAccept(s.link_id)}
                    >
                      {t("buyer.connectedSuppliers.accept")}
                    </button>
                    <button
                      type="button"
                      className="btn-tb"
                      disabled={busy}
                      onClick={() => handleDecline(s.link_id)}
                    >
                      {t("buyer.connectedSuppliers.decline")}
                    </button>
                  </div>
                ) : s.status === "accepted" ? (
                  <button
                    type="button"
                    className="btn-tb is-danger"
                    disabled={busy}
                    onClick={() => setRevokeTarget(s.link_id)}
                  >
                    {t("buyer.connectedSuppliers.revoke")}
                  </button>
                ) : undefined
              }
            />
          ))
        )}
      </ListCardList>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("buyer.connectedSuppliers.confirmRevoke.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("buyer.connectedSuppliers.confirmRevoke.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>
              {t("buyer.connectedSuppliers.confirmRevoke.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRevoking}
              onClick={handleRevokeConfirm}
            >
              {t("buyer.connectedSuppliers.confirmRevoke.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}