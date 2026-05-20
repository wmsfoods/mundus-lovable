import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { UsersIcon, SearchIcon, PlusIcon, EditIcon, XIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { ListCard, ListCardList } from "@/components/mundus/ListCard";
import { useBuyerUsers, type BuyerUser } from "@/hooks/useBuyerUsers";
import { BuyerInviteUserModal } from "@/components/buyer/BuyerInviteUserModal";
import { toast } from "sonner";

const PROFILE_OPTIONS: BuyerUser["profileType"][] = ["admin", "buyer", "viewer"];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(iso));
}

function formatDateTime(iso: string, locale: string) {
  const d = new Date(iso);
  return `${formatDate(iso, locale)} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function BuyerUsers() {
  const { t, i18n } = useTranslation();
  const { data: users } = useBuyerUsers();
  const locale = i18n.language || "en";

  const [query, setQuery] = useState("");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (profileFilter !== "all" && u.profileType !== profileFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${u.name} ${u.email} ${u.jobTitle}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, query, profileFilter, statusFilter]);

  const handleEdit = (id: string) => {
    console.log("edit buyer user", id);
    toast(t("buyer.users.actions.editMock"));
  };
  const handleDeactivate = (id: string) => {
    console.log("deactivate buyer user", id);
    toast(t("buyer.users.actions.deactivateMock"));
  };

  return (
    <>
      <Crumbs
        items={[
          { label: t("shell.home", { defaultValue: "Home" }), to: "/buyer" },
          { label: t("buyer.users.title") },
        ]}
      />

      <PageTitle icon={UsersIcon} title={t("buyer.users.title")} />

      <div className="table-toolbar">
        <div className="left">
          <div className="search-input">
            <span className="ic">
              <SearchIcon size={16} />
            </span>
            <input
              placeholder={t("buyer.users.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="mini-select"
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
          >
            <option value="all">{t("buyer.users.allProfiles")}</option>
            {PROFILE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {t(`buyer.users.profile.${p}`)}
              </option>
            ))}
          </select>
          <select
            className="mini-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t("buyer.users.all")}</option>
            <option value="active">{t("buyer.users.status.active")}</option>
            <option value="inactive">{t("buyer.users.status.inactive")}</option>
          </select>
        </div>
        <div className="right">
          <span className="result-count">
            {t("buyer.users.userCount", { count: filtered.length, total: users.length })}
          </span>
          <button
            type="button"
            className="btn-tb is-primary"
            onClick={() => setInviteOpen(true)}
          >
            <PlusIcon size={16} />
            {t("buyer.users.inviteUser")}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="detail-empty">
          <p>{t("buyer.users.empty")}</p>
        </div>
      ) : (
        <div className="data-table-wrap has-mobile-cards">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("buyer.users.col.user")}</th>
                <th>{t("buyer.users.col.email")}</th>
                <th>{t("buyer.users.col.profileType")}</th>
                <th>{t("buyer.users.col.created")}</th>
                <th>{t("buyer.users.col.lastLogin")}</th>
                <th>{t("buyer.users.col.status")}</th>
                <th aria-label={t("buyer.users.col.actions")} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <span className="name">{u.name}</span>
                      <span className="job">{u.jobTitle}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--fg-muted)" }}>{u.email}</td>
                  <td>{t(`buyer.users.profile.${u.profileType}`)}</td>
                  <td>{formatDate(u.createdAt, locale)}</td>
                  <td>{formatDateTime(u.lastLoginAt, locale)}</td>
                  <td>
                    <span className={u.status === "active" ? "pill pill-active" : "pill pill-inactive"}>
                      {t(`buyer.users.status.${u.status}`)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="action-icon-btn"
                        aria-label="Edit"
                        onClick={() => handleEdit(u.id)}
                      >
                        <EditIcon size={16} />
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn"
                        aria-label="Deactivate"
                        onClick={() => handleDeactivate(u.id)}
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <ListCardList>
          {filtered.map((u) => (
            <ListCard
              key={u.id}
              title={u.name}
              subtitle={u.jobTitle ? `${u.jobTitle} · ${u.email}` : u.email}
              chip={{
                label: t(`buyer.users.status.${u.status}`),
                className: u.status === "active" ? "pill-active" : "pill-inactive",
              }}
              meta={[
                { label: t("buyer.users.col.profileType"), value: t(`buyer.users.profile.${u.profileType}`) },
                { label: t("buyer.users.col.lastLogin"), value: formatDateTime(u.lastLoginAt, locale) },
              ]}
            />
          ))}
        </ListCardList>
      )}

      <BuyerInviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
