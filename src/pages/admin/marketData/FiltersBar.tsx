import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketFilters } from "./useReport";

type Preset = "12m" | "24m" | "ytd" | "all" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "12m", label: "12M" },
  { key: "24m", label: "24M" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "Desde 2019" },
  { key: "custom", label: "Personalizado" },
];

function todayIso() { return new Date().toISOString().slice(0, 10); }
function presetRange(p: Preset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const to = todayIso();
  if (p === "12m") {
    const d = new Date(now); d.setMonth(d.getMonth() - 12);
    return { dateFrom: d.toISOString().slice(0, 10), dateTo: to };
  }
  if (p === "24m") {
    const d = new Date(now); d.setMonth(d.getMonth() - 24);
    return { dateFrom: d.toISOString().slice(0, 10), dateTo: to };
  }
  if (p === "ytd") {
    return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: to };
  }
  if (p === "all") {
    return { dateFrom: "2019-01-01", dateTo: to };
  }
  return {};
}

function MultiCombo({
  label, options, values, onChange, placeholder,
}: { label: string; options: string[]; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) =>
    onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o]);
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9">
            <span className="truncate text-sm">
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

export function FiltersBar({
  value,
  onApply,
  options,
}: {
  value: MarketFilters;
  onApply: (next: MarketFilters) => void;
  options: { products: string[]; destCountries: string[]; shippers: string[]; consignees: string[] };
}) {
  const [preset, setPreset] = useState<Preset>("12m");
  const [draft, setDraft] = useState<MarketFilters>(value);

  // Sync external value into draft
  useEffect(() => { setDraft(value); }, [JSON.stringify(value)]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = presetRange(p);
      const next = { ...draft, ...r };
      setDraft(next);
      onApply(next);
    }
  };

  const apply = () => onApply(draft);
  const clear = () => {
    const cleared: MarketFilters = { dateFrom: draft.dateFrom, dateTo: draft.dateTo };
    setDraft(cleared);
    onApply(cleared);
  };

  const chips = useMemo(() => {
    const out: { label: string; onRemove: () => void }[] = [];
    const removeMulti = (k: keyof MarketFilters, item: string) => {
      const arr = ((draft[k] as string[] | undefined) ?? []).filter((v) => v !== item);
      const next = { ...draft, [k]: arr.length ? arr : undefined };
      setDraft(next); onApply(next);
    };
    (["products", "destCountries", "shippers", "consignees", "polPorts"] as const).forEach((k) => {
      (draft[k] ?? []).forEach((v) =>
        out.push({ label: `${labelFor(k)}: ${v}`, onRemove: () => removeMulti(k, v) }),
      );
    });
    return out;
  }, [draft, onApply]);

  return (
    <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur border-b border-border/60">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={preset === p.key ? "default" : "outline"}
              className="h-8 px-3"
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> De
              </Label>
              <Input type="date" className="h-9 w-[140px]" value={draft.dateFrom ?? ""}
                onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value || undefined })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Até</Label>
              <Input type="date" className="h-9 w-[140px]" value={draft.dateTo ?? ""}
                onChange={(e) => setDraft({ ...draft, dateTo: e.target.value || undefined })} />
            </div>
          </div>
        )}

        <div className="min-w-[180px] flex-1">
          <MultiCombo label="Produto (HS8)" options={options.products}
            values={draft.products ?? []} onChange={(v) => setDraft({ ...draft, products: v.length ? v : undefined })}
            placeholder="Todos" />
        </div>
        <div className="min-w-[180px] flex-1">
          <MultiCombo label="País destino" options={options.destCountries}
            values={draft.destCountries ?? []} onChange={(v) => setDraft({ ...draft, destCountries: v.length ? v : undefined })}
            placeholder="Todos" />
        </div>
        <div className="min-w-[180px] flex-1">
          <MultiCombo label="Exportador" options={options.shippers}
            values={draft.shippers ?? []} onChange={(v) => setDraft({ ...draft, shippers: v.length ? v : undefined })}
            placeholder="Todos" />
        </div>
        <div className="min-w-[180px] flex-1">
          <MultiCombo label="Importador" options={options.consignees}
            values={draft.consignees ?? []} onChange={(v) => setDraft({ ...draft, consignees: v.length ? v : undefined })}
            placeholder="Todos" />
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="h-9" onClick={apply}>Aplicar</Button>
          <Button size="sm" variant="ghost" className="h-9" onClick={clear}>Limpar</Button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
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

function labelFor(k: string) {
  switch (k) {
    case "products": return "Produto";
    case "destCountries": return "Destino";
    case "shippers": return "Exportador";
    case "consignees": return "Importador";
    case "polPorts": return "Porto origem";
    default: return k;
  }
}