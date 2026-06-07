import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ChevronLeft,
  Sparkles,
  Globe,
  Beef,
  CreditCard,
  Megaphone,
  ChevronRight,
  Plus,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { isUsCompany } from "@/lib/companyHelpers";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { usePortsCatalog } from "@/hooks/usePortsCatalog";
import { useCompanyPlants } from "@/hooks/useCompanyPlants";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import { useOfferForPrefill } from "@/hooks/useOfferForPrefill";
import { useBuyerRequestForPrefill } from "@/hooks/useBuyerRequestForPrefill";
import { useOfferHasActiveBids } from "@/hooks/useOfferHasActiveBids";
import { useMyCustomers } from "@/hooks/useMyCustomers";
import { supabase } from "@/integrations/supabase/client";

import { type CutRow, emptyCutRow } from "@/lib/cutRowTypes";
import {
  type Incoterm,
  type Certification,
  type ContainerSize,
  type Temperature,
} from "@/lib/offerOptions";
import { containerCapacityKg } from "@/lib/units";
import { computeCompletion } from "@/lib/offerCompletion";
import { submitOfferV2, updateOfferV2 } from "@/lib/offerSubmit";
import { formatOfferNumber } from "@/lib/offerNumber";
import type { NegotiationMode, NegotiationDial } from "@/components/offer/NegotiationHandlingControl";

import { AiQuickFillModal } from "@/components/supplier/CreateOfferV2/AiQuickFillModal";
import { type DistributionValue } from "@/components/supplier/CreateOfferV2/DistributionCard";
import { LogisticsSheetMobile } from "@/components/supplier/CreateOfferV2/mobile/LogisticsSheetMobile";
import { CutSheetMobile } from "@/components/supplier/CreateOfferV2/mobile/CutSheetMobile";
import { PaymentTermsCard } from "@/components/supplier/CreateOfferV2/PaymentTermsCard";
import { ShipmentReadyPicker } from "@/components/supplier/CreateOfferV2/ShipmentReadyPicker";
import { formatCutMeta } from "@/lib/cutMetaDisplay";

// ---------- Types shared with desktop ----------
type Unit = "kg" | "lbs";
type PortFreightShape = { mode: "same"; same: string } | { mode: "perPort"; perPort: Record<string, string> };
type DestinationState = {
  countryId: string;
  iso: string;
  name: string;
  flag: string;
  selectedPortIds: string[];
  freight: PortFreightShape;
  insurance: PortFreightShape;
};
type LogisticsState = {
  originCountryId: string | null;
  originPortIds: string[];
  destinations: DestinationState[];
  containerSize: ContainerSize;
  fclCount: number;
  temperature: Temperature;
  incoterms: Incoterm[];
  certifications: Certification[];
  shipmentReady: string;
  sameFreightGlobal: boolean;
  globalFreight: string;
  globalInsurance: string;
  exwPickupLocation: string;
  primaryPricingIncoterm: "CFR" | "FOB" | null;
  pricingReferencePortId: string | null;
};

const EMPTY_LOGISTICS: LogisticsState = {
  originCountryId: null,
  originPortIds: [],
  destinations: [],
  containerSize: "40ft",
  fclCount: 1,
  temperature: "Frozen",
  incoterms: ["CFR"],
  certifications: [],
  shipmentReady: "",
  sameFreightGlobal: false,
  globalFreight: "",
  globalInsurance: "",
  exwPickupLocation: "",
  primaryPricingIncoterm: null,
  pricingReferencePortId: null,
};

