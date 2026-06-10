import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown, Download, Save, Play, RefreshCw, AlertTriangle, X } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const BRAND = "#B64769";

type Column = { column_name: string; data_type: string };
type Schema = {
  columns: Column[];
  rowCount: number;
  distincts: Record<string, string[]>;
  refreshedAt?: string;
};
type Measure = { column: string; agg: "sum" | "avg" | "count" | "min" | "max" };
type Filter =
  | { column: string; op: "in"; value: string[] }
  | { column: string; op: "between"; value: [string, string] }
  | { column: string; op: "gte" | "lte"; value: string }
  | { column: string; op: "ilike"; value: string };

type SavedQuery = { id: string; name: string; payload: any; created_at: string };

function isNumeric(t: string) { return /int|numeric|decimal|double|real|float|money/i.test(t); }
function isText(t: string) { return /char|text|citext/i.test(t); }
function isDate(t: string) { return /date|time/i.test(t); }
function looksLikeWeight(name: string) { return /(kg|peso|weight|volume|quantidade|qtd|liquido|bruto)/i.test(name); }
function looksLikeMoney(name: string) { return /(valor|preco|price|usd|us\$|fob|cif|amount)/i.test(name); }

function fmtNumber(n: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
}
function fmtCell(col: string, v: any) {
  if (v == null) return "—";
  if (typeof v === "number") {
    if (looksLikeMoney(col)) return "US$ " + fmtNumber(v);
    if (looksLikeWeight(col)) return fmtNumber(v) + " kg";
    return fmtNumber(v);
  }
  return String(v);
}

function MultiCombo({
  options, values, onChange, placeholder,
}: { options: string[]; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) =>
    onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">
            {values.length === 0 ? placeholder : `${values.length} selecionado(s)`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
  );
}

