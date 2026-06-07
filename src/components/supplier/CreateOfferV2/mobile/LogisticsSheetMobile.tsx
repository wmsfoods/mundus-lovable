import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Search, X, Check } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { usePortsCatalog } from "@/hooks/usePortsCatalog";
import {
  REGIONS,
  type Region,
  COUNTRY_REGION,
  CONTAINER_SIZES,
  type ContainerSize,
  TEMPERATURES,
  type Temperature,
  INCOTERMS,
  type Incoterm,
  CERTIFICATIONS,
  type Certification,
} from "@/lib/offerOptions";
import { containerCapacityKg } from "@/lib/units";
import { ShipmentReadyPicker } from "@/components/supplier/CreateOfferV2/ShipmentReadyPicker";

// ---------- Mirror desktop types exactly ----------
type PortFreightShape =
  | { mode: "same"; same: string }
  | { mode: "perPort"; perPort: Record<string, string> };
type DestinationState = {
  countryId: string;
  iso: string;
  name: string;
  flag: string;
  selectedPortIds: string[];
  freight: PortFreightShape;
  insurance: PortFreightShape;
};
export type LogisticsState = {
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

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  subtitle?: string;
  value: LogisticsState;
  onSave: (next: LogisticsState) => void;
};

type TabKey = "markets" | "freight" | "container";

