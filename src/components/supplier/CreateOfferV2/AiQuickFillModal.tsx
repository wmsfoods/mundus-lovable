import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, HelpCircle, Plus, X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiParseOffer, type ParsedOfferPayload, type MatchStatus } from "@/hooks/useAiParseOffer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  supplierId: string | null;
  onApply: (payload: ParsedOfferPayload) => void;
};

function MatchBadge({ status, tk }: { status: MatchStatus; tk: (k: string, fb: string) => string }) {
  if (status === "none") return null;
  const map = {
    exact: { cls: "bg-green-100 text-green-800 border-green-300", Icon: CheckCircle2, label: tk("badge.exact", "Matched") },
    fuzzy: { cls: "bg-amber-100 text-amber-800 border-amber-300", Icon: HelpCircle, label: tk("badge.fuzzy", "Possible match") },
    not_found: { cls: "bg-red-100 text-red-800 border-red-300", Icon: AlertCircle, label: tk("badge.notFound", "Not registered") },
  } as const;
  const m = map[status as keyof typeof map];
  if (!m) return null;
  const I = m.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", m.cls)}>
      <I size={10} />
      {m.label}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-28 shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

type ItemOverride = {
  skip: boolean;
  cutId: string | null;
  cutName: string;
  cutMatch: MatchStatus;
  plantId: string | null;
  plantNumber: string;
  plantMatch: MatchStatus;
  plantNameDraft: string;
};

function useAllCuts(enabled: boolean) {
  return useQuery({
    queryKey: ["ai-quickfill-all-cuts"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cuts")
        .select("id,name,category,bone_spec")
        .eq("is_active", true)
        .order("name")
        .limit(1500);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; category: string; bone_spec: string }>;
    },
  });
}

