import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Trash2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";

import { useCompanyPlants } from "@/hooks/useCompanyPlants";
import { useCutsCatalog } from "@/hooks/useCutsCatalog";
import { BrandPicker } from "@/components/supplier/CreateOfferV2/BrandPicker";
import {
  PROTEINS,
  PACKING_OPTIONS,
  SPEC_OPTIONS,
  emptyCutRow,
  type CutRow,
} from "@/lib/cutRowTypes";
import { fromDisplay, toDisplay, weightLabel, priceLabel, type WeightUnit } from "@/lib/units";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  mode: "new" | "edit";
  value?: CutRow;
  cutRegion: "global" | "us";
  unit: WeightUnit;
  supplierContextId: string | null;
  onSave: (cut: CutRow) => void;
  onDelete?: () => void;
};

export function CutSheetMobile({
  open,
  onOpenChange,
  mode,
  value,
  cutRegion,
  unit,
  supplierContextId,
  onSave,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.mobile.cut.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;

  const [draft, setDraft] = useState<CutRow>(() => value ?? emptyCutRow());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) setDraft(value ?? emptyCutRow());
  }, [open, value]);

  const { plants } = useCompanyPlants(supplierContextId);
  const { cuts: catalog, loading: cutsLoading } = useCutsCatalog(draft.protein, cutRegion);

  const selectedCatalogCut = useMemo(
    () => (draft.cutId ? catalog.find((c) => c.id === draft.cutId) : null),
    [catalog, draft.cutId],
  );
  const catalogPhotoUrl = selectedCatalogCut?.image_url ?? null;
  const displayedPhoto = draft.photoPreviewUrl ?? catalogPhotoUrl;

  const patch = (p: Partial<CutRow>) => setDraft((prev) => ({ ...prev, ...p }));

  // --- input handlers w/ unit conversion (mirror desktop) ---
  const qtyDisplay = draft.qty > 0 ? toDisplay(draft.qty, "weight", unit) : 0;
  const askDisplay = draft.askPrice > 0 ? toDisplay(draft.askPrice, "price", unit) : 0;
  const floorDisplay = draft.floorPrice > 0 ? toDisplay(draft.floorPrice, "price", unit) : 0;

  const onQty = (s: string) => {
    const n = parseFloat(s) || 0;
    patch({ qty: n > 0 ? fromDisplay(n, "weight", unit) : 0 });
  };
  const onAsk = (s: string) => {
    const n = parseFloat(s) || 0;
    patch({ askPrice: n > 0 ? fromDisplay(n, "price", unit) : 0 });
  };
  const onFloor = (s: string) => {
    const n = parseFloat(s) || 0;
    patch({ floorPrice: n > 0 ? fromDisplay(n, "price", unit) : 0 });
  };

  const subtotal = draft.qty * draft.askPrice;
  const floorOverAsk = draft.floorPrice > 0 && draft.floorPrice > draft.askPrice;
  const plantsRequired = plants.length > 0;
  const plantMissing = plantsRequired && !draft.plantId;
  const saveDisabled =
    !draft.cutName || !(draft.qty > 0) || !(draft.askPrice > 0) || floorOverAsk || plantMissing;

  const handlePhotoPick = (file: File | null) => {
    if (draft.photoPreviewUrl) URL.revokeObjectURL(draft.photoPreviewUrl);
    patch({
      photoFile: file,
      photoPreviewUrl: file ? URL.createObjectURL(file) : null,
    });
  };

  const handleSave = () => {
    if (saveDisabled) return;
    onSave(draft);
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete?.();
    setConfirmDelete(false);
    onOpenChange(false);
  };

  // --- header subtitle ---
  const subtitleParts: string[] = [];
  if (value?.protein) subtitleParts.push(value.protein);
  if (value?.brandName) subtitleParts.push(value.brandName);
  if (value?.plantNumber) subtitleParts.push(tk("subtitle.plant", "plant {{n}}", { n: value.plantNumber }));

  const title = mode === "new" ? tk("title.new", "Add cut") : value?.cutName || tk("title.editFallback", "Edit cut");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[95vh] flex-col rounded-t-3xl p-0">
          <div className="flex shrink-0 justify-center pt-2">
            <div className="h-1 w-9 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="shrink-0 border-b px-4 pb-2 pt-2 text-left">
            <SheetTitle className="truncate">{title}</SheetTitle>
            {subtitleParts.length > 0 && (
              <p className="text-xs text-muted-foreground">{subtitleParts.join(" · ")}</p>
            )}
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Photo */}
            <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-muted">
              {displayedPhoto ? (
                <img src={displayedPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground">
                  🥩
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoPick(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 flex h-10 items-center gap-1.5 rounded-full bg-black/60 px-3 text-xs font-medium text-white backdrop-blur active:bg-black/80"
              >
                <Camera size={14} />
                {displayedPhoto ? tk("photo.change", "Change photo") : tk("photo.add", "Add photo")}
              </button>
              {draft.photoPreviewUrl && (
                <button
                  type="button"
                  onClick={() => handlePhotoPick(null)}
                  className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white active:bg-black/80"
                  aria-label="Remove photo"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Form */}
            <div className="space-y-3">
              {/* Protein + Brand */}
              <div className="grid grid-cols-2 gap-2">
                <Field label={tk("field.protein", "Protein")}>
                  <NativeSelect
                    value={draft.protein ?? ""}
                    onChange={(v) => patch({ protein: v || null, cutId: null, cutName: "" })}
                  >
                    <option value="">{tk("field.protein.ph", "—")}</option>
                    {PROTEINS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={tk("field.brand", "Brand")}>
                  <BrandPicker
                    companyId={supplierContextId}
                    value={{ id: draft.brandId, name: draft.brandName }}
                    onChange={(b) => patch({ brandId: b.id, brandName: b.name })}
                  />
                </Field>
              </div>

              {/* Cut (item) */}
              <Field label={tk("field.cut", "Item / cut")} error={!draft.cutName}>
                <NativeSelect
                  value={draft.cutId ?? ""}
                  disabled={!draft.protein || cutsLoading}
                  onChange={(v) => {
                    const id = v || null;
                    const found = catalog.find((c) => c.id === id);
                    patch({
                      cutId: id,
                      cutName: found?.displayName ?? "",
                      spec: draft.spec || (found?.bone_spec ?? ""),
                    });
                  }}
                  invalid={!draft.cutName}
                >
                  <option value="">
                    {!draft.protein
                      ? tk("field.cut.pickProtein", "Pick protein first")
                      : cutsLoading
                        ? tk("field.cut.loading", "Loading…")
                        : tk("field.cut.pick", "Pick cut…")}
                  </option>
                  {draft.cutId && draft.cutName && !catalog.some((c) => c.id === draft.cutId) && (
                    <option value={draft.cutId}>{draft.cutName} (other region)</option>
                  )}
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              {/* Spec + Packing */}
              <div className="grid grid-cols-2 gap-2">
                <Field label={tk("field.spec", "Spec")}>
                  <NativeSelect value={draft.spec} onChange={(v) => patch({ spec: v })}>
                    <option value="">—</option>
                    {SPEC_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={tk("field.packing", "Packing")}>
                  <NativeSelect value={draft.packing} onChange={(v) => patch({ packing: v })}>
                    <option value="">—</option>
                    {PACKING_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              {/* Plant */}
              <Field
                label={tk("field.plant", "Plant #")}
                error={plantMissing}
                hint={
                  plantMissing
                    ? tk("field.plant.required", "Pick a plant for this cut.")
                    : undefined
                }
              >
                {plants.length > 0 ? (
                  <NativeSelect
                    value={draft.plantId ?? ""}
                    invalid={plantMissing}
                    onChange={(v) => {
                      const id = v || null;
                      const p = plants.find((x) => x.id === id);
                      patch({
                        plantId: id,
                        plantNumber: p ? p.plant_number || p.name || "" : "",
                      });
                    }}
                  >
                    <option value="">{tk("field.plant.pick", "Pick plant…")}</option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.plant_number || p.name || p.id}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    className="h-11 text-base"
                    placeholder={tk("field.plant.ph", "Plant #")}
                    value={draft.plantNumber}
                    onChange={(e) => patch({ plantNumber: e.target.value, plantId: null })}
                  />
                )}
              </Field>

              {/* Aging method */}
              <Field label={tk("field.aging", "Aging method")}>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { v: null, label: tk("field.aging.none", "—") },
                      { v: "wet", label: tk("field.aging.wet", "Wet Aged") },
                      { v: "dry", label: tk("field.aging.dry", "Dry Aged") },
                    ] as const
                  ).map((opt) => {
                    const active = (draft.agingMethod ?? null) === opt.v;
                    return (
                      <button
                        key={String(opt.v)}
                        type="button"
                        onClick={() => patch({ agingMethod: opt.v })}
                        className={cn(
                          "min-h-[44px] rounded-md border text-sm font-medium",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* USDA Grade (gated by cutRegion === "us") */}
              {cutRegion === "us" && (
                <Field label={tk("field.usGrade", "USDA Grade")}>
                  <NativeSelect
                    value={draft.usGrade ?? ""}
                    onChange={(v) => {
                      const valid = ["Prime", "Choice", "Select", "Non Roll", "Ungraded"];
                      patch({ usGrade: valid.includes(v) ? (v as CutRow["usGrade"]) : null });
                    }}
                  >
                    <option value="">{tk("field.usGrade.none", "—")}</option>
                    <option value="Prime">{tk("field.usGrade.prime", "Prime")}</option>
                    <option value="Choice">{tk("field.usGrade.choice", "Choice")}</option>
                    <option value="Select">{tk("field.usGrade.select", "Select")}</option>
                    <option value="Non Roll">{tk("field.usGrade.nonRoll", "Non Roll")}</option>
                    <option value="Ungraded">{tk("field.usGrade.ungraded", "Ungraded")}</option>
                  </NativeSelect>
                </Field>
              )}

              {/* Notes */}
              <Field label={tk("field.notes", "Notes")}>
                <Textarea
                  className="min-h-[80px] text-base"
                  placeholder={tk("field.notes.ph", "Optional notes about this cut")}
                  value={draft.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                />
              </Field>

              {/* PRICING */}
              <div className="pt-2">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tk("pricing.title", "Pricing")}
                </h3>
                <div className="space-y-3 rounded-xl border bg-card p-3">
                  <Field label={tk("pricing.qty", "Quantity ({{unit}})", { unit: weightLabel(unit) })} error={!(draft.qty > 0)}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="h-11 text-base"
                      value={qtyDisplay || ""}
                      onChange={(e) => onQty(e.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={tk("pricing.ask", "Ask {{u}}", { u: priceLabel(unit) })} error={!(draft.askPrice > 0)}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="h-11 text-base"
                        value={askDisplay || ""}
                        onChange={(e) => onAsk(e.target.value)}
                      />
                    </Field>
                    <Field
                      label={tk("pricing.floor", "Floor {{u}}", { u: priceLabel(unit) })}
                      error={floorOverAsk}
                      hint={floorOverAsk ? tk("pricing.floorErr", "Floor must be ≤ Ask") : undefined}
                    >
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="h-11 text-base"
                        value={floorDisplay || ""}
                        onChange={(e) => onFloor(e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {tk("pricing.subtotal", "Subtotal")}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {subtotal > 0
                        ? `$${subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="shrink-0 border-t bg-background px-4 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
          >
            <div className="flex gap-2.5">
              {mode === "edit" && onDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 basis-[30%] border-destructive text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  {tk("delete", "Delete")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 basis-[30%] text-base"
                  onClick={() => onOpenChange(false)}
                >
                  {tk("cancel", "Cancel")}
                </Button>
              )}
              <Button
                type="button"
                className="h-12 flex-1 bg-primary text-base text-primary-foreground"
                disabled={saveDisabled}
                onClick={handleSave}
              >
                {tk("save", "Save cut")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tk("deleteModal.title", "Delete this cut?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tk("deleteModal.body", "This cut will be removed from the offer. You can add it back later.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tk("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tk("delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CutSheetMobile;

// ---------- Small UI atoms ----------
function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && (
        <p className={cn("mt-1 text-[11px]", error ? "text-destructive" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  children,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full rounded-md border bg-background px-3 text-base",
        invalid ? "border-destructive/60" : "border-border",
        disabled && "opacity-60",
      )}
    >
      {children}
    </select>
  );
}