// ---------- Helpers ----------
function kgToLbs(kg: number) {
  return kg * 2.20462;
}
function fmtQty(kg: number, unit: Unit) {
  const v = unit === "kg" ? kg : kgToLbs(kg);
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${unit}`;
}
function fmtPricePerUnit(askKg: number, unit: Unit) {
  const v = unit === "kg" ? askKg : askKg / 2.20462;
  return `$${v.toFixed(2)}/${unit}`;
}

// ---------- Component ----------
export default function SupplierCreateOfferV2Mobile() {
  const { t } = useTranslation();
  const tk = (key: string, fallback: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.${key}`, { defaultValue: fallback, ...(opts ?? {}) }) as string;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const catalog = usePortsCatalog();

  const editId = searchParams.get("id");
  const cloneId = searchParams.get("clone");
  const requestId =
    searchParams.get("request_id") ??
    searchParams.get("from_request") ??
    searchParams.get("from");
  const asCompanyParam = searchParams.get("as_company");
  const mode: "create" | "edit" | "clone" | "fromRequest" = editId
    ? "edit"
    : cloneId
      ? "clone"
      : requestId
        ? "fromRequest"
        : "create";

  const offerPrefillQuery = useOfferForPrefill(
    editId ?? cloneId ?? null,
    editId ? "edit" : cloneId ? "clone" : null,
  );
  const requestPrefillQuery = useBuyerRequestForPrefill(requestId);

  const { company } = useCurrentCompany();
  const { isAdmin: isMundusAdmin } = useIsMundusAdmin();
  const adminMode = !!asCompanyParam && isMundusAdmin;

  const [adminCompany, setAdminCompany] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (!adminMode || !asCompanyParam) {
      setAdminCompany(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", asCompanyParam)
        .maybeSingle();
      if (!cancelled && data) setAdminCompany({ id: data.id as string, name: (data.name as string) ?? "Supplier" });
    })();
    return () => {
      cancelled = true;
    };
  }, [adminMode, asCompanyParam]);

  const supplierContextId = adminMode ? adminCompany?.id ?? null : company?.id ?? null;
  const supplierContextName = adminMode
    ? adminCompany?.name ?? "Supplier"
    : company?.name ?? "Mundus Supplier";

  const { plants } = useCompanyPlants(supplierContextId);

  // ---------- State ----------
  const [unit, setUnit] = useState<Unit>("kg");
  const [logistics, setLogistics] = useState<LogisticsState>(EMPTY_LOGISTICS);
  const [cuts, setCuts] = useState<CutRow[]>([]);
  const [cutRegion, setCutRegion] = useState<"global" | "us">("global");
  const [pendingRegion, setPendingRegion] = useState<"global" | "us" | null>(null);
  const showRegionToggle = isUsCompany(company);
  const requestRegionChange = (newRegion: "global" | "us") => {
    if (cutRegion === newRegion) return;
    if (cuts.length === 0) { setCutRegion(newRegion); return; }
    setPendingRegion(newRegion);
  };
  const confirmRegionChange = () => {
    if (!pendingRegion) return;
    setCuts([]);
    setCutRegion(pendingRegion);
    setPendingRegion(null);
  };
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [distribution, setDistribution] = useState<DistributionValue>({
    marketplace: true,
    allCustomers: false,
    specificCustomerIds: [],
  });
  const [notes, setNotes] = useState("");
  const [negotiationMode] = useState<NegotiationMode>("manual");
  const [negotiationDial] = useState<NegotiationDial>("balanced");

  const [submitting, setSubmitting] = useState(false);
  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const [logisticsSheetOpen, setLogisticsSheetOpen] = useState(false);
  const [cutSheet, setCutSheet] = useState<{ open: boolean; mode: "new" | "edit"; cutId: string | null }>({
    open: false,
    mode: "new",
    cutId: null,
  });

  // ---------- Prefill (mirrors desktop) ----------
  const [prefillApplied, setPrefillApplied] = useState(false);
  useEffect(() => {
    if (prefillApplied) return;
    const data = offerPrefillQuery.data?.prefill;
    if (!data) return;
    setLogistics({
      originCountryId: data.originCountryId,
      originPortIds: data.originPortIds,
      destinations: data.destinations,
      containerSize: data.containerSize,
      fclCount: data.fclCount,
      temperature: data.temperature,
      incoterms: data.incoterms as LogisticsState["incoterms"],
      certifications: data.certifications as LogisticsState["certifications"],
      shipmentReady: data.shipmentReady,
      sameFreightGlobal: data.sameFreightGlobal,
      globalFreight: data.globalFreight,
      globalInsurance: data.globalInsurance,
      exwPickupLocation: data.exwPickupLocation,
      primaryPricingIncoterm: data.primaryPricingIncoterm,
      pricingReferencePortId: data.pricingReferencePortId,
    });
    setCuts(data.cuts);
    setCutRegion(data.cutRegion);
    setPaymentTerms(data.paymentTerms);
    setDistribution(data.distribution);
    setPrefillApplied(true);
  }, [offerPrefillQuery.data, prefillApplied]);

  useEffect(() => {
    if (prefillApplied) return;
    const data = requestPrefillQuery.data;
    if (!data) return;
    setLogistics((prev) => ({
      ...prev,
      destinations: data.destinations ?? prev.destinations,
      containerSize: data.containerSize ?? prev.containerSize,
      fclCount: data.fclCount ?? prev.fclCount,
      temperature: data.temperature ?? prev.temperature,
      incoterms: (data.incoterms as LogisticsState["incoterms"]) ?? prev.incoterms,
      shipmentReady: data.shipmentReady ?? prev.shipmentReady,
    }));
    if (data.cuts && data.cuts.length > 0) setCuts(data.cuts);
    if (data.cutRegion) setCutRegion(data.cutRegion);
    setPrefillApplied(true);
    if (data.requestNumber != null) {
      toast.success(
        tk("fromRequestMode.toast", "Prefilled from request #{{requestNumber}}", {
          requestNumber: data.requestNumber,
        }),
      );
    }
  }, [requestPrefillQuery.data, prefillApplied, tk]);

  // ---------- AI Quick-fill apply (mirrors desktop) ----------
  const applyAiPrefill = (p: import("@/hooks/useAiParseOffer").ParsedOfferPayload) => {
    setLogistics((prev) => {
      const next: LogisticsState = { ...prev };
      if (p.origin.country?.id) {
        next.originCountryId = p.origin.country.id;
        const ports = catalog.getPortsByCountryId(p.origin.country.id);
        if (p.origin.portName) {
          const needle = p.origin.portName.toLowerCase();
          const match = ports.find(
            (po) => po.name.toLowerCase() === needle || po.name.toLowerCase().includes(needle),
          );
          if (match) next.originPortIds = [match.id];
        }
      }
      if (p.destinations.length > 0) {
        next.destinations = p.destinations
          .filter((d) => d.country?.id)
          .map((d) => {
            const cid = d.country!.id!;
            const ports = catalog.getPortsByCountryId(cid);
            const selected: string[] = [];
            for (const pn of d.portNames) {
              const needle = pn.toLowerCase();
              const match = ports.find(
                (po) => po.name.toLowerCase() === needle || po.name.toLowerCase().includes(needle),
              );
              if (match && !selected.includes(match.id)) selected.push(match.id);
            }
            return {
              countryId: cid,
              iso: d.country!.iso,
              name: d.country!.name,
              flag: d.country!.flag,
              selectedPortIds: selected,
              freight: { mode: "same" as const, same: d.freightUsd != null ? String(d.freightUsd) : "" },
              insurance: { mode: "same" as const, same: d.insuranceUsd != null ? String(d.insuranceUsd) : "" },
            };
          });
      }
      if (p.sameFreightGlobal) {
        next.sameFreightGlobal = true;
        if (p.globalFreight != null) next.globalFreight = String(p.globalFreight);
        if (p.globalInsurance != null) next.globalInsurance = String(p.globalInsurance);
      }
      const validIncoterms = p.incoterms.filter((i): i is LogisticsState["incoterms"][number] =>
        ["FOB", "CFR", "CIF", "EXW", "DDP", "DAP"].includes(i),
      );
      if (validIncoterms.length > 0) next.incoterms = validIncoterms;
      if (p.containerSize) next.containerSize = p.containerSize;
      if (p.fclCount && p.fclCount > 0) next.fclCount = Math.floor(p.fclCount);
      if (p.temperature) next.temperature = p.temperature;
      if (p.shipmentReady) next.shipmentReady = p.shipmentReady;
      const pm = (p as any).pricingModel as "FOB" | "CFR" | "CIF" | "EXW" | null | undefined;
      const refPort = (p as any).pricingReferencePort as
        | { id: string | null; name: string | null; match: string; countryId: string | null }
        | undefined;
      if (pm === "FOB" || pm === "EXW") {
        next.primaryPricingIncoterm = "FOB";
        next.pricingReferencePortId = null;
      } else if (pm === "CFR" || pm === "CIF") {
        next.primaryPricingIncoterm = "CFR";
        next.pricingReferencePortId = refPort?.id ?? null;
      }
      return next;
    });
    if (p.paymentTerms.label && (p.paymentTerms.match === "exact" || p.paymentTerms.match === "fuzzy")) {
      setPaymentTerms(p.paymentTerms.label);
    }
    if (p.items.length > 0) {
      setCuts((prev) => {
        const additions: CutRow[] = p.items.map((it) => {
          const row = emptyCutRow();
          row.cutId = it.cut?.id ?? null;
          row.cutName = it.cutName;
          row.protein = it.protein;
          row.spec = it.spec ?? "";
          row.packing = it.packing ?? "";
          row.qty = it.qtyKg ?? 0;
          row.askPrice = it.askPricePerKg ?? 0;
          row.notes = it.notes ?? "";
          row.plantId = it.plant.plantId;
          row.plantNumber = it.plant.plantNumber ?? "";
          row.brandId = p.brand.id;
          row.brandName = p.brand.name ?? "";
          return row;
        });
        const onlyEmpty = prev.length === 1 && !prev[0].cutName && prev[0].qty === 0;
        return onlyEmpty ? additions : [...prev, ...additions];
      });
    }
  };

  // ---------- Derived ----------
  const breakdown = useMemo(
    () =>
      computeCompletion({
        logistics,
        cuts,
        hasPlants: plants.length > 0,
        paymentTerms,
        distribution,
      }),
    [logistics, cuts, plants.length, paymentTerms, distribution],
  );
  const completion = breakdown.total;
  const isComplete = completion >= 100;

  const totalCutKg = useMemo(() => cuts.reduce((a, c) => a + (c.qty || 0), 0), [cuts]);
  const capacityKg = useMemo(
    () => containerCapacityKg(logistics.containerSize) * Math.max(1, logistics.fclCount),
    [logistics.containerSize, logistics.fclCount],
  );
  const capacityPct = capacityKg > 0 ? Math.min(100, (totalCutKg / capacityKg) * 100) : 0;

  const totalCash = useMemo(() => cuts.reduce((a, c) => a + (c.qty || 0) * (c.askPrice || 0), 0), [cuts]);
  const avgAskKg = totalCutKg > 0 ? totalCash / totalCutKg : 0;

  // ---------- Display helpers ----------
  const originCountry = catalog.getCountryById(logistics.originCountryId);
  const originPorts = logistics.originCountryId
    ? catalog.getPortsByCountryId(logistics.originCountryId).filter((p) => logistics.originPortIds.includes(p.id))
    : [];
  const originLabel = originCountry
    ? `${originCountry.flag_emoji ?? "🏳️"} ${
        originPorts.length > 0 ? originPorts.map((p) => p.name).join(", ") : originCountry.english_name
      }`
    : "—";

  const destinationFlags = logistics.destinations.map((d) => d.flag).filter(Boolean).join(" ") || "🏳️";
  const totalDestPorts = logistics.destinations.reduce((a, d) => a + d.selectedPortIds.length, 0);
  const destLabel = `${destinationFlags} ${totalDestPorts} ${totalDestPorts === 1 ? "port" : "ports"}`;

  const incotermLabel = logistics.incoterms.join("/") || "—";
  const containerLabel = `${logistics.fclCount}× ${logistics.containerSize} · ${logistics.temperature} · ${incotermLabel}`;

  const logisticsSubtitle = `${logistics.destinations.length} markets · ${totalDestPorts} ports · ${logistics.fclCount}× ${logistics.containerSize}`;

  // Customer count for distribution row
  const { customers } = useMyCustomers();
  const customerCount = customers?.length ?? 0;

  // ---------- Submit ----------
  const handleSubmit = async (status: "draft" | "active") => {
    if (submitting) return;
    if (!supplierContextId) {
      toast.error(tk("submit.noCompany", "No supplier company linked to your account."));
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        logistics,
        cuts,
        paymentTerms,
        distribution,
        negotiationMode,
        negotiationDial,
        cutRegion,
        requestId: mode === "fromRequest" ? requestId : null,
      };
      const ctx = {
        supplierId: supplierContextId,
        supplierName: supplierContextName,
        officeId: null,
        status,
      };
      const res =
        mode === "edit" && editId
          ? await updateOfferV2(editId, input, ctx)
          : await submitOfferV2(input, ctx);
      const label = formatOfferNumber(res.offerNumber);
      toast.success(
        mode === "edit"
          ? tk("submit.successUpdate", "Offer {{n}} updated", { n: label })
          : status === "draft"
            ? tk("submit.successDraft", "Draft saved — {{n}}", { n: label })
            : tk("submit.successPublish", "Offer {{n}} published successfully!", { n: label }),
      );
      navigate(adminMode ? "/admin/offers" : "/supplier/offers");
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const knownKeys = new Set([
        "missingOrigin","missingDestinations","missingIncoterm","missingCuts",
        "missingCutResolution","invalidCutNumbers","floorGtAsk","missingPayment","missingDistribution",
        "offerHasActiveBids",
      ]);
      const msg = knownKeys.has(raw)
        ? tk(`submit.${raw}`, raw)
        : tk("submit.errorGeneric", "Failed to save offer: {{err}}", { err: raw });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "edit"
      ? tk("mobile.title.edit", "Edit offer")
      : mode === "clone"
        ? tk("mobile.title.clone", "Clone offer")
        : tk("mobile.title.create", "New offer");

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f5f5f5]">
      {/* HEADER */}
      <header
        className="sticky top-0 z-30 border-b bg-background"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-md text-foreground active:bg-muted"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1 text-center text-[11px] text-muted-foreground">
            Home · {mode === "edit" ? "Edit offer" : "New offer"}
          </div>
          <button
            type="button"
            onClick={() => setQuickFillOpen(true)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-primary-foreground shadow-sm active:opacity-80"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)",
            }}
            aria-label="AI quick fill"
          >
            <Sparkles size={18} />
          </button>
        </div>
        <h1 className="px-3.5 pb-2 text-[20px] font-semibold leading-tight text-foreground">{title}</h1>
      </header>

      {/* STATUS BAR */}
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+92px)] z-20 border-b bg-background px-3.5 py-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
              isComplete ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fff4e0] text-[#a85b00]",
            )}
          >
            {isComplete ? "✓" : "●"}{" "}
            {isComplete
              ? tk("mobile.status.complete", "Complete · 100%")
              : tk("mobile.status.inProgress", "In progress · {{pct}}%", { pct: completion })}
          </span>
          <div className="inline-flex rounded-full bg-muted p-0.5">
            {(["kg", "lbs"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={cn(
                  "min-w-[44px] rounded-full px-3 py-1 text-xs font-semibold",
                  unit === u ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* BODY */}
      <main className="flex-1 space-y-3 px-3.5 pb-[120px] pt-3">
        {/* Card A — Markets & freight */}
        <button
          type="button"
          onClick={() => setLogisticsSheetOpen(true)}
          className="w-full rounded-xl border bg-card p-3.5 text-left active:bg-muted/30"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-primary" />
              <span className="text-sm font-semibold">
                {tk("mobile.card.markets", "Markets & freight")}
              </span>
            </div>
            <span className="text-xs font-medium text-primary">
              {tk("mobile.edit", "Edit")} ›
            </span>
          </div>
          <div className="space-y-2 border-t pt-2.5">
            <KV label="FROM" value={originLabel} />
            <KV label="TO" value={destLabel} />
            <KV label="CONTAINER" value={containerLabel} />
          </div>
        </button>

        {/* Card B — Container fill */}
        <div className="rounded-xl border bg-card p-3">
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="font-medium">{tk("mobile.card.fill", "Container fill")}</span>
            <span className={cn("font-semibold", capacityPct >= 100 ? "text-[#15803d]" : "text-foreground")}>
              {fmtQty(totalCutKg, unit)} / {fmtQty(capacityKg, unit)} ·{" "}
              {capacityPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                capacityPct >= 100 ? "bg-[#15803d]" : "bg-amber-500",
              )}
              style={{ width: `${Math.min(100, capacityPct)}%` }}
            />
          </div>
        </div>

        {/* Card C — Products & pricing header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Beef size={18} className="text-primary" />
            <span className="text-base font-semibold">
              {tk("mobile.card.products", "Products & pricing")}
            </span>
            <span className="text-xs text-muted-foreground">
              {cuts.length} {cuts.length === 1 ? "cut" : "cuts"}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-primary text-primary"
            onClick={() => setCutSheet({ open: true, mode: "new", cutId: null })}
          >
            <Plus size={14} className="mr-1" />
            {tk("mobile.addCut", "Add cut")}
          </Button>
        </div>

        {/* Cut nomenclature region toggle (US suppliers only) */}
        {showRegionToggle && (
          <div className="inline-flex rounded-lg bg-muted p-0.5 self-start">
            {(["global", "us"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => requestRegionChange(r)}
                className={cn(
                  "min-h-[44px] rounded-md px-4 text-sm font-medium",
                  cutRegion === r ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                )}
              >
                {r === "global"
                  ? tk("cutsTable.regionGlobal", "🌐 Global")
                  : tk("cutsTable.regionUs", "🇺🇸 US (IMPS/NAMP)")}
              </button>
            ))}
          </div>
        )}

        {/* Cards D[] — Cut cards */}
        {cuts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
            {tk("mobile.noCuts", "No cuts yet — tap + Add cut to start.")}
          </div>
        ) : (
          cuts.map((c, idx) => {
            const cutKey = c.cutId ?? `idx-${idx}`;
            const lineTotal = (c.qty || 0) * (c.askPrice || 0);
            const specs: string[] = [];
            if (c.spec) specs.push(c.spec);
            if (c.packing) specs.push(c.packing);
            if (c.plantNumber) specs.push(`#${c.plantNumber}`);
            return (
              <button
                key={cutKey + idx}
                type="button"
                onClick={() => setCutSheet({ open: true, mode: "edit", cutId: cutKey })}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left active:bg-muted/30"
              >
                <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-2xl">
                  🥩
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {c.cutName || tk("mobile.unnamedCut", "Unnamed cut")}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {c.brandName || ""}
                      {c.brandName && c.protein ? " · " : ""}
                      {c.protein || ""}
                    </span>
                  </div>
                  {specs.length > 0 && (
                    <div className="mb-1 flex flex-wrap gap-1">
                      {specs.map((s, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const meta = formatCutMeta(c, t);
                    return meta.length > 0 ? (
                      <div className="mb-1 text-[11px] text-muted-foreground">
                        {meta.join(" · ")}
                      </div>
                    ) : null;
                  })()}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {fmtQty(c.qty || 0, unit)} · {fmtPricePerUnit(c.askPrice || 0, unit)}
                    </span>
                    <span className="font-bold text-primary">
                      ${lineTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </button>
            );
          })
        )}

        {/* Card E — Summary */}
        {cuts.length > 0 && (
          <div className="space-y-2 rounded-xl border bg-card p-3.5">
            <KV label={tk("mobile.summary.totalQty", "Total qty")} value={fmtQty(totalCutKg, unit)} bold />
            <KV
              label={tk("mobile.summary.avgAsk", "Avg ask")}
              value={fmtPricePerUnit(avgAskKg, unit)}
              bold
            />
            <KV
              label={tk("mobile.summary.askTotal", "Asking total")}
              value={`$${totalCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              accent
            />
          </div>
        )}

        {/* Card F — Payment terms */}
        <div className="space-y-3 rounded-xl border bg-card p-3.5">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-primary" />
            <span className="text-sm font-semibold">
              {tk("mobile.card.payment", "Payment terms")}
            </span>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {tk("mobile.payment.terms", "Terms")}
            </label>
            <PaymentTermsCard
              value={paymentTerms}
              onChange={setPaymentTerms}
              supplierContextId={supplierContextId}
              mode={mode}
              showChrome={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {tk("mobile.payment.shipmentReady", "Shipment ready")}
            </label>
            <ShipmentReadyPicker
              size="compact"
              value={logistics.shipmentReady}
              onChange={(v) => setLogistics((p) => ({ ...p, shipmentReady: v }))}
            />
          </div>
        </div>

        {/* Card G — Distribution */}
        <div className="space-y-3 rounded-xl border bg-card p-3.5">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-primary" />
            <span className="text-sm font-semibold">
              {tk("mobile.card.distribution", "Offer distribution")}
            </span>
          </div>
          <DistributionRow
            checked={distribution.marketplace}
            onCheckedChange={(v) => setDistribution((p) => ({ ...p, marketplace: v }))}
            title={tk("mobile.dist.marketplace", "Publish to Marketplace")}
            subtitle={tk("mobile.dist.marketplaceSub", "Visible to all buyers")}
          />
          <DistributionRow
            checked={distribution.allCustomers}
            onCheckedChange={(v) => setDistribution((p) => ({ ...p, allCustomers: v }))}
            title={tk("mobile.dist.allCustomers", "Send to all my customers")}
            subtitle={tk("mobile.dist.allCustomersSub", "Notify {{n}} buyers", { n: customerCount })}
          />
          <DistributionRow
            checked={distribution.specificCustomerIds.length > 0}
            onCheckedChange={(v) =>
              setDistribution((p) => ({
                ...p,
                specificCustomerIds: v ? p.specificCustomerIds : [],
              }))
            }
            title={tk("mobile.dist.specific", "Specific customers")}
            subtitle={tk("mobile.dist.specificSub", "{{n}} selected", {
              n: distribution.specificCustomerIds.length,
            })}
          />
        </div>

        {/* Card H — Notes */}
        <div className="rounded-xl border bg-card p-3.5">
          <Textarea
            className="min-h-[96px] text-base"
            placeholder={tk("mobile.notesPlaceholder", "Optional notes about this offer")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </main>

      {/* FOOTER */}
      <footer
        className="sticky bottom-0 z-30 border-t bg-background px-3.5 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            className="h-12 flex-1 text-base"
            disabled={submitting}
            onClick={() => handleSubmit("draft")}
          >
            {tk("mobile.draft", "Draft")}
          </Button>
          <Button
            className="h-12 flex-1 bg-primary text-base text-primary-foreground"
            disabled={submitting || !isComplete}
            onClick={() => handleSubmit("active")}
          >
            {tk("mobile.publish", "Publish offer")} →
          </Button>
        </div>
      </footer>

      {/* Modals/Sheets */}
      <AiQuickFillModal
        open={quickFillOpen}
        onOpenChange={setQuickFillOpen}
        supplierId={supplierContextId}
        onApply={applyAiPrefill}
      />
      <LogisticsSheetMobile
        open={logisticsSheetOpen}
        onOpenChange={setLogisticsSheetOpen}
        subtitle={logisticsSubtitle}
        value={logistics}
        onSave={(next) => setLogistics(next)}
      />
      <CutSheetMobile
        open={cutSheet.open}
        onOpenChange={(b) => setCutSheet((p) => ({ ...p, open: b }))}
        mode={cutSheet.mode}
        value={
          cutSheet.mode === "edit"
            ? cuts.find((c, i) => (c.cutId ?? `idx-${i}`) === cutSheet.cutId)
            : undefined
        }
        cutRegion={cutRegion}
        unit={unit}
        supplierContextId={supplierContextId}
        onSave={(cut) => {
          if (cutSheet.mode === "new") {
            setCuts((prev) => [...prev, cut]);
          } else {
            setCuts((prev) =>
              prev.map((c, i) => ((c.cutId ?? `idx-${i}`) === cutSheet.cutId ? cut : c)),
            );
          }
        }}
        onDelete={
          cutSheet.mode === "edit"
            ? () =>
                setCuts((prev) =>
                  prev.filter((c, i) => (c.cutId ?? `idx-${i}`) !== cutSheet.cutId),
                )
            : undefined
        }
      />
      <AlertDialog open={pendingRegion !== null} onOpenChange={(o) => { if (!o) setPendingRegion(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tk("cutsTable.regionSwitchTitle", "Switch cut catalog?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tk(
                "cutsTable.regionSwitchDesc",
                "Each offer uses cuts from a single catalog (Global OR US IMPS/NAMP). Switching to {{target}} will remove the {{n}} cut(s) you've already added. Continue?",
                {
                  target: pendingRegion === "us" ? "US (IMPS/NAMP)" : "Global",
                  n: cuts.length,
                },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tk("cutsTable.regionSwitchCancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={confirmRegionChange}
            >
              {tk("cutsTable.regionSwitchConfirm", "Yes, switch and reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Small UI atoms ----------
function KV({ label, value, bold, accent }: { label: string; value: React.ReactNode; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right text-sm",
          (bold || accent) && "font-bold",
          accent && "text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function DistributionRow({
  checked,
  onCheckedChange,
  title,
  subtitle,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
    >
      <Checkbox checked={checked} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  );
}