export function LogisticsSheetMobile({ open, onOpenChange, subtitle, value, onSave }: Props) {
  const { t } = useTranslation();
  const tk = (key: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.mobile.logistics.${key}`, { defaultValue: fb, ...(opts ?? {}) }) as string;
  const catalog = usePortsCatalog();

  const [draft, setDraft] = useState<LogisticsState>(value);
  const [tab, setTab] = useState<TabKey>("markets");
  const [destSearch, setDestSearch] = useState("");
  const [destRegion, setDestRegion] = useState<Region>("All");

  // Reset draft each time sheet opens (parity with desktop drawer).
  useEffect(() => {
    if (open) {
      setDraft(value);
      setTab("markets");
      setDestSearch("");
      setDestRegion("All");
    }
  }, [open, value]);

  const destPortCount = draft.destinations.reduce((a, d) => a + d.selectedPortIds.length, 0);
  const cifEnabled = draft.incoterms.includes("CIF");

  // ----- Helpers (mirror desktop) -----
  const toggleDestination = (countryId: string) => {
    setDraft((prev) => {
      const exists = prev.destinations.find((d) => d.countryId === countryId);
      if (exists) {
        if (
          prev.pricingReferencePortId &&
          exists.selectedPortIds.includes(prev.pricingReferencePortId)
        ) {
          const p = catalog.ports.find((x) => x.id === prev.pricingReferencePortId);
          toast.error(
            tk(
              "pricingRef.cannotRemove",
              "{{port}} is your pricing anchor. Change the reference port first.",
              { port: p?.name ?? "Port" },
            ),
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
    setDraft((prev) => {
      const dest = prev.destinations.find((d) => d.countryId === countryId);
      const removing = dest?.selectedPortIds.includes(portId);
      if (removing && prev.pricingReferencePortId === portId) {
        const p = catalog.ports.find((x) => x.id === portId);
        toast.error(
          tk("pricingRef.cannotRemove", "{{port}} is your pricing anchor. Change the reference port first.", {
            port: p?.name ?? "Port",
          }),
        );
        return prev;
      }
      return {
        ...prev,
        destinations: prev.destinations.map((d) => {
          if (d.countryId !== countryId) return d;
          const has = d.selectedPortIds.includes(portId);
          return {
            ...d,
            selectedPortIds: has
              ? d.selectedPortIds.filter((p) => p !== portId)
              : [...d.selectedPortIds, portId],
          };
        }),
      };
    });
  };

  const setDestFreightMode = (countryId: string, mode: "same" | "perPort") => {
    setDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) => {
        if (d.countryId !== countryId) return d;
        if (d.freight.mode === mode) return d;
        if (mode === "same")
          return { ...d, freight: { mode: "same", same: d.freight.mode === "same" ? d.freight.same : "" } };
        return { ...d, freight: { mode: "perPort", perPort: d.freight.mode === "perPort" ? d.freight.perPort : {} } };
      }),
    }));
  };
  const setDestSameFreight = (countryId: string, v: string) =>
    setDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) =>
        d.countryId === countryId && d.freight.mode === "same"
          ? { ...d, freight: { mode: "same", same: v } }
          : d,
      ),
    }));
  const setDestPerPortFreight = (countryId: string, portId: string, v: string) =>
    setDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) => {
        if (d.countryId !== countryId || d.freight.mode !== "perPort") return d;
        return { ...d, freight: { mode: "perPort", perPort: { ...d.freight.perPort, [portId]: v } } };
      }),
    }));
  const setDestSameInsurance = (countryId: string, v: string) =>
    setDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) =>
        d.countryId === countryId ? { ...d, insurance: { mode: "same", same: v } } : d,
      ),
    }));
  const setDestPerPortInsurance = (countryId: string, portId: string, v: string) =>
    setDraft((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) => {
        if (d.countryId !== countryId) return d;
        const cur = d.insurance.mode === "perPort" ? d.insurance.perPort : {};
        return { ...d, insurance: { mode: "perPort", perPort: { ...cur, [portId]: v } } };
      }),
    }));

  // ----- Derived lists -----
  const filteredCountries = useMemo(() => {
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

  const originPorts = draft.originCountryId ? catalog.getPortsByCountryId(draft.originCountryId) : [];
  const totalCapacityKg = containerCapacityKg(draft.containerSize) * Math.max(1, draft.fclCount);

  const saveDisabled =
    (draft.incoterms.includes("FOB") || draft.incoterms.includes("EXW")) && !draft.primaryPricingIncoterm;

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[92vh] flex-col rounded-t-3xl p-0">
        <div className="flex shrink-0 justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/30" />
        </div>
        <SheetHeader className="shrink-0 border-b px-4 pb-2 pt-2 text-left">
          <SheetTitle>{tk("title", "Edit logistics")}</SheetTitle>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </SheetHeader>

        {/* Sticky tabs */}
        <div className="sticky top-0 z-10 grid shrink-0 grid-cols-3 border-b bg-background">
          {(
            [
              { key: "markets", label: tk("tab.markets", "Markets"), count: draft.destinations.length },
              { key: "freight", label: tk("tab.freight", "Freight"), count: draft.destinations.length },
              { key: "container", label: tk("tab.container", "Container"), count: null as number | null },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex h-12 items-center justify-center gap-2 text-sm font-medium",
                tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground",
              )}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-6">
          {tab === "markets" && (
            <MarketsTab
              draft={draft}
              setDraft={setDraft}
              catalog={catalog}
              originPorts={originPorts}
              destSearch={destSearch}
              setDestSearch={setDestSearch}
              destRegion={destRegion}
              setDestRegion={setDestRegion}
              filteredCountries={filteredCountries}
              toggleDestination={toggleDestination}
              togglePortInDest={togglePortInDest}
              tk={tk}
            />
          )}
          {tab === "freight" && (
            <FreightTab
              draft={draft}
              setDraft={setDraft}
              catalog={catalog}
              cifEnabled={cifEnabled}
              setDestFreightMode={setDestFreightMode}
              setDestSameFreight={setDestSameFreight}
              setDestPerPortFreight={setDestPerPortFreight}
              setDestSameInsurance={setDestSameInsurance}
              setDestPerPortInsurance={setDestPerPortInsurance}
              tk={tk}
            />
          )}
          {tab === "container" && (
            <ContainerTab
              draft={draft}
              setDraft={setDraft}
              catalog={catalog}
              totalCapacityKg={totalCapacityKg}
              tk={tk}
            />
          )}
        </div>

        {/* Sticky footer */}
        <div
          className="shrink-0 border-t bg-background px-4 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-12 basis-[30%] text-base"
              onClick={() => onOpenChange(false)}
            >
              {tk("cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 bg-primary text-base text-primary-foreground"
              disabled={saveDisabled}
              onClick={handleSave}
            >
              {tk("save", "Save logistics")}
            </Button>
          </div>
          {saveDisabled && (
            <p className="mt-2 text-center text-[11px] font-medium text-amber-700">
              {tk(
                "validation.primaryPricingMissing",
                "Pick which incoterm (FOB or CFR) your prices reference before saving.",
              )}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default LogisticsSheetMobile;

// ===================================================
// MARKETS TAB
// ===================================================
function MarketsTab({
  draft,
  setDraft,
  catalog,
  originPorts,
  destSearch,
  setDestSearch,
  destRegion,
  setDestRegion,
  filteredCountries,
  toggleDestination,
  togglePortInDest,
  tk,
}: {
  draft: LogisticsState;
  setDraft: React.Dispatch<React.SetStateAction<LogisticsState>>;
  catalog: ReturnType<typeof usePortsCatalog>;
  originPorts: ReturnType<ReturnType<typeof usePortsCatalog>["getPortsByCountryId"]>;
  destSearch: string;
  setDestSearch: (v: string) => void;
  destRegion: Region;
  setDestRegion: (r: Region) => void;
  filteredCountries: ReturnType<typeof usePortsCatalog>["countries"];
  toggleDestination: (id: string) => void;
  togglePortInDest: (cid: string, pid: string) => void;
  tk: (k: string, fb: string, opts?: Record<string, unknown>) => string;
}) {
  const originCountry = draft.originCountryId ? catalog.getCountryById(draft.originCountryId) : null;

  return (
    <div className="space-y-5">
      {/* ORIGIN */}
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tk("origin.title", "Origin")}
        </h3>
        <div className="space-y-2 rounded-xl border bg-card p-3">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {tk("origin.country", "Country")}
          </label>
          <select
            className="h-11 w-full rounded-md border bg-background px-3 text-base"
            value={draft.originCountryId ?? ""}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                originCountryId: e.target.value || null,
                originPortIds: [],
              }))
            }
          >
            <option value="">{tk("origin.countryPh", "Select country…")}</option>
            {catalog.countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flag_emoji ?? "🏳️"} {c.english_name}
              </option>
            ))}
          </select>

          <label className="mt-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {tk("origin.ports", "Ports")} ({draft.originPortIds.length})
          </label>
          {!draft.originCountryId ? (
            <p className="text-xs text-muted-foreground">
              {tk("origin.selectCountryFirst", "Select origin country first.")}
            </p>
          ) : originPorts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {tk("origin.noPorts", "No ports listed for this country.")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {originPorts.map((p) => {
                const active = draft.originPortIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        originPortIds: active
                          ? prev.originPortIds.filter((x) => x !== p.id)
                          : [...prev.originPortIds, p.id],
                      }))
                    }
                    className={cn(
                      "min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground",
                    )}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
          {originCountry && draft.originPortIds.length === 0 && (
            <p className="mt-1 text-[11px] font-medium text-amber-700">
              {tk("origin.atLeastOnePort", "Select at least one origin port.")}
            </p>
          )}
        </div>
      </section>

      {/* DESTINATIONS */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {tk("dest.title", "Destinations")}
          </h3>
          {draft.destinations.length > 0 && (
            <Badge className="bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary">
              {draft.destinations.length}
            </Badge>
          )}
        </div>

        <div className="relative mb-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-11 pl-8 text-base"
            placeholder={tk("dest.search", "Search countries…")}
            value={destSearch}
            onChange={(e) => setDestSearch(e.target.value)}
          />
        </div>

        <div className="-mx-4 mb-3 overflow-x-auto px-4">
          <div className="flex w-max gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDestRegion(r)}
                className={cn(
                  "min-h-[36px] shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                  destRegion === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {tk(`region.${r}`, r)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {filteredCountries.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {tk("dest.empty", "No countries match.")}
            </p>
          )}
          {filteredCountries.map((c) => {
            const selected = draft.destinations.some((d) => d.countryId === c.id);
            const portCount = catalog.getPortsByCountryId(c.id).length;
            const region = c.iso_code ? COUNTRY_REGION[c.iso_code.toUpperCase()] ?? "—" : "—";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleDestination(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                  selected ? "border-primary bg-primary/5" : "border-border bg-card",
                )}
              >
                <span className="text-xl">{c.flag_emoji ?? "🏳️"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.english_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {tk("dest.portsRegion", "{{n}} ports · {{r}}", { n: portCount, r: region })}
                  </div>
                </div>
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {selected && <Check size={14} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* PORTS OF ENTRY */}
      {draft.destinations.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {tk("portsOfEntry.title", "Ports of entry")}
          </h3>
          <div className="space-y-2">
            {draft.destinations.map((d) => {
              const allPorts = catalog.getPortsByCountryId(d.countryId);
              return (
                <div key={d.countryId} className="rounded-xl border bg-card p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">{d.flag}</span>
                    <span className="flex-1 truncate text-sm font-semibold">{d.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {tk("portsOfEntry.count", "{{n}}p", { n: d.selectedPortIds.length })}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleDestination(d.countryId)}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground active:bg-muted"
                      aria-label="Remove country"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {allPorts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {tk("portsOfEntry.noPorts", "No ports listed.")}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {allPorts.map((p) => {
                        const active = d.selectedPortIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => togglePortInDest(d.countryId, p.id)}
                            className={cn(
                              "min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-foreground",
                            )}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ===================================================
// FREIGHT TAB
// ===================================================
function FreightTab({
  draft,
  setDraft,
  catalog,
  cifEnabled,
  setDestFreightMode,
  setDestSameFreight,
  setDestPerPortFreight,
  setDestSameInsurance,
  setDestPerPortInsurance,
  tk,
}: {
  draft: LogisticsState;
  setDraft: React.Dispatch<React.SetStateAction<LogisticsState>>;
  catalog: ReturnType<typeof usePortsCatalog>;
  cifEnabled: boolean;
  setDestFreightMode: (cid: string, mode: "same" | "perPort") => void;
  setDestSameFreight: (cid: string, v: string) => void;
  setDestPerPortFreight: (cid: string, pid: string, v: string) => void;
  setDestSameInsurance: (cid: string, v: string) => void;
  setDestPerPortInsurance: (cid: string, pid: string, v: string) => void;
  tk: (k: string, fb: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="space-y-3">
      {/* Same-freight global toggle card */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">
              {tk("freight.sameAll", "Same freight for all markets")}
            </div>
            <p className="text-xs text-muted-foreground">
              {tk("freight.sameAllSub", "Apply one cost across every port")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.sameFreightGlobal}
            onClick={() =>
              setDraft((p) => ({ ...p, sameFreightGlobal: !p.sameFreightGlobal }))
            }
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
              draft.sameFreightGlobal ? "border-primary bg-primary" : "border-border bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
                draft.sameFreightGlobal ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        {draft.sameFreightGlobal && (
          <div className="mt-3 space-y-2">
            <UsdInput
              label={tk("freight.freight", "Freight")}
              value={draft.globalFreight}
              onChange={(v) => setDraft((p) => ({ ...p, globalFreight: v }))}
            />
            <UsdInput
              label={tk("freight.insurance", "Insurance")}
              value={draft.globalInsurance}
              onChange={(v) => setDraft((p) => ({ ...p, globalInsurance: v }))}
              disabled={!cifEnabled}
              disabledHint={tk("freight.insuranceDisabled", "Enable CIF to add insurance")}
            />
          </div>
        )}
      </div>

      {/* Per-country freight cards */}
      {!draft.sameFreightGlobal &&
        (draft.destinations.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card p-6 text-center text-xs text-muted-foreground">
            {tk("freight.noDest", "Add destinations on the Markets tab first.")}
          </p>
        ) : (
          draft.destinations.map((d) => {
            const allPorts = catalog.getPortsByCountryId(d.countryId);
            const showModeToggle = d.selectedPortIds.length >= 2;
            return (
              <div key={d.countryId} className="rounded-xl border bg-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">{d.flag}</span>
                  <span className="flex-1 truncate text-sm font-semibold">{d.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {tk("portsOfEntry.count", "{{n}}p", { n: d.selectedPortIds.length })}
                  </span>
                </div>

                {d.selectedPortIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {tk("freight.selectPorts", "Select at least one port for this country.")}
                  </p>
                ) : (
                  <>
                    {showModeToggle && (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {tk("freight.sameAllPorts", "Same freight all ports?")}
                        </span>
                        <div className="ml-auto inline-flex rounded-md border">
                          {(["same", "perPort"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setDestFreightMode(d.countryId, m)}
                              className={cn(
                                "min-w-[44px] px-3 py-1.5 text-xs font-medium",
                                d.freight.mode === m
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card text-muted-foreground",
                              )}
                            >
                              {m === "same" ? tk("freight.yes", "Yes") : tk("freight.no", "No")}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.freight.mode === "same" ? (
                      <div className="space-y-2">
                        <UsdInput
                          label={tk("freight.freight", "Freight")}
                          value={d.freight.same}
                          onChange={(v) => setDestSameFreight(d.countryId, v)}
                        />
                        <UsdInput
                          label={tk("freight.insurance", "Insurance")}
                          value={d.insurance.mode === "same" ? d.insurance.same : ""}
                          onChange={(v) => setDestSameInsurance(d.countryId, v)}
                          disabled={!cifEnabled}
                          disabledHint={tk("freight.insuranceDisabled", "Enable CIF to add insurance")}
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {d.selectedPortIds.map((pid) => {
                          const port = allPorts.find((p) => p.id === pid);
                          if (!port) return null;
                          const perPort = (d.freight as { mode: "perPort"; perPort: Record<string, string> }).perPort;
                          const perPortIns = d.insurance.mode === "perPort" ? d.insurance.perPort : {};
                          return (
                            <div key={pid} className="rounded-lg border bg-muted/20 p-2.5">
                              <div className="mb-2 truncate text-xs font-medium">
                                {port.name} ({port.code})
                              </div>
                              <div className="space-y-2">
                                <UsdInput
                                  label={tk("freight.freight", "Freight")}
                                  value={perPort[pid] ?? ""}
                                  onChange={(v) => setDestPerPortFreight(d.countryId, pid, v)}
                                />
                                <UsdInput
                                  label={tk("freight.insurance", "Insurance")}
                                  value={perPortIns[pid] ?? ""}
                                  onChange={(v) => setDestPerPortInsurance(d.countryId, pid, v)}
                                  disabled={!cifEnabled}
                                  disabledHint={tk("freight.insuranceDisabled", "Enable CIF to add insurance")}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        ))}
    </div>
  );
}

function UsdInput({
  label,
  value,
  onChange,
  disabled,
  disabledHint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {disabled && disabledHint && <span className="normal-case text-[10px]">{disabledHint}</span>}
      </label>
      <div className="flex items-stretch overflow-hidden rounded-md border bg-background">
        <span className="flex items-center bg-muted px-2.5 text-xs font-semibold text-muted-foreground">
          US$
        </span>
        <Input
          type="number"
          inputMode="decimal"
          className="h-11 flex-1 rounded-none border-0 text-base focus-visible:ring-0"
          value={value}
          disabled={disabled}
          placeholder={disabled ? "N/A" : "0"}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// ===================================================
// CONTAINER TAB
// ===================================================
function ContainerTab({
  draft,
  setDraft,
  catalog,
  totalCapacityKg,
  tk,
}: {
  draft: LogisticsState;
  setDraft: React.Dispatch<React.SetStateAction<LogisticsState>>;
  catalog: ReturnType<typeof usePortsCatalog>;
  totalCapacityKg: number;
  tk: (k: string, fb: string, opts?: Record<string, unknown>) => string;
}) {
  const op = draft.originPortIds[0] ? catalog.ports.find((p) => p.id === draft.originPortIds[0]) : null;
  const destPorts = draft.destinations.flatMap((d) =>
    d.selectedPortIds
      .map((pid) => catalog.ports.find((p) => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => !!p),
  );
  const pricingRefVisible = draft.incoterms.includes("FOB") || draft.incoterms.includes("EXW");
  const pricingMode: "fob" | "cfr" | null =
    draft.primaryPricingIncoterm === "FOB"
      ? "fob"
      : draft.primaryPricingIncoterm === "CFR"
        ? "cfr"
        : null;

  const toggleIncoterm = (i: Incoterm) =>
    setDraft((p) => ({
      ...p,
      incoterms: p.incoterms.includes(i) ? p.incoterms.filter((x) => x !== i) : [...p.incoterms, i],
    }));

  const toggleCert = (c: Certification) =>
    setDraft((p) => ({
      ...p,
      certifications: p.certifications.includes(c)
        ? p.certifications.filter((x) => x !== c)
        : [...p.certifications, c],
    }));

  return (
    <div className="space-y-5">
      {/* FCL SETUP */}
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tk("container.fclSetup", "FCL setup")}
        </h3>
        <div className="space-y-3 rounded-xl border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {CONTAINER_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, containerSize: s }))}
                  className={cn(
                    "min-h-[44px] flex-1 rounded-md border text-sm font-semibold",
                    draft.containerSize === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="w-24">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {tk("container.fcls", "FCLs")}
              </label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                className="h-11 text-center text-base"
                value={draft.fclCount}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, fclCount: Math.max(1, parseInt(e.target.value) || 1) }))
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {tk("container.temperature", "Temperature")}
            </label>
            <div className="flex gap-1.5">
              {TEMPERATURES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, temperature: t }))}
                  className={cn(
                    "min-h-[44px] flex-1 rounded-md border text-sm font-semibold",
                    draft.temperature === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {tk(`container.temp.${t}`, t)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
            {tk("container.totalCapacity", "Total capacity · {{kg}} kg", {
              kg: totalCapacityKg.toLocaleString(),
            })}
          </div>
        </div>
      </section>

      {/* INCOTERM */}
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tk("container.incoterm", "Incoterm")}
        </h3>
        <div className="rounded-xl border bg-card p-3">
          <div className="grid grid-cols-2 gap-1.5">
            {INCOTERMS.map((i) => {
              const active = draft.incoterms.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleIncoterm(i)}
                  className={cn(
                    "min-h-[44px] rounded-md border text-sm font-semibold",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {i}
                </button>
              );
            })}
          </div>

          {draft.incoterms.includes("EXW") && (
            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {tk("container.exwPickup", "EXW pickup location")}
              </label>
              <Input
                className="h-11 text-base"
                placeholder={tk("container.exwPickupPh", "City, state — where buyer collects")}
                value={draft.exwPickupLocation}
                onChange={(e) => setDraft((p) => ({ ...p, exwPickupLocation: e.target.value }))}
              />
            </div>
          )}
        </div>
      </section>

      {/* PRICING REFERENCE */}
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tk("container.pricingRef", "Pricing reference")}
        </h3>
        <div className="space-y-2 rounded-xl border bg-card p-3">
          <button
            type="button"
            onClick={() => setDraft((p) => ({ ...p, pricingReferencePortId: null }))}
            className={cn(
              "flex w-full items-center gap-2 rounded-md border p-2.5 text-left text-sm",
              pricingMode === "fob" ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <span
              className={cn(
                "h-4 w-4 shrink-0 rounded-full border-2",
                pricingMode === "fob" ? "border-primary bg-primary" : "border-border",
              )}
            />
            <span>
              {tk("container.pricingRef.fob", "FOB at origin ({{port}})", { port: op?.name ?? "—" })}
            </span>
          </button>
          <div
            className={cn(
              "rounded-md border p-2.5",
              pricingMode === "cfr" ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <button
              type="button"
              onClick={() => {
                if (destPorts.length === 0) {
                  toast.error(
                    tk(
                      "pricingRef.noDestPorts",
                      "Add at least one destination port before choosing CFR.",
                    ),
                  );
                  return;
                }
                setDraft((p) => ({
                  ...p,
                  pricingReferencePortId: p.pricingReferencePortId ?? destPorts[0]?.id ?? null,
                }));
              }}
              className="flex w-full items-center gap-2 text-left text-sm"
            >
              <span
                className={cn(
                  "h-4 w-4 shrink-0 rounded-full border-2",
                  pricingMode === "cfr" ? "border-primary bg-primary" : "border-border",
                )}
              />
              <span>{tk("container.pricingRef.cfr", "CFR at destination port")}</span>
            </button>
            {pricingMode === "cfr" && destPorts.length > 0 && (
              <select
                className="mt-2 h-11 w-full rounded-md border bg-background px-2 text-sm"
                value={draft.pricingReferencePortId ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, pricingReferencePortId: e.target.value || null }))
                }
              >
                {destPorts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </section>

      {/* CERTIFICATIONS */}
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tk("container.certifications", "Slaughter certifications")}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {CERTIFICATIONS.map((c) => {
            const active = draft.certifications.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCert(c)}
                className={cn(
                  "min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      {/* SHIPMENT READY */}
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tk("container.shipmentReady", "Shipment ready")}
        </h3>
        <ShipmentReadyPicker
          size="compact"
          value={draft.shipmentReady}
          onChange={(v) => setDraft((p) => ({ ...p, shipmentReady: v }))}
        />
      </section>
    </div>
  );
}