export default function AdminMarketDataExplorer() {
  const { toast } = useToast();
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [moreFilters, setMoreFilters] = useState(false);

  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [rangeValues, setRangeValues] = useState<Record<string, { min?: string; max?: string }>>({});
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [measures, setMeasures] = useState<Measure[]>([]);

  const [rows, setRows] = useState<any[] | null>(null);
  const [running, setRunning] = useState(false);
  const [orderBy, setOrderBy] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);

  const [saved, setSaved] = useState<SavedQuery[]>([]);
  const [saveName, setSaveName] = useState("");

  const lowCardCols = useMemo(
    () => schema ? schema.columns.filter((c) => schema.distincts[c.column_name]?.length) : [],
    [schema],
  );
  const numericCols = useMemo(() => schema ? schema.columns.filter((c) => isNumeric(c.data_type)) : [], [schema]);
  const dateCols = useMemo(() => schema ? schema.columns.filter((c) => isDate(c.data_type)) : [], [schema]);
  const dimensionableCols = useMemo(
    () => schema ? schema.columns.filter((c) => isText(c.data_type) || isDate(c.data_type)) : [],
    [schema],
  );

  const loadIntrospect = async (force = false) => {
    setLoadingSchema(true);
    try {
      const { data, error } = await supabase.functions.invoke("agrostats-market-data", {
        body: { action: "introspect", forceRefresh: force },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSchema(data as Schema);
    } catch (e: any) {
      toast({ title: "Erro ao carregar schema", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setLoadingSchema(false);
    }
  };

  const loadSaved = async () => {
    const { data } = await supabase
      .from("agrostats_saved_queries")
      .select("id,name,payload,created_at")
      .order("created_at", { ascending: false });
    setSaved((data ?? []) as SavedQuery[]);
  };

  useEffect(() => { loadIntrospect(); loadSaved(); }, []);

  const buildPayload = (overrideOrder?: typeof orderBy) => {
    const filters: Filter[] = [];
    for (const [col, vals] of Object.entries(filterValues)) {
      if (vals.length) filters.push({ column: col, op: "in", value: vals });
    }
    for (const [col, r] of Object.entries(rangeValues)) {
      if (r.min && r.max) filters.push({ column: col, op: "between", value: [r.min, r.max] });
      else if (r.min) filters.push({ column: col, op: "gte", value: r.min });
      else if (r.max) filters.push({ column: col, op: "lte", value: r.max });
    }
    return {
      dimensions,
      measures,
      filters,
      orderBy: overrideOrder ?? orderBy,
      limit: dimensions.length ? 500 : 1000,
    };
  };

  const runQuery = async (overrideOrder?: typeof orderBy) => {
    setRunning(true);
    try {
      const payload = buildPayload(overrideOrder);
      const { data, error } = await supabase.functions.invoke("agrostats-market-data", {
        body: { action: "query", ...payload },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setRows((data as any).rows ?? []);
    } catch (e: any) {
      toast({ title: "Erro na consulta", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = () => {
    if (!rows || rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const esc = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `market-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveCurrent = async () => {
    if (!saveName.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("agrostats_saved_queries").insert({
      name: saveName.trim(),
      payload: buildPayload() as any,
      created_by: u.user?.id,
    });
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    setSaveName("");
    toast({ title: "Pesquisa salva" });
    loadSaved();
  };

  const loadSavedQuery = (id: string) => {
    const s = saved.find((q) => q.id === id);
    if (!s) return;
    const p = s.payload || {};
    setDimensions(p.dimensions ?? []);
    setMeasures(p.measures ?? []);
    const fv: Record<string, string[]> = {};
    const rv: Record<string, { min?: string; max?: string }> = {};
    for (const f of (p.filters ?? []) as Filter[]) {
      if (f.op === "in") fv[f.column] = f.value as string[];
      else if (f.op === "between") rv[f.column] = { min: (f.value as any)[0], max: (f.value as any)[1] };
      else if (f.op === "gte") rv[f.column] = { ...(rv[f.column] ?? {}), min: f.value as string };
      else if (f.op === "lte") rv[f.column] = { ...(rv[f.column] ?? {}), max: f.value as string };
    }
    setFilterValues(fv);
    setRangeValues(rv);
    setOrderBy(p.orderBy ?? null);
  };

  const sortBy = (col: string) => {
    const next: typeof orderBy = orderBy?.column === col && orderBy.direction === "desc"
      ? { column: col, direction: "asc" } : { column: col, direction: "desc" };
    setOrderBy(next);
    runQuery(next);
  };

  const chartType = useMemo<"bar" | "line" | null>(() => {
    if (!rows || rows.length === 0 || dimensions.length !== 1 || measures.length !== 1) return null;
    const dim = schema?.columns.find((c) => c.column_name === dimensions[0]);
    return dim && isDate(dim.data_type) ? "line" : "bar";
  }, [rows, dimensions, measures, schema]);

  const chartData = useMemo(() => {
    if (!rows || chartType !== "bar") return rows ?? [];
    const m = measures[0];
    const key = `${m.agg}_${m.column}`;
    return [...rows].sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0)).slice(0, 20);
  }, [rows, chartType, measures]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Market Data — Exportações Brasileiras</h1>
        <p className="text-sm text-muted-foreground">Dados licenciados para uso interno Mundus Trade LLC.</p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 text-sm dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          Não compartilhar externamente.
        </div>
      </div>

      {loadingSchema ? (
        <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-40" /></div>
      ) : !schema ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          Schema indisponível. <Button variant="link" onClick={() => loadIntrospect(true)}>Tentar novamente</Button>
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Filtros</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {schema.rowCount.toLocaleString("pt-BR")} linhas no total
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => loadIntrospect(true)}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar schema
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowCardCols.slice(0, 6).map((c) => (
                  <div key={c.column_name} className="space-y-1">
                    <Label className="text-xs">{c.column_name}</Label>
                    <MultiCombo
                      options={schema.distincts[c.column_name] ?? []}
                      values={filterValues[c.column_name] ?? []}
                      onChange={(v) => setFilterValues({ ...filterValues, [c.column_name]: v })}
                      placeholder="Todos"
                    />
                  </div>
                ))}
              </div>

              <Collapsible open={moreFilters} onOpenChange={setMoreFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">{moreFilters ? "Menos filtros" : "Mais filtros"}</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lowCardCols.slice(6).map((c) => (
                      <div key={c.column_name} className="space-y-1">
                        <Label className="text-xs">{c.column_name}</Label>
                        <MultiCombo
                          options={schema.distincts[c.column_name] ?? []}
                          values={filterValues[c.column_name] ?? []}
                          onChange={(v) => setFilterValues({ ...filterValues, [c.column_name]: v })}
                          placeholder="Todos"
                        />
                      </div>
                    ))}
                    {dateCols.map((c) => (
                      <div key={c.column_name} className="space-y-1">
                        <Label className="text-xs">{c.column_name} (período)</Label>
                        <div className="flex gap-2">
                          <Input type="date" value={rangeValues[c.column_name]?.min ?? ""}
                            onChange={(e) => setRangeValues({ ...rangeValues, [c.column_name]: { ...rangeValues[c.column_name], min: e.target.value } })} />
                          <Input type="date" value={rangeValues[c.column_name]?.max ?? ""}
                            onChange={(e) => setRangeValues({ ...rangeValues, [c.column_name]: { ...rangeValues[c.column_name], max: e.target.value } })} />
                        </div>
                      </div>
                    ))}
                    {numericCols.map((c) => (
                      <div key={c.column_name} className="space-y-1">
                        <Label className="text-xs">{c.column_name} (min/max)</Label>
                        <div className="flex gap-2">
                          <Input type="number" placeholder="min" value={rangeValues[c.column_name]?.min ?? ""}
                            onChange={(e) => setRangeValues({ ...rangeValues, [c.column_name]: { ...rangeValues[c.column_name], min: e.target.value } })} />
                          <Input type="number" placeholder="max" value={rangeValues[c.column_name]?.max ?? ""}
                            onChange={(e) => setRangeValues({ ...rangeValues, [c.column_name]: { ...rangeValues[c.column_name], max: e.target.value } })} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Consulta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Agrupar por (máx. 3)</Label>
                  <MultiCombo
                    options={dimensionableCols.map((c) => c.column_name)}
                    values={dimensions}
                    onChange={(v) => setDimensions(v.slice(0, 3))}
                    placeholder="Sem agrupamento"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Métricas</Label>
                  <MultiCombo
                    options={numericCols.map((c) => c.column_name)}
                    values={measures.map((m) => m.column)}
                    onChange={(v) => {
                      const next: Measure[] = v.map((col) => {
                        const existing = measures.find((m) => m.column === col);
                        return existing ?? { column: col, agg: "sum" };
                      });
                      setMeasures(next);
                    }}
                    placeholder="Nenhuma"
                  />
                </div>
              </div>
              {measures.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {measures.map((m, i) => (
                    <div key={m.column} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                      <span className="text-xs flex-1 truncate">{m.column}</span>
                      <Select value={m.agg} onValueChange={(v: any) => {
                        const next = [...measures]; next[i] = { ...m, agg: v }; setMeasures(next);
                      }}>
                        <SelectTrigger className="h-8 w-[90px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sum">SUM</SelectItem>
                          <SelectItem value="avg">AVG</SelectItem>
                          <SelectItem value="count">COUNT</SelectItem>
                          <SelectItem value="min">MIN</SelectItem>
                          <SelectItem value="max">MAX</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setMeasures(measures.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button onClick={() => runQuery()} disabled={running}
                  style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90">
                  <Play className="h-4 w-4 mr-1" /> {running ? "Executando..." : "Run query"}
                </Button>
                <Button variant="outline" onClick={exportCsv} disabled={!rows || rows.length === 0}>
                  <Download className="h-4 w-4 mr-1" /> Exportar CSV (uso interno)
                </Button>
                <div className="flex items-center gap-2 ml-auto">
                  <Input placeholder="Nome da pesquisa" value={saveName}
                    onChange={(e) => setSaveName(e.target.value)} className="w-[200px] h-9" />
                  <Button variant="outline" onClick={saveCurrent} disabled={!saveName.trim()}>
                    <Save className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                  <Select onValueChange={loadSavedQuery}>
                    <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Carregar pesquisa..." /></SelectTrigger>
                    <SelectContent>
                      {saved.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma</div>}
                      {saved.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Resultados</CardTitle></CardHeader>
            <CardContent>
              {running ? (
                <div className="space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
              ) : rows == null ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Monte sua pesquisa e clique em Run query.
                </p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma linha retornada.</p>
              ) : (
                <Tabs defaultValue="table">
                  <TabsList>
                    <TabsTrigger value="table">Tabela ({rows.length})</TabsTrigger>
                    <TabsTrigger value="chart" disabled={!chartType}>Gráfico</TabsTrigger>
                  </TabsList>
                  <TabsContent value="table">
                    <div className="max-h-[600px] overflow-auto border rounded-md">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            {Object.keys(rows[0]).map((c) => (
                              <TableHead key={c} className="cursor-pointer select-none" onClick={() => sortBy(c)}>
                                {c}{orderBy?.column === c ? (orderBy.direction === "desc" ? " ↓" : " ↑") : ""}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r, i) => (
                            <TableRow key={i}>
                              {Object.keys(rows[0]).map((c) => (
                                <TableCell key={c} className="whitespace-nowrap text-sm">{fmtCell(c, r[c])}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  <TabsContent value="chart">
                    {chartType && (
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === "bar" ? (
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey={`dim_${dimensions[0]}`} tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <RTooltip />
                              <Bar dataKey={`${measures[0].agg}_${measures[0].column}`} fill={BRAND} />
                            </BarChart>
                          ) : (
                            <LineChart data={rows}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey={`dim_${dimensions[0]}`} tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <RTooltip />
                              <Line type="monotone" dataKey={`${measures[0].agg}_${measures[0].column}`} stroke={BRAND} strokeWidth={2} dot={false} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}