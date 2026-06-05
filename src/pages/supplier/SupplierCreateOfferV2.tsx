import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { usePortsCatalog } from "@/hooks/usePortsCatalog";
import {
  REGIONS,
  INCOTERMS,
  CERTIFICATIONS,
  CONTAINER_SIZES,
  TEMPERATURES,
  COUNTRY_REGION,
  type Region,
  type Incoterm,
  type Certification,
  type ContainerSize,
  type Temperature,
} from "@/lib/offerOptions";
import { cn } from "@/lib/utils";
import { Search, X, Globe, MapPin, Box, FileBadge, Ship, Truck, Edit3, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { CutsTable } from "@/components/supplier/CreateOfferV2/CutsTable";
import { type CutRow } from "@/lib/cutRowTypes";
import { PaymentTermsCard } from "@/components/supplier/CreateOfferV2/PaymentTermsCard";
import { DistributionCard, type DistributionValue } from "@/components/supplier/CreateOfferV2/DistributionCard";
import { ActionBar } from "@/components/supplier/CreateOfferV2/ActionBar";
import { FinalReviewCard } from "@/components/supplier/CreateOfferV2/FinalReviewCard";
import { EngineSettingsModal } from "@/components/supplier/CreateOfferV2/EngineSettingsModal";
import { AiQuickFillModal } from "@/components/supplier/CreateOfferV2/AiQuickFillModal";
import { computeCompletion } from "@/lib/offerCompletion";
import { containerCapacityKg } from "@/lib/units";
import { useCompanyPlants } from "@/hooks/useCompanyPlants";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { Sparkles, Settings2 } from "lucide-react";
import type { NegotiationMode, NegotiationDial } from "@/components/offer/NegotiationHandlingControl";
import { submitOfferV2 } from "@/lib/offerSubmit";
import { updateOfferV2 } from "@/lib/offerSubmit";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatOfferNumber } from "@/lib/offerNumber";
import { useOfferForPrefill } from "@/hooks/useOfferForPrefill";
import { useBuyerRequestForPrefill } from "@/hooks/useBuyerRequestForPrefill";
import { EditModeWarningBanner } from "@/components/supplier/CreateOfferV2/EditModeWarningBanner";
import { Skeleton } from "@/components/ui/skeleton";

type Unit = "kg" | "lbs";
type DrawerFocus = "origin" | "destinations" | "container" | "freight";

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
  shipmentReady: string; // YYYY-MM
  sameFreightGlobal: boolean;
  globalFreight: string;
  globalInsurance: string;
  exwPickupLocation: string;
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
};

function Pill({ label, value, onClick, icon: Icon }: { label: string; value: React.ReactNode; onClick: () => void; icon: React.ElementType }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon size={16} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="truncate text-sm font-semibold text-foreground">{value}</span>
      </span>
    </button>
  );
}

