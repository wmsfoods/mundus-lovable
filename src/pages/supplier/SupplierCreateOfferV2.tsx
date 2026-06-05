import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
import { Search, X, Globe, MapPin, Box, FileBadge, Ship, Truck, Edit3 } from "lucide-react";

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
};

type LogisticsState = {
  originCountryId: string | null;
  originPortId: string | null;
  destinations: DestinationState[];
  containerSize: ContainerSize;
  fclCount: number;
  temperature: Temperature;
  incoterms: Incoterm[];
  certifications: Certification[];
  shipmentReady: string; // YYYY-MM
  sameFreightGlobal: boolean;
  globalFreight: string;
};

const EMPTY_LOGISTICS: LogisticsState = {
  originCountryId: null,
  originPortId: null,
  destinations: [],
  containerSize: "40ft",
  fclCount: 1,
  temperature: "Frozen",
  incoterms: ["CFR"],
  certifications: [],
  shipmentReady: "",
  sameFreightGlobal: false,
  globalFreight: "",
};

function Pill({ label, value, onClick, icon: Icon }: { label: string; value: React.ReactNode; onClick: () => void; icon: React.ComponentType<{ className?: string; size?: number }> }) {
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

  const [unit, setUnit] = useState<Unit>("kg");
  const [unitLocked, setUnitLocked] = useState(false);
  const [logistics, setLogistics] = useState<LogisticsState>(EMPTY_LOGISTICS);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDraft, setDrawerDraft] = useState<LogisticsState>(EMPTY_LOGISTICS);
  const [drawerFocus, setDrawerFocus] = useState<DrawerFocus>("origin");
  const [destSearch, setDestSearch] = useState("");
  const [destRegion, setDestRegion] = useState<Region>("All");

  const completion = 0; // computed in R3-R5

  const tk = (key: string, fallback: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.${key}`, { defaultValue: fallback, ...(opts ?? {}) }) as string;

  const setUnitChoice = (next: Unit) => {
    if (unitLocked) return;
    setUnit(next);
    setUnitLocked(true);
  };

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
        title={tk("title", "New offer")}
        subtitle={tk("subtitle", "One screen · click any pill to edit")}
        right={
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {tk("livePreview", "Live preview")}
            </span>
            <div className="inline-flex rounded-full bg-muted p-0.5">
              {(["kg", "lbs"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  disabled={unitLocked && unit !== u}
                  title={unitLocked ? tk("unitLockedHint", "Cannot change unit after first selection") : undefined}
                  onClick={() => setUnitChoice(u)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    unitLocked && unit !== u && "cursor-not-allowed opacity-40",
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
        <SectionPlaceholder
          title={tk("placeholders.productsTitle", "Products & pricing")}
          hint={tk("placeholders.productsHint", "Coming in R3 — cuts table, brand picker, per-cut photo & files")}
          height={200}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionPlaceholder
            title={tk("placeholders.paymentTitle", "Payment terms")}
            hint={tk("placeholders.paymentHint", "Coming in R4")}
            height={180}
          />
          <SectionPlaceholder
            title={tk("placeholders.distributionTitle", "Distribution")}
            hint={tk("placeholders.distributionHint", "Coming in R4")}
            height={180}
          />
        </div>
      </div>

      {/* Sticky action bar placeholder */}
      <div className="sticky bottom-0 -mx-4 mt-8 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <span className="mr-auto text-xs text-muted-foreground">
          {tk("actionBar.comingSoon", "Action bar — coming in R5")}
        </span>
        <Button variant="outline" disabled>
          {tk("actionBar.cancel", "Cancel")}
        </Button>
        <Button variant="outline" disabled>
          {tk("actionBar.saveDraft", "Save draft")}
        </Button>
        <Button disabled>
          {tk("actionBar.publish", "Publish")}
        </Button>
      </div>

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
                  <div className="ml-auto flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">US$</span>
                    <Input
                      type="number"
                      className="w-28"
                      value={drawerDraft.globalFreight}
                      onChange={(e) => setDrawerDraft((p) => ({ ...p, globalFreight: e.target.value }))}
                    />
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{tk("drawer.s4.freightUSD", "Freight USD")}</span>
                            <Input
                              type="number"
                              className="w-32"
                              value={d.freight.same}
                              onChange={(e) => setDestSameFreight(d.countryId, e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {d.selectedPortIds.map((pid) => {
                              const port = allPorts.find((p) => p.id === pid);
                              if (!port) return null;
                              return (
                                <div key={pid} className="flex items-center gap-2 text-xs">
                                  <span className="flex-1 truncate">
                                    {port.name} ({port.code})
                                  </span>
                                  <span className="text-muted-foreground">USD</span>
                                  <Input
                                    type="number"
                                    className="w-28"
                                    value={d.freight.perPort[pid] ?? ""}
                                    onChange={(e) => setDestPerPortFreight(d.countryId, pid, e.target.value)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
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
