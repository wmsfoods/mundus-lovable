import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Tag } from "lucide-react";

type Brand = { id: string; name: string };

type Props = {
  companyId: string | null;
  value: { id: string | null; name: string };
  onChange: (b: { id: string; name: string }) => void;
};

export function BrandPicker({ companyId, value, onChange }: Props) {
  const { t } = useTranslation();
  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.cutsTable.brand.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !companyId) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_supplier_brands", {
        p_company_id: companyId,
        p_query: q.trim() || undefined,
      });
      setLoading(false);
      if (!error && Array.isArray(data)) setResults(data.slice(0, 20) as Brand[]);
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [open, q, companyId]);

  const exactMatch = results.find((r) => r.name.trim().toLowerCase() === q.trim().toLowerCase());
  const showCreate = open && companyId && q.trim().length >= 2 && !exactMatch && !loading;

  const handleCreate = async () => {
    if (!companyId || q.trim().length < 2 || creating) return;
    setCreating(true);
    const { data, error } = await supabase.rpc("create_or_find_supplier_brand", {
      p_company_id: companyId,
      p_name: q.trim(),
    });
    setCreating(false);
    if (!error && data && typeof data === "object") {
      const d = data as any;
      if (d.id && d.name) {
        onChange({ id: d.id, name: d.name });
        setOpen(false);
        setQ("");
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 text-left text-xs hover:bg-muted/40"
        >
          <Tag size={12} className="text-muted-foreground" />
          <span className={value.name ? "truncate font-medium" : "truncate text-muted-foreground"}>
            {value.name || tk("placeholder", "Pick brand…")}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative mb-2">
          <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={tk("searchPlaceholder", "Search brands…")}
            className="h-8 pl-7 text-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {loading && <div className="px-2 py-1.5 text-xs text-muted-foreground">{tk("loading", "Searching…")}</div>}
          {!loading && results.length === 0 && !showCreate && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {q.trim() ? tk("none", "No brands found.") : tk("typeToSearch", "Type to search your brands.")}
            </div>
          )}
          {results.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onChange({ id: b.id, name: b.name });
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60"
            >
              <span className="truncate">{b.name}</span>
              {value.id === b.id && <span className="text-[10px] text-primary">✓</span>}
            </button>
          ))}
        </div>
        {showCreate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={creating}
            onClick={handleCreate}
            className="mt-2 w-full justify-start text-xs"
          >
            <Plus size={12} className="mr-1" />
            {creating ? tk("creating", "Creating…") : tk("createCta", "Create \"{{name}}\"", { name: q.trim() })}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}