function SectionPlaceholder({ title, hint, height = 160 }: { title: string; hint: string; height?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/20 text-center"
      style={{ minHeight: height }}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Chip({ active, onClick, children, disabled }: { active?: boolean; onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:bg-muted/60",
        disabled && "opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("inline-flex rounded-lg bg-muted p-0.5", disabled && "opacity-60")}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium",
            value === opt
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function SupplierCreateOfferV2() {
  const { t } = useTranslation();
  const catalog = usePortsCatalog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const cloneId = searchParams.get("clone");
  const requestId = searchParams.get("request_id");
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
  const prefilling = offerPrefillQuery.isLoading || requestPrefillQuery.isLoading;
  const activeNegotiations =
    mode === "edit" ? offerPrefillQuery.data?.activeNegotiations ?? 0 : 0;

  const [submitting, setSubmitting] = useState(false);

  const [unit, setUnit] = useState<Unit>("kg");
  const [logistics, setLogistics] = useState<LogisticsState>(EMPTY_LOGISTICS);

  // R3 — cuts state (in-memory only; persistence comes in R5)
  const [cuts, setCuts] = useState<CutRow[]>([]);
  const [cutRegion, setCutRegion] = useState<"global" | "us">("global");

  // R4 — payment + distribution state (in-memory only; persistence comes in R5)
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [distribution, setDistribution] = useState<DistributionValue>({
    marketplace: true,
    allCustomers: false,
    specificCustomerIds: [],
  });

  // R5.A — engine + quick-fill + review state
  const [negotiationMode, setNegotiationMode] = useState<NegotiationMode>("manual");
  const [negotiationDial, setNegotiationDial] = useState<NegotiationDial>("balanced");
  const [engineModalOpen, setEngineModalOpen] = useState(false);
  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const { company } = useCurrentCompany();
  const { plants } = useCompanyPlants(company?.id);

  // Prefill from offer (Edit/Clone)
  const [prefillApplied, setPrefillApplied] = useState(false);
  useEffect(() => {
    if (prefillApplied) return;
    const data = offerPrefillQuery.data?.prefill;
    if (!data) return;
    setLogistics({
      originCountryId: data.originCountryId,
      originPortId: data.originPortId,
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
    });
    setCuts(data.cuts);
    setCutRegion(data.cutRegion);
    setPaymentTerms(data.paymentTerms);
    setDistribution(data.distribution);
    setNegotiationMode(data.negotiationMode);
    setNegotiationDial(data.negotiationDial);
    setPrefillApplied(true);
  }, [offerPrefillQuery.data, prefillApplied]);

  // Prefill from buyer request
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
  }, [requestPrefillQuery.data, prefillApplied]);

  const handleSubmit = async (status: "draft" | "active") => {
    if (submitting) return;
    if (!company?.id) {
      toast.error(t("supplier.createOfferV2.submit.noCompany", { defaultValue: "No supplier company linked to your account." }) as string);
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
        supplierId: company.id,
        supplierName: company.name || "Mundus Supplier",
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
          ? (t("supplier.createOfferV2.submit.successUpdate", { defaultValue: "Offer {{n}} updated", n: label }) as string)
          : status === "draft"
            ? (t("supplier.createOfferV2.submit.successDraft", { defaultValue: "Draft saved — {{n}}", n: label }) as string)
            : (t("supplier.createOfferV2.submit.successPublish", { defaultValue: "Offer {{n}} published successfully!", n: label }) as string),
      );
      navigate("/supplier/offers");
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const knownKeys = new Set([
        "missingOrigin","missingDestinations","missingIncoterm","missingCuts",
        "missingCutResolution","invalidCutNumbers","floorGtAsk","missingPayment","missingDistribution",
      ]);
      const msg = knownKeys.has(raw)
        ? (t(`supplier.createOfferV2.submit.${raw}`, { defaultValue: raw }) as string)
        : (t("supplier.createOfferV2.submit.errorGeneric", { defaultValue: "Failed to save offer: {{err}}", err: raw }) as string);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDraft, setDrawerDraft] = useState<LogisticsState>(EMPTY_LOGISTICS);
  const [drawerFocus, setDrawerFocus] = useState<DrawerFocus>("origin");
  const [destSearch, setDestSearch] = useState("");
  const [destRegion, setDestRegion] = useState<Region>("All");

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

  // Capacity % for review block
  const totalCutKg = useMemo(() => cuts.reduce((a, c) => a + (c.qty || 0), 0), [cuts]);
  const capacityPct = useMemo(() => {
    const cap = containerCapacityKg(logistics.containerSize) * Math.max(1, logistics.fclCount);
    return cap > 0 ? (totalCutKg / cap) * 100 : 0;
  }, [totalCutKg, logistics.containerSize, logistics.fclCount]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tk = (key: string, fallback: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.${key}`, { defaultValue: fallback, ...(opts ?? {}) }) as string;

  // No lock: replicate legacy wizard behavior (free toggle anytime).
  // Qty/prices are stored in kg and only converted at display time.
  const setUnitChoice = (next: Unit) => setUnit(next);

  const openDrawer = (focus: DrawerFocus) => {
    setDrawerDraft(logistics);
    setDrawerFocus(focus);
    setDrawerOpen(true);
  };

  const saveDrawer = () => {
    setLogistics(drawerDraft);
    setDrawerOpen(false);
  };

  // Top strip computed values
  const originPort = logistics.originPortId ? catalog.ports.find((p) => p.id === logistics.originPortId) : null;
  const originCountry = logistics.originCountryId ? catalog.getCountryById(logistics.originCountryId) : null;

  const destPortCount = logistics.destinations.reduce((acc, d) => acc + d.selectedPortIds.length, 0);
  const totalFreight = useMemo(() => {
    if (logistics.sameFreightGlobal) {
      const v = parseFloat(logistics.globalFreight) || 0;
      return v * destPortCount;
    }
    let s = 0;
    for (const d of logistics.destinations) {
      if (d.freight.mode === "same") {
        s += (parseFloat(d.freight.same) || 0) * d.selectedPortIds.length;
      } else {
        for (const pid of d.selectedPortIds) {
          s += parseFloat(d.freight.perPort[pid] ?? "") || 0;
        }
      }
    }
    return s;
  }, [logistics, destPortCount]);

  const totalInsurance = useMemo(() => {
    if (!logistics.incoterms.includes("CIF")) return 0;
    if (logistics.sameFreightGlobal) {
      const v = parseFloat(logistics.globalInsurance) || 0;
      return v * destPortCount;
    }
    let s = 0;
    for (const d of logistics.destinations) {
      if (d.insurance.mode === "same") {
        s += (parseFloat(d.insurance.same) || 0) * d.selectedPortIds.length;
      } else {
        for (const pid of d.selectedPortIds) {
          s += parseFloat(d.insurance.perPort[pid] ?? "") || 0;
        }
      }
    }
    return s;
  }, [logistics, destPortCount]);

  // Drawer destination list (filtered)
  const drawerCountriesFiltered = useMemo(() => {
    const q = destSearch.trim().toLowerCase();
    return catalog.countries.filter((c) => {
      if (destRegion !== "All") {
        const r = c.iso_code ? COUNTRY_REGION[c.iso_code.toUpperCase()] : null;
        if (r !== destRegion) return false;
      }
      if (q && !c.english_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog.countries, destSearch, destRegion]);

  const draftPortsForCountry = (countryId: string) => catalog.getPortsByCountryId(countryId);

  const toggleDestination = (countryId: string) => {
    setDrawerDraft((prev) => {
      const exists = prev.destinations.find((d) => d.countryId === countryId);
      if (exists) {
        return { ...prev, destinations: prev.destinations.filter((d) => d.countryId !== countryId) };
      }
      const c = catalog.getCountryById(countryId);
      if (!c) return prev;
      return {
        ...prev,
        destinations: [
          ...prev.destinations,
          {
            countryId,
            iso: c.iso_code ?? "",
            name: c.english_name,
            flag: c.flag_emoji ?? "🏳️",
            selectedPortIds: [],
            freight: { mode: "same", same: "" },
            insurance: { mode: "same", same: "" },
          },
        ],
      };
    });
  };

  const togglePortInDest = (countryId: string, portId: string) => {
    setDrawerDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) => {
        if (d.countryId !== countryId) return d;
        const has = d.selectedPortIds.includes(portId);
        return { ...d, selectedPortIds: has ? d.selectedPortIds.filter((p) => p !== portId) : [...d.selectedPortIds, portId] };
      }),
    }));
  };

  const setDestFreightMode = (countryId: string, mode: "same" | "perPort") => {
    setDrawerDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) => {
        if (d.countryId !== countryId) return d;
        if (d.freight.mode === mode) return d;
        // preserve values: keep both shapes side by side
        if (mode === "same") return { ...d, freight: { mode: "same", same: d.freight.mode === "same" ? d.freight.same : "" } };
        return { ...d, freight: { mode: "perPort", perPort: d.freight.mode === "perPort" ? d.freight.perPort : {} } };
      }),
    }));
  };

  const setDestSameFreight = (countryId: string, value: string) => {
    setDrawerDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) =>
        d.countryId === countryId && d.freight.mode === "same"
          ? { ...d, freight: { mode: "same", same: value } }
          : d,
      ),
    }));
  };

  const setDestPerPortFreight = (countryId: string, portId: string, value: string) => {
    setDrawerDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) => {
        if (d.countryId !== countryId || d.freight.mode !== "perPort") return d;
        return { ...d, freight: { mode: "perPort", perPort: { ...d.freight.perPort, [portId]: value } } };
      }),
    }));
  };

  const setDestSameInsurance = (countryId: string, value: string) => {
    setDrawerDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) => {
        if (d.countryId !== countryId) return d;
        if (d.insurance.mode === "same") return { ...d, insurance: { mode: "same", same: value } };
        return { ...d, insurance: { mode: "same", same: value } };
      }),
    }));
  };
  const setDestPerPortInsurance = (countryId: string, portId: string, value: string) => {
    setDrawerDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) => {
        if (d.countryId !== countryId) return d;
        const cur = d.insurance.mode === "perPort" ? d.insurance.perPort : {};
        return { ...d, insurance: { mode: "perPort", perPort: { ...cur, [portId]: value } } };
      }),
    }));
  };

  const cifEnabled = drawerDraft.incoterms.includes("CIF");

  const draftIncotermsText = drawerDraft.incoterms.join(" · ") || "—";
  const draftDestPortCount = drawerDraft.destinations.reduce((a, d) => a + d.selectedPortIds.length, 0);

  return (
    <>
      <Crumbs
        items={[
          { label: t("shell.nav.home"), to: "/supplier" },
          { label: tk("title", "New offer") },
        ]}
      />

      <PageTitle
        title={
          mode === "edit" && offerPrefillQuery.data?.prefill
            ? tk("editMode.title", "Edit offer {{n}}", {
                n: formatOfferNumber(offerPrefillQuery.data.prefill.offerNumber),
              })
            : mode === "clone" && offerPrefillQuery.data?.prefill
              ? tk("cloneMode.title", "New offer cloned from {{n}}", {
                  n: formatOfferNumber(offerPrefillQuery.data.prefill.offerNumber),
                })
              : mode === "fromRequest" && requestPrefillQuery.data?.requestNumber
                ? tk("fromRequestMode.title", "New offer from request #{{n}}", {
                    n: requestPrefillQuery.data.requestNumber,
                  })
                : tk("title", "New offer")
        }
        subtitle={tk("subtitle", "One screen · click any pill to edit")}
        right={
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled
              title={tk("livePreviewComingSoon", "Coming soon")}
              className="cursor-not-allowed rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground opacity-50"
            >
              {tk("livePreview", "Live preview")}
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickFillOpen(true)}
            >
              <Sparkles size={14} className="mr-1" />
              {tk("quickFill.openButton", "AI Quick-fill")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEngineModalOpen(true)}
            >
              <Settings2 size={14} className="mr-1" />
              {tk("engine.openButton", "Engine")}
            </Button>
            <div className="inline-flex rounded-full bg-muted p-0.5">
              {(["kg", "lbs"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnitChoice(u)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                completion >= 100 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800",
              )}
            >
              {completion >= 100
                ? tk("readyToPublish", "Ready to publish")
                : tk("percentComplete", "{{n}}% complete", { n: completion })}
            </span>
          </div>
        }
      />

      {mode === "edit" && activeNegotiations > 0 && (
        <EditModeWarningBanner activeNegotiations={activeNegotiations} />
      )}

      {prefilling ? (
        <div className="mt-4 flex flex-col gap-4" aria-busy="true" aria-label={tk("loading.prefill", "Loading offer data…")}>
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
      <>
      {/* Top strip */}
      <div className="mt-4 flex flex-wrap items-stretch gap-2 rounded-xl border border-border bg-card p-2">
        <Pill
          icon={Ship}
          label={tk("strip.from", "From")}
          value={
            originPort && originCountry
              ? `${originCountry.flag_emoji ?? ""} ${originPort.name}`
              : tk("strip.empty", "—")
          }
          onClick={() => openDrawer("origin")}
        />
        <Pill
          icon={MapPin}
          label={tk("strip.toCountries", "To countries")}
          value={
            logistics.destinations.length > 0
              ? tk("strip.countriesPortsSummary", "{{c}} countries · {{p}} ports", {
                  c: logistics.destinations.length,
                  p: destPortCount,
                })
              : tk("strip.empty", "—")
          }
          onClick={() => openDrawer("destinations")}
        />
        <Pill
          icon={Box}
          label={tk("strip.container", "Container")}
          value={`${logistics.fclCount} × ${logistics.containerSize} · ${tk(`temp.${logistics.temperature}`, logistics.temperature)}`}
          onClick={() => openDrawer("container")}
        />
        <Pill
          icon={Truck}
          label={tk("strip.incoterm", "Incoterm")}
          value={logistics.incoterms.length > 0 ? logistics.incoterms.join(" · ") : tk("strip.empty", "—")}
          onClick={() => openDrawer("container")}
        />
        <Pill
          icon={FileBadge}
          label={tk("strip.certifications", "Certifications")}
          value={logistics.certifications.length > 0 ? logistics.certifications.join(" · ") : tk("strip.empty", "—")}
          onClick={() => openDrawer("container")}
        />
        <Pill
          icon={Globe}
          label={tk("strip.freight", "Freight")}
          value={
            totalFreight > 0
              ? `US$ ${totalFreight.toLocaleString()}`
              : tk("strip.setFreight", "Set freight")
          }
          onClick={() => openDrawer("freight")}
        />
        <Button
          type="button"
          onClick={() => openDrawer("origin")}
          className="self-stretch"
        >
          <Edit3 size={14} className="mr-1" />
          {tk("strip.editLogistics", "Edit logistics")}
        </Button>
      </div>

      {/* Placeholders for R3-R5 */}
      <div className="mt-6 flex flex-col gap-4">
        <div id="v2-section-cuts">
        <CutsTable
          cuts={cuts}
          setCuts={setCuts}
          unit={unit}
          containerSize={logistics.containerSize}
          cutRegion={cutRegion}
          setCutRegion={setCutRegion}
        />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div id="v2-section-payment">
            <PaymentTermsCard value={paymentTerms} onChange={setPaymentTerms} />
          </div>
          <div id="v2-section-distribution">
            <DistributionCard value={distribution} onChange={setDistribution} />
          </div>
        </div>

        <FinalReviewCard
          completion={completion}
          logistics={{
            originLabel:
              originPort && originCountry
                ? `${originCountry.flag_emoji ?? ""} ${originPort.name}`
                : "",
            destCountries: logistics.destinations.length,
            destPorts: destPortCount,
            freightTotal: totalFreight,
            incoterms: logistics.incoterms,
            insuranceTotal: totalInsurance,
            exwPickup:
              logistics.incoterms.includes("EXW") ? logistics.exwPickupLocation : "",
          }}
          cuts={cuts}
          capacityPct={capacityPct}
          paymentTerms={paymentTerms}
          distribution={{
            marketplace: distribution.marketplace,
            allCustomers: distribution.allCustomers,
            specificCount: distribution.specificCustomerIds.length,
          }}
          onEditLogistics={() => openDrawer("origin")}
          onEditCuts={() => scrollTo("v2-section-cuts")}
          onEditPayment={() => scrollTo("v2-section-payment")}
          onEditDistribution={() => scrollTo("v2-section-distribution")}
        />
      </div>

      <ActionBar
        completion={completion}
        submitting={submitting}
        onSaveDraft={() => handleSubmit("draft")}
        onPublish={() => handleSubmit("active")}
        mode={mode}
      />
      </>
      )}

      <EngineSettingsModal
        open={engineModalOpen}
        onOpenChange={setEngineModalOpen}
        mode={negotiationMode}
        dial={negotiationDial}
        onChange={(m, d) => {
          setNegotiationMode(m);
          setNegotiationDial(d);
        }}
      />
      <AiQuickFillModal open={quickFillOpen} onOpenChange={setQuickFillOpen} />

      {/* Logistics Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
          <SheetHeader className="border-b border-border p-5">
            <SheetTitle>{tk("drawer.title", "Edit logistics")}</SheetTitle>
            <SheetDescription>
              {tk("drawer.subtitle", "Origin, destinations, container & items — used to compute freight")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {catalog.loading && (
              <div className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {tk("drawer.loading", "Loading countries & ports…")}
              </div>
            )}

            {/* 1. Origin */}
            <DrawerSection number={1} title={tk("drawer.s1.title", "Origin")} focused={drawerFocus === "origin"}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {tk("drawer.s1.country", "Country")}
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-card px-2 py-2 text-sm"
                    value={drawerDraft.originCountryId ?? ""}
                    onChange={(e) =>
                      setDrawerDraft((p) => ({ ...p, originCountryId: e.target.value || null, originPortId: null }))
                    }
                  >
                    <option value="">{tk("drawer.s1.selectCountry", "Select…")}</option>
                    {catalog.countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.flag_emoji ?? ""} {c.english_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {tk("drawer.s1.port", "Port")}
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-card px-2 py-2 text-sm"
                    value={drawerDraft.originPortId ?? ""}
                    disabled={!drawerDraft.originCountryId}
                    onChange={(e) => setDrawerDraft((p) => ({ ...p, originPortId: e.target.value || null }))}
                  >
                    <option value="">{tk("drawer.s1.selectPort", "Select…")}</option>
                    {draftPortsForCountry(drawerDraft.originCountryId ?? "").map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </DrawerSection>

            {/* 2. Destinations */}
            <DrawerSection number={2} title={tk("drawer.s2.title", "Destinations")} focused={drawerFocus === "destinations"}>
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {tk("drawer.s2.summary", "{{c}} countries · {{p}} ports", {
                    c: drawerDraft.destinations.length,
                    p: draftDestPortCount,
                  })}
                </span>
              </div>
              <div className="relative mb-2">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder={tk("drawer.s2.search", "Search countries…")}
                  value={destSearch}
                  onChange={(e) => setDestSearch(e.target.value)}
                />
              </div>
              <div className="mb-3 flex flex-wrap gap-1">
                {REGIONS.map((r) => (
                  <Chip key={r} active={destRegion === r} onClick={() => setDestRegion(r)}>
                    {tk(`drawer.s2.region.${r}`, r)}
                  </Chip>
                ))}
              </div>
              <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
                {drawerCountriesFiltered.map((c) => {
                  const selected = drawerDraft.destinations.some((d) => d.countryId === c.id);
                  const portCount = catalog.getPortsByCountryId(c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleDestination(c.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-card hover:bg-muted",
                      )}
                    >
                      <span>{c.flag_emoji ?? "🏳️"}</span>
                      <span className="flex-1 truncate font-medium">{c.english_name}</span>
                      <span className="text-[10px] text-muted-foreground">{portCount}</span>
                    </button>
                  );
                })}
                {drawerCountriesFiltered.length === 0 && (
                  <div className="col-span-2 py-4 text-center text-xs text-muted-foreground">
                    {tk("drawer.s2.empty", "No countries match.")}
                  </div>
                )}
              </div>
            </DrawerSection>

            {/* 3. Same-freight global toggle */}
            <DrawerSection number={3} title={tk("drawer.s3.title", "Freight setup")} focused={drawerFocus === "freight"}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={drawerDraft.sameFreightGlobal}
                  onChange={(e) => setDrawerDraft((p) => ({ ...p, sameFreightGlobal: e.target.checked }))}
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    🌐 {tk("drawer.s3.toggleTitle", "Same freight for all markets and ports")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tk("drawer.s3.toggleHint", "Apply one freight cost across every selected port")}
                  </div>
                </div>
              </label>
              {drawerDraft.sameFreightGlobal && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/20 p-3">
                  <span className="text-xs text-muted-foreground">
                    {tk("drawer.s3.globalFreightLabel", "Freight per {{size}} FCL · applies to {{c}} countries & {{p}} ports", {
                      size: drawerDraft.containerSize,
                      c: drawerDraft.destinations.length,
                      p: draftDestPortCount,
                    })}
                  </span>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">US$</span>
                      <Input
                        type="number"
                        className="w-28"
                        value={drawerDraft.globalFreight}
                        onChange={(e) => setDrawerDraft((p) => ({ ...p, globalFreight: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {tk("drawer.s3.insurance", "Insurance")}
                      </span>
                      <Input
                        type="number"
                        className="w-24"
                        disabled={!cifEnabled}
                        placeholder={cifEnabled ? "0" : "N/A"}
                        value={drawerDraft.globalInsurance}
                        onChange={(e) => setDrawerDraft((p) => ({ ...p, globalInsurance: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </DrawerSection>

            {/* 4. Per-country freight cards */}
            {!drawerDraft.sameFreightGlobal && drawerDraft.destinations.length > 0 && (
              <DrawerSection number={4} title={tk("drawer.s4.title", "Per-country freight")}>
                <div className="flex flex-col gap-3">
                  {drawerDraft.destinations.map((d) => {
                    const allPorts = catalog.getPortsByCountryId(d.countryId);
                    return (
                      <div key={d.countryId} className="rounded-lg border border-border bg-card p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span>{d.flag}</span>
                          <span className="font-semibold text-sm">{d.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {tk("drawer.s4.portsSelected", "{{n}} of {{m}} ports", { n: d.selectedPortIds.length, m: allPorts.length })}
                          </span>
                          <button
                            type="button"
                            className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted"
                            onClick={() => toggleDestination(d.countryId)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {tk("drawer.s4.portsOfEntry", "Ports of entry")}
                        </div>
                        <div className="mb-3 flex flex-wrap gap-1">
                          {allPorts.length === 0 && (
                            <span className="text-xs text-muted-foreground">{tk("drawer.s4.noPorts", "No ports listed for this country.")}</span>
                          )}
                          {allPorts.map((p) => (
                            <Chip
                              key={p.id}
                              active={d.selectedPortIds.includes(p.id)}
                              onClick={() => togglePortInDest(d.countryId, p.id)}
                            >
                              {p.name}
                            </Chip>
                          ))}
                        </div>
                        {d.selectedPortIds.length >= 2 && (
                          <div className="mb-2 flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">{tk("drawer.s4.sameAllPorts", "Same freight all ports?")}</span>
                            <Segmented
                              options={["Yes", "No"] as const}
                              value={d.freight.mode === "same" ? "Yes" : "No"}
                              onChange={(v) => setDestFreightMode(d.countryId, v === "Yes" ? "same" : "perPort")}
                            />
                          </div>
                        )}
                        {d.freight.mode === "same" ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{tk("drawer.s4.freightUSD", "Freight USD")}</span>
                              <Input
                                type="number"
                                className="w-32"
                                value={d.freight.same}
                                onChange={(e) => setDestSameFreight(d.countryId, e.target.value)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{tk("drawer.s4.insuranceUSD", "Insurance USD")}</span>
                              <Input
                                type="number"
                                className="w-24"
                                disabled={!cifEnabled}
                                placeholder={cifEnabled ? "0" : "N/A"}
                                value={d.insurance.mode === "same" ? d.insurance.same : ""}
                                onChange={(e) => setDestSameInsurance(d.countryId, e.target.value)}
                              />
                            </div>
                          </div>
                        ) : d.freight.mode === "perPort" ? (
                          <div className="flex flex-col gap-2">
                            {d.selectedPortIds.map((pid) => {
                              const port = allPorts.find((p) => p.id === pid);
                              if (!port) return null;
                              const perPort = (d.freight as { mode: "perPort"; perPort: Record<string, string> }).perPort;
                              const perPortIns = d.insurance.mode === "perPort" ? d.insurance.perPort : {};
                              return (
                                <div key={pid} className="flex items-center gap-2 text-xs">
                                  <span className="flex-1 truncate">
                                    {port.name} ({port.code})
                                  </span>
                                  <span className="text-muted-foreground">USD</span>
                                  <Input
                                    type="number"
                                    className="w-28"
                                    value={perPort[pid] ?? ""}
                                    onChange={(e) => setDestPerPortFreight(d.countryId, pid, e.target.value)}
                                  />
                                  <span className="text-muted-foreground">
                                    {tk("drawer.s4.insShort", "Ins")}
                                  </span>
                                  <Input
                                    type="number"
                                    className="w-20"
                                    disabled={!cifEnabled}
                                    placeholder={cifEnabled ? "0" : "N/A"}
                                    value={perPortIns[pid] ?? ""}
                                    onChange={(e) => setDestPerPortInsurance(d.countryId, pid, e.target.value)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </DrawerSection>
            )}

            {/* 5. Container & Incoterm */}
            <DrawerSection number={5} title={tk("drawer.s5.title", "Container & Incoterm")} focused={drawerFocus === "container"}>
              <div className="flex flex-col gap-3">
                <Field label={tk("drawer.s5.containerSize", "Container size")}>
                  <Segmented
                    options={CONTAINER_SIZES}
                    value={drawerDraft.containerSize}
                    onChange={(v) => setDrawerDraft((p) => ({ ...p, containerSize: v }))}
                  />
                </Field>
                <Field label={tk("drawer.s5.fclCount", "Number of containers (FCL)")}>
                  <Input
                    type="number"
                    min={1}
                    className="w-32"
                    value={drawerDraft.fclCount}
                    onChange={(e) => setDrawerDraft((p) => ({ ...p, fclCount: Math.max(1, parseInt(e.target.value) || 1) }))}
                  />
                </Field>
                <Field label={tk("drawer.s5.temperature", "Temperature")}>
                  <Segmented
                    options={TEMPERATURES}
                    value={drawerDraft.temperature}
                    onChange={(v) => setDrawerDraft((p) => ({ ...p, temperature: v }))}
                  />
                </Field>
                <Field label={tk("drawer.s5.incoterms", "Incoterms")}>
                  <div className="flex flex-wrap gap-1">
                    {INCOTERMS.map((i) => (
                      <Chip
                        key={i}
                        active={drawerDraft.incoterms.includes(i)}
                        onClick={() =>
                          setDrawerDraft((p) => ({
                            ...p,
                            incoterms: p.incoterms.includes(i) ? p.incoterms.filter((x) => x !== i) : [...p.incoterms, i],
                          }))
                        }
                      >
                        {i}
                      </Chip>
                    ))}
                  </div>
                  {drawerDraft.incoterms.includes("EXW") && (
                    <div className="mt-2">
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {tk("drawer.s5.exwPickup", "EXW pickup location")}
                      </label>
                      <Input
                        placeholder={tk("drawer.s5.exwPickupPh", "City, state — where buyer collects")}
                        value={drawerDraft.exwPickupLocation}
                        onChange={(e) =>
                          setDrawerDraft((p) => ({ ...p, exwPickupLocation: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </Field>
                <Field label={tk("drawer.s5.certifications", "Slaughter certifications")}>
                  <div className="flex flex-wrap gap-1">
                    {CERTIFICATIONS.map((c) => (
                      <Chip
                        key={c}
                        active={drawerDraft.certifications.includes(c)}
                        onClick={() =>
                          setDrawerDraft((p) => ({
                            ...p,
                            certifications: p.certifications.includes(c)
                              ? p.certifications.filter((x) => x !== c)
                              : [...p.certifications, c],
                          }))
                        }
                      >
                        {c}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label={tk("drawer.s5.shipmentReady", "Shipment ready")}>
                  <Input
                    type="month"
                    className="w-48"
                    value={drawerDraft.shipmentReady}
                    onChange={(e) => setDrawerDraft((p) => ({ ...p, shipmentReady: e.target.value }))}
                  />
                </Field>
              </div>
            </DrawerSection>
          </div>

          <SheetFooter className="flex-row items-center justify-between gap-3 border-t border-border bg-muted/20 p-4 sm:flex-row sm:justify-between">
            <span className="text-xs text-muted-foreground">
              {tk("drawer.footer.summary", "{{c}} destinations · {{p}} ports · {{k}} FCL · {{i}}", {
                c: drawerDraft.destinations.length,
                p: draftDestPortCount,
                k: drawerDraft.fclCount,
                i: draftIncotermsText,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                {tk("drawer.footer.cancel", "Cancel")}
              </Button>
              <Button onClick={saveDrawer}>{tk("drawer.footer.save", "Save & search freight")}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DrawerSection({
  number,
  title,
  focused,
  children,
}: {
  number: number;
  title: string;
  focused?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "mb-5 rounded-lg border bg-card p-4 transition-colors",
        focused ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {number}
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
