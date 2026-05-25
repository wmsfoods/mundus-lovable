import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SparkleIcon, FileTextIcon } from "@/components/icons";

export type ParsedRow = {
  cut: string;
  spec?: string;
  marbling?: string;
  qty_kg: number;
  target_price_per_kg?: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category: string;
  knownCuts: string[];
  onApply: (rows: ParsedRow[]) => void;
}

const MARBLING_VALUES = ["Not specified", "Low", "Medium", "High", "Prime"];

function normalizeMarbling(s?: string): string {
  if (!s) return "Not specified";
  const v = s.trim().toLowerCase();
  for (const m of MARBLING_VALUES) {
    if (m.toLowerCase() === v) return m;
  }
  return "Not specified";
}

function parseNumber(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.,\-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Heuristic local parser: TSV / CSV / "qty kg cut @ price" */
function parseLocal(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const rows: ParsedRow[] = [];
  const sepRe = /\t|;|,(?=\s*[A-Za-z0-9])/;

  for (const line of lines) {
    if (/^(cut|item|product|description)/i.test(line) && /(qty|quantity|kg|price)/i.test(line)) continue;

    const cols = line.split(sepRe).map((c) => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      let cut = "", spec = "", marbling = "", qty: number | null = null, price: number | null = null;
      const numericCols: { idx: number; val: number }[] = [];
      cols.forEach((c, i) => {
        const n = parseNumber(c);
        if (n != null && /^[\d.,\s$kKgGlLbBtTpPmMrR/-]+$/.test(c)) numericCols.push({ idx: i, val: n });
      });
      // Heuristic: first text col = cut, last big number = qty, smaller decimal = price
      const textCols = cols.filter((_, i) => !numericCols.find((n) => n.idx === i));
      cut = textCols[0] ?? cols[0];
      if (textCols[1]) {
        const m = MARBLING_VALUES.find((mv) => mv.toLowerCase() === textCols[1].toLowerCase());
        if (m) marbling = m; else spec = textCols[1];
      }
      if (textCols[2] && !marbling) {
        const m = MARBLING_VALUES.find((mv) => mv.toLowerCase() === textCols[2].toLowerCase());
        if (m) marbling = m;
      }
      if (numericCols.length >= 2) {
        const sorted = [...numericCols].sort((a, b) => b.val - a.val);
        qty = sorted[0].val;
        price = sorted[sorted.length - 1].val;
        if (price === qty) price = null;
      } else if (numericCols.length === 1) {
        qty = numericCols[0].val;
      }
      if (cut && qty != null) {
        rows.push({ cut, spec, marbling: normalizeMarbling(marbling), qty_kg: qty, target_price_per_kg: price });
      }
    } else {
      // Pattern: "1000 kg ribeye 7-9 lb @ 8.50"
      const m = line.match(/^([\d.,]+)\s*(kg|lb|t)?\s+(.+?)(?:\s*@\s*\$?([\d.,]+))?$/i);
      if (m) {
        const qty = parseNumber(m[1]) ?? 0;
        const cut = m[3].trim();
        const price = m[4] ? parseNumber(m[4]) : null;
        if (cut && qty) rows.push({ cut, qty_kg: qty, target_price_per_kg: price, marbling: "Not specified" });
      }
    }
  }
  return rows;
}

export default function RequestPasteImport({ open, onOpenChange, category, knownCuts, onApply }: Props) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const reset = () => { setText(""); setRows([]); setSelected(new Set()); };

  const doLocal = () => {
    const parsed = parseLocal(text);
    setRows(parsed);
    setSelected(new Set(parsed.map((_, i) => i)));
    if (parsed.length === 0) toast.info("Nothing recognizable — try AI parse.");
  };

  const doAi = async () => {
    if (!text.trim()) return toast.error("Paste something first");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-request-cuts", {
        body: { text, category, known_cuts: knownCuts },
      });
      if (error) throw error;
      const parsed: ParsedRow[] = (data?.rows ?? []).map((r: any) => ({
        cut: String(r.cut ?? ""),
        spec: r.spec ?? "",
        marbling: normalizeMarbling(r.marbling),
        qty_kg: Number(r.qty_kg) || 0,
        target_price_per_kg: r.target_price_per_kg == null ? null : Number(r.target_price_per_kg),
      })).filter((r: ParsedRow) => r.cut && r.qty_kg > 0);
      setRows(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      if (parsed.length === 0) toast.info("AI did not find any rows.");
      else toast.success(`AI found ${parsed.length} cut${parsed.length === 1 ? "" : "s"}.`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to parse with AI");
    } finally { setBusy(false); }
  };

  const apply = () => {
    const chosen = rows.filter((_, i) => selected.has(i));
    if (chosen.length === 0) return toast.error("Select at least one row");
    onApply(chosen);
    onOpenChange(false);
    reset();
  };

  const toggle = (i: number) => {
    const n = new Set(selected);
    n.has(i) ? n.delete(i) : n.add(i);
    setSelected(n);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[640px] overflow-y-auto p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <SparkleIcon size={18} /> Paste / Import with AI
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste rows from Excel, a list, or free text. Use <b>Detect</b> for a quick local parse or
            <b> Parse with AI</b> to let AI normalize cut names against the catalog.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"e.g.\nRibeye\t7-9 lb\t1000\t8.50\nStriploin\t4-6 lb\t500\t9.20\n\nor:\n1000 kg ribeye 7-9 lb @ 8.50"}
            style={{
              width: "100%", minHeight: 180, padding: "10px 12px",
              border: "1px solid hsl(var(--border))", borderRadius: 8,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12, resize: "vertical", background: "hsl(var(--background))",
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={doLocal} disabled={busy || !text.trim()} className="ai-btn ai-btn-ghost">
              <FileTextIcon size={14} /> Detect locally
            </button>
            <button type="button" onClick={doAi} disabled={busy || !text.trim()} className="ai-btn ai-btn-primary">
              <SparkleIcon size={14} /> {busy ? "Parsing…" : "Parse with AI"}
            </button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="px-5 pb-4">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              {rows.length} row{rows.length === 1 ? "" : "s"} detected · select what to import
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-left">PRODUCT / CUT</th>
                    <th className="p-2 text-left">Spec</th>
                    <th className="p-2 text-left">MARBLING / GRADE</th>
                    <th className="p-2 text-right">Qty (kg)</th>
                    <th className="p-2 text-right">Target $/kg</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 text-center">
                        <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
                      </td>
                      <td className="p-2 font-medium">{r.cut}</td>
                      <td className="p-2 text-muted-foreground">{r.spec || "—"}</td>
                      <td className="p-2 text-muted-foreground">{r.marbling}</td>
                      <td className="p-2 text-right">{r.qty_kg.toLocaleString()}</td>
                      <td className="p-2 text-right">{r.target_price_per_kg != null ? `$${r.target_price_per_kg.toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-background border-t px-5 py-3 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="ai-btn ai-btn-ghost">Cancel</button>
          <button type="button" onClick={apply} disabled={rows.length === 0} className="ai-btn ai-btn-primary">
            Add {selected.size > 0 ? `${selected.size} ` : ""}cut{selected.size === 1 ? "" : "s"}
          </button>
        </div>

        <style>{`
          .ai-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid hsl(var(--border)); font-family: inherit; }
          .ai-btn:disabled { opacity: .5; cursor: not-allowed; }
          .ai-btn-ghost { background: #fff; color: hsl(var(--foreground)); }
          .ai-btn-ghost:hover:not(:disabled) { background: hsl(var(--muted)); }
          .ai-btn-primary { background: #8B2252; color: #fff; border-color: #8B2252; }
          .ai-btn-primary:hover:not(:disabled) { background: #7a1d48; }
        `}</style>
      </SheetContent>
    </Sheet>
  );
}
