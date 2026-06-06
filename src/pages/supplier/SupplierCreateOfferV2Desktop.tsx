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
import { Search, X, Globe, MapPin, Box, FileBadge, Ship, Truck, Edit3, Check, ChevronsUpDown, AlertTriangle, ChevronDown } from "lucide-react";
import { CutsTable } from "@/components/supplier/CreateOfferV2/CutsTable";
import { DerivedPricesPreview } from "@/components/supplier/CreateOfferV2/DerivedPricesPreview";
import { type CutRow } from "@/lib/cutRowTypes";
import { emptyCutRow } from "@/lib/cutRowTypes";
import { PaymentTermsCard } from "@/components/supplier/CreateOfferV2/PaymentTermsCard";
import { ShipmentReadyPicker } from "@/components/supplier/CreateOfferV2/ShipmentReadyPicker";
import { DistributionCard, type DistributionValue } from "@/components/supplier/CreateOfferV2/DistributionCard";
import { ActionBar } from "@/components/supplier/CreateOfferV2/ActionBar";
import { FinalReviewCard } from "@/components/supplier/CreateOfferV2/FinalReviewCard";
import { EngineSettingsModal } from "@/components/supplier/CreateOfferV2/EngineSettingsModal";
import { AiQuickFillModal } from "@/components/supplier/CreateOfferV2/AiQuickFillModal";
import { computeCompletion, sectionStatus, missingSections, type SectionStatus, type SectionKey } from "@/lib/offerCompletion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { containerCapacityKg } from "@/lib/units";
import { useCompanyPlants } from "@/hooks/useCompanyPlants";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import { supabase } from "@/integrations/supabase/client";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

function Pill({
  label, value, onClick, icon: Icon, status, tooltipContent,
}: {
  label: string;
  value: React.ReactNode;
  onClick: () => void;
  icon: React.ElementType;
  status?: "ok" | "partial" | "empty";
  tooltipContent?: React.ReactNode;
}) {
  const ring =
    status === "ok" ? "ring-1 ring-green-400/60"
    : status === "partial" ? "ring-1 ring-amber-400/60"
    : "";
  const dot =
    status === "ok" ? "bg-green-500"
    : status === "partial" ? "bg-amber-500"
    : "bg-muted-foreground/30";
  const btn = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50",
        ring,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon size={16} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {status && <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dot)} aria-hidden />}
          {label}
        </span>
        <span className="truncate text-sm font-semibold text-foreground">{value}</span>
      </span>
    </button>
  );
  if (!tooltipContent) return btn;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MissingTooltip({
  section, tk,
}: { section: SectionStatus; tk: (k: string, fb: string) => string }) {
  if (section.ok) return <span className="text-xs text-green-700">{tk("completion.allSet", "All set")}</span>;
  return (
    <div className="text-xs">
      <p className="font-semibold mb-1">{tk("completion.missingInSection", "Missing in this section:")}</p>
      <ul className="list-disc pl-4 space-y-0.5">
        {section.missingFields.map((k) => (
          <li key={k}>{tk(k, k.split(".").pop() ?? k)}</li>
        ))}
      </ul>
    </div>
  );
}

