import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, X, ArrowLeftRight, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtPrice, fmtWeight, priceLabel, weightLabel, toDisplay, fromDisplay } from "@/lib/units";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";

type Phase = "loading" | "invalid" | "expired" | "used" | "ready" | "submitting" | "done";

type TokenRow = {
  id: string;
  negotiation_id: string;
  supplier_email: string | null;
  is_used: boolean;
  expires_at: string;
};

export default function SupplierRespond() {
  const { token = "" } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const { unit } = useWeightUnit();
  const pLbl = priceLabel(unit);
  const wLbl = weightLabel(unit);

  const [phase, setPhase] = useState<Phase>("loading");
  const [tokenRow, setTokenRow] = useState<TokenRow | null>(null);
  const [neg, setNeg] = useState<RealNegotiationRow | null>(null);
  const [doneMessage, setDoneMessage] = useState("");

  // counter form state
  const [mode, setMode] = useState<"none" | "counter">("none");
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: trows, error: terr } = await supabase
        .from("negotiation_tokens")
        .select("id, negotiation_id, supplier_email, is_used, expires_at")
        .eq("token", token)
        .limit(1);
      if (cancelled) return;
      if (terr || !trows || trows.length === 0) {
        setPhase("invalid");
        return;
      }
      const tr = trows[0] as TokenRow;
      setTokenRow(tr);
      if (tr.is_used) {
        setPhase("used");
        return;
      }
      if (new Date(tr.expires_at).getTime() < Date.now()) {
        setPhase("expired");
        return;
      }
      const { data: nrow, error: nerr } = await supabase
        .from("negotiations")
        .select(
          `
          id, offer_id, buyer_company_id, port_id, incoterm, status,
          fcl_count, freight_cost_per_kg, created_at, updated_at, expires_at,
          offer:offers (
            id, offer_number, supplier_id, supplier_name, origin_country, origin_port,
            payment_terms, container_size, shipment_month, shipment_year, shipment_ready_raw, total_fcl,
            items:offer_items (
              id, amount, price, minimum_price,
              customer_product:customer_products ( id, name )
            )
          ),
          port:ports ( id, name, country:countries ( english_name, iso_code ) ),
          rounds:round_proposals (
            id, round, created_at, created_by_user_id,
            cut_rounds ( id, offer_item_id, price_per_kg, quantity_kg )
          )
          `,
        )
        .eq("id", tr.negotiation_id)
        .maybeSingle();
      if (cancelled) return;
      if (nerr || !nrow) {
        setPhase("invalid");
        return;
      }
      const row = nrow as unknown as RealNegotiationRow;
      row.rounds?.sort((a, b) => a.round - b.round);
      setNeg(row);
      setPhase("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Latest buyer bid prices per offer item
  const buyerPrices = useMemo(() => {
    const map = new Map<string, number>();
    if (!neg) return map;
    const bids = (neg.rounds ?? []).filter((r) => r.round % 2 === 1);
    const last = bids[bids.length - 1];
    for (const c of last?.cut_rounds ?? []) map.set(c.offer_item_id, Number(c.price_per_kg));
    return map;
  }, [neg]);

  const items = neg?.offer?.items ?? [];
  const maxRaw = (neg?.rounds ?? []).reduce((m, r) => Math.max(m, r.round), 0);
  const nextRaw = maxRaw + 1;
  const displayRound = Math.ceil(nextRaw / 2);

  // Init counter prefill when opening counter form
  useEffect(() => {
    if (mode !== "counter" || !neg) return;
    const initial: Record<string, number> = {};
    for (const it of items) initial[it.id] = Number(it.price);
    setCounters(initial);
  }, [mode, neg, items]);

  async function markTokenUsed() {
    if (!tokenRow) return;
    await supabase
      .from("negotiation_tokens")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);
  }

  async function submitAccept() {
    if (!neg) return;
    setPhase("submitting");
    try {
      const settled = items.reduce(
        (s, it) => s + (buyerPrices.get(it.id) ?? Number(it.price)) * Number(it.amount),
        0,
      );
      const { error } = await supabase
        .from("negotiations")
        .update({
          status: "bid_accepted",
          settled_total_value: settled,
          expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", neg.id);
      if (error) throw error;
      await markTokenUsed();
      setDoneMessage(t("public.respond.doneAccepted"));
      setPhase("done");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setPhase("ready");
    }
  }

  async function submitReject() {
    if (!neg) return;
    if (!window.confirm(t("public.respond.confirmReject"))) return;
    setPhase("submitting");
    try {
      const { error } = await supabase
        .from("negotiations")
        .update({ status: "offer_rejected", updated_at: new Date().toISOString() })
        .eq("id", neg.id);
      if (error) throw error;
      await markTokenUsed();
      setDoneMessage(t("public.respond.doneRejected"));
      setPhase("done");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setPhase("ready");
    }
  }

  async function submitCounter() {
    if (!neg) return;
    setPhase("submitting");
    try {
      const { data: rp, error: rpErr } = await supabase
        .from("round_proposals")
        .insert({
          negotiation_id: neg.id,
          round: nextRaw,
          // No authenticated user — token-based response.
          created_by_user_id: null,
        })
        .select("id")
        .single();
      if (rpErr || !rp) throw rpErr ?? new Error("Failed to create round");
      const rows = items.map((it) => ({
        round_proposal_id: rp.id,
        offer_item_id: it.id,
        price_per_kg: counters[it.id] ?? Number(it.price),
        quantity_kg: Number(it.amount),
      }));
      const { error: crErr } = await supabase.from("cut_rounds").insert(rows);
      if (crErr) throw crErr;
      const { error: nErr } = await supabase
        .from("negotiations")
        .update({ status: "pending_buyer_review", updated_at: new Date().toISOString() })
        .eq("id", neg.id);
      if (nErr) throw nErr;
      await markTokenUsed();
      setDoneMessage(t("public.respond.doneCounter"));
      setPhase("done");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setPhase("ready");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size="md" />
          <span className="text-sm font-medium text-muted-foreground">
            {t("public.respond.headerTitle")}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-10">
        {phase === "loading" && (
          <div className="text-center text-muted-foreground py-20">
            {t("public.respond.loading")}
          </div>
        )}

        {(phase === "invalid" || phase === "expired" || phase === "used") && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <div
              className="mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-4"
              style={{ background: "#fee2e2", color: "#b91c1c" }}
            >
              <X size={24} />
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {phase === "expired"
                ? t("public.respond.expiredTitle")
                : phase === "used"
                  ? t("public.respond.usedTitle")
                  : t("public.respond.invalidTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {phase === "expired"
                ? t("public.respond.expiredBody")
                : phase === "used"
                  ? t("public.respond.usedBody")
                  : t("public.respond.invalidBody")}
            </p>
          </div>
        )}

        {phase === "done" && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <div
              className="mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-4"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              <Check size={24} />
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {t("public.respond.doneTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{doneMessage}</p>
          </div>
        )}

        {(phase === "ready" || phase === "submitting") && neg && (
          <>
            {/* Bid summary */}
            <div className="rounded-xl border border-border bg-card p-5 mb-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("public.respond.youReceived")}
              </div>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground mt-1">
                {neg.offer?.supplier_name
                  ? t("public.respond.bidFor", { supplier: neg.offer.supplier_name })
                  : t("public.respond.bidGeneric")}
              </h1>

              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("public.respond.origin")}</dt>
                  <dd className="font-medium">{neg.offer?.origin_country ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("public.respond.destination")}</dt>
                  <dd className="font-medium">
                    {neg.port?.name ?? "—"}
                    {neg.port?.country?.english_name ? ` (${neg.port.country.english_name})` : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("public.respond.incoterm")}</dt>
                  <dd className="font-medium">{neg.incoterm}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("public.respond.payment")}</dt>
                  <dd className="font-medium">{neg.offer?.payment_terms ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("public.respond.container")}</dt>
                  <dd className="font-medium">{neg.offer?.container_size ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("public.respond.created")}</dt>
                  <dd className="font-medium">{new Date(neg.created_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>

            {/* Cuts table — readable on mobile via overflow */}
            <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="font-semibold text-sm text-foreground">
                  {t("public.respond.cutsTitle")}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="px-4 py-2 font-medium">{t("public.respond.col.cut")}</th>
                      <th className="px-4 py-2 font-medium text-right">
                        {t("public.respond.col.qty", { unit: wLbl })}
                      </th>
                      <th className="px-4 py-2 font-medium text-right">
                        {t("public.respond.col.asking")} ({pLbl})
                      </th>
                      <th className="px-4 py-2 font-medium text-right">
                        {t("public.respond.col.buyerBid")} ({pLbl})
                      </th>
                      <th className="px-4 py-2 font-medium text-right">
                        {t("public.respond.col.diff")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const asking = Number(it.price);
                      const bid = buyerPrices.get(it.id) ?? asking;
                      const d = bid - asking;
                      const dPct = asking > 0 ? (d / asking) * 100 : 0;
                      return (
                        <tr key={it.id} className="border-t border-border">
                          <td className="px-4 py-2">{it.customer_product?.name ?? "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {fmtWeight(Number(it.amount), unit)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {fmtPrice(asking, unit)}
                          </td>
                          <td
                            className="px-4 py-2 text-right tabular-nums font-medium"
                            style={{ color: "#1e3a8a" }}
                          >
                            {fmtPrice(bid, unit)}
                          </td>
                          <td className="px-4 py-2 text-right text-xs tabular-nums">
                            {Math.abs(d) > 0.001 ? (
                              <span style={{ color: d < 0 ? "#b45309" : "#15803d" }}>
                                {d < 0 ? "↓" : "↑"} ${Math.abs(d).toFixed(2)} ({d >= 0 ? "+" : ""}
                                {dPct.toFixed(1)}%)
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Response section */}
            {mode === "none" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={submitAccept}
                  disabled={phase === "submitting"}
                  className="rounded-xl border-2 p-5 text-left transition hover:shadow-md disabled:opacity-50"
                  style={{ borderColor: "#15803d", background: "rgba(21,128,61,0.05)" }}
                >
                  <div className="flex items-center gap-2 font-semibold" style={{ color: "#15803d" }}>
                    <Check size={18} /> {t("public.respond.actions.accept")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("public.respond.actions.acceptDesc")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("counter")}
                  disabled={phase === "submitting"}
                  className="rounded-xl border-2 p-5 text-left transition hover:shadow-md disabled:opacity-50"
                  style={{ borderColor: "#8B2252", background: "rgba(139,34,82,0.05)" }}
                >
                  <div className="flex items-center gap-2 font-semibold" style={{ color: "#8B2252" }}>
                    <ArrowLeftRight size={18} /> {t("public.respond.actions.counter")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("public.respond.actions.counterDesc")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={submitReject}
                  disabled={phase === "submitting"}
                  className="rounded-xl border-2 p-5 text-left transition hover:shadow-md disabled:opacity-50"
                  style={{ borderColor: "#b91c1c", background: "rgba(185,28,28,0.05)" }}
                >
                  <div className="flex items-center gap-2 font-semibold" style={{ color: "#b91c1c" }}>
                    <X size={18} /> {t("public.respond.actions.reject")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("public.respond.actions.rejectDesc")}
                  </p>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="font-semibold text-sm text-foreground mb-3">
                  {t("public.respond.counterTitle", { round: displayRound })}
                </h2>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left text-xs uppercase text-muted-foreground">
                        <th className="px-3 py-2 font-medium">{t("public.respond.col.cut")}</th>
                        <th className="px-3 py-2 font-medium text-right">
                          {t("public.respond.col.buyerBid")} ({pLbl})
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          {t("public.respond.col.yourCounter")} ({pLbl})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => {
                        const bid = buyerPrices.get(it.id) ?? Number(it.price);
                        const yours = counters[it.id] ?? Number(it.price);
                        const displayY = toDisplay(yours, "price", unit);
                        return (
                          <tr key={it.id} className="border-t border-border">
                            <td className="px-3 py-2">{it.customer_product?.name ?? "—"}</td>
                            <td
                              className="px-3 py-2 text-right tabular-nums"
                              style={{ color: "#1e3a8a" }}
                            >
                              {fmtPrice(bid, unit)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={Number.isFinite(displayY) ? displayY.toFixed(2) : ""}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  const kg = Number.isFinite(v)
                                    ? fromDisplay(v, "price", unit)
                                    : 0;
                                  setCounters((p) => ({ ...p, [it.id]: kg }));
                                }}
                                className="h-9 w-24 ml-auto text-right tabular-nums focus-visible:ring-[#8B2252]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
                  <label className="text-sm font-medium text-foreground">
                    {t("public.respond.message")}
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("public.respond.messagePlaceholder")}
                    className="mt-1 min-h-[80px]"
                  />
                </div>
                <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <Button variant="outline" onClick={() => setMode("none")} disabled={phase === "submitting"}>
                    {t("public.respond.back")}
                  </Button>
                  <Button
                    onClick={submitCounter}
                    disabled={phase === "submitting"}
                    style={{ background: "#8B2252", color: "#fff" }}
                    className="hover:opacity-90"
                  >
                    {phase === "submitting"
                      ? t("public.respond.submitting")
                      : t("public.respond.submitCounter")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border bg-card mt-8">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail size={12} /> Mundus Trade
          </span>
          <a
            href="https://mundus.trade"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            mundus.trade
          </a>
        </div>
      </footer>
    </div>
  );
}