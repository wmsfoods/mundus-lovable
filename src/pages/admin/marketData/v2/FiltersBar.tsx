import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronsUpDown, X, Info, Bookmark, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { HS_CATEGORY_LABELS, type HsCategory, type PanelFilters } from "./types";
import { searchEntity, usePanel } from "./usePanel";
import { addSaved, loadSaved, removeSaved, type SavedSearch } from "./savedSearches";

type Preset = "12m" | "24m" | "ytd" | "all" | "custom";
const PRESETS: { key: Preset; label: string }[] = [
  { key: "12m", label: "12M" },
  { key: "24m", label: "24M" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "Desde 2019" },
  { key: "custom", label: "Personalizado" },
];

function ymNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymShift(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function presetRange(p: Preset): { from?: string; to?: string } {
  const to = ymNow();
  if (p === "12m") return { from: ymShift(11), to };
  if (p === "24m") return { from: ymShift(23), to };
  if (p === "ytd") return { from: `${new Date().getFullYear()}-01`, to };
  if (p === "all") return { from: "2019-01", to };
  return {};
}

function MultiCombo({
  label, options, values, onChange, placeholder,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) => onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o]);
  return (
    <div className="space-y-1 min-w-[160px]">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9">
            <span className="truncate text-xs">
              {values.length === 0 ? placeholder : `${values.length} selecionado(s)`}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar..." />
            <CommandList>
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o} onSelect={() => toggle(o)}>
                    <Check className={cn("mr-2 h-4 w-4", values.includes(o) ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{o}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function EntityAutocomplete({
  label, entity, value, onChange, placeholder,
}: {
  label: string;
  entity: "shipper" | "consignee";
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    if (q.length < 2) { setOpts([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchEntity(entity, q);
      if (!cancel) { setOpts(r); setLoading(false); }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, entity]);

  return (
    <div className="space-y-1 min-w-[180px]">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal h-9">
            <span className="truncate text-xs">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Digite ao menos 2 letras…" value={q} onValueChange={setQ} />
            <CommandList>
              {loading && <div className="p-2 text-xs text-muted-foreground">Buscando…</div>}
              {!loading && q.length >= 2 && !opts.length && <CommandEmpty>Nenhum resultado.</CommandEmpty>}
              <CommandGroup>
                {value && (
                  <CommandItem onSelect={() => { onChange(undefined); setOpen(false); setQ(""); }}>
                    <X className="mr-2 h-4 w-4" /> Limpar
                  </CommandItem>
                )}
                {opts.map((o) => (
                  <CommandItem key={o} onSelect={() => { onChange(o); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", value === o ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{o}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function useIntrospectDistincts(): { destCountries: string[]; polPorts: string[] } {
  const [d, setD] = useState({ destCountries: [] as string[], polPorts: [] as string[] });
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("agrostats-market-data", {
          body: { action: "introspect", forceRefresh: false },
        });
        const dist = (data as any)?.distincts ?? {};
        setD({
          destCountries: (dist["Place_and_Ports/DEST_Country"] ?? []).slice().sort((a: string, b: string) => a.localeCompare(b, "pt-BR")),
          polPorts: (dist["Place_and_Ports/POL_Name"] ?? []).slice().sort((a: string, b: string) => a.localeCompare(b, "pt-BR")),
        });
      } catch { /* noop */ }
    })();
  }, []);
  return d;
}

export function FiltersBar({
  value, onApply, activeTab,
}: {
  value: PanelFilters;
  onApply: (next: PanelFilters) => void;
  activeTab: string;
}) {
  const [preset, setPreset] = useState<Preset>("12m");
  const [draft, setDraft] = useState<PanelFilters>(value);
  const [saved, setSaved] = useState<SavedSearch[]>(() => loadSaved());
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const { destCountries, polPorts } = useIntrospectDistincts();

  useEffect(() => { setDraft(value); }, [JSON.stringify(value)]);

  // Top HS8 list scoped to current categories (limit 50)
  const hsTop = usePanel<{ rows: { name: string }[] }>(
    { panel: "top", filters: { ...draft, hs8: undefined }, dimension: "hs8", metric: "volume", limit: 50 },
    [draft.hsCategory?.join(","), draft.from, draft.to, draft.destCountry?.join(","), draft.polPort?.join(",")],
  );
  const hsOptions = useMemo(() => (hsTop.data?.rows ?? []).map((r) => r.name).filter(Boolean), [hsTop.data]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = presetRange(p);
      const next = { ...draft, ...r };
      setDraft(next); onApply(next);
    }
  };

  const apply = () => onApply(draft);
  const clearAll = () => {
    const cleared: PanelFilters = { from: draft.from, to: draft.to, realOwnerOnly: true };
    setDraft(cleared); onApply(cleared);
  };

  const setCat = (cat: HsCategory) => {
    const arr = cat === "all" ? [] : [cat];
    const next = { ...draft, hsCategory: arr.length ? arr : undefined, hs8: undefined };
    setDraft(next); onApply(next);
  };
  const currentCat: HsCategory = draft.hsCategory?.[0] ?? "all";

  const removeMulti = (k: keyof PanelFilters, item: string) => {
    const arr = ((draft[k] as string[] | undefined) ?? []).filter((v) => v !== item);
    const next = { ...draft, [k]: arr.length ? arr : undefined };
    setDraft(next); onApply(next);
  };
  const removeScalar = (k: keyof PanelFilters) => {
    const next = { ...draft, [k]: undefined };
    setDraft(next); onApply(next);
  };

  const chips: { label: string; onRemove: () => void }[] = [];
  if (draft.hsCategory?.length) chips.push({ label: `Categoria: ${HS_CATEGORY_LABELS[draft.hsCategory[0]]}`, onRemove: () => setCat("all") });
  (draft.hs8 ?? []).forEach((v) => chips.push({ label: `HS8: ${v.split(" - ")[0]}`, onRemove: () => removeMulti("hs8", v) }));
  (draft.destCountry ?? []).forEach((v) => chips.push({ label: `Destino: ${v}`, onRemove: () => removeMulti("destCountry", v) }));
  (draft.polPort ?? []).forEach((v) => chips.push({ label: `Porto BR: ${v}`, onRemove: () => removeMulti("polPort", v) }));
  if (draft.shipperName) chips.push({ label: `Exportador: ${draft.shipperName}`, onRemove: () => removeScalar("shipperName") });
  if (draft.consigneeName) chips.push({ label: `Comprador: ${draft.consigneeName}`, onRemove: () => removeScalar("consigneeName") });
  if (draft.realOwnerOnly === false) chips.push({ label: "Inclui trading", onRemove: () => { const n = { ...draft, realOwnerOnly: true }; setDraft(n); onApply(n); } });

  const handleSave = () => {
    const name = saveName.trim() || `Busca ${saved.length + 1}`;
    setSaved(addSaved({ name, filters: draft, activeTab }));
    setSaveName(""); setSaveOpen(false);
  };
  const handleApplySaved = (s: SavedSearch) => {
    setDraft(s.filters); onApply(s.filters);
  };

  return (
    <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur border-b border-border/60 space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => (
            <Button key={p.key} size="sm" variant={preset === p.key ? "default" : "outline"} className="h-8 px-3 text-xs"
              onClick={() => applyPreset(p.key)}>{p.label}</Button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="flex items-end gap-1.5">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">De (mês)</Label>
              <Input type="month" className="h-9 w-[140px]" value={draft.from ?? ""}
                onChange={(e) => setDraft({ ...draft, from: e.target.value || undefined })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Até</Label>
              <Input type="month" className="h-9 w-[140px]" value={draft.to ?? ""}
                onChange={(e) => setDraft({ ...draft, to: e.target.value || undefined })} />
            </div>
          </div>
        )}

        <div className="space-y-1 min-w-[180px]">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Categoria</Label>
          <Select value={currentCat} onValueChange={(v) => setCat(v as HsCategory)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(HS_CATEGORY_LABELS) as HsCategory[]).map((k) => (
                <SelectItem key={k} value={k} className="text-xs">{HS_CATEGORY_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <MultiCombo label="HS8 (refinar)" options={hsOptions}
          values={draft.hs8 ?? []} onChange={(v) => setDraft({ ...draft, hs8: v.length ? v : undefined })}
          placeholder="Todos" />

        <MultiCombo label="País destino" options={destCountries}
          values={draft.destCountry ?? []} onChange={(v) => setDraft({ ...draft, destCountry: v.length ? v : undefined })}
          placeholder="Todos" />

        <MultiCombo label="Porto BR" options={polPorts}
          values={draft.polPort ?? []} onChange={(v) => setDraft({ ...draft, polPort: v.length ? v : undefined })}
          placeholder="Todos" />

        <EntityAutocomplete label="Exportador" entity="shipper" value={draft.shipperName}
          onChange={(v) => setDraft({ ...draft, shipperName: v })} placeholder="Qualquer" />
        <EntityAutocomplete label="Comprador" entity="consignee" value={draft.consigneeName}
          onChange={(v) => setDraft({ ...draft, consigneeName: v })} placeholder="Qualquer" />

        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            Somente dono real
            <TooltipProvider><Tooltip>
              <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Exclui tradings e intermediários — mantém apenas registros onde Exportador e Comprador são marcados como "REAL DONO".
              </TooltipContent>
            </Tooltip></TooltipProvider>
          </Label>
          <div className="h-9 flex items-center px-2">
            <Switch checked={draft.realOwnerOnly !== false}
              onCheckedChange={(v) => { const n = { ...draft, realOwnerOnly: v }; setDraft(n); onApply(n); }} />
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button size="sm" className="h-9" onClick={apply}>Aplicar</Button>
          <Button size="sm" variant="ghost" className="h-9" onClick={clearAll}>Limpar</Button>
          <Popover open={saveOpen} onOpenChange={setSaveOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-1"><Bookmark className="h-3.5 w-3.5" />Salvas</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3 space-y-3" align="end">
              <div className="space-y-1">
                <Label className="text-xs">Salvar busca atual</Label>
                <div className="flex gap-1">
                  <Input className="h-8 text-xs" placeholder="Nome…" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
                  <Button size="sm" className="h-8 gap-1" onClick={handleSave}><Save className="h-3 w-3" />Salvar</Button>
                </div>
              </div>
              <div className="space-y-1 max-h-[260px] overflow-auto">
                {!saved.length && <p className="text-xs text-muted-foreground">Nenhuma busca salva ainda.</p>}
                {saved.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded hover:bg-muted/60">
                    <button className="text-left flex-1 truncate" onClick={() => handleApplySaved(s)} title={`Aba: ${s.activeTab}`}>
                      {s.name} <span className="text-muted-foreground">· {s.activeTab}</span>
                    </button>
                    <button onClick={() => setSaved(removeSaved(s.id))}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" /></button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-[11px]">
              {c.label}
              <button onClick={c.onRemove} className="ml-1 rounded hover:bg-muted-foreground/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}