function MissingFieldsBanner({
  sections, tk, onJump,
}: {
  sections: SectionStatus[];
  tk: (k: string, fb: string) => string;
  onJump: (key: SectionKey) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const missing = sections.filter((s) => !s.ok);
  if (dismissed || missing.length === 0) return null;
  const totalFields = missing.reduce((a, s) => a + s.missingFields.length, 0);
  return (
    <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
      <div className="flex items-center gap-2 px-3 py-2">
        <AlertTriangle size={14} className="shrink-0" />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left text-xs font-medium"
        >
          {tk("completion.missingFieldsBanner", `${totalFields} fields missing to publish — see pills above`).replace("{{n}}", String(totalFields))}
        </button>
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs underline">
          {expanded ? tk("completion.collapse", "Hide") : tk("completion.expand", "Details")}
        </button>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="ml-1 opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
      {expanded && (
        <ul className="border-t border-amber-300/40 px-3 py-2 text-xs space-y-1.5">
          {missing.map((s) => (
            <li key={s.key}>
              <button type="button" onClick={() => onJump(s.key)} className="font-semibold underline-offset-2 hover:underline">
                {tk(s.labelKey, s.key)}
              </button>
              <span className="text-amber-900/80 dark:text-amber-200/80">
                {": "}{s.missingFields.map((k) => tk(k, k.split(".").pop() ?? k)).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
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

type TkFn = (key: string, fallback: string, opts?: Record<string, unknown>) => string;

function OriginPicker({
  countries,
  portsForCountry,
  countryId,
  onCountryChange,
  portIds,
  onPortIdsChange,
  incoterms,
  tk,
}: {
  countries: { id: string; english_name: string; flag_emoji: string | null }[];
  portsForCountry: { id: string; name: string; code: string }[];
  countryId: string | null;
  onCountryChange: (id: string | null) => void;
  portIds: string[];
  onPortIdsChange: (ids: string[]) => void;
  incoterms: string[];
  tk: TkFn;
}) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [portOpen, setPortOpen] = useState(false);
  const country = countryId ? countries.find((c) => c.id === countryId) ?? null : null;
  const singleOriginRequired =
    incoterms.includes("FOB") || incoterms.includes("EXW");
  const tooManyPorts = singleOriginRequired && portIds.length > 1;
  const noPort = portIds.length === 0;

  const togglePort = (id: string) => {
    if (portIds.includes(id)) onPortIdsChange(portIds.filter((p) => p !== id));
    else onPortIdsChange([...portIds, id]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {tk("drawer.s1.country", "Country")}
          </label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border bg-card px-2 py-2 text-sm"
              >
                <span className="truncate text-left">
                  {country
                    ? `${country.flag_emoji ?? ""} ${country.english_name}`
                    : tk("drawer.s1.selectCountry", "Select…")}
                </span>
                <ChevronsUpDown size={14} className="ml-2 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder={tk("logistics.country.placeholder", "Search countries…")} />
                <CommandList>
                  <CommandEmpty>{tk("logistics.country.empty", "No country found")}</CommandEmpty>
                  <CommandGroup>
                    {countries.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.english_name}
                        onSelect={() => {
                          onCountryChange(c.id);
                          setCountryOpen(false);
                        }}
                      >
                        <Check
                          size={14}
                          className={cn(
                            "mr-2",
                            country?.id === c.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="mr-2">{c.flag_emoji ?? ""}</span>
                        {c.english_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {tk("drawer.s1.port", "Port")}
          </label>
          <Popover open={portOpen} onOpenChange={(o) => countryId && setPortOpen(o)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!countryId}
                className="flex w-full items-center justify-between rounded-md border border-border bg-card px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="truncate text-left">
                  {!countryId
                    ? tk("logistics.port.selectCountryFirst", "Select origin country first")
                    : portIds.length === 0
                      ? tk("logistics.port.addPort", "Add port")
                      : tk("logistics.port.nSelected", "{{n}} port(s) selected", { n: portIds.length })}
                </span>
                <ChevronsUpDown size={14} className="ml-2 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder={tk("logistics.port.placeholder", "Search ports…")} />
                <CommandList>
                  <CommandEmpty>{tk("logistics.port.empty", "No port found")}</CommandEmpty>
                  <CommandGroup>
                    {portsForCountry.map((p) => {
                      const checked = portIds.includes(p.id);
                      return (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.code ?? ""}`}
                          onSelect={() => togglePort(p.id)}
                        >
                          <Check
                            size={14}
                            className={cn("mr-2", checked ? "opacity-100" : "opacity-0")}
                          />
                          {p.name} {p.code ? `(${p.code})` : ""}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {portIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {portIds.map((pid) => {
            const p = portsForCountry.find((x) => x.id === pid);
            if (!p) return null;
            return (
              <span
                key={pid}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
              >
                {p.name}
                {p.code ? ` (${p.code})` : ""}
                <button
                  type="button"
                  onClick={() => togglePort(pid)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {tooManyPorts && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {tk("logistics.warning.singlePortFobExw",
              "{{n}} origin ports selected, but FOB/EXW supports only 1. Remove extras to continue.",
              { n: portIds.length })}
          </span>
        </div>
      )}
      {!tooManyPorts && countryId && noPort && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {tk("logistics.warning.atLeastOnePort", "Select at least one origin port.")}
        </div>
      )}
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

export default function SupplierCreateOfferV2Desktop() {
  const { t } = useTranslation();
  const catalog = usePortsCatalog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const cloneId = searchParams.get("clone");
  // Accept V2 native param + legacy V1 aliases for cutover compatibility.
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
  const { isAdmin: isMundusAdmin } = useIsMundusAdmin();

  // Admin on-behalf: only honored for verified Mundus admins; non-admins
  // silently fall back to their own company.
  const adminMode = !!asCompanyParam && isMundusAdmin;
  const [adminCompany, setAdminCompany] = useState<
    { id: string; name: string; country: string | null } | null
  >(null);
  useEffect(() => {
    if (!adminMode || !asCompanyParam) {
      setAdminCompany(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, country")
        .eq("id", asCompanyParam)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setAdminCompany({
          id: data.id as string,
          name: (data.name as string) ?? "Supplier",
          country: ((data as { country?: string | null }).country ?? null) as string | null,
        });
      }
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

  // R6.A — apply parsed AI payload onto the V2 form state.
  const applyAiPrefill = (p: import("@/hooks/useAiParseOffer").ParsedOfferPayload) => {
    setLogistics((prev) => {
      const next: LogisticsState = { ...prev };
      // Origin
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
      // Destinations
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
      // Same-freight-global
      if (p.sameFreightGlobal) {
        next.sameFreightGlobal = true;
        if (p.globalFreight != null) next.globalFreight = String(p.globalFreight);
        if (p.globalInsurance != null) next.globalInsurance = String(p.globalInsurance);
      }
      // Incoterms
      const validIncoterms = p.incoterms.filter((i): i is LogisticsState["incoterms"][number] =>
        ["FOB", "CFR", "CIF", "EXW", "DDP", "DAP"].includes(i),
      );
      if (validIncoterms.length > 0) next.incoterms = validIncoterms;
      // Container
      if (p.containerSize) next.containerSize = p.containerSize;
      if (p.fclCount && p.fclCount > 0) next.fclCount = Math.floor(p.fclCount);
      if (p.temperature) next.temperature = p.temperature;
      if (p.shipmentReady) next.shipmentReady = p.shipmentReady;
      // Pricing model — fix9 alignment
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
      // pm === null → leave untouched so user decides in Edit Logistics
      return next;
    });

    // Payment terms — only set if exact/fuzzy match found in catalog
    if (p.paymentTerms.label && (p.paymentTerms.match === "exact" || p.paymentTerms.match === "fuzzy")) {
      setPaymentTerms(p.paymentTerms.label);
    }

    // Items → append as new CutRow entries (preserve any user-entered rows)
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
        // If the only existing row is the default empty row, replace it.
        const onlyEmpty = prev.length === 1 && !prev[0].cutName && prev[0].qty === 0;
        return onlyEmpty ? additions : [...prev, ...additions];
      });
    }
  };

  // Prefill from offer (Edit/Clone)
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
    // One-shot toast confirming the prefill (parity with V1 behavior).
    if (data.requestNumber != null) {
      toast.success(
        t("supplier.createOfferV2.fromRequestMode.toast", {
          defaultValue: "Prefilled from request #{{requestNumber}}",
          requestNumber: data.requestNumber,
        }) as string,
      );
    }
  }, [requestPrefillQuery.data, prefillApplied]);

  const handleSubmit = async (status: "draft" | "active") => {
    if (submitting) return;
    if (!supplierContextId) {
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
          ? (t("supplier.createOfferV2.submit.successUpdate", { defaultValue: "Offer {{n}} updated", n: label }) as string)
          : status === "draft"
            ? (t("supplier.createOfferV2.submit.successDraft", { defaultValue: "Draft saved — {{n}}", n: label }) as string)
            : (t("supplier.createOfferV2.submit.successPublish", { defaultValue: "Offer {{n}} published successfully!", n: label }) as string),
      );
      if (adminMode) {
        navigate("/admin/offers");
      } else {
        navigate("/supplier/offers");
      }
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
  const [refChangeModal, setRefChangeModal] = useState<{
    open: boolean;
    nextLogistics: LogisticsState | null;
    mode: "keepFob" | "keepAsk";
  }>({ open: false, nextLogistics: null, mode: "keepFob" });

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

  const sectionByKey = useMemo(() => {
    const m: Record<string, SectionStatus> = {};
    for (const s of breakdown.sections) m[s.key] = s;
    return m;
  }, [breakdown]);

  const jumpToSection = (key: SectionKey) => {
    switch (key) {
      case "origin": openDrawer("origin"); break;
      case "destinations": openDrawer("destinations"); break;
      case "incoterm":
      case "freight": openDrawer("freight"); break;
      case "shipment": openDrawer("container"); break;
      case "cuts": scrollTo("v2-section-cuts"); break;
      case "payment": scrollTo("v2-section-payment"); break;
      case "distribution": scrollTo("v2-section-distribution"); break;
    }
  };

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
    const refChanged =
      drawerDraft.pricingReferencePortId !== logistics.pricingReferencePortId;
    const hasPricedCuts = cuts.some((c) => c.askPrice > 0);
    if (refChanged && hasPricedCuts) {
      setRefChangeModal({ open: true, nextLogistics: drawerDraft, mode: "keepFob" });
      return;
    }
    setLogistics(drawerDraft);
    setDrawerOpen(false);
  };

  const freightPerKgForPort = (l: LogisticsState, portId: string, totalKg: number): number => {
    if (!(totalKg > 0)) return 0;
    if (l.sameFreightGlobal) return (parseFloat(l.globalFreight) || 0) / totalKg;
    for (const d of l.destinations) {
      if (!d.selectedPortIds.includes(portId)) continue;
      const usd =
        d.freight.mode === "same"
          ? parseFloat(d.freight.same) || 0
          : parseFloat(d.freight.perPort[portId] ?? "") || 0;
      return usd / totalKg;
    }
    return 0;
  };

  const applyRefChange = (mode: "keepFob" | "keepAsk") => {
    const next = refChangeModal.nextLogistics;
    if (!next) return;
    if (mode === "keepFob") {
      // Determine current FOB per-kg per cut (using OLD reference), then recompute ASK with new reference.
      const totalKg = cuts.reduce((s, c) => s + (c.qty || 0), 0);
      const oldRef = logistics.pricingReferencePortId;
      const newRef = next.pricingReferencePortId;
      const oldFreightPerKg = oldRef ? freightPerKgForPort(logistics, oldRef, totalKg) : 0;
      const newFreightPerKg = newRef ? freightPerKgForPort(next, newRef, totalKg) : 0;
      setCuts(
        cuts.map((c) => {
          if (!(c.askPrice > 0)) return c;
          const fob = c.askPrice - oldFreightPerKg;
          const newAsk = fob + newFreightPerKg;
          const oldFloorFob = c.floorPrice > 0 ? c.floorPrice - oldFreightPerKg : 0;
          const newFloor = oldFloorFob > 0 ? oldFloorFob + newFreightPerKg : c.floorPrice;
          return { ...c, askPrice: Math.max(0, newAsk), floorPrice: Math.max(0, newFloor) };
        }),
      );
    }
    setLogistics(next);
    setRefChangeModal({ open: false, nextLogistics: null, mode: "keepFob" });
    setDrawerOpen(false);
  };

  // Top strip computed values
  const originPort = logistics.originPortIds[0]
    ? catalog.ports.find((p) => p.id === logistics.originPortIds[0])
    : null;
  const originPortExtraCount = Math.max(0, logistics.originPortIds.length - 1);
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
        if (
          prev.pricingReferencePortId &&
          exists.selectedPortIds.includes(prev.pricingReferencePortId)
        ) {
          const p = catalog.ports.find((x) => x.id === prev.pricingReferencePortId);
          toast.error(
            tk("pricingRef.cannotRemove",
              "{{port}} is your pricing anchor. Change the reference port first before removing this destination.",
              { port: p?.name ?? "Port" }),
          );
          return prev;
        }
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
    setDrawerDraft((prev) => {
      const dest = prev.destinations.find((d) => d.countryId === countryId);
      const removing = dest?.selectedPortIds.includes(portId);
      if (removing && prev.pricingReferencePortId === portId) {
        const p = catalog.ports.find((x) => x.id === portId);
        toast.error(
          tk("pricingRef.cannotRemove",
            "{{port}} is your pricing anchor. Change the reference port first before removing this destination.",
            { port: p?.name ?? "Port" }),
        );
        return prev;
      }
      return {
        ...prev,
        destinations: prev.destinations.map((d) => {
          if (d.countryId !== countryId) return d;
          const has = d.selectedPortIds.includes(portId);
          return { ...d, selectedPortIds: has ? d.selectedPortIds.filter((p) => p !== portId) : [...d.selectedPortIds, portId] };
        }),
      };
    });
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
            <button
              type="button"
              onClick={() => setQuickFillOpen(true)}
              className="group relative inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-md bg-gradient-to-r from-primary via-primary to-accent px-3 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-12 w-10 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 group-hover:left-[110%] group-hover:opacity-100"
              />
              <Sparkles size={14} className="animate-pulse drop-shadow-[0_0_4px_hsl(var(--primary-foreground)/0.6)]" />
              <span className="relative">{tk("quickFill.openButton", "AI Quick-fill")}</span>
            </button>
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

      {adminMode && (
        <div
          className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900"
          role="status"
        >
          🛡️{" "}
          {tk("admin.actingAs", "Acting as supplier: {{name}}", {
            name: adminCompany?.name ?? "…",
          })}
        </div>
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
              ? `${originCountry.flag_emoji ?? ""} ${originPort.name}${originPortExtraCount > 0 ? ` +${originPortExtraCount}` : ""}`
              : tk("strip.empty", "—")
          }
          onClick={() => openDrawer("origin")}
          status={sectionStatus(sectionByKey.origin)}
          tooltipContent={<MissingTooltip section={sectionByKey.origin} tk={tk} />}
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
          status={sectionStatus(sectionByKey.destinations)}
          tooltipContent={<MissingTooltip section={sectionByKey.destinations} tk={tk} />}
        />
        <Pill
          icon={Box}
          label={tk("strip.container", "Container")}
          value={`${logistics.fclCount} × ${logistics.containerSize} · ${tk(`temp.${logistics.temperature}`, logistics.temperature)}`}
          onClick={() => openDrawer("container")}
          status="ok"
        />
        <Pill
          icon={Truck}
          label={tk("strip.incoterm", "Incoterm")}
          value={logistics.incoterms.length > 0 ? logistics.incoterms.join(" · ") : tk("strip.empty", "—")}
          onClick={() => openDrawer("container")}
          status={sectionStatus(sectionByKey.incoterm)}
          tooltipContent={<MissingTooltip section={sectionByKey.incoterm} tk={tk} />}
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
          status={sectionStatus(sectionByKey.freight)}
          tooltipContent={<MissingTooltip section={sectionByKey.freight} tk={tk} />}
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

      {/* Missing fields banner + section status row */}
      <MissingFieldsBanner sections={breakdown.sections} tk={tk} onJump={jumpToSection} />
      <div className="mt-3 flex flex-wrap gap-2">
        {(["cuts", "payment", "distribution"] as const).map((k) => {
          const s = sectionByKey[k];
          if (!s) return null;
          const status = sectionStatus(s);
          const cls = status === "ok"
            ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200"
            : status === "partial"
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
              : "border-border bg-muted/30 text-muted-foreground";
          return (
            <TooltipProvider key={k} delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => jumpToSection(k)}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", cls)}
                  >
                    {status === "ok" ? <Check size={11} /> : <AlertTriangle size={11} />}
                    {tk(s.labelKey, k)}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <MissingTooltip section={s} tk={tk} />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
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
          companyOverride={
            adminMode && adminCompany
              ? { id: adminCompany.id, name: adminCompany.name, country: adminCompany.country }
              : null
          }
          pricingRefLabel={(() => {
            if (!logistics.pricingReferencePortId) {
              const op = logistics.originPortIds[0]
                ? catalog.ports.find((p) => p.id === logistics.originPortIds[0])
                : null;
              return `FOB ${op?.name ?? "origin"}`;
            }
            const dp = catalog.ports.find((p) => p.id === logistics.pricingReferencePortId);
            return `CFR ${dp?.name ?? "destination"}`;
          })()}
        />
        {(() => {
          const op = logistics.originPortIds[0]
            ? catalog.ports.find((p) => p.id === logistics.originPortIds[0])
            : null;
          const destPorts = logistics.destinations.flatMap((d) =>
            d.selectedPortIds
              .map((pid) => catalog.ports.find((p) => p.id === pid))
              .filter((p): p is NonNullable<typeof p> => !!p)
              .map((p) => ({ id: p.id, name: p.name })),
          );
          return (
            <DerivedPricesPreview
              cuts={cuts}
              logistics={logistics}
              originPortName={op?.name ?? ""}
              destinationPorts={destPorts}
              totalKgPerOffer={totalCutKg}
            />
          );
        })()}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div id="v2-section-payment">
            <PaymentTermsCard
              value={paymentTerms}
              onChange={setPaymentTerms}
              supplierContextId={supplierContextId}
              mode={mode}
            />
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
        missingSections={missingSections(breakdown).filter((s) => s.group !== "logistics" || s.key !== "shipment")}
        translate={tk}
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
      <AiQuickFillModal
        open={quickFillOpen}
        onOpenChange={setQuickFillOpen}
        supplierId={company?.id ?? null}
        onApply={applyAiPrefill}
      />

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
              <OriginPicker
                countries={catalog.countries}
                portsForCountry={draftPortsForCountry(drawerDraft.originCountryId ?? "")}
                countryId={drawerDraft.originCountryId}
                onCountryChange={(cid) =>
                  setDrawerDraft((p) => ({ ...p, originCountryId: cid, originPortIds: [] }))
                }
                portIds={drawerDraft.originPortIds}
                onPortIdsChange={(ids) => setDrawerDraft((p) => ({ ...p, originPortIds: ids }))}
                incoterms={drawerDraft.incoterms}
                tk={tk}
              />
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
                  {(drawerDraft.incoterms.includes("FOB") || drawerDraft.incoterms.includes("EXW")) && (
                    <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                      <p className="mb-1 text-xs font-semibold text-foreground">
                        {tk("incoterm.primaryPricing.question", "Your prices are based on which incoterm?")}
                      </p>
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        {tk(
                          "incoterm.primaryPricing.help",
                          "Helps buyers calculate equivalent prices at destination.",
                        )}
                      </p>
                      <div className="flex gap-2">
                        {(["CFR", "FOB"] as const).map((opt) => (
                          <Chip
                            key={opt}
                            active={drawerDraft.primaryPricingIncoterm === opt}
                            onClick={() =>
                              setDrawerDraft((p) => ({ ...p, primaryPricingIncoterm: opt }))
                            }
                          >
                            {tk(`incoterm.primaryPricing.${opt.toLowerCase()}`, opt)}
                          </Chip>
                        ))}
                      </div>
                      {!drawerDraft.primaryPricingIncoterm && (
                        <p className="mt-2 text-[11px] font-medium text-amber-700">
                          {tk(
                            "validation.primaryPricingMissing",
                            "Pick the incoterm your prices reference before saving.",
                          )}
                        </p>
                      )}
                    </div>
                  )}
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
                  <ShipmentReadyPicker
                    value={drawerDraft.shipmentReady}
                    onChange={(v) => setDrawerDraft((p) => ({ ...p, shipmentReady: v }))}
                  />
                </Field>
              </div>
            </DrawerSection>

            {/* 6. Pricing reference */}
            <DrawerSection number={6} title={tk("pricingRef.title", "Pricing reference")}>
              <p className="mb-3 text-xs text-muted-foreground">
                {tk("pricingRef.subtitle", "How do you price this offer?")}
              </p>
              {(() => {
                const op = drawerDraft.originPortIds[0]
                  ? catalog.ports.find((p) => p.id === drawerDraft.originPortIds[0])
                  : null;
                const destPorts = drawerDraft.destinations.flatMap((d) =>
                  d.selectedPortIds
                    .map((pid) => catalog.ports.find((p) => p.id === pid))
                    .filter((p): p is NonNullable<typeof p> => !!p),
                );
                const mode: "fob" | "cfr" = drawerDraft.pricingReferencePortId ? "cfr" : "fob";
                return (
                  <>
                    <RadioGroup
                      value={mode}
                      onValueChange={(v) => {
                        if (v === "fob") {
                          setDrawerDraft((p) => ({ ...p, pricingReferencePortId: null }));
                        } else {
                          setDrawerDraft((p) => ({
                            ...p,
                            pricingReferencePortId: p.pricingReferencePortId ?? destPorts[0]?.id ?? null,
                          }));
                        }
                      }}
                      className="flex flex-col gap-2"
                    >
                      <label className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                        <RadioGroupItem value="fob" />
                        <span>
                          {tk("pricingRef.fobAtOrigin", "FOB at origin ({{port}})", {
                            port: op?.name ?? "—",
                          })}
                        </span>
                      </label>
                      <div className="rounded-md border border-border p-2">
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="cfr" />
                          <span>{tk("pricingRef.cfrAtDest", "CFR at destination port:")}</span>
                        </label>
                        {mode === "cfr" && (
                          <select
                            className="mt-2 h-8 w-full rounded-md border border-border bg-card px-2 text-xs"
                            value={drawerDraft.pricingReferencePortId ?? ""}
                            onChange={(e) =>
                              setDrawerDraft((p) => ({
                                ...p,
                                pricingReferencePortId: e.target.value || null,
                              }))
                            }
                            disabled={destPorts.length === 0}
                          >
                            {destPorts.length === 0 && <option value="">—</option>}
                            {destPorts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </RadioGroup>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {tk(
                        "pricingRef.helpText",
                        "All other incoterms will be calculated automatically from freight/insurance values.",
                      )}
                    </p>
                  </>
                );
              })()}
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
              <Button
                onClick={saveDrawer}
                disabled={
                  (drawerDraft.incoterms.includes("FOB") ||
                    drawerDraft.incoterms.includes("EXW")) &&
                  !drawerDraft.primaryPricingIncoterm
                }
              >
                {tk("drawer.footer.save", "Save & search freight")}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={refChangeModal.open}
        onOpenChange={(o) => !o && setRefChangeModal((s) => ({ ...s, open: false }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ⚠️ {tk("pricingRef.changeModal.title", "Change pricing reference")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tk(
                "pricingRef.changeModal.body",
                "You're changing the pricing reference. What should happen?",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <RadioGroup
            value={refChangeModal.mode}
            onValueChange={(v) =>
              setRefChangeModal((s) => ({ ...s, mode: v as "keepFob" | "keepAsk" }))
            }
            className="flex flex-col gap-2 py-2"
          >
            <label className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
              <RadioGroupItem value="keepFob" className="mt-0.5" />
              <span>
                {tk(
                  "pricingRef.changeModal.keepFob",
                  "Keep the same FOB (recalculate ASK to match new port)",
                )}
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
              <RadioGroupItem value="keepAsk" className="mt-0.5" />
              <span>
                {tk(
                  "pricingRef.changeModal.keepAsk",
                  "Keep the same ASK (FOB and other ports will recalculate)",
                )}
              </span>
            </label>
          </RadioGroup>
          <AlertDialogFooter>
            <AlertDialogCancel>{tk("drawer.footer.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyRefChange(refChangeModal.mode)}>
              {tk("pricingRef.changeModal.apply", "Apply")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
