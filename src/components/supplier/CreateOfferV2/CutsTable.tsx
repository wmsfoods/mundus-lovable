import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useCompanyPlants } from "@/hooks/useCompanyPlants";
import type { CompanyPlant } from "@/hooks/useCompanyPlants";
import { useCutsCatalog } from "@/hooks/useCutsCatalog";
import { isUsCompany } from "@/lib/companyHelpers";
import {
  fromDisplay,
  toDisplay,
  weightLabel,
  priceLabel,
  containerCapacityKg,
  type WeightUnit,
} from "@/lib/units";
import {
  PROTEINS,
  PACKING_OPTIONS,
  SPEC_OPTIONS,
  emptyCutRow,
  type CutRow,
} from "@/lib/cutRowTypes";
import { CapacityBar } from "./CapacityBar";
import { BrandPicker } from "./BrandPicker";
import { PhotoCell } from "./PhotoCell";
import { FilesCell } from "./FilesCell";
import { NumberCell } from "./NumberCell";
import { ApplyToAllChip } from "./ApplyToAllChip";
import { cn } from "@/lib/utils";
import { formatCutMeta } from "@/lib/cutMetaDisplay";
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
import { buttonVariants } from "@/components/ui/button";

type Props = {
  cuts: CutRow[];
  setCuts: (cuts: CutRow[]) => void;
  unit: WeightUnit;
  containerSize: "20ft" | "40ft";
  cutRegion: "global" | "us";
  setCutRegion: (r: "global" | "us") => void;
  /** Dynamic header label, e.g. "FOB Santos" or "CFR Hong Kong". Reflects the pricing reference. */
  pricingRefLabel?: string;
  /**
   * Admin on-behalf mode: when set, overrides `useCurrentCompany()` so plants,
   * brands and the US-grade region toggle reflect the target supplier instead
   * of the admin's own company. Pass `null`/omit to use the logged-in company.
   */
  companyOverride?: { id: string; name?: string | null; country?: string | null } | null;
};