export function AiQuickFillModal({ open, onOpenChange, supplierId, onApply }: Props) {
  const { t } = useTranslation();
  const { isAdmin } = useIsMundusAdmin();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedOfferPayload | null>(null);
  const mutation = useAiParseOffer();

  // Editable state derived from preview
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [brandMatch, setBrandMatch] = useState<MatchStatus>("none");
  const [brandDraft, setBrandDraft] = useState<string>("");
  const [brandSkip, setBrandSkip] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);

  const [itemOverrides, setItemOverrides] = useState<ItemOverride[]>([]);
  const [creatingPlantIdx, setCreatingPlantIdx] = useState<number | null>(null);
  const allCuts = useAllCuts(!!preview);

  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.quickFill.${k}`, { defaultValue: fb }) as string;

  const reset = () => {
    setText("");
    setPreview(null);
    mutation.reset();
    setBrandId(null); setBrandName(""); setBrandMatch("none"); setBrandDraft(""); setBrandSkip(false);
    setItemOverrides([]);
  };

  const handleClose = (b: boolean) => {
    if (!b) reset();
    onOpenChange(b);
  };

  const handleParse = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      toast.error(tk("tooShort", "Please paste at least 20 characters."));
      return;
    }
    try {
      const result = await mutation.mutateAsync({ text: trimmed, supplierId });
      setPreview(result);
      setBrandId(result.brand.id);
      setBrandName(result.brand.name ?? "");
      setBrandMatch(result.brand.match);
      setBrandDraft(result.brand.name ?? "");
      setBrandSkip(false);
      setItemOverrides(
        result.items.map((it) => ({
          skip: false,
          cutId: it.cut.id,
          cutName: it.cut.name ?? it.cutName,
          cutMatch: it.cut.match,
          plantId: it.plant.plantId,
          plantNumber: it.plant.plantNumber ?? "",
          plantMatch: it.plant.match,
          plantNameDraft: "",
        })),
      );
    } catch (e: any) {
      toast.error(e?.message || tk("error", "Failed to parse — try again."));
    }
  };

  const handleCreateBrand = async () => {
    if (!supplierId) { toast.error("No supplier company"); return; }
    const name = brandDraft.trim();
    if (!name) return;
    setCreatingBrand(true);
    try {
      // Try insert; if duplicate, fetch existing.
      const { data, error } = await supabase
        .from("supplier_brands")
        .insert({ company_id: supplierId, name })
        .select("id,name")
        .single();
      if (error) {
        if ((error as any).code === "23505") {
          const { data: ex } = await supabase
            .from("supplier_brands").select("id,name").eq("company_id", supplierId).ilike("name", name).maybeSingle();
          if (ex) {
            setBrandId(ex.id); setBrandName(ex.name); setBrandMatch("exact");
            toast.success(tk("brand.created", "Brand ready"));
            return;
          }
        }
        throw error;
      }
      setBrandId(data.id); setBrandName(data.name); setBrandMatch("exact");
      toast.success(tk("brand.created", "Brand created"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to create brand");
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleCreatePlant = async (idx: number) => {
    if (!supplierId) { toast.error("No supplier company"); return; }
    const ov = itemOverrides[idx];
    const plantNumber = ov.plantNumber.trim();
    const plantName = ov.plantNameDraft.trim() || plantNumber || `Plant ${plantNumber}`;
    if (!plantNumber) return;
    setCreatingPlantIdx(idx);
    try {
      const { data, error } = await supabase
        .from("company_plants")
        .insert({ company_id: supplierId, plant_number: plantNumber, name: plantName, is_active: true })
        .select("id,plant_number")
        .single();
      if (error) throw error;
      setItemOverrides((prev) => prev.map((p, i) => i === idx
        ? { ...p, plantId: data.id, plantNumber: data.plant_number || plantNumber, plantMatch: "exact" }
        : p));
      // Propagate to other items with the same plant number
      setItemOverrides((prev) => prev.map((p) => p.plantNumber === plantNumber && !p.plantId
        ? { ...p, plantId: data.id, plantMatch: "exact" }
        : p));
      toast.success(tk("plant.created", "Plant created"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to create plant");
    } finally {
      setCreatingPlantIdx(null);
    }
  };

  const updateItem = (idx: number, patch: Partial<ItemOverride>) =>
    setItemOverrides((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const handleApply = () => {
    if (!preview) return;
    // Build a final payload patched with all user resolutions.
    const finalItems = preview.items
      .map((it, idx) => {
        const ov = itemOverrides[idx];
        if (!ov || ov.skip) return null;
        return {
          ...it,
          cutName: ov.cutName || it.cutName,
          cut: { ...it.cut, id: ov.cutId, name: ov.cutName, match: ov.cutMatch },
          plant: { ...it.plant, plantId: ov.plantId, plantNumber: ov.plantNumber, match: ov.plantMatch },
        };
      })
      .filter(Boolean) as ParsedOfferPayload["items"];
    const patched: ParsedOfferPayload = {
      ...preview,
      brand: brandSkip
        ? { ...preview.brand, id: null, name: null, match: "none" }
        : { ...preview.brand, id: brandId, name: brandName, match: brandMatch },
      items: finalItems,
    };
    onApply(patched);
    toast.success(tk("applied", "AI parsed data applied — review and adjust as needed."));
    reset();
    onOpenChange(false);
  };

  // --- STEP 1: paste ---
  if (!preview) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              {tk("title", "AI Quick-fill")}
            </DialogTitle>
            <DialogDescription>
              {tk("subtitle", "Paste an offer email, spec sheet, or any text — AI will parse and prefill the form.")}
            </DialogDescription>
          </DialogHeader>
          {isAdmin && (
            <p className="text-[11px] text-muted-foreground">
              📥 Need sample data?{" "}
              <a
                href="/admin/docs?tab=admin&doc=ai-quickfill-samples"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline"
              >
                Download templates →
              </a>
            </p>
          )}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tk("placeholder", "Paste here…")}
            rows={12}
            className="font-mono text-xs"
            disabled={mutation.isPending}
          />
          <p className="text-[11px] text-muted-foreground">
            {tk("hint", "AI will detect brand, plant, items, origin/destination ports, incoterms, freight and payment terms. You can adjust everything before saving.")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)} disabled={mutation.isPending}>
              {tk("cancel", "Cancel")}
            </Button>
            <Button onClick={handleParse} disabled={mutation.isPending || text.trim().length < 20}>
              {mutation.isPending ? (
                <><Loader2 size={14} className="mr-1 animate-spin" /> {tk("parsing", "Parsing…")}</>
              ) : (
                <><Sparkles size={14} className="mr-1" /> {tk("parse", "Parse with AI")}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // --- STEP 2: preview ---
  const p = preview;
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            {tk("previewTitle", "Review parsed data")}
          </DialogTitle>
          <DialogDescription>
            {tk("previewSubtitle", "Verify what AI extracted — green = matched, amber = possible match, red = not in your catalog. Click Apply to fill the form.")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {/* Brand */}
          <section className="rounded-lg border border-border bg-card p-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tk("section.brand", "Brand")}</h4>
            {p.brand.name ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{brandName || p.brand.name}</span>
                  <MatchBadge status={brandMatch} tk={tk} />
                  {brandSkip && <span className="text-[11px] text-muted-foreground italic">{tk("skipped", "skipped")}</span>}
                </div>
                {brandMatch === "not_found" && !brandSkip && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={brandDraft}
                      onChange={(e) => setBrandDraft(e.target.value)}
                      placeholder={tk("brand.namePlaceholder", "Brand name")}
                      className="h-8 max-w-xs text-xs"
                      disabled={creatingBrand}
                    />
                    <Button size="sm" variant="default" onClick={handleCreateBrand} disabled={creatingBrand || !brandDraft.trim()}>
                      {creatingBrand ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} className="mr-1" />}
                      {tk("brand.create", "Create")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setBrandSkip(true)}>
                      {tk("brand.skip", "Skip")}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{tk("none", "Not detected")}</p>
            )}
          </section>

          {/* Logistics */}
          <section className="rounded-lg border border-border bg-card p-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tk("section.logistics", "Logistics")}</h4>
            <Row label={tk("logistics.origin", "Origin")}>
              {p.origin.country ? (
                <span className="inline-flex items-center gap-1.5">
                  <span>{p.origin.country.flag} {p.origin.country.name}</span>
                  {p.origin.portName && <span className="text-muted-foreground">· {p.origin.portName}</span>}
                  <MatchBadge status={p.origin.country.match} tk={tk} />
                </span>
              ) : <span className="text-muted-foreground">—</span>}
            </Row>
            <Row label={tk("logistics.destinations", "Destinations")}>
              {p.destinations.length > 0 ? (
                <ul className="space-y-1">
                  {p.destinations.map((d, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-1.5">
                      <span>{d.country?.flag} {d.country?.name ?? "—"}</span>
                      {d.portNames.length > 0 && <span className="text-muted-foreground">· {d.portNames.join(", ")}</span>}
                      {d.country && <MatchBadge status={d.country.match} tk={tk} />}
                      {(d.freightUsd != null) && <span className="text-[11px] text-muted-foreground">· Frt ${d.freightUsd}</span>}
                      {(d.insuranceUsd != null) && <span className="text-[11px] text-muted-foreground">· Ins ${d.insuranceUsd}</span>}
                    </li>
                  ))}
                </ul>
              ) : <span className="text-muted-foreground">—</span>}
              {p.sameFreightGlobal && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {tk("logistics.sameFreight", "Same freight for all destinations")}: ${p.globalFreight ?? "?"} / Ins ${p.globalInsurance ?? "?"}
                </p>
              )}
            </Row>
            <Row label={tk("logistics.incoterms", "Incoterms")}>
              {p.incoterms.length > 0 ? p.incoterms.join(" · ") : <span className="text-muted-foreground">—</span>}
            </Row>
            <Row label={tk("logistics.container", "Container")}>
              {p.containerSize ? `${p.fclCount ?? 1} × ${p.containerSize}` : <span className="text-muted-foreground">—</span>}
              {p.temperature && <span className="ml-2 text-muted-foreground">· {p.temperature}</span>}
            </Row>
            <Row label={tk("logistics.shipment", "Shipment")}>
              {p.shipmentReady || <span className="text-muted-foreground">—</span>}
            </Row>
          </section>

          {/* Payment */}
          <section className="rounded-lg border border-border bg-card p-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tk("section.payment", "Payment terms")}</h4>
            {p.paymentTerms.label ? (
              <div className="flex items-center gap-2 text-sm">
                <span>{p.paymentTerms.label}</span>
                <MatchBadge status={p.paymentTerms.match} tk={tk} />
              </div>
            ) : <p className="text-xs text-muted-foreground">{tk("none", "Not detected")}</p>}
          </section>

          {/* Items */}
          <section className="rounded-lg border border-border bg-card p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tk("section.items", "Items")} ({p.items.length})
            </h4>
            {p.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">{tk("noItems", "No items detected")}</p>
            ) : (
              <ul className="space-y-2">
                {p.items.map((it, i) => {
                  const ov = itemOverrides[i];
                  if (!ov) return null;
                  return (
                    <li key={i} className={cn("rounded border p-2 text-xs", ov.skip ? "border-dashed border-muted bg-muted/20 opacity-60" : "border-border bg-background/40")}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground">{it.cutName || "—"}</span>
                        {it.protein && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{it.protein}</span>}
                        {it.spec && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{it.spec}</span>}
                        {it.packing && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{it.packing}</span>}
                        {ov.skip && <span className="text-[10px] italic text-muted-foreground">— {tk("skipped", "skipped")}</span>}
                        {!ov.skip && (
                          <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-[10px]" onClick={() => updateItem(i, { skip: true })}>
                            <X size={10} className="mr-0.5" /> {tk("cut.skip", "Skip")}
                          </Button>
                        )}
                        {ov.skip && (
                          <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-[10px]" onClick={() => updateItem(i, { skip: false })}>
                            {tk("undo", "Undo")}
                          </Button>
                        )}
                      </div>

                      {!ov.skip && (
                        <>
                          {/* Cut resolution */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{tk("item.cut", "Cut")}:</span>
                            <span className="text-foreground">{ov.cutName}</span>
                            <MatchBadge status={ov.cutMatch} tk={tk} />
                            {ov.cutMatch === "fuzzy" && it.cut.candidates.length > 0 && (
                              <>
                                <span className="text-[10px] text-muted-foreground">
                                  ({tk("cut.didYouMean", "Did you mean?")} {it.cut.candidates[0]?.score}%)
                                </span>
                                {it.cut.candidates.length > 1 && (
                                  <CutCandidatesDropdown
                                    candidates={it.cut.candidates}
                                    onPick={(c) => updateItem(i, { cutId: c.id, cutName: c.name, cutMatch: "exact" })}
                                    tk={tk}
                                  />
                                )}
                              </>
                            )}
                            {ov.cutMatch === "not_found" && (
                              <ManualCutPicker
                                cuts={allCuts.data ?? []}
                                loading={allCuts.isLoading}
                                currentName={ov.cutName}
                                onPick={(c) => updateItem(i, { cutId: c.id, cutName: c.name, cutMatch: "exact" })}
                                tk={tk}
                              />
                            )}
                          </div>

                          {/* Plant resolution */}
                          {it.plant.plantNumber && (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{tk("item.plant", "Plant")}:</span>
                              <span className="font-medium text-foreground">{ov.plantNumber}</span>
                              <MatchBadge status={ov.plantMatch} tk={tk} />
                              {ov.plantMatch === "not_found" && (
                                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                  <Input
                                    value={ov.plantNumber}
                                    onChange={(e) => updateItem(i, { plantNumber: e.target.value })}
                                    className="h-7 w-24 text-xs"
                                    placeholder="#"
                                  />
                                  <Input
                                    value={ov.plantNameDraft}
                                    onChange={(e) => updateItem(i, { plantNameDraft: e.target.value })}
                                    className="h-7 w-44 text-xs"
                                    placeholder={tk("plant.namePlaceholder", "Plant name (optional)")}
                                  />
                                  <Button size="sm" variant="default" className="h-7 px-2 text-[11px]"
                                    onClick={() => handleCreatePlant(i)}
                                    disabled={creatingPlantIdx === i || !ov.plantNumber.trim()}>
                                    {creatingPlantIdx === i ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} className="mr-0.5" />}
                                    {tk("plant.create", "Create")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                            {it.qtyKg != null && <span>{tk("item.qty", "Qty")}: <span className="text-foreground font-medium">{it.qtyKg.toLocaleString()} kg</span></span>}
                            {it.askPricePerKg != null && <span>{tk("item.price", "Ask")}: <span className="text-foreground font-medium">${it.askPricePerKg}/kg</span></span>}
                          </div>
                          {it.notes && <p className="mt-1 italic text-muted-foreground">{it.notes}</p>}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <p className="text-[10px] text-muted-foreground text-right">{tk("modelLabel", "Model")}: {p.model}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setPreview(null)}>
            {tk("back", "Back")}
          </Button>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            {tk("cancel", "Cancel")}
          </Button>
          <Button onClick={handleApply}>
            <CheckCircle2 size={14} className="mr-1" />
            {tk("apply", "Apply to form")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CutCandidatesDropdown({
  candidates, onPick, tk,
}: {
  candidates: Array<{ id: string; name: string; score: number }>;
  onPick: (c: { id: string; name: string }) => void;
  tk: (k: string, fb: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]">
          <ChevronsUpDown size={10} className="mr-0.5" />
          {tk("cut.tryOther", "Try other matches")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {candidates.map((c) => (
                <CommandItem key={c.id} value={c.name} onSelect={() => { onPick(c); setOpen(false); }}>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">{c.score}%</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ManualCutPicker({
  cuts, loading, currentName, onPick, tk,
}: {
  cuts: Array<{ id: string; name: string; category: string }>;
  loading: boolean;
  currentName: string;
  onPick: (c: { id: string; name: string }) => void;
  tk: (k: string, fb: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]">
          <ChevronsUpDown size={10} className="mr-0.5" />
          {tk("cut.manualSelect", "Manual select")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder={tk("cut.search", "Search cuts…")} defaultValue={currentName} />
          <CommandList>
            {loading ? (
              <div className="p-3 text-xs text-muted-foreground"><Loader2 size={12} className="inline animate-spin mr-1" />Loading…</div>
            ) : (
              <>
                <CommandEmpty>{tk("cut.noResults", "No cuts found")}</CommandEmpty>
                <CommandGroup>
                  {cuts.slice(0, 200).map((c) => (
                    <CommandItem key={c.id} value={`${c.name} ${c.category}`} onSelect={() => { onPick(c); setOpen(false); }}>
                      <span className="flex-1">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.category}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}