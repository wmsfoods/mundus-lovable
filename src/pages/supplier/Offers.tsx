import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  TagIcon,
  GridIcon,
  PlusIcon,
  EyeIcon,
  MessageIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertIcon,
  ListIcon,
} from "@/components/icons";
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { useRealSupplierOffers } from "@/hooks/useRealSupplierOffers";
import { useActiveOffice } from "@/hooks/useActiveOffice";
import { ProteinFilter, categoryToProtein, type ProteinKey } from "@/components/marketplace/ProteinFilter";
import { useSupplierProteins } from "@/hooks/useSupplierProteins";
import { OfficeIndicator } from "@/components/mundus/OfficeIndicator";
import {
  OffersFilterBar,
  DEFAULT_OFFERS_FILTER,
  type OffersFilterState,
  type TempValue,
} from "@/components/marketplace/OffersFilterBar";
import { SupplierOfferCard } from "@/components/supplier/OfferCard";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const PAGE_SIZE = 12;

export default function SupplierOffers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { offers: realOffers, loading: realLoading } = useRealSupplierOffers();
  const { activeOffice, isAllOffices } = useActiveOffice();

  const [shown, setShown] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priceDesc" | "priceAsc">("newest");
  const [cat, setCat] = useState<ProteinKey>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SupplierOffer["status"]>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { available: supplierProteins, counts: proteinCounts } = useSupplierProteins();
  const [filter, setFilter] = useState<OffersFilterState>(DEFAULT_OFFERS_FILTER);

  const [negCounts, setNegCounts] = useState<Record<string, { total: number; companies: number }>>({});
  const [deleteTarget, setDeleteTarget] = useState<SupplierOffer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteDraft = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("offers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success(t("supplier.offers.deleteDraftSuccess", "Draft deleted"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete draft");
    } finally {
      setDeleting(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("negotiations")
        .select("offer_id, buyer_company_id")
        .not("status", "in", "(expired,offer_withdrawn,bid_accepted)")
        .is("deleted_at", null);
      if (cancelled) return;
      const byOffer: Record<string, { total: number; companies: Set<string> }> = {};
      (data ?? []).forEach((n: { offer_id: string; buyer_company_id: string }) => {
        const e = byOffer[n.offer_id] ?? { total: 0, companies: new Set<string>() };
        e.total += 1;
        if (n.buyer_company_id) e.companies.add(n.buyer_company_id);
        byOffer[n.offer_id] = e;
      });
      const counts: Record<string, { total: number; companies: number }> = {};
      Object.entries(byOffer).forEach(([k, v]) => {
        counts[k] = { total: v.total, companies: v.companies.size };
      });
      setNegCounts(counts);
    })();
    return () => { cancelled = true; };
  }, []);

  const filterOptions = useMemo(() => {
    const temps = new Set<TempValue>();
    const origins = new Set<string>();
    const incoterms = new Set<string>();
    const markets = new Set<string>();
    for (const o of realOffers) {
      if (o.condition === "Frozen" || o.condition === "Chilled") temps.add(o.condition);
      if (o.originCountry) origins.add(o.originCountry);
      for (const i of o.incoterms ?? []) incoterms.add(i);
      for (const d of o.destinations ?? []) markets.add(d.name);
    }
    return {
      temps: Array.from(temps),
      origins: Array.from(origins),
      incoterms: Array.from(incoterms),
      markets: Array.from(markets),
    };
  }, [realOffers]);

  const filtered = useMemo(() => {
    let copy: SupplierOffer[] = [...realOffers];
    if (cat !== "all") copy = copy.filter((o) => categoryToProtein(o.category) === cat);
    if (statusFilter !== "all") copy = copy.filter((o) => o.status === statusFilter);
    if (filter.temp !== "all") copy = copy.filter((o) => o.condition === filter.temp);
    if (filter.origins.length > 0)
      copy = copy.filter((o) => filter.origins.includes(o.originCountry));
    if (filter.incoterms.length > 0)
      copy = copy.filter((o) =>
        (o.incoterms ?? []).some((i) => filter.incoterms.includes(i)),
      );
    if (filter.markets.length > 0)
      copy = copy.filter((o) =>
        (o.destinations ?? []).some((d) => filter.markets.includes(d.name)),
      );
    if (filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      copy = copy.filter((o) => {
        return (
          o.title.toLowerCase().includes(q) ||
          o.cutsLabel.toLowerCase().includes(q) ||
          (o.originCountry ?? "").toLowerCase().includes(q) ||
          (o.originPort ?? "").toLowerCase().includes(q) ||
          o.items.some((it) => it.name.toLowerCase().includes(q))
        );
      });
    }
    copy.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === "priceDesc") return b.pricePerFclUsd - a.pricePerFclUsd;
      return a.pricePerFclUsd - b.pricePerFclUsd;
    });
    return copy;
  }, [sortBy, cat, statusFilter, realOffers, filter]);

  const total = filtered.length;
  const visible = filtered.slice(0, shown);
  const hasMore = shown < total;

  const kpis = useMemo(() => {
    const all = realOffers;
    return {
      total: all.length,
      available: all.filter((o) => o.status === "active").length,
      negotiating: all.filter((o) => o.status === "negotiating").length,
      expiring: 0,
      views: 0,
      proposals: 0,
    };
  }, [realOffers]);

  return (
    <>
      <header className="so-header">
        <div className="so-header-l">
          <span className="so-header-icon"><TagIcon size={16} /></span>
          <h1>{t("supplier.offers.title")}</h1>
        </div>
        <button
          type="button"
          className="so-new-btn"
          onClick={() => navigate("/supplier/offers/new")}
        >
          <PlusIcon size={14} /> {t("supplier.offers.newOffer")}
        </button>
      </header>

      <OfficeIndicator />

      <div className="so-kpis">
        <div className="so-kpi"><span className="so-kpi-ic"><TagIcon size={14} /></span><div><span className="so-kpi-n">{kpis.total}</span><span className="so-kpi-l">{t("supplier.offers.kpi.total")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic"><CheckCircleIcon size={14} /></span><div><span className="so-kpi-n">{kpis.available}</span><span className="so-kpi-l">{t("supplier.offers.kpi.available")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic"><MessageIcon size={14} /></span><div><span className="so-kpi-n">{kpis.negotiating}</span><span className="so-kpi-l">{t("supplier.offers.kpi.negotiating")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic warn"><ClockIcon size={14} /></span><div><span className="so-kpi-n">{kpis.expiring}</span><span className="so-kpi-l">{t("supplier.offers.kpi.expiring")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic"><EyeIcon size={14} /></span><div><span className="so-kpi-n">{kpis.views}</span><span className="so-kpi-l">{t("supplier.offers.kpi.views")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic"><AlertIcon size={14} /></span><div><span className="so-kpi-n">{kpis.proposals}</span><span className="so-kpi-l">{t("supplier.offers.kpi.proposals")}</span></div></div>
      </div>

      <div className="so-filterbar">
        <div className="so-toolbar-r" style={{ marginLeft: "auto" }}>
          <div className="mini-select-wrap">
            <select
              className="mini-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label={t("supplier.offers.statusFilter")}
            >
              <option value="all">{t("supplier.offers.statusFilter")}: {t("supplier.offers.allStatuses")}</option>
              <option value="active">{t("supplier.offers.status.active")}</option>
              <option value="draft">{t("supplier.offers.status.draft")}</option>
              <option value="new">{t("supplier.offers.status.new")}</option>
              <option value="negotiating">{t("supplier.offers.status.negotiating")}</option>
              <option value="closed">{t("supplier.offers.status.closed")}</option>
            </select>
          </div>
          <div className="mini-select-wrap">
            <select
              className="mini-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label={t("supplier.offers.sortBy")}
            >
              <option value="newest">{t("supplier.offers.sortBy")}: {t("supplier.offers.sort.newest")}</option>
              <option value="oldest">{t("supplier.offers.sort.oldest")}</option>
              <option value="priceDesc">{t("supplier.offers.sort.priceDesc")}</option>
              <option value="priceAsc">{t("supplier.offers.sort.priceAsc")}</option>
            </select>
          </div>
          <div className="so-view-toggle">
            <button type="button" className={viewMode === "grid" ? "is-active" : ""} onClick={() => setViewMode("grid")} aria-label="Grid view"><GridIcon size={14} /></button>
            <button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")} aria-label="List view"><ListIcon size={14} /></button>
          </div>
        </div>
      </div>

      <OffersFilterBar
        value={filter}
        onChange={setFilter}
        options={filterOptions}
        searchPlaceholder={t("supplier.offers.searchPlaceholder", "Search products, ports...")}
        proteinNode={
          <ProteinFilter
            value={cat}
            onChange={setCat}
            available={supplierProteins}
            counts={proteinCounts}
            allLabel={t("supplier.offers.cat.all")}
          />
        }
      />

      <div className="so-count-row">
        <span className="result-count">
          {t("supplier.offers.showingShort", { shown: visible.length, total })}
        </span>
      </div>

      {realLoading && realOffers.length === 0 && visible.length === 0 ? (
        <div className="so-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="oc" style={{ opacity: 0.5 }}>
              <div style={{ height: 16, background: "#e5e7eb", borderRadius: 4, marginBottom: 12 }} />
              <div style={{ height: 24, background: "#e5e7eb", borderRadius: 4, marginBottom: 12, width: "70%" }} />
              <div style={{ height: 80, background: "#f3f4f6", borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state" style={{ textAlign: "center", padding: "48px 16px" }}>
          <p style={{ marginBottom: 12 }}>
            {activeOffice && !isAllOffices
              ? t("supplier.offers.emptyForOffice", {
                  defaultValue: "No offers yet for {{office}}.",
                  office: activeOffice.office_name || activeOffice.name,
                })
              : t("supplier.offers.empty", "No offers yet. Create your first offer.")}
          </p>
          <button type="button" className="so-new-btn" onClick={() => navigate("/supplier/offers/new")}>
            <PlusIcon size={14} /> {t("supplier.offers.newOffer")}
          </button>
        </div>
      ) : (
        <>
          <div className="so-grid">
            {visible.map((o) => (
              <SupplierOfferCard
                key={o.id}
                o={o}
                t={t}
                negInfo={negCounts[o.id]}
                onOpen={() => navigate(`/supplier/offers/${o.id}`)}
                onDelete={(off) => setDeleteTarget(off)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="so-load-more">
              <button type="button" onClick={() => setShown(shown + PAGE_SIZE)}>
                {t("supplier.offers.loadMore")}
              </button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("supplier.offers.deleteDraftTitle", "Delete this draft?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "supplier.offers.deleteDraftBody",
                "This draft will be permanently removed. This action cannot be undone.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              type="button"
              className="cov4-btn-s"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {t("supplier.offers.deleteDraftCancel", "Cancel")}
            </button>
            <button
              type="button"
              className="cov4-btn-p"
              style={{ background: "#b91c1c", borderColor: "#b91c1c" }}
              onClick={confirmDeleteDraft}
              disabled={deleting}
            >
              {deleting
                ? t("supplier.offers.deleting", "Deleting...")
                : t("supplier.offers.deleteDraftConfirm", "Delete draft")}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}