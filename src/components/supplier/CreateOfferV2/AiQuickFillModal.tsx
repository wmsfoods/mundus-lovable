import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiParseOffer, type ParsedOfferPayload, type MatchStatus } from "@/hooks/useAiParseOffer";

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

export function AiQuickFillModal({ open, onOpenChange, supplierId, onApply }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedOfferPayload | null>(null);
  const mutation = useAiParseOffer();

  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.quickFill.${k}`, { defaultValue: fb }) as string;

  const reset = () => {
    setText("");
    setPreview(null);
    mutation.reset();
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
    } catch (e: any) {
      toast.error(e?.message || tk("error", "Failed to parse — try again."));
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onApply(preview);
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
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{p.brand.name}</span>
                <MatchBadge status={p.brand.match} tk={tk} />
                {p.brand.match === "not_found" && (
                  <span className="text-[11px] text-muted-foreground">{tk("brand.willCreate", "— will need manual selection or creation in the row.")}</span>
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
                      {d.portName && <span className="text-muted-foreground">· {d.portName}</span>}
                      {d.country && <MatchBadge status={d.country.match} tk={tk} />}
                      {(d.freightUsd != null) && <span className="text-[11px] text-muted-foreground">· Frt ${d.freightUsd}</span>}
                      {(d.insuranceUsd != null) && <span className="text-[11px] text-muted-foreground">· Ins ${d.insuranceUsd}</span>}
                    </li>
                  ))}
                </ul>
              ) : <span className="text-muted-foreground">—</span>}
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
                {p.items.map((it, i) => (
                  <li key={i} className="rounded border border-border bg-background/40 p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-sm text-foreground">{it.cutName || "—"}</span>
                      {it.protein && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{it.protein}</span>}
                      {it.spec && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{it.spec}</span>}
                      {it.packing && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{it.packing}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                      {it.qtyKg != null && <span>{tk("item.qty", "Qty")}: <span className="text-foreground font-medium">{it.qtyKg.toLocaleString()} kg</span></span>}
                      {it.askPricePerKg != null && <span>{tk("item.price", "Ask")}: <span className="text-foreground font-medium">${it.askPricePerKg}/kg</span></span>}
                      {it.plant.plantNumber && (
                        <span className="inline-flex items-center gap-1">
                          {tk("item.plant", "Plant")}: <span className="text-foreground font-medium">{it.plant.plantNumber}</span>
                          <MatchBadge status={it.plant.match} tk={tk} />
                        </span>
                      )}
                    </div>
                    {it.notes && <p className="mt-1 italic text-muted-foreground">{it.notes}</p>}
                  </li>
                ))}
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