export function CutsTable({ cuts, setCuts, unit, containerSize, cutRegion, setCutRegion, pricingRefLabel, companyOverride }: Props) {
  const { t } = useTranslation();
  const { company: liveCompany } = useCurrentCompany();
  const effectiveCompany = companyOverride
    ? { country: companyOverride.country ?? null }
    : liveCompany;
  const companyId = companyOverride ? companyOverride.id : liveCompany?.id ?? null;
  const showRegionToggle = isUsCompany(effectiveCompany);
  const [pendingRegion, setPendingRegion] = useState<"global" | "us" | null>(null);

  const requestRegionChange = (newRegion: "global" | "us") => {
    if (cutRegion === newRegion) return;
    if (cuts.length === 0) {
      setCutRegion(newRegion);
      return;
    }
    setPendingRegion(newRegion);
  };
  const confirmRegionChange = () => {
    if (!pendingRegion) return;
    setCuts([]);
    setCutRegion(pendingRegion);
    setPendingRegion(null);
  };

  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.cutsTable.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;

  const { plants } = useCompanyPlants(companyId);
  const plantOptions = useMemo(
    () => plants.map((p) => p.plant_number || p.name || p.id).filter(Boolean) as string[],
    [plants],
  );
  const applyPlantToAll = (label: string) => {
    const match = plants.find(
      (p) => (p.plant_number || p.name || p.id) === label,
    );
    setCuts(
      cuts.map((c) => ({
        ...c,
        plantId: match?.id ?? null,
        plantNumber: match ? (match.plant_number || match.name || "") : label,
      })),
    );
    toast.success(tk("toastApplied", "Applied to {{n}} cuts", { n: cuts.length }));
  };

  // Force global region for non-US companies
  useEffect(() => {
    if (!showRegionToggle && cutRegion !== "global") setCutRegion("global");
  }, [showRegionToggle, cutRegion, setCutRegion]);

  /* ─── Mutators ─── */
  const updateRow = (idx: number, patch: Partial<CutRow>) => {
    setCuts(cuts.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };
  const addRow = () => setCuts([...cuts, emptyCutRow()]);
  const removeRow = (idx: number) => setCuts(cuts.filter((_, i) => i !== idx));

  const applyToAll = <K extends keyof CutRow>(field: K, value: CutRow[K]) => {
    setCuts(cuts.map((c) => ({ ...c, [field]: value })));
    toast.success(tk("toastApplied", "Applied to {{n}} cuts", { n: cuts.length }));
  };

  /* ─── Capacity math (identical to wizard's `containerCapacityKg`) ─── */
  const usedKg = useMemo(() => cuts.reduce((s, c) => s + (c.qty || 0), 0), [cuts]);
  const capKg = containerCapacityKg(containerSize);

  /* ─── Totals ─── */
  const totals = useMemo(() => {
    const totalQty = cuts.reduce((s, c) => s + (c.qty || 0), 0);
    const askSum = cuts.reduce((s, c) => s + (c.qty || 0) * (c.askPrice || 0), 0);
    const floorSum = cuts.reduce((s, c) => s + (c.qty || 0) * (c.floorPrice || 0), 0);
    const avgAsk = totalQty > 0 ? askSum / totalQty : 0;
    return { totalQty, askSum, floorSum, avgAsk };
  }, [cuts]);

  const fmtNum = (n: number, frac = 0) =>
    n.toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac });

  const proteinOptions = PROTEINS as readonly string[];
  const multipleCuts = cuts.length > 1;

  const showUsGradeCol = cutRegion === "us";
  const tkCuts = (k: string, fb: string) =>
    t(`supplier.createOfferV2.cuts.${k}`, { defaultValue: fb }) as string;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{tk("title", "Products & pricing")}</h2>
          <p className="text-xs text-muted-foreground">{tk("subtitle", "Each row = one cut. Prices in {{unit}}.", { unit: priceLabel(unit) })}</p>
        </div>
        {showRegionToggle && (
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            {(["global", "us"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => requestRegionChange(r)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium",
                  cutRegion === r ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "global" ? tk("regionGlobal", "🌐 Global") : tk("regionUs", "🇺🇸 US (IMPS/NAMP)")}
              </button>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={pendingRegion !== null} onOpenChange={(o) => { if (!o) setPendingRegion(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tk("regionSwitchTitle", "Switch cut catalog?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tk(
                "regionSwitchDesc",
                "Each offer uses cuts from a single catalog (Global OR US IMPS/NAMP). Switching to {{target}} will remove the {{n}} cut(s) you've already added. Continue?",
                {
                  target: pendingRegion === "us" ? "US (IMPS/NAMP)" : "Global",
                  n: cuts.length,
                },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tk("regionSwitchCancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={confirmRegionChange}
            >
              {tk("regionSwitchConfirm", "Yes, switch and reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Capacity bar */}
      <div className="mb-3">
        <CapacityBar usedKg={usedKg} containerSize={containerSize} unit={unit} />
      </div>

      {/* Apply-to-all chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {tk("applyChipsLabel", "Apply to all")}:
        </span>
        <ApplyToAllChip
          label={tk("col.packing", "Packing")}
          options={[...PACKING_OPTIONS]}
          disabled={!multipleCuts}
          onApply={(v) => applyToAll("packing", v)}
        />
        <ApplyToAllChip
          label={tk("col.plant", "Plant #")}
          options={plantOptions.length > 0 ? plantOptions : undefined}
          freeText={plantOptions.length === 0}
          disabled={!multipleCuts}
          onApply={(v) => (plants.length > 0 ? applyPlantToAll(v) : applyToAll("plantNumber", v))}
        />
        <ApplyToAllChip
          label={tk("col.spec", "Spec")}
          options={[...SPEC_OPTIONS]}
          disabled={!multipleCuts}
          onApply={(v) => applyToAll("spec", v)}
        />
        <ApplyToAllChip
          label={tk("col.brand", "Brand")}
          freeText
          disabled={!multipleCuts}
          onApply={(v) => applyToAll("brandName", v)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1100px] text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-12 px-2 py-2 text-left">{tk("col.photo", "Photo")}</th>
              <th className="w-28 px-2 py-2 text-left">{tk("col.protein", "Protein")}</th>
              <th className="w-36 px-2 py-2 text-left">{tk("col.brand", "Brand")}</th>
              <th className="w-44 px-2 py-2 text-left">{tk("col.cut", "Item / Cut")}</th>
              <th className="w-28 px-2 py-2 text-left">{tk("col.spec", "Spec")}</th>
              <th className="w-32 px-2 py-2 text-left">{tk("col.packing", "Packing")}</th>
              <th className="w-28 px-2 py-2 text-left">{tk("col.plant", "Plant #")}</th>
              <th className="w-40 px-2 py-2 text-left">{tk("col.notes", "Notes")}</th>
              <th className="w-28 px-2 py-2 text-right">{tk("col.qty", "Qty ({{u}})", { u: weightLabel(unit) })}</th>
              <th
                className="w-28 px-2 py-2 text-right"
                title={tk("derivedTooltip", "Other incoterms will be calculated automatically from freight/insurance values per destination.")}
              >
                {tk("col.ask", "Ask {{u}}", { u: priceLabel(unit) })}
                {pricingRefLabel ? <span className="ml-1 text-[10px] normal-case text-muted-foreground">({pricingRefLabel}) ℹ️</span> : null}
              </th>
              <th className="w-28 px-2 py-2 text-right">
                {tk("col.floor", "Floor {{u}}", { u: priceLabel(unit) })}
                {pricingRefLabel ? <span className="ml-1 text-[10px] normal-case text-muted-foreground">({pricingRefLabel})</span> : null}
              </th>
              <th className="w-28 px-2 py-2 text-right">{tk("col.subtotal", "Subtotal")}</th>
              <th className="w-8 px-1 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {cuts.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {tk("emptyState", "No cuts yet. Click \"Add cut\" to start.")}
                </td>
              </tr>
            )}
            {cuts.map((c, i) => (
              <CutRowView
                key={c.tempId}
                row={c}
                idx={i}
                unit={unit}
                companyId={companyId}
                proteinOptions={proteinOptions}
                cutRegion={cutRegion}
                plantOptions={plantOptions}
                plants={plants}
                onChange={(patch) => updateRow(i, patch)}
                onRemove={() => removeRow(i)}
                fmtNum={fmtNum}
              />
            ))}
            {cuts.length > 0 && (
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td colSpan={8} className="px-2 py-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground">
                  {tk("totals", "Totals")}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {fmtNum(toDisplay(totals.totalQty, "weight", unit))} {weightLabel(unit)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {totals.avgAsk > 0 ? toDisplay(totals.avgAsk, "price", unit).toFixed(2) : "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                  {tk("avgWeighted", "weighted")}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  ${fmtNum(totals.askSum, 0)}
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <div className="mt-3 flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus size={14} className="mr-1" />
          {tk("addCut", "Add cut")}
        </Button>
        {cuts.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {tk("rowCount", "{{n}} cut(s) · floor total ${{f}}", {
              n: cuts.length,
              f: fmtNum(totals.floorSum, 0),
            })}
          </span>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────── Row ──────────────────────────── */

type RowProps = {
  row: CutRow;
  idx: number;
  unit: WeightUnit;
  companyId: string | null;
  proteinOptions: readonly string[];
  cutRegion: "global" | "us";
  plantOptions: string[];
  plants: CompanyPlant[];
  onChange: (patch: Partial<CutRow>) => void;
  onRemove: () => void;
  fmtNum: (n: number, frac?: number) => string;
};

function CutRowView({
  row,
  unit,
  companyId,
  proteinOptions,
  cutRegion,
  plantOptions,
  plants,
  onChange,
  onRemove,
  fmtNum,
}: RowProps) {
  const { t } = useTranslation();
  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.cutsTable.${k}`, { defaultValue: fb }) as string;
  const tkCuts = (k: string, fb: string) =>
    t(`supplier.createOfferV2.cuts.${k}`, { defaultValue: fb }) as string;

  const { cuts: catalog, loading: cutsLoading } = useCutsCatalog(row.protein, cutRegion);

  const selectedCatalogCut = useMemo(
    () => (row.cutId ? catalog.find((c) => c.id === row.cutId) : null),
    [catalog, row.cutId],
  );
  const catalogPhotoUrl = selectedCatalogCut?.image_url ?? null;

  /* Validation (soft, UX-only this batch) */
  const errors = {
    cut: !row.cutName,
    qty: !(row.qty > 0),
    ask: !(row.askPrice > 0),
    floor: row.floorPrice > 0 && row.floorPrice > row.askPrice,
    plant: plants.length > 0 && !row.plantId,
  };

  /* Display values (converted to current unit) */
  const qtyDisplay = row.qty > 0 ? toDisplay(row.qty, "weight", unit) : 0;
  const askDisplay = row.askPrice > 0 ? toDisplay(row.askPrice, "price", unit) : 0;
  const floorDisplay = row.floorPrice > 0 ? toDisplay(row.floorPrice, "price", unit) : 0;
  const subtotal = row.qty * row.askPrice; // in $/kg × kg = $

  const handleQty = (v: string) => {
    const n = parseFloat(v) || 0;
    onChange({ qty: n > 0 ? fromDisplay(n, "weight", unit) : 0 });
  };
  const handleAsk = (v: string) => {
    const n = parseFloat(v) || 0;
    onChange({ askPrice: n > 0 ? fromDisplay(n, "price", unit) : 0 });
  };
  const handleFloor = (v: string) => {
    const n = parseFloat(v) || 0;
    onChange({ floorPrice: n > 0 ? fromDisplay(n, "price", unit) : 0 });
  };

  const inputCls = (err: boolean) =>
    cn("h-8 text-xs", err && "border-destructive/60 focus-visible:ring-destructive/30");

  return (
    <tr className="border-t border-border align-top">
      <td className="px-2 py-2">
        <PhotoCell
          previewUrl={row.photoPreviewUrl ?? catalogPhotoUrl}
          canRemove={!!row.photoPreviewUrl}
          onPick={(f) => {
            if (row.photoPreviewUrl) URL.revokeObjectURL(row.photoPreviewUrl);
            onChange({
              photoFile: f,
              photoPreviewUrl: f ? URL.createObjectURL(f) : null,
            });
          }}
        />
      </td>
      <td className="px-2 py-2">
        <select
          className="h-8 w-full rounded-md border border-border bg-card px-1 text-xs"
          value={row.protein ?? ""}
          onChange={(e) => onChange({ protein: e.target.value || null, cutId: null, cutName: "" })}
        >
          <option value="">{tk("col.proteinPh", "—")}</option>
          {proteinOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <BrandPicker
          companyId={companyId}
          value={{ id: row.brandId, name: row.brandName }}
          onChange={(b) => onChange({ brandId: b.id, brandName: b.name })}
        />
      </td>
      <td className="px-2 py-2">
        <select
          className={cn(
            "h-8 w-full rounded-md border border-border bg-card px-1 text-xs",
            errors.cut && "border-destructive/60",
          )}
          value={row.cutId ?? ""}
          disabled={!row.protein || cutsLoading}
          onChange={(e) => {
            const id = e.target.value || null;
            const found = catalog.find((c) => c.id === id);
            onChange({
              cutId: id,
              cutName: found?.displayName ?? "",
              // Prefill spec from catalog when row spec is empty
              spec: row.spec || (found?.bone_spec ?? ""),
            });
          }}
        >
          <option value="">
            {!row.protein ? tk("col.pickProteinFirst", "Pick protein first") : cutsLoading ? tk("loading", "Loading…") : tk("col.pickCut", "Pick cut…")}
          </option>
          {/* Orphan cut (prefilled from Edit/Clone but not in current
              catalog, e.g. region mismatch) — render a synthetic option so
              the saved cut name is still visible. */}
          {row.cutId && row.cutName && !catalog.some((c) => c.id === row.cutId) && (
            <option value={row.cutId}>
              {row.cutName} (other region)
            </option>
          )}
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>{c.displayName}</option>
          ))}
        </select>
        {/* Aging + (US-only) USDA Grade — inline below cut select; replaces the
             dedicated columns. Read-only display is rendered via formatCutMeta()
             in buyer views and mobile cards. */}
        <div className="mt-1 flex gap-1">
          <select
            className="h-7 flex-1 rounded-md border border-border bg-card px-1 text-[11px] text-muted-foreground"
            value={row.agingMethod ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ agingMethod: v === "wet" || v === "dry" ? v : null });
            }}
          >
            <option value="">{tkCuts("aging.none", "Aging —")}</option>
            <option value="wet">{tkCuts("aging.wet", "Wet Aged")}</option>
            <option value="dry">{tkCuts("aging.dry", "Dry Aged")}</option>
          </select>
          {cutRegion === "us" && (
            <select
              className="h-7 flex-1 rounded-md border border-border bg-card px-1 text-[11px] text-muted-foreground"
              value={row.usGrade ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const valid = ["Prime", "Choice", "Select", "Non Roll", "Ungraded"];
                onChange({ usGrade: valid.includes(v) ? (v as CutRow["usGrade"]) : null });
              }}
            >
              <option value="">{tkCuts("usGrade.none", "Grade —")}</option>
              <option value="Prime">{tkCuts("usGrade.prime", "Prime")}</option>
              <option value="Choice">{tkCuts("usGrade.choice", "Choice")}</option>
              <option value="Select">{tkCuts("usGrade.select", "Select")}</option>
              <option value="Non Roll">{tkCuts("usGrade.nonRoll", "Non Roll")}</option>
              <option value="Ungraded">{tkCuts("usGrade.ungraded", "Ungraded")}</option>
            </select>
          )}
        </div>
        {(() => {
          const meta = formatCutMeta(row, t);
          return meta.length > 0 ? (
            <div className="mt-1 text-[10px] text-muted-foreground">{meta.join(" · ")}</div>
          ) : null;
        })()}
      </td>
      <td className="px-2 py-2">
        <select
          className="h-8 w-full rounded-md border border-border bg-card px-1 text-xs"
          value={row.spec}
          onChange={(e) => onChange({ spec: e.target.value })}
        >
          <option value="">—</option>
          {SPEC_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <select
          className="h-8 w-full rounded-md border border-border bg-card px-1 text-xs"
          value={row.packing}
          onChange={(e) => onChange({ packing: e.target.value })}
        >
          <option value="">—</option>
          {PACKING_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        {plants.length > 0 ? (
          <select
            className={cn(
              "h-8 w-full rounded-md border border-border bg-card px-1 text-xs",
              errors.plant && "border-destructive/60",
            )}
            value={row.plantId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const p = plants.find((x) => x.id === id);
              onChange({
                plantId: id,
                plantNumber: p ? (p.plant_number || p.name || "") : "",
              });
            }}
          >
            <option value="">{tk("col.pickPlant", "Pick plant…")}</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.plant_number || p.name || p.id}
              </option>
            ))}
          </select>
        ) : (
          <Input
            className="h-8 text-xs"
            placeholder={tk("col.plantPh", "Plant #")}
            value={row.plantNumber}
            onChange={(e) => onChange({ plantNumber: e.target.value, plantId: null })}
          />
        )}
      </td>
      <td className="px-2 py-2">
        <Input
          className="h-8 text-xs"
          placeholder={tk("col.notesPh", "Notes…")}
          value={row.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </td>
      <td className="px-2 py-2">
        <NumberCell
          value={qtyDisplay}
          fractionDigits={2}
          minFractionDigits={0}
          onCommit={(s) => handleQty(s)}
          className={cn(inputCls(errors.qty), "text-right tabular-nums")}
        />
      </td>
      <td className="px-2 py-2">
        <NumberCell
          value={askDisplay}
          fractionDigits={2}
          minFractionDigits={2}
          onCommit={(s) => handleAsk(s)}
          className={cn(inputCls(errors.ask), "text-right tabular-nums")}
        />
      </td>
      <td className="px-2 py-2">
        <NumberCell
          value={floorDisplay}
          fractionDigits={2}
          minFractionDigits={2}
          onCommit={(s) => handleFloor(s)}
          className={cn(inputCls(errors.floor), "text-right tabular-nums")}
          title={errors.floor ? tk("col.floorErr", "Floor must be ≤ Ask") : undefined}
        />
      </td>
      <td className="px-2 py-2 text-right">
        <div className="text-xs font-semibold tabular-nums">
          {subtotal > 0 ? `$${fmtNum(subtotal, 0)}` : "—"}
        </div>
        <div className="mt-1">
          <FilesCell
            files={row.files}
            onAdd={(f) =>
              onChange({
                files: [...row.files, { file: f, previewUrl: URL.createObjectURL(f) }],
              })
            }
            onRemove={(idx) => {
              const removed = row.files[idx];
              if (removed) URL.revokeObjectURL(removed.previewUrl);
              onChange({ files: row.files.filter((_, i) => i !== idx) });
            }}
          />
        </div>
      </td>
      <td className="px-1 py-2 text-center">
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
          title={tk("removeRow", "Remove cut")}
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}