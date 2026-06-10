import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePanel } from "../usePanel";
import { WidgetShell } from "../WidgetShell";
import { EntityDrawer } from "../EntityDrawer";
import { useOfferOptions, type OfferOption } from "../useOfferOptions";
import { useMundusCompanies, matchMundusStatus, type MundusStatus } from "../useMundusCompanies";
import { HS_CATEGORY_LABELS, HS_CATEGORY_ORDER, type HsCategory, type PanelFilters } from "../types";
import { fmtTonCompact, fmtUsdCompact, fmtPrice, fmtCompactNumber, fmtLoadsNumber, downloadCsv, truncate, toLoads } from "../format";

type OppRow = {
  name: string;
  country: string;
  volume: number;
  fob: number;
  avg_price_ton: number | null;
  suppliers_count: number;
  shipments: number;
  buys_from_exporter: boolean;
};

export function OpportunitiesTab({ filters, initialOfferId }: { filters: PanelFilters; initialOfferId?: string | null }) {
  const offers = useOfferOptions(80);
  const mundus = useMundusCompanies();

  const [offerId, setOfferId] = useState<string | null>(initialOfferId ?? null);
  const [cats, setCats] = useState<string[]>([]);
  const [destCountry, setDestCountry] = useState<string[]>([]);
  const [exporter, setExporter] = useState<string>("");
  const [onlyOpps, setOnlyOpps] = useState(true);
  const [onlyProspects, setOnlyProspects] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  // Apply offer auto-fill when an offer is picked, or when the initial offer arrives
  useEffect(() => {
    if (!offerId || !offers.data.length) return;
    const o = offers.data.find((x) => x.id === offerId);
    if (!o) return;
    setCats(o.hsCategories);
    setDestCountry(o.destCountries);
    setExporter(o.supplier_name);
  }, [offerId, offers.data]);

  // Destination country options come from offers + a small fallback list — admin can type, but typically these are the BL distinct values.
  // The panel filter accepts free-text country names that match the BL data exactly. To keep it simple we use a Combobox with values already
  // present in selected offers + manual entry.

  const panelFilters: PanelFilters = useMemo(
    () => ({
      ...filters,
      hsCategory: cats.length ? cats : undefined,
      destCountry: destCountry.length ? destCountry : undefined,
    }),
    [filters, cats, destCountry],
  );

  const exporterTrimmed = exporter.trim();
  const match = usePanel<{ rows: OppRow[] }>(
    { panel: "opportunity-match", filters: panelFilters, ...({ exporter: exporterTrimmed || undefined } as any) },
    [exporterTrimmed],
  );

  const rowsRaw = match.data?.rows ?? [];
  const enriched = useMemo(() => {
    return rowsRaw.map((r) => {
      const { status } = matchMundusStatus(r.name, mundus.data);
      return { ...r, mundus_status: status as MundusStatus };
    });
  }, [rowsRaw, mundus.data]);

  const filteredSorted = useMemo(() => {
    let list = enriched.slice();
    if (exporterTrimmed && onlyOpps) list = list.filter((r) => !r.buys_from_exporter);
    if (onlyProspects) list = list.filter((r) => r.mundus_status === "prospect");
    list.sort((a, b) => {
      // opportunities first when exporter set, then by volume desc
      if (exporterTrimmed) {
        if (a.buys_from_exporter !== b.buys_from_exporter) return a.buys_from_exporter ? 1 : -1;
      }
      return b.volume - a.volume;
    });
    return list;
  }, [enriched, onlyOpps, onlyProspects, exporterTrimmed]);

  const handleExport = () => {
    const rows = filteredSorted.map((r) => ({
      comprador: r.name,
      pais: r.country,
      volume_ton: r.volume,
      loads: Number(toLoads(r.volume).toFixed(1)),
      fob_usd: r.fob,
      preco_usd_ton: r.avg_price_ton,
      n_fornecedores: r.suppliers_count,
      embarques: r.shipments,
      relacao_exportador: !exporterTrimmed ? "" : r.buys_from_exporter ? "Já compra" : "Oportunidade",
      mundus_status: r.mundus_status,
    }));
    downloadCsv("oportunidades.csv", rows, [
      { key: "comprador", label: "Comprador" },
      { key: "pais", label: "País" },
      { key: "volume_ton", label: "Volume (t)" },
      { key: "loads", label: "Loads (27t)" },
      { key: "fob_usd", label: "FOB (US$)" },
      { key: "preco_usd_ton", label: "Preço (US$/t)" },
      { key: "n_fornecedores", label: "Nº fornecedores" },
      { key: "embarques", label: "Embarques" },
      { key: "relacao_exportador", label: "Relação c/ exportador" },
      { key: "mundus_status", label: "Mundus" },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <OfferSelect value={offerId} onChange={setOfferId} options={offers.data} loading={offers.loading} />
          <CategoryMulti values={cats} onChange={setCats} />
          <DestCountryInput values={destCountry} onChange={setDestCountry} />
          <div className="space-y-1 min-w-[220px] flex-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Exportador (frigorífico)</Label>
            <Input
              value={exporter}
              onChange={(e) => setExporter(e.target.value)}
              placeholder="Ex: JBS, MARFRIG…"
              className="h-9 text-xs"
            />
          </div>
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setOfferId(null); setCats([]); setDestCountry([]); setExporter(""); }}>
            Limpar
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="inline-flex items-center gap-2">
            <Switch checked={onlyOpps} onCheckedChange={setOnlyOpps} disabled={!exporterTrimmed} />
            <span className={cn(!exporterTrimmed && "opacity-50")}>Só oportunidades (não compra deste exportador)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <Switch checked={onlyProspects} onCheckedChange={setOnlyProspects} />
            <span>Só prospects fora da Mundus</span>
          </label>
          <span className="text-muted-foreground ml-auto">
            {cats.length || destCountry.length ? `${filteredSorted.length} comprador(es)` : "Selecione categoria e destino"}
          </span>
        </div>
      </div>

      <WidgetShell
        title="Oportunidades — Compradores no destino que importam esta categoria"
        subtitle={exporterTrimmed ? `Confronto com exportador: ${exporterTrimmed}` : "Adicione um exportador para revelar oportunidades reais"}
        actions={
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={handleExport} disabled={!filteredSorted.length}>
            <Download className="h-3 w-3" /> CSV
          </Button>
        }
        loading={match.loading || mundus.loading}
        error={match.error}
        empty={!match.loading && !filteredSorted.length}
        onRetry={match.refetch}
        height={520}
      >
        <div className="overflow-x-auto -mx-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="font-medium py-2 px-3">#</th>
                <th className="font-medium py-2 px-3">Comprador</th>
                <th className="font-medium py-2 px-3">País</th>
                <th className="font-medium py-2 px-3 text-right">Volume</th>
                <th className="font-medium py-2 px-3 text-right">Loads</th>
                <th className="font-medium py-2 px-3 text-right">FOB</th>
                <th className="font-medium py-2 px-3 text-right">US$/t</th>
                <th className="font-medium py-2 px-3 text-right">Nº forn.</th>
                <th className="font-medium py-2 px-3">Relação</th>
                <th className="font-medium py-2 px-3">Mundus</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((r, i) => (
                <tr
                  key={r.name}
                  className="border-b border-border/40 hover:bg-muted/40 cursor-pointer"
                  onClick={() => setSel(r.name)}
                >
                  <td className="py-1.5 px-3 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="py-1.5 px-3 font-medium" title={r.name}>{truncate(r.name, 50)}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{r.country || "—"}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{fmtTonCompact(r.volume)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{fmtLoadsNumber(r.volume)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{fmtUsdCompact(r.fob)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{fmtPrice(r.avg_price_ton)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{fmtCompactNumber(r.suppliers_count)}</td>
                  <td className="py-1.5 px-3">
                    {exporterTrimmed ? (
                      r.buys_from_exporter ? (
                        <Badge variant="outline" className="text-[10px] font-normal">Já compra</Badge>
                      ) : (
                        <Badge className="text-[10px] font-normal bg-emerald-600 hover:bg-emerald-600/90 text-white">Oportunidade</Badge>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    {r.mundus_status === "cliente" ? (
                      <Badge className="text-[10px] font-normal bg-blue-600 hover:bg-blue-600/90 text-white">Cliente Mundus</Badge>
                    ) : r.mundus_status === "convidado" ? (
                      <Badge variant="outline" className="text-[10px] font-normal">Convidado</Badge>
                    ) : (
                      <Badge className="text-[10px] font-normal bg-amber-500 hover:bg-amber-500/90 text-white">Prospect</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WidgetShell>

      <EntityDrawer
        open={!!sel}
        onOpenChange={(v) => !v && setSel(null)}
        kind="consignee"
        name={sel}
        filters={panelFilters}
      />
    </div>
  );
}

function OfferSelect({
  value, onChange, options, loading,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  options: OfferOption[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sel = options.find((o) => o.id === value);
  return (
    <div className="space-y-1 min-w-[280px]">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Oferta Mundus</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal h-9">
            <span className="truncate text-xs">
              {loading ? "Carregando…" : sel ? sel.label : "Selecionar oferta…"}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar por nº, fornecedor…" />
            <CommandList>
              <CommandEmpty>Nenhuma oferta.</CommandEmpty>
              <CommandGroup>
                {value && (
                  <CommandItem onSelect={() => { onChange(null); setOpen(false); }}>
                    <span className="text-muted-foreground">Limpar seleção</span>
                  </CommandItem>
                )}
                {options.map((o) => (
                  <CommandItem key={o.id} value={o.label} onSelect={() => { onChange(o.id); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", value === o.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">#{o.offer_number} — {o.supplier_name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {o.hsCategories.join(", ") || "—"} · {o.destCountries.slice(0, 3).join(", ") || "sem destino"}
                      </div>
                    </div>
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

function CategoryMulti({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: HsCategory) => {
    const next = values.includes(k) ? values.filter((v) => v !== k) : [...values, k];
    onChange(next);
  };
  return (
    <div className="space-y-1 min-w-[180px]">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Categoria</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal h-9">
            <span className="truncate text-xs">
              {values.length === 0 ? "Selecionar"
                : values.length === 1 ? (HS_CATEGORY_LABELS as any)[values[0]] ?? values[0]
                : `${values.length} categorias`}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-1" align="start">
          {HS_CATEGORY_ORDER.map((k) => {
            const checked = values.includes(k);
            return (
              <button key={k} onClick={() => toggle(k)} className="flex items-center w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted">
                <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                {HS_CATEGORY_LABELS[k]}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function DestCountryInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1 min-w-[240px]">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">País(es) de destino</Label>
      <div className="flex flex-wrap items-center gap-1 min-h-9 border rounded-md px-2 py-1 bg-background">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="text-[10px] font-normal gap-1">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="ml-1 opacity-60 hover:opacity-100">×</button>
          </Badge>
        ))}
        <input
          className="text-xs flex-1 min-w-[80px] bg-transparent outline-none"
          placeholder="Adicionar (Enter)…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          onBlur={add}
        />
      </div>
    </div>
  );
}