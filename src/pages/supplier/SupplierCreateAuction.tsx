import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Check, Lock, Eye, Plus, Search as SearchIcon, Clock, DollarSign, Megaphone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSupplierOfferData, type OfferMarket } from "@/hooks/useSupplierOfferData";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import {
  containerCapacityKg,
  fmtPrice,
  fmtWeight,
  fromDisplay,
  priceLabel,
  qtyLabel,
  toDisplay,
  weightLabel,
} from "@/lib/units";
import "@/styles/mundus-create-offer-v2.css";

/* ──────────────────────────────────────────────────────────
   Static catalogs (kept in sync with SupplierCreateOffer)
   ────────────────────────────────────────────────────────── */
type Market = OfferMarket;
const SPECS = ["Boneless", "Bone-In", "Semi-Boneless"];
const PKGS = ["Vacuum Pack", "Carton Box", "IWP (Individually Wrapped)", "Bulk"];
const GRADES = ["Not Classified", "Low", "Medium", "High", "Prime"];
const AGINGS = ["None", "Wet Aged", "Dry Aged"];

const PRIMARY_MARKETS = [
  "China", "Hong Kong", "Vietnam", "Taiwan", "Thailand",
  "South Korea", "Indonesia", "Egypt", "Russia", "Jordan",
  "United States", "Canada", "Mexico",
];

const INCOTERMS = [
  { id: "FOB", name: "FOB - Free on Board" },
  { id: "CFR", name: "CFR - Cost and Freight" },
  { id: "CIF", name: "CIF - Cost, Insurance & Freight" },
  { id: "EXW", name: "EXW - Ex Works" },
  { id: "DDP", name: "DDP - Delivered Duty Paid" },
  { id: "DAP", name: "DAP - Delivered at Place" },
];

const PAY_TERMS = [
  "30% Advance, Balance TT - Against finalized doc copies",
  "50% Advance, 50% Against BL copy",
  "100% TT in advance",
  "L/C at sight",
  "L/C 30 days",
];

const MOCK_CUSTOMERS = [
  { id: "c1", name: "Delta Imports", country: "China" },
  { id: "c2", name: "Gamma Buyers", country: "Argentina" },
  { id: "c3", name: "Alpha Foods", country: "UAE" },
  { id: "c4", name: "Atrides Mt", country: "Brazil" },
  { id: "c5", name: "WMS Foods", country: "United States" },
];

const CERTIFICATION_OPTIONS = ["Halal", "Kosher", "USDA", "HACCP", "BRC", "Organic"];

const INCO_BADGE: Record<string, { bg: string; fg: string }> = {
  FOB: { bg: "#FAEEDA", fg: "#633806" },
  CFR: { bg: "#E6F1FB", fg: "#0C447C" },
  CIF: { bg: "#FBEAF0", fg: "#72243E" },
  EXW: { bg: "#EEF2FF", fg: "#3730A3" },
  DDP: { bg: "#ECFDF5", fg: "#065F46" },
  DAP: { bg: "#FEF3C7", fg: "#92400E" },
};

type MktCfg = { sp: string[]; sm: boolean; gf: string; pf: Record<string, string> };

type Cut = {
  id: string;
  cat: string;
  cut: string;
  cutId?: string;
  spec: string;
  pkg: string;
  gr: string;
  ag: string;
  qty: string;   // kg
  ask: string;   // kg ($/kg) — "starting price"
  floor: string; // kg ($/kg) — internal min
  notes: string;
};

const EMPTY_NF: Omit<Cut, "id"> = {
  cat: "Beef", cut: "", spec: "Boneless", pkg: "Vacuum Pack", gr: "Not Classified", ag: "None",
  qty: "", ask: "", floor: "", notes: "",
};

/* ──────────────────────────────────────────────────────────
   Date helpers
   ────────────────────────────────────────────────────────── */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatDuration(ms: number, t: (k: string, o?: any) => string): string {
  if (ms <= 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days)  parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (!days && mins) parts.push(`${mins} min`);
  return parts.join(", ") || "—";
}

