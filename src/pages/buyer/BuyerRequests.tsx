import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ClipboardIcon, SearchIcon, PlusIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import {
  useBuyerRequests,
  type BuyerRequest,
  type BuyerRequestStatus,
  type Species,
} from "@/hooks/useBuyerRequests";

const STATUS_CHIP: Record<BuyerRequestStatus, string> = {
  draft: "req-status-chip is-draft",
  active: "req-status-chip is-active",
  closed_won: "req-status-chip is-won",
  closed_no_winner: "req-status-chip is-nowin",
  expired: "req-status-chip is-expired",
};

function fmtKg(v: number) {
  return new Intl.NumberFormat("de-DE").format(v);
}
function fmtMonth(ym: string, locale: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" })
    .format(new Date(y, m - 1, 1));
}
function fmtDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(iso));
}

export default function BuyerRequests() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, counts } = useBuyerRequests();
  const locale = i18n.language || "en";
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<"all" | BuyerRequestStatus>("all");
  const [speciesF, setSpeciesF] = useState<"all" | Species>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (statusF !== "all" && r.status !== statusF) return false;
      if (speciesF !== "all" && r.species !== speciesF) return false;
      if (!q) return true;
      return `${r.id} ${r.title} ${r.destinationCountry} ${r.destinationPort}`
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, statusF, speciesF]);

  const statusChips: Array<{ key: "all" | BuyerRequestStatus; count: number }> = [
    { key: "all", count: counts.all },
    { key: "draft", count: counts.draft },
    { key: "active", count: counts.active },
    { key: "closed_won", count: counts.closed_won },
    { key: "closed_no_winner", count: counts.closed_no_winner },
    { key: "expired", count: counts.expired },
  ];

  return (
    <>
      <Crumbs
        items={[
          { label: t("supplier.requests.crumbHome"), to: "/buyer" },
          { label: t("buyer.requests.title") },
        ]}
      />
      <PageTitle icon={ClipboardIcon} title={t("buyer.requests.title")} />

      <div className="table-toolbar">
        <div className="left">
          <div className="search-input">
            <span className="ic"><SearchIcon size={16} /></span>
            <input
              type="text"
              placeholder={t("buyer.requests.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="mini-select"
            value={statusF}
            onChange={(e) => setStatusF(e.target.value as typeof statusF)}
          >
            <option value="all">{t("buyer.requests.statusAll")}</option>
            <option value="draft">{t("buyer.requests.status.draft")}</option>
            <option value="active">{t("buyer.requests.status.active")}</option>
            <option value="closed_won">{t("buyer.requests.status.closed_won")}</option>
            <option value="closed_no_winner">{t("buyer.requests.status.closed_no_winner")}</option>
            <option value="expired">{t("buyer.requests.status.expired")}</option>
          </select>
          <select
            className="mini-select"
            value={speciesF}
            onChange={(e) => setSpeciesF(e.target.value as typeof speciesF)}
          >
            <option value="all">{t("buyer.requests.speciesAll")}</option>
            <option value="beef">{t("buyer.requests.species.beef", { defaultValue: "Beef" })}</option>
            <option value="pork">{t("buyer.requests.species.pork", { defaultValue: "Pork" })}</option>
            <option value="poultry">{t("buyer.requests.species.poultry", { defaultValue: "Poultry" })}</option>
            <option value="lamb">{t("buyer.requests.species.lamb", { defaultValue: "Lamb" })}</option>
          </select>
        </div>
        <div className="right">
          <button
            type="button"
            className="btn-tb is-primary"
            onClick={() => toast(t("buyer.requests.toast.create"))}
          >
            <PlusIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {t("buyer.requests.newRequest")}
          </button>
        </div>
      </div>

      <div className="nego-chips" style={{ marginTop: 12 }}>
        {statusChips.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`nego-chip ${statusF === c.key ? "is-active" : ""}`.trim()}
            onClick={() => setStatusF(c.key)}
          >
            {c.key === "all"
              ? t("buyer.requests.statusAll")
              : t(`buyer.requests.status.${c.key}` as const)}
            <span className="count">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="data-table-wrap" style={{ marginTop: 12 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("buyer.requests.col.title")}</th>
              <th>{t("buyer.requests.col.species")}</th>
              <th>{t("buyer.requests.col.destination")}</th>
              <th>{t("buyer.requests.col.target")}</th>
              <th>{t("buyer.requests.col.volume")}</th>
              <th>{t("buyer.requests.col.shipment")}</th>
              <th>{t("buyer.requests.col.offers")}</th>
              <th>{t("buyer.requests.col.status")}</th>
              <th>{t("buyer.requests.col.updated")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "32px 12px", color: "var(--fg-muted)" }}>
                  {t("buyer.requests.empty")}
                </td>
              </tr>
            ) : (
              filtered.map((r: BuyerRequest) => (
                <tr
                  key={r.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/buyer/requests/${r.id}`)}
                >
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--fg-muted)" }}>
                      {r.id}
                    </div>
                  </td>
                  <td><span className="req-species-chip">{r.species}</span></td>
                  <td>
                    {r.destinationCountry}
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--fg-muted)" }}>
                      {r.destinationPort}
                    </div>
                  </td>
                  <td>${r.targetPricePerKgUsd.toFixed(2)}</td>
                  <td>{fmtKg(r.targetVolumeKg)} kg</td>
                  <td>{fmtMonth(r.shipmentMonth, locale)}</td>
                  <td>
                    <span className={`req-offer-badge ${r.offers.length === 0 ? "is-empty" : ""}`.trim()}>
                      {t("buyer.requests.offersCount", { n: r.offers.length })}
                    </span>
                  </td>
                  <td>
                    <span className={STATUS_CHIP[r.status]}>
                      {t(`buyer.requests.status.${r.status}`)}
                    </span>
                  </td>
                  <td>{fmtDate(r.updatedAt, locale)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}