/* ══════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════ */
export default function SupplierCreateAuction() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const ta = (k: string, dflt: string, opts?: any) =>
    t(`supplier.createAuction.${k}`, { defaultValue: dflt, ...(opts || {}) }) as unknown as string;

  const { unit, setUnit } = useWeightUnit();
  const wLbl = weightLabel(unit);
  const pLbl = priceLabel(unit);
  const qLbl = qtyLabel(unit);
  const qtyPh = unit === "kg" ? "27000" : "59524";
  const askPh = unit === "kg" ? "6.40" : "2.90";
  const floorPh = unit === "kg" ? "5.80" : "2.63";

  const { markets: MARKETS, cutsByCategory, loading: dataLoading } = useSupplierOfferData();

  /* Auction timing */
  const initialOpens = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return toLocalInput(d);
  }, []);
  const initialCloses = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1 + 72, 0, 0, 0);
    return toLocalInput(d);
  }, []);
  const [auctionOpensAt, setAuctionOpensAt]   = useState<string>(initialOpens);
  const [auctionClosesAt, setAuctionClosesAt] = useState<string>(initialCloses);

  const auctionDurationMs =
    new Date(auctionClosesAt).getTime() - new Date(auctionOpensAt).getTime();

  /* Pricing controls */
  const [reservePrice, setReservePrice] = useState<string>(""); // kg
  const [minBid, setMinBid]             = useState<string>(""); // kg

  /* Markets & shipping */
  const [selMarkets, setSelMarkets] = useState<Market[]>([]);
  const [mktCfg, setMktCfg] = useState<Record<string, MktCfg>>({});
  const [moreMktsOpen, setMoreMktsOpen] = useState(false);
  const [csize, setCsize] = useState<"20ft" | "40ft">("40ft");
  const [temp, setTemp]   = useState<"Frozen" | "Chilled">("Frozen");
  const [uniformFreight, setUniformFreight] = useState(false);
  const [uniformFreightValue, setUniformFreightValue] = useState("");

  /* Incoterms */
  const [selInco, setSelInco] = useState<string[]>([]);
  const [primaryInco, setPrimaryInco] = useState<string>("");
  useEffect(() => {
    if (selInco.length === 0) { if (primaryInco) setPrimaryInco(""); return; }
    if (!selInco.includes(primaryInco)) {
      setPrimaryInco(selInco.find((i) => i === "CFR") || selInco.find((i) => i === "CIF") || selInco[0]);
    }
  }, [selInco, primaryInco]);

  /* Certs + payment */
  const [certifications, setCertifications] = useState<string[]>([]);
  const [payTerm, setPayTerm] = useState(PAY_TERMS[0]);

  /* Visibility */
  const [visibility, setVisibility] = useState<"marketplace" | "invite">("marketplace");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  /* Cuts */
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [addRow, setAddRow] = useState(false);
  const [nf, setNf] = useState<Omit<Cut, "id">>({ ...EMPTY_NF });
  const [cutPickerOpen, setCutPickerOpen] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  /* Derived */
  const cap = containerCapacityKg(csize);
  const tw = cuts.reduce((s, c) => s + (parseFloat(c.qty) || 0), 0);
  const fp = Math.min((tw / cap) * 100, 100);
  const fc = fp > 95 ? "#16a34a" : fp > 70 ? "#ca8a04" : "var(--p800)";
  const totalPriceUsd = cuts.reduce((s, c) => s + (parseFloat(c.ask) || 0) * (parseFloat(c.qty) || 0), 0);

  /* ── Handlers ── */
  const toggleMarket = useCallback((id: string) => {
    const m = MARKETS.find((x) => x.id === id);
    if (!m) return;
    setSelMarkets((prev) => {
      if (prev.find((x) => x.id === id)) {
        setMktCfg((c) => { const n = { ...c }; delete n[id]; return n; });
        return prev.filter((x) => x.id !== id);
      }
      setMktCfg((c) => ({
        ...c,
        [id]: { sp: m.p.map((p) => p.id), sm: true, gf: "", pf: Object.fromEntries(m.p.map((p) => [p.id, ""])) },
      }));
      return [...prev, m];
    });
  }, [MARKETS]);

  const toggleInco = useCallback((id: string) => {
    setSelInco((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleCert = (c: string) =>
    setCertifications((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const toggleCustomer = (id: string) =>
    setSelectedCustomers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addCut = useCallback(() => {
    if (!nf.cut || !nf.qty || !nf.ask) return;
    const a = parseFloat(nf.ask), f = parseFloat(nf.floor);
    if (!isNaN(a) && !isNaN(f) && a < f) { toast.error("Asking must be ≥ floor"); return; }
    setCuts((prev) => [...prev, { id: Date.now().toString(), ...nf }]);
    setNf({ ...EMPTY_NF });
    setAddRow(false);
  }, [nf]);

  const removeCut = (i: number) => setCuts((prev) => prev.filter((_, idx) => idx !== i));

  /* Publish checklist */
  const windowOk =
    !!auctionOpensAt && !!auctionClosesAt &&
    new Date(auctionClosesAt).getTime() > new Date(auctionOpensAt).getTime();
  const publishSteps = [
    { key: "window",  label: ta("step.window",  "Set auction window (opens & closes)"), done: windowOk,           anchor: "sec-window" },
    { key: "markets", label: ta("step.markets", "Select at least one destination market"), done: selMarkets.length > 0, anchor: "sec-markets" },
    { key: "cuts",    label: ta("step.cuts",    "Add at least one product cut"),       done: cuts.length > 0,     anchor: "sec-cuts" },
    { key: "inco",    label: ta("step.inco",    "Choose an incoterm"),                  done: selInco.length > 0,  anchor: "sec-inco" },
  ];
  const stepsDone = publishSteps.filter((s) => s.done).length;
  const nextStep  = publishSteps.find((s) => !s.done);
  const canPublish = !nextStep;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("cov4-pulse");
    window.setTimeout(() => el.classList.remove("cov4-pulse"), 1400);
  };

  const handlePublish = () => {
    if (!canPublish) return;
    const seq = String(Math.floor(Math.random() * 90000) + 10000);
    toast.success(ta("publishedToast", `Auction MDS-A#${seq} scheduled!`, { seq }));
    navigate("/supplier/auctions");
  };
  const handleCancel = () => {
    if (confirm(ta("discardConfirm", "Discard this auction?"))) navigate("/supplier/auctions");
  };

  /* ── Render ── */
  return (
    <div className="cov4 cov4--auction">
      {/* HEADER */}
      <header className="cov4-header">
        <div className="cov4-hdr-l">
          <div>
            <h1>🔨 {ta("title", "Create new auction")}</h1>
            <p>{ta("subtitle", "Sealed-bid · Markets · Products · Pricing")}</p>
          </div>
        </div>
        <div className="cov4-hdr-r">
          <span className="cov4-orig-badge">🇧🇷 Brazil · Santos (BRSSZ)</span>
          <div className="cov4-tgl" role="group" aria-label="Unit">
            {(["kg", "lbs"] as const).map((u) => (
              <button key={u} type="button" className={unit === u ? "on" : ""} onClick={() => setUnit(u)}>{u}</button>
            ))}
          </div>
          <button
            type="button"
            className={`cov4-preview-btn ${showPreview ? "on" : ""}`}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "✕ Close preview" : "👁 Live preview"}
          </button>
        </div>
      </header>

      <div className={`cov4-grid ${showPreview ? "with-preview" : ""}`}>
        {/* ═══════════ LEFT PANEL ═══════════ */}
        <aside className="cov4-panel cov4-panel-l">
          {/* 1 ── AUCTION WINDOW */}
          <div id="sec-window" className="cov4-sec ca-amber-sec">
            <div className="cov4-sh">
              <div className="cov4-sh-ic" style={{ background: "#FDF2D8" }}>
                <Clock size={16} color="#7A4B00" />
              </div>
              <div>
                <h2>{ta("auctionWindow", "Auction Window")}</h2>
                <p>{ta("auctionWindowSub", "When buyers can submit sealed bids")}</p>
              </div>
            </div>

            <div className="ca-window-grid">
              <label className="ca-field">
                <span className="ca-field-l">{ta("opensAt", "Opens at")}</span>
                <input
                  type="datetime-local"
                  className="ca-input"
                  value={auctionOpensAt}
                  onChange={(e) => setAuctionOpensAt(e.target.value)}
                />
              </label>
              <label className="ca-field">
                <span className="ca-field-l">{ta("closesAt", "Closes at")}</span>
                <input
                  type="datetime-local"
                  className="ca-input"
                  value={auctionClosesAt}
                  onChange={(e) => setAuctionClosesAt(e.target.value)}
                />
              </label>
            </div>

            <div className="ca-duration">
              <span className="ca-duration-l">{ta("duration", "Duration")}</span>
              <span className="ca-duration-v">{formatDuration(auctionDurationMs, t)}</span>
            </div>

            <p className="ca-hint">
              ℹ️ {ta("windowHint", "Buyers can place bids only during this window. After close, you review bids and award.")}
            </p>
          </div>

          {/* 2 ── PRICING CONTROLS */}
          <div className="cov4-sec ca-amber-sec">
            <div className="cov4-sh">
              <div className="cov4-sh-ic" style={{ background: "#FDF2D8" }}>
                <DollarSign size={16} color="#7A4B00" />
              </div>
              <div>
                <h2>{ta("pricingControls", "Pricing Controls")}</h2>
                <p>{ta("pricingControlsSub", "Reserve & minimum bid (per kg / lb)")}</p>
              </div>
            </div>

            <PricingRow
              label={ta("reservePrice", "Reserve price")}
              hint={ta("reservePriceHint", "Hidden from buyers")}
              icon={<Lock size={11} />}
              tone="hidden"
              unit={unit}
              valueKg={reservePrice}
              onChangeKg={setReservePrice}
              placeholder={askPh}
              pLbl={pLbl}
            />
            <PricingRow
              label={ta("minBid", "Min bid")}
              hint={ta("minBidHint", "Visible to buyers")}
              icon={<Eye size={11} />}
              tone="visible"
              unit={unit}
              valueKg={minBid}
              onChangeKg={setMinBid}
              placeholder={floorPh}
              pLbl={pLbl}
            />

            <p className="ca-hint">
              ℹ️ {ta("reserveExplain", "Reserve price is your minimum acceptable price. If no bid meets it, you can still award at your discretion.")}
            </p>
          </div>

          {/* 3 ── MARKETS & FREIGHT */}
          <SectionHeader icon="🌍" t={ta("marketsTitle", "Markets & freight")} s={ta("marketsSub", "Countries, ports, freight costs")} />

          <div className="cov4-cfg-row">
            <div className="cov4-cfg-g">
              <span className="cov4-cfg-l">Container</span>
              <div className="cov4-tgl">
                {(["20ft", "40ft"] as const).map((opt) => (
                  <button key={opt} type="button" className={csize === opt ? "on" : ""} onClick={() => setCsize(opt)}>{opt}</button>
                ))}
              </div>
            </div>
            <div className="cov4-cfg-g">
              <span className="cov4-cfg-l">Temperature</span>
              <div className="cov4-tgl">
                {(["Frozen", "Chilled"] as const).map((opt) => (
                  <button key={opt} type="button" className={temp === opt ? "on" : ""} onClick={() => setTemp(opt)}>{opt}</button>
                ))}
              </div>
            </div>
          </div>

          <div id="sec-markets" className="cov4-chips">
            {(() => {
              const byName = new Map(MARKETS.map((m) => [m.n, m]));
              const primary = PRIMARY_MARKETS.map((n) => byName.get(n)).filter(Boolean) as Market[];
              const primaryIds = new Set(primary.map((m) => m.id));
              const extraSelected = selMarkets.filter((m) => !primaryIds.has(m.id));
              const others = MARKETS.filter((m) => !primaryIds.has(m.id));
              return (
                <>
                  {primary.map((m) => {
                    const on = !!selMarkets.find((x) => x.id === m.id);
                    return (
                      <button key={m.id} type="button" className={`cov4-chip ${on ? "on" : ""}`} onClick={() => toggleMarket(m.id)}>
                        {m.f} {m.n} {on && <span className="cov4-chip-ck">✓</span>}
                      </button>
                    );
                  })}
                  {extraSelected.map((m) => (
                    <button key={m.id} type="button" className="cov4-chip on" onClick={() => toggleMarket(m.id)}>
                      {m.f} {m.n} <span className="cov4-chip-ck">✓</span>
                    </button>
                  ))}
                  <Popover open={moreMktsOpen} onOpenChange={setMoreMktsOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" className="cov4-chip cov4-chip-more">
                        <Plus size={12} style={{ marginRight: 4, display: "inline" }} />
                        More markets
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[320px]" align="start">
                      <Command>
                        <CommandInput placeholder="Search markets…" />
                        <CommandList className="max-h-[320px]">
                          <CommandEmpty>No markets</CommandEmpty>
                          <CommandGroup>
                            {others.map((m) => {
                              const on = !!selMarkets.find((x) => x.id === m.id);
                              return (
                                <CommandItem key={m.id} value={`${m.n} ${m.f}`} onSelect={() => toggleMarket(m.id)}>
                                  <span style={{ marginRight: 8 }}>{m.f}</span>
                                  <span style={{ flex: 1 }}>{m.n}</span>
                                  {on && <Check size={14} className="text-primary" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </>
              );
            })()}
          </div>

          {/* Uniform freight */}
          {selMarkets.length >= 2 && (
            <label
              style={{
                margin: "8px 0 4px", padding: "10px 12px", borderRadius: 8,
                background: uniformFreight ? "#E6F1FB" : "#F9FAFB",
                border: `1px solid ${uniformFreight ? "#BDD7F0" : "#E5E7EB"}`,
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexWrap: "wrap",
              }}
            >
              <input type="checkbox" checked={uniformFreight} onChange={() => setUniformFreight((v) => !v)} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>🌐 Same freight for all markets</span>
              {uniformFreight && (
                <input
                  type="number" step="0.01" placeholder="US$/kg"
                  value={uniformFreightValue}
                  onChange={(e) => setUniformFreightValue(e.target.value)}
                  style={{ marginLeft: "auto", padding: "4px 8px", border: "1px solid #D1D5DB", borderRadius: 6, width: 120, fontSize: 12 }}
                />
              )}
            </label>
          )}

          {/* Per-market freight (compact) */}
          {selMarkets.length > 0 && !uniformFreight && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {selMarkets.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#F9FAFB", borderRadius: 6, border: "1px solid #E5E7EB" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{m.f} {m.n}</span>
                  <input
                    type="number" step="0.01" placeholder="Freight US$/kg"
                    value={mktCfg[m.id]?.gf || ""}
                    onChange={(e) =>
                      setMktCfg((prev) => ({
                        ...prev,
                        [m.id]: { ...(prev[m.id] || { sp: m.p.map((p) => p.id), sm: true, pf: {} }), gf: e.target.value },
                      }))
                    }
                    style={{ width: 120, padding: "4px 8px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 12 }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 4 ── INCOTERMS */}
          <div id="sec-inco" className="cov4-sec">
            <div className="cov4-sec-t">Incoterms</div>
            <div className="cov4-chips" style={{ marginBottom: 0 }}>
              {INCOTERMS.map((i) => {
                const on = selInco.includes(i.id);
                const isPrimary = primaryInco === i.id;
                return (
                  <button key={i.id} type="button"
                    className={`cov4-chip ${on ? "on" : ""}`}
                    onClick={() => toggleInco(i.id)}
                    title={i.name}
                    style={on ? { background: INCO_BADGE[i.id].bg, color: INCO_BADGE[i.id].fg, borderColor: INCO_BADGE[i.id].fg } : undefined}
                  >
                    {i.id} {on && <span className="cov4-chip-ck">{isPrimary ? "★" : "✓"}</span>}
                  </button>
                );
              })}
            </div>
            {selInco.length > 1 && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>Primary pricing:</span>
                {selInco.map((s) => (
                  <button key={s} type="button"
                    onClick={() => setPrimaryInco(s)}
                    style={{
                      padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${primaryInco === s ? INCO_BADGE[s].fg : "#D1D5DB"}`,
                      background: primaryInco === s ? INCO_BADGE[s].bg : "#fff",
                      color: primaryInco === s ? INCO_BADGE[s].fg : "#6B7280",
                      cursor: "pointer",
                    }}>
                    {primaryInco === s ? "★ " : ""}{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5 ── CERTIFICATIONS */}
          <div className="cov4-sec">
            <div className="cov4-sec-t">Certifications</div>
            <div className="cov4-chips" style={{ marginBottom: 0 }}>
              {CERTIFICATION_OPTIONS.map((c) => (
                <button key={c} type="button" className={`cov4-chip ${certifications.includes(c) ? "on" : ""}`} onClick={() => toggleCert(c)}>
                  {certifications.includes(c) && <span className="cov4-chip-ck">✓</span>} {c}
                </button>
              ))}
            </div>
          </div>

          {/* 6 ── PAYMENT TERMS */}
          <div className="cov4-sec">
            <div className="cov4-sec-t">Payment terms</div>
            <select className="cov4-pay-select" value={payTerm} onChange={(e) => setPayTerm(e.target.value)}>
              {PAY_TERMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          {/* 7 ── VISIBILITY (replaces Distribution) */}
          <div className="cov4-sec ca-amber-sec">
            <div className="cov4-sh">
              <div className="cov4-sh-ic" style={{ background: "#FDF2D8" }}>
                <Megaphone size={16} color="#7A4B00" />
              </div>
              <div>
                <h2>{ta("visibility", "Auction Visibility")}</h2>
                <p>{ta("visibilitySub", "Who can see and bid on this auction")}</p>
              </div>
            </div>
            <div className="cov4-dist-opts">
              <label className="cov4-dist-opt">
                <input type="radio" name="ca-vis" checked={visibility === "marketplace"} onChange={() => setVisibility("marketplace")} />
                <div>
                  <div className="cov4-dist-label">🏪 {ta("visMarketplace", "Publish to Marketplace")}</div>
                  <div className="cov4-dist-desc">{ta("visMarketplaceDesc", "All buyers can see and bid")}</div>
                </div>
              </label>
              <label className="cov4-dist-opt">
                <input type="radio" name="ca-vis" checked={visibility === "invite"} onChange={() => setVisibility("invite")} />
                <div>
                  <div className="cov4-dist-label">🔒 {ta("visInvite", "Invite-only")}</div>
                  <div className="cov4-dist-desc">{ta("visInviteDesc", "Only selected buyers can see this auction")}</div>
                </div>
              </label>
            </div>
            {visibility === "invite" && (
              <div className="cov4-cust-list">
                {MOCK_CUSTOMERS.map((c) => {
                  const on = selectedCustomers.includes(c.id);
                  return (
                    <button key={c.id} type="button" className={`cov4-cust-chip ${on ? "on" : ""}`} onClick={() => toggleCustomer(c.id)}>
                      {on ? "✓ " : ""}{c.name}
                      <span className="cov4-cust-country">{c.country}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ═══════════ CENTER PANEL: Cuts & Pricing ═══════════ */}
        <main className="cov4-panel cov4-panel-c">
          <div className="cov4-center-head">
            <SectionHeader icon="🥩" t="Cuts & pricing" s="Products, specs, starting & floor price" />
          </div>

          <div className="cov4-cap">
            <div className="cov4-cap-h">
              <span className="cov4-cap-l">Container capacity</span>
              <span className="cov4-cap-v">
                {fmtWeight(tw, unit)} / {fmtWeight(cap, unit)} {wLbl}
                <span className="cov4-cap-p" style={{ color: fc }}>({fp.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="cov4-pbar">
              <div className="cov4-pfill" style={{ width: `${fp}%`, background: fc }} />
            </div>
          </div>

          <div id="sec-cuts" className="cov4-tblw">
            <table className="cov4-tbl">
              <thead>
                <tr>
                  <th>Cut</th>
                  <th>Spec</th>
                  <th>Packaging</th>
                  <th>Grading</th>
                  <th>Aging</th>
                  <th className="num">{qLbl}</th>
                  <th className="num">Start {pLbl}</th>
                  <th className="num">Floor {pLbl}</th>
                  <th>Notes</th>
                  <th style={{ width: 28 }} aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {cuts.map((c, i) => (
                  <tr key={c.id}>
                    <td><span className="cov4-cut-nm">{c.cat} {c.cut}</span></td>
                    <td><span className="cov4-tag">{c.spec}</span></td>
                    <td><span className="cov4-tag">{c.pkg}</span></td>
                    <td><span className="cov4-tag">{c.gr !== "Not Classified" ? c.gr : "—"}</span></td>
                    <td><span className="cov4-tag">{c.ag !== "None" ? c.ag : "—"}</span></td>
                    <td className="num">{fmtWeight(Number(c.qty) || 0, unit)}</td>
                    <td className="num">{fmtPrice(Number(c.ask) || 0, unit)}</td>
                    <td className="num cov4-floor">{c.floor ? fmtPrice(Number(c.floor) || 0, unit) : "—"}</td>
                    <td><span className="cov4-notes-cell">{c.notes || "—"}</span></td>
                    <td><button type="button" className="cov4-rm-x" onClick={() => removeCut(i)} aria-label="Remove cut">✕</button></td>
                  </tr>
                ))}

                {addRow && (
                  <tr style={{ background: "var(--bg-brand-soft)" }}>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <select value={nf.cat} onChange={(e) => setNf((p) => ({ ...p, cat: e.target.value, cut: "", cutId: undefined }))}>
                          {Object.keys(cutsByCategory).map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <Popover open={cutPickerOpen} onOpenChange={setCutPickerOpen}>
                          <PopoverTrigger asChild>
                            <button type="button" className="cov4-cut-trigger">
                              {nf.cut
                                ? <span className="cov4-cut-trigger-v">{nf.cut}</span>
                                : <span className="cov4-cut-trigger-ph">{dataLoading ? "Loading…" : "Pick cut"}</span>}
                              <SearchIcon size={11} style={{ opacity: 0.5 }} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[280px]" align="start">
                            <Command>
                              <CommandInput placeholder="Search cuts…" />
                              <CommandList className="max-h-[280px]">
                                <CommandEmpty>No cuts</CommandEmpty>
                                <CommandGroup>
                                  {(cutsByCategory[nf.cat] ?? []).map((cu) => (
                                    <CommandItem
                                      key={cu.id}
                                      value={cu.displayName}
                                      onSelect={() => {
                                        setNf((p) => ({ ...p, cut: cu.displayName, cutId: cu.id }));
                                        setCutPickerOpen(false);
                                      }}
                                    >
                                      {cu.displayName}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </td>
                    <td><select value={nf.spec} onChange={(e) => setNf((p) => ({ ...p, spec: e.target.value }))}>{SPECS.map((s) => <option key={s}>{s}</option>)}</select></td>
                    <td><select value={nf.pkg}  onChange={(e) => setNf((p) => ({ ...p, pkg: e.target.value }))}>{PKGS.map((s) => <option key={s}>{s}</option>)}</select></td>
                    <td><select value={nf.gr}   onChange={(e) => setNf((p) => ({ ...p, gr: e.target.value }))}>{GRADES.map((s) => <option key={s}>{s}</option>)}</select></td>
                    <td><select value={nf.ag}   onChange={(e) => setNf((p) => ({ ...p, ag: e.target.value }))}>{AGINGS.map((s) => <option key={s}>{s}</option>)}</select></td>
                    <td className="num">
                      <input
                        type="number" placeholder={qtyPh}
                        value={nf.qty === "" ? "" : (unit === "kg" ? nf.qty : toDisplay(parseFloat(nf.qty) || 0, "weight", unit).toFixed(0))}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") return setNf((p) => ({ ...p, qty: "" }));
                          const kg = fromDisplay(parseFloat(v) || 0, "weight", unit);
                          setNf((p) => ({ ...p, qty: String(kg) }));
                        }}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number" step="0.01" placeholder={askPh}
                        value={nf.ask === "" ? "" : (unit === "kg" ? nf.ask : toDisplay(parseFloat(nf.ask) || 0, "price", unit).toFixed(2))}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") return setNf((p) => ({ ...p, ask: "" }));
                          const kg = fromDisplay(parseFloat(v) || 0, "price", unit);
                          setNf((p) => ({ ...p, ask: String(kg) }));
                        }}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number" step="0.01" placeholder={floorPh}
                        value={nf.floor === "" ? "" : (unit === "kg" ? nf.floor : toDisplay(parseFloat(nf.floor) || 0, "price", unit).toFixed(2))}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") return setNf((p) => ({ ...p, floor: "" }));
                          const kg = fromDisplay(parseFloat(v) || 0, "price", unit);
                          setNf((p) => ({ ...p, floor: String(kg) }));
                        }}
                      />
                    </td>
                    <td><input type="text" placeholder="Notes…" value={nf.notes} onChange={(e) => setNf((p) => ({ ...p, notes: e.target.value }))} /></td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button type="button" className="cov4-add-confirm" onClick={addCut} disabled={!nf.cut || !nf.qty || !nf.ask}>+</button>
                        <button type="button" className="cov4-add-cancel" onClick={() => setAddRow(false)}>✕</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!addRow && (
            <button type="button" className="cov4-add-row-btn" onClick={() => setAddRow(true)}>+ Add cut</button>
          )}
          {cuts.length === 0 && !addRow && (
            <div className="cov4-empty"><span style={{ fontSize: 22 }}>📦</span><p>Add the cuts you want to auction</p></div>
          )}
        </main>

        {/* ═══════════ RIGHT PANEL: AUCTION PREVIEW ═══════════ */}
        {showPreview && (
          <aside className="cov4-panel cov4-panel-r">
            <div className="cov4-prev-h">
              <span className="cov4-prev-h-t">👁 Live preview</span>
              <span className="cov4-prev-h-s">Buyer's view</span>
            </div>
            <div className="cov4-prev-card oc--auction">
              <div style={{ marginBottom: 8 }}>
                <span className="auct-badge">🔨 AUCTION</span>
              </div>
              <AuctionPreviewCountdown opensAt={auctionOpensAt} closesAt={auctionClosesAt} />
              <h3 className="cov4-prev-title">
                {cuts.length === 1 ? `${cuts[0].cat} ${cuts[0].cut}` : cuts.length > 1 ? "Mix FCL" : "Untitled Auction"}
              </h3>
              <div className="cov4-prev-meta">
                <PrevRow l="Origin" v="🇧🇷 Brazil, Santos" />
                <PrevRow l="Destination" v={selMarkets.map((m) => m.f + " " + m.n).join(", ") || "—"} />
                <PrevRow l="Incoterm" v={selInco.join(", ") || "—"} />
                <PrevRow l="Temperature" v={temp} />
                <PrevRow l="Container" v={`${csize} · ${fmtWeight(tw, unit)} ${wLbl}`} />
                {certifications.length > 0 && <PrevRow l="Certifications" v={certifications.join(", ")} />}
              </div>

              <div className="cov4-prev-price">
                <span className="cov4-prev-price-l">Starting bid</span>
                <span className="cov4-prev-price-v">
                  US$ {totalPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="cov4-prev-price-sub">per FCL</span>
              </div>

              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--fg-muted)" }}>
                <div>🔒 {ta("reserveHidden", "Reserve")}: {ta("hidden", "Hidden")}</div>
                {minBid && (
                  <div>👁 {ta("minBid", "Min bid")}: US$ {fmtPrice(parseFloat(minBid) || 0, unit)}/{wLbl}</div>
                )}
                <div>📊 0 {ta("bids", "bids")}</div>
              </div>

              <button
                type="button" disabled
                style={{
                  marginTop: 12, width: "100%", padding: "10px 14px",
                  background: "var(--p800)", color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "not-allowed", opacity: 0.85,
                }}
              >
                ⚡ {ta("placeBid", "Place Bid")}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* FOOTER */}
      <footer className="cov4-footer">
        <div className="cov4-ft-l">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={`cov4-ready-pill ${canPublish ? "ready" : ""}`} aria-label="Publishing checklist">
                <span className="cov4-ready-ring" aria-hidden>
                  <svg viewBox="0 0 36 36" width="22" height="22">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${(stepsDone / publishSteps.length) * 94.25} 94.25`}
                      transform="rotate(-90 18 18)"
                      style={{ transition: "stroke-dasharray .35s ease" }}
                    />
                  </svg>
                </span>
                <span className="cov4-ready-txt">
                  {canPublish
                    ? ta("readyToSchedule", "Ready to schedule")
                    : `${stepsDone}/${publishSteps.length} · ${nextStep?.label}`}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="cov4-ready-pop p-0 w-[320px]">
              <div className="cov4-ready-head">
                {canPublish ? ta("readyTitle", "All set — you can schedule 🎉") : ta("remainingTitle", "A few things left")}
              </div>
              <ul className="cov4-ready-list">
                {publishSteps.map((s) => (
                  <li key={s.key}>
                    <button type="button" className={`cov4-ready-item ${s.done ? "done" : ""}`} onClick={() => !s.done && scrollToSection(s.anchor)} disabled={s.done}>
                      <span className={`cov4-ready-dot ${s.done ? "done" : ""}`}>{s.done ? <Check size={12} /> : ""}</span>
                      <span className="cov4-ready-lbl">{s.label}</span>
                      {!s.done && <span className="cov4-ready-go">→</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
        <div className="cov4-ft-r">
          <button type="button" className="cov4-btn-s" onClick={handleCancel}>Cancel</button>
          <button
            type="button" className="cov4-btn-p"
            onClick={() => {
              if (!canPublish && nextStep) { scrollToSection(nextStep.anchor); return; }
              handlePublish();
            }}
            title={nextStep ? `Next: ${nextStep.label}` : "Schedule auction"}
          >
            {ta("scheduleCta", "Schedule Auction")} →
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────── */
function SectionHeader({ icon, t, s }: { icon: string; t: string; s: string }) {
  return (
    <div className="cov4-sh">
      <div className="cov4-sh-ic">{icon}</div>
      <div>
        <h2>{t}</h2>
        <p>{s}</p>
      </div>
    </div>
  );
}

function PrevRow({ l, v }: { l: string; v: string }) {
  return (
    <div className="cov4-prev-row">
      <span className="cov4-prev-row-l">{l}</span>
      <span className="cov4-prev-row-v">{v}</span>
    </div>
  );
}

function PricingRow({
  label, hint, icon, tone, unit, valueKg, onChangeKg, placeholder, pLbl,
}: {
  label: string; hint: string; icon: React.ReactNode; tone: "hidden" | "visible";
  unit: "kg" | "lbs"; valueKg: string; onChangeKg: (v: string) => void;
  placeholder: string; pLbl: string;
}) {
  const display = valueKg === "" ? "" : (unit === "kg" ? valueKg : toDisplay(parseFloat(valueKg) || 0, "price", unit).toFixed(2));
  const toneBg = tone === "hidden" ? "#FEF3C7" : "#DCFCE7";
  const toneFg = tone === "hidden" ? "#92400E" : "#166534";
  return (
    <div className="ca-price-row">
      <div className="ca-price-row-label">
        <span>{label}</span>
        <span className="ca-tone-badge" style={{ background: toneBg, color: toneFg }}>
          {icon} {hint}
        </span>
      </div>
      <div className="cov4-ip">
        <span className="cov4-ip-px">US{pLbl}</span>
        <input
          type="number" step="0.01" placeholder={placeholder}
          value={display}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return onChangeKg("");
            const kg = fromDisplay(parseFloat(v) || 0, "price", unit);
            onChangeKg(String(kg));
          }}
        />
      </div>
    </div>
  );
}

function AuctionPreviewCountdown({ opensAt, closesAt }: { opensAt: string; closesAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const opens  = new Date(opensAt).getTime();
  const closes = new Date(closesAt).getTime();
  const target = now < opens ? opens : closes;
  const ms = Math.max(0, target - now);
  const days  = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins  = Math.floor((ms % 3600000) / 60000);
  const secs  = Math.floor((ms % 60000) / 1000);
  const label = now < opens ? "OPENS IN" : (now > closes ? "CLOSED" : "CLOSES IN");
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      background: "#FDF2D8", color: "#7A4B00", borderRadius: 999, fontSize: 11, fontWeight: 700,
      fontVariantNumeric: "tabular-nums", marginBottom: 8,
    }}>
      {label}: {pad(days)}:{pad(hours)}:{pad(mins)}:{pad(secs)}
    </div>
  );
}