import { useCallback, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import MarketplaceLogisticsDrawer, { type MarketplaceRate } from "@/components/supplier/MarketplaceLogisticsDrawer";
import { useSupplierOfferData, type OfferMarket } from "@/hooks/useSupplierOfferData";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Check, Plus, Search as SearchIcon } from "lucide-react";

/* ══════════════════════════════════════════════════════════
   DATA — markets & cuts come from Supabase via useSupplierOfferData
   ══════════════════════════════════════════════════════════ */
type Market = OfferMarket;
const SPECS = ["Boneless", "Bone-In", "Semi-Boneless"];
const PKGS = ["Vacuum Pack", "Carton Box", "IWP (Individually Wrapped)", "Bulk"];
const GRADES = ["Not Classified", "Low", "Medium", "High", "Prime"];
const AGINGS = ["None", "Wet Aged", "Dry Aged"];

// Primary destination markets shown as chips (in this order).
// Match is done against country english_name.
const PRIMARY_MARKETS = [
  "China", "Hong Kong", "Vietnam", "Taiwan", "Thailand",
  "South Korea", "Indonesia", "Egypt", "Russia", "Jordan",
  "United States", "Canada", "Mexico",
];

// Incoterms that are mutually exclusive (selecting one disables the others).
const INCO_EXCLUSIVE_GROUPS: string[][] = [["CIF", "CFR"]];

type Incoterm = { id: string; name: string; extra: null | "insurance" | "city" };
const INCOTERMS: Incoterm[] = [
  { id: "FOB", name: "FOB - Free on Board", extra: null },
  { id: "CFR", name: "CFR - Cost and Freight", extra: null },
  { id: "CIF", name: "CIF - Cost, Insurance & Freight", extra: "insurance" },
  { id: "EXW", name: "EXW - Ex Works", extra: "city" },
  { id: "DDP", name: "DDP - Delivered Duty Paid", extra: "city" },
  { id: "DAP", name: "DAP - Delivered at Place", extra: "city" },
];

const PAY_TERMS = [
  "30% Advance, Balance TT - Against finalized doc copies",
  "50% Advance, 50% Against BL copy",
  "100% TT in advance",
  "L/C at sight",
  "L/C 30 days",
  "10% Advance, Balance TT - Against finalized doc copies",
  "Open account 30 days",
];

const MOCK_CUSTOMERS = [
  { id: "c1", name: "Delta Imports", country: "China" },
  { id: "c2", name: "Gamma Buyers", country: "Argentina" },
  { id: "c3", name: "Alpha Foods", country: "UAE" },
  { id: "c4", name: "Atrides Mt", country: "Brazil" },
  { id: "c5", name: "WMS Foods", country: "United States" },
];

const CERTIFICATION_OPTIONS = ["Halal", "Kosher", "USDA", "HACCP", "BRC", "Organic"];

type MktCfg = { sp: string[]; sm: boolean; gf: string; pf: Record<string, string> };

type Cut = {
  id: string;
  cat: string;
  cut: string;
  cutId?: string;
  cutImage?: string | null;
  spec: string;
  pkg: string;
  gr: string;
  ag: string;
  qty: string;
  ask: string;
  floor: string;
  notes: string;
};

type IncoExtras = {
  cifInsurance?: string;
  exwCity?: string;
  ddpCity?: string;
  dapCity?: string;
};

const EMPTY_NF: Omit<Cut, "id"> = {
  cat: "Beef", cut: "", spec: "Boneless", pkg: "Vacuum Pack", gr: "Not Classified", ag: "None",
  qty: "", ask: "", floor: "", notes: "",
};

/* ══════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════ */
export default function SupplierCreateOffer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromRequestId = searchParams.get("from");
  const { t } = useTranslation();
  const tm = (k: string, v?: any) => t(`supplier.createOffer.marketplace.${k}`, v as any) as unknown as string;

  const { markets: MARKETS, cutsByCategory, loading: dataLoading, error: dataError } = useSupplierOfferData();
  const isMobile = useIsMobile();
  const [moreMktsOpen, setMoreMktsOpen] = useState(false);
  const [cutPickerOpen, setCutPickerOpen] = useState(false);

  const [selMarkets, setSelMarkets] = useState<Market[]>([]);
  const [mktCfg, setMktCfg] = useState<Record<string, MktCfg>>({});
  const [csize, setCsize] = useState<"20ft" | "40ft">("40ft");
  const [temp, setTemp] = useState<"Frozen" | "Chilled">("Frozen");

  const [selInco, setSelInco] = useState<string[]>(["CIF"]);
  const [incoExtras, setIncoExtras] = useState<IncoExtras>({});

  const [payTerm, setPayTerm] = useState(PAY_TERMS[0]);
  const [certifications, setCertifications] = useState<string[]>([]);

  const [cuts, setCuts] = useState<Cut[]>([]);
  const [cutImgs, setCutImgs] = useState<Record<string, string>>({});
  const [addRow, setAddRow] = useState(false);
  const [newImgPrev, setNewImgPrev] = useState<string | null>(null);
  const [nf, setNf] = useState<Omit<Cut, "id">>({ ...EMPTY_NF });

  const [distMarketplace, setDistMarketplace] = useState(true);
  const [distAllCustomers, setDistAllCustomers] = useState(false);
  const [distSpecific, setDistSpecific] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  const [showAiImport, setShowAiImport] = useState(false);
  const [aiMode, setAiMode] = useState<null | "paste" | "file" | "voice">(null);
  const [aiInput, setAiInput] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  const [mlOpen, setMlOpen] = useState(false);
  const [routeSources, setRouteSources] = useState<Record<string, MarketplaceRate["source"]>>({});

  useEffect(() => {
    if (fromRequestId) {
      toast.success(`Prefilled from request #${fromRequestId}`, { duration: 4000 });
    }
  }, [fromRequestId]);

  useEffect(() => {
    if (dataError) toast.error(`Failed to load catalog: ${dataError}`);
  }, [dataError]);

  const cap = csize === "40ft" ? 28000 : 13000;
  const tw = cuts.reduce((s, c) => s + (parseFloat(c.qty) || 0), 0);
  const fp = Math.min((tw / cap) * 100, 100);
  const fc = fp > 95 ? "#16a34a" : fp > 70 ? "#ca8a04" : "var(--p800)";

  /* Markets */
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

  const togglePort = useCallback((mid: string, pid: string) => {
    setMktCfg((prev) => {
      const c = { ...prev[mid] };
      c.sp = c.sp.includes(pid) ? c.sp.filter((p) => p !== pid) : [...c.sp, pid];
      return { ...prev, [mid]: c };
    });
  }, []);

  /* Incoterms */
  const toggleInco = useCallback((id: string) => {
    setSelInco((prev) => {
      // Block adding if it conflicts with already-selected exclusive incoterm
      if (!prev.includes(id)) {
        const conflict = INCO_EXCLUSIVE_GROUPS.some(
          (grp) => grp.includes(id) && grp.some((x) => x !== id && prev.includes(x))
        );
        if (conflict) return prev;
      }
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next.length === 0 ? [id] : next;
    });
  }, []);

  /* Certifications */
  const toggleCert = (cert: string) => {
    setCertifications((prev) => (prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]));
  };

  /* Cuts */
  const addCut = useCallback(() => {
    if (!nf.cut || !nf.qty || !nf.ask) return;
    const id = Date.now().toString();
    setCuts((prev) => [...prev, { id, ...nf }]);
    if (newImgPrev) {
      setCutImgs((prev) => ({ ...prev, [id]: newImgPrev }));
      setNewImgPrev(null);
    }
    setNf({ ...EMPTY_NF });
    setAddRow(false);
  }, [nf, newImgPrev]);

  const removeCut = useCallback((i: number) => {
    setCuts((prev) => {
      const id = prev[i].id;
      setCutImgs((imgs) => { const n = { ...imgs }; delete n[id]; return n; });
      return prev.filter((_, idx) => idx !== i);
    });
  }, []);

  const handleCutImg = useCallback((cutId: string, file: File) => {
    const r = new FileReader();
    r.onload = (e) => setCutImgs((prev) => ({ ...prev, [cutId]: e.target?.result as string }));
    r.readAsDataURL(file);
  }, []);

  /* AI Import (mock) */
  const simulateAiImport = useCallback(() => {
    setAiProcessing(true);
    setTimeout(() => {
      const mockParsed: Cut[] = [
        { id: Date.now().toString(), cat: "Beef", cut: "Forequarter", spec: "Boneless", pkg: "Vacuum Pack", gr: "Not Classified", ag: "None", qty: "14000", ask: "6.40", floor: "5.80", notes: "98 VL" },
        { id: (Date.now() + 1).toString(), cat: "Beef", cut: "Brisket", spec: "Boneless", pkg: "Carton Box", gr: "Medium", ag: "Wet Aged", qty: "13000", ask: "4.35", floor: "3.90", notes: "" },
      ];
      setCuts((prev) => [...prev, ...mockParsed]);
      setAiProcessing(false);
      setShowAiImport(false);
      setAiMode(null);
      setAiInput("");
      toast.success("AI parsed 2 cuts");
    }, 1500);
  }, []);

  const toggleCustomer = useCallback((id: string) => {
    setSelectedCustomers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const canPublish = selMarkets.length > 0 && cuts.length > 0 && selInco.length > 0;
  const totalPriceUsd = cuts.reduce((s, c) => s + (parseFloat(c.ask) || 0) * (parseFloat(c.qty) || 0), 0);

  const handleSaveDraft = () => toast("Draft saved");

  const applyMarketplaceRate = useCallback((rate: MarketplaceRate) => {
    const market = MARKETS.find((m) => m.id === rate.countryCode);
    if (!market) return;
    setSelMarkets((prev) => (prev.find((x) => x.id === market.id) ? prev : [...prev, market]));
    setMktCfg((prev) => {
      const existing = prev[market.id];
      if (existing) {
        const sp = existing.sp.includes(rate.portId) ? existing.sp : [...existing.sp, rate.portId];
        return {
          ...prev,
          [market.id]: {
            ...existing,
            sp,
            sm: false,
            pf: { ...existing.pf, [rate.portId]: rate.freight },
          },
        };
      }
      return {
        ...prev,
        [market.id]: {
          sp: [rate.portId],
          sm: false,
          gf: rate.freight,
          pf: Object.fromEntries(market.p.map((p) => [p.id, p.id === rate.portId ? rate.freight : ""])),
        },
      };
    });
    setRouteSources((prev) => ({ ...prev, [`${rate.countryCode}-${rate.portId}`]: rate.source }));
    toast.success(tm("importedToast", { carrier: rate.source.carrierShort, freight: Number(rate.freight).toLocaleString() }));
    setMlOpen(false);
  }, [tm, MARKETS]);

  const handlePublish = () => {
    if (!canPublish) return;
    toast.success("Offer ready to publish (mock)");
  };
  const handleCancel = () => {
    if (confirm("Discard this offer?")) navigate("/supplier/offers");
  };

  return (
    <div className="cov4">
      {/* HEADER */}
      <header className="cov4-header">
        <div className="cov4-hdr-l">
          <div>
            <h1>Create new offer</h1>
            <p>Markets · Products · Pricing · Distribution</p>
          </div>
        </div>
        <div className="cov4-hdr-r">
          <span className="cov4-orig-badge">🇧🇷 Brazil · Santos (BRSSZ)</span>
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
          <SectionHeader icon="🌍" t="Markets & freight" s="Countries, ports, freight costs" />

          {/* Container & Temp */}
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

          {/* Market chips */}
          <div className="cov4-chips">
            {MARKETS.map((m) => {
              const on = !!selMarkets.find((x) => x.id === m.id);
              return (
                <button key={m.id} type="button" className={`cov4-chip ${on ? "on" : ""}`} onClick={() => toggleMarket(m.id)}>
                  {m.f} {m.n} {on && <span className="cov4-chip-ck">✓</span>}
                </button>
              );
            })}
          </div>

          {/* Market cards */}
          {selMarkets.map((m) => {
            const c = mktCfg[m.id];
            if (!c) return null;
            return (
              <div key={m.id} className="cov4-mcard">
                <div className="cov4-mc-h">
                  <span style={{ fontSize: 16 }}>{m.f}</span>
                  <h3>{m.n}</h3>
                  <span className="cov4-mc-cnt">{c.sp.length}p</span>
                  <button type="button" className="cov4-rm-btn" onClick={() => toggleMarket(m.id)} aria-label="Remove market">✕</button>
                </div>
                <div className="cov4-ports">
                  {m.p.map((p) => {
                    const on = c.sp.includes(p.id);
                    return (
                      <button key={p.id} type="button" className={`cov4-port ${on ? "on" : ""}`} onClick={() => togglePort(m.id, p.id)}>
                        <span className="cov4-p-dot" />{p.n}
                      </button>
                    );
                  })}
                </div>
                {c.sp.length > 1 && (
                  <div className="cov4-ftgl">
                    <span>Same freight all ports?</span>
                    <div className="cov4-tgl cov4-tgl-sm">
                      {(["Yes", "No"] as const).map((opt) => (
                        <button key={opt} type="button" className={(c.sm ? "Yes" : "No") === opt ? "on" : ""}
                          onClick={() => setMktCfg((pr) => ({ ...pr, [m.id]: { ...pr[m.id], sm: opt === "Yes" } }))}>{opt}</button>
                      ))}
                    </div>
                  </div>
                )}
                {(c.sm || c.sp.length <= 1) ? (
                  <div className="cov4-fr-row">
                    <label className="cov4-fr-lbl">Freight</label>
                    <PriceInput value={c.gf} onChange={(v) => setMktCfg((pr) => ({ ...pr, [m.id]: { ...pr[m.id], gf: v } }))} />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    {c.sp.map((pid) => {
                      const pn = m.p.find((x) => x.id === pid);
                      return (
                        <div key={pid} className="cov4-ppf-r">
                          <span className="cov4-ppf-n">{pn?.n}</span>
                          <PriceInput value={c.pf[pid] || ""} onChange={(v) => setMktCfg((pr) => ({ ...pr, [m.id]: { ...pr[m.id], pf: { ...pr[m.id].pf, [pid]: v } } }))} />
                          <MarketplaceSourceTag src={routeSources[`${m.id}-${pid}`]} via={tm("via")} />
                        </div>
                      );
                    })}
                  </div>
                )}
                {(c.sm || c.sp.length <= 1) && c.sp[0] && (
                  <MarketplaceSourceTag src={routeSources[`${m.id}-${c.sp[0]}`]} via={tm("via")} />
                )}
              </div>
            );
          })}
          {selMarkets.length === 0 && (
            <div className="cov4-empty">
              <span style={{ fontSize: 22 }}>📍</span>
              <p>Select destination markets above</p>
            </div>
          )}

          {/* Marketplace Logistics CTA */}
          <div
            style={{
              marginTop: 12, background: "#8B2252", color: "#fff",
              borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              🚢 {tm("ctaTitle")}
            </div>
            <div style={{ fontSize: 12, opacity: 0.92, lineHeight: 1.4 }}>{tm("ctaDesc")}</div>
            <button
              type="button"
              onClick={() => setMlOpen(true)}
              style={{
                alignSelf: "flex-start", background: "transparent", color: "#fff",
                border: "1px solid rgba(255,255,255,0.6)", borderRadius: 8,
                padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {tm("ctaBtn")} →
            </button>
          </div>

          {/* Incoterms */}
          <div className="cov4-sec">
            <div className="cov4-sec-t">Incoterms</div>
            <div className="cov4-inco-grid">
              {INCOTERMS.map((ic) => {
                const on = selInco.includes(ic.id);
                return (
                  <button key={ic.id} type="button" className={`cov4-inco-btn ${on ? "on" : ""}`} onClick={() => toggleInco(ic.id)}>
                    <span>{on ? "☑" : "☐"}</span>
                    <span>{ic.id}</span>
                  </button>
                );
              })}
            </div>

            {selInco.includes("CIF") && (
              <div className="cov4-inco-extra">
                <span className="cov4-inco-ex-lbl">🛡 CIF Insurance cost</span>
                <PriceInput value={incoExtras.cifInsurance || ""} onChange={(v) => setIncoExtras((p) => ({ ...p, cifInsurance: v }))} />
              </div>
            )}
            {selInco.includes("EXW") && (
              <div className="cov4-inco-extra">
                <span className="cov4-inco-ex-lbl">📍 EXW Pickup location</span>
                <input className="cov4-text-in" placeholder="City, warehouse address..." value={incoExtras.exwCity || ""} onChange={(e) => setIncoExtras((p) => ({ ...p, exwCity: e.target.value }))} />
              </div>
            )}
            {selInco.includes("DDP") && (
              <div className="cov4-inco-extra">
                <span className="cov4-inco-ex-lbl">🚚 DDP Delivery city</span>
                <input className="cov4-text-in" placeholder="Final destination city..." value={incoExtras.ddpCity || ""} onChange={(e) => setIncoExtras((p) => ({ ...p, ddpCity: e.target.value }))} />
              </div>
            )}
            {selInco.includes("DAP") && (
              <div className="cov4-inco-extra">
                <span className="cov4-inco-ex-lbl">📦 DAP Delivery place</span>
                <input className="cov4-text-in" placeholder="Delivery address or terminal..." value={incoExtras.dapCity || ""} onChange={(e) => setIncoExtras((p) => ({ ...p, dapCity: e.target.value }))} />
              </div>
            )}
          </div>

          {/* Certifications (preserved) */}
          <div className="cov4-sec">
            <div className="cov4-sec-t">Certifications</div>
            <div className="cov4-chips" style={{ marginBottom: 0 }}>
              {CERTIFICATION_OPTIONS.map((cert) => (
                <button key={cert} type="button"
                  className={`cov4-chip ${certifications.includes(cert) ? "on" : ""}`}
                  onClick={() => toggleCert(cert)}>
                  {certifications.includes(cert) && <span className="cov4-chip-ck">✓</span>} {cert}
                </button>
              ))}
            </div>
          </div>

          {/* Payment terms */}
          <div className="cov4-sec">
            <div className="cov4-sec-t">Payment terms</div>
            <select className="cov4-pay-select" value={payTerm} onChange={(e) => setPayTerm(e.target.value)}>
              {PAY_TERMS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <p className="cov4-hint">From your supplier preferences — editable per offer</p>
          </div>

          {/* Distribution */}
          <div className="cov4-sec">
            <div className="cov4-sec-t">Offer distribution</div>
            <div className="cov4-dist-opts">
              <label className="cov4-dist-opt">
                <input type="checkbox" checked={distMarketplace} onChange={() => setDistMarketplace((v) => !v)} />
                <div>
                  <div className="cov4-dist-label">🏪 Publish to Marketplace</div>
                  <div className="cov4-dist-desc">Visible to all buyers on the platform</div>
                </div>
              </label>
              <label className="cov4-dist-opt">
                <input type="checkbox" checked={distAllCustomers} onChange={() => setDistAllCustomers((v) => !v)} />
                <div>
                  <div className="cov4-dist-label">📨 Send to all my customers</div>
                  <div className="cov4-dist-desc">Notify all registered buyers</div>
                </div>
              </label>
              <label className="cov4-dist-opt">
                <input type="checkbox" checked={distSpecific} onChange={() => setDistSpecific((v) => !v)} />
                <div>
                  <div className="cov4-dist-label">🎯 Specific customers</div>
                  <div className="cov4-dist-desc">Choose which buyers receive this offer</div>
                </div>
              </label>
            </div>
            {distSpecific && (
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

        {/* ═══════════ CENTER PANEL ═══════════ */}
        <main className="cov4-panel cov4-panel-c">
          <div className="cov4-center-head">
            <SectionHeader icon="🥩" t="Cuts & pricing" s="Products, specs, photos, ask & floor price" />
            <button type="button" className="cov4-ai-btn" onClick={() => setShowAiImport((v) => !v)}>
              ✨ AI Import
            </button>
          </div>

          {/* AI panel */}
          {showAiImport && (
            <div className="cov4-ai-panel">
              <div className="cov4-ai-h">
                <span className="cov4-ai-t">✨ AI-powered import</span>
                <button type="button" className="cov4-rm-btn" onClick={() => { setShowAiImport(false); setAiMode(null); }}>✕</button>
              </div>
              <p className="cov4-ai-d">Import cuts from any source — AI will parse and auto-fill the table</p>
              <div className="cov4-ai-modes">
                <button type="button" className={`cov4-ai-mode ${aiMode === "paste" ? "on" : ""}`} onClick={() => setAiMode("paste")}>📋 Paste from Excel/Text</button>
                <button type="button" className={`cov4-ai-mode ${aiMode === "file" ? "on" : ""}`} onClick={() => setAiMode("file")}>📄 Upload PDF / Image</button>
                <button type="button" className={`cov4-ai-mode ${aiMode === "voice" ? "on" : ""}`} onClick={() => setAiMode("voice")}>🎤 Voice input</button>
              </div>
              {aiMode === "paste" && (
                <div>
                  <textarea
                    className="cov4-ai-textarea"
                    rows={4}
                    placeholder={"Paste your data here...\ne.g.: Beef Forequarter | Boneless | 14,000 kg | $6.40/kg\n       Beef Brisket | Bone-In | 13,000 kg | $4.35/kg"}
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                  />
                  <button type="button" className="cov4-ai-process" onClick={simulateAiImport} disabled={!aiInput || aiProcessing}>
                    {aiProcessing ? "⏳ Processing..." : "✨ Parse & import"}
                  </button>
                </div>
              )}
              {aiMode === "file" && (
                <label className="cov4-ai-upload">
                  <span style={{ fontSize: 24 }}>📎</span>
                  <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Drop PDF, image, or click to upload</span>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv" onChange={() => simulateAiImport()} />
                </label>
              )}
              {aiMode === "voice" && (
                <button type="button" className="cov4-voice" onClick={simulateAiImport}>
                  <span style={{ fontSize: 28 }}>🎙</span>
                  <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{aiProcessing ? "Listening..." : "Tap to start recording"}</span>
                </button>
              )}
            </div>
          )}

          {/* Capacity bar */}
          <div className="cov4-cap">
            <div className="cov4-cap-h">
              <span className="cov4-cap-l">Container capacity</span>
              <span className="cov4-cap-v">
                {tw.toLocaleString()} / {cap.toLocaleString()} kg
                <span className="cov4-cap-p" style={{ color: fc }}>({fp.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="cov4-pbar">
              <div className="cov4-pfill" style={{ width: `${fp}%`, background: fc }} />
            </div>
          </div>

          {/* Cuts table */}
          <div className="cov4-tblw">
            <table className="cov4-tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Photo</th>
                  <th>Cut</th>
                  <th>Spec</th>
                  <th>Packaging</th>
                  <th>Grading</th>
                  <th>Aging</th>
                  <th className="num">Qty (kg)</th>
                  <th className="num">Ask $/kg</th>
                  <th className="num">Floor $/kg</th>
                  <th>Notes</th>
                  <th style={{ width: 28 }} aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {cuts.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      <label className={`cov4-img-box ${cutImgs[c.id] || c.cutImage ? "has" : ""}`}>
                        {cutImgs[c.id] ? (
                          <img src={cutImgs[c.id]} alt="" />
                        ) : c.cutImage ? (
                          <img src={c.cutImage} alt="" />
                        ) : (
                          <span style={{ fontSize: 12, color: "#aaa" }}>📷</span>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleCutImg(c.id, e.target.files[0])} />
                      </label>
                    </td>
                    <td><span className="cov4-cut-nm">{c.cat} {c.cut}</span></td>
                    <td><span className="cov4-tag">{c.spec}</span></td>
                    <td><span className="cov4-tag">{c.pkg}</span></td>
                    <td><span className="cov4-tag">{c.gr !== "Not Classified" ? c.gr : "—"}</span></td>
                    <td><span className="cov4-tag">{c.ag !== "None" ? c.ag : "—"}</span></td>
                    <td className="num">{Number(c.qty).toLocaleString()}</td>
                    <td className="num">{Number(c.ask).toFixed(2)}</td>
                    <td className="num cov4-floor">{c.floor ? Number(c.floor).toFixed(2) : "—"}</td>
                    <td><span className="cov4-notes-cell">{c.notes || "—"}</span></td>
                    <td>
                      <button type="button" className="cov4-rm-x" onClick={() => removeCut(i)} aria-label="Remove cut">✕</button>
                    </td>
                  </tr>
                ))}

                {addRow && (
                  <tr style={{ background: "var(--bg-brand-soft)" }}>
                    <td>
                      <label className="cov4-img-box">
                        {newImgPrev
                          ? <img src={newImgPrev} alt="" />
                          : <span style={{ fontSize: 11, color: "#aaa" }}>📷</span>}
                        <input type="file" accept="image/*" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const r = new FileReader();
                            r.onload = (ev) => setNewImgPrev(ev.target?.result as string);
                            r.readAsDataURL(f);
                          }
                        }} />
                      </label>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <select
                          value={nf.cat}
                          onChange={(e) => setNf((p) => ({ ...p, cat: e.target.value, cut: "", cutId: undefined, cutImage: null }))}
                        >
                          {Object.keys(cutsByCategory).map((c) => (
                            <option key={c} value={c}>
                              {t(`admin.marketplace.cuts.categories.${c}`, { defaultValue: c })}
                            </option>
                          ))}
                        </select>
                        <select
                          value={nf.cutId ?? ""}
                          onChange={(e) => {
                            const id = e.target.value;
                            const found = (cutsByCategory[nf.cat] || []).find((x) => x.id === id);
                            setNf((p) => ({
                              ...p,
                              cutId: id || undefined,
                              cut: found?.displayName ?? "",
                              cutImage: found?.image_url ?? null,
                            }));
                          }}
                        >
                          <option value="">{dataLoading ? "Loading..." : "Cut..."}</option>
                          {(cutsByCategory[nf.cat] || []).map((c) => (
                            <option key={c.id} value={c.id}>{c.displayName}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td><select value={nf.spec} onChange={(e) => setNf((p) => ({ ...p, spec: e.target.value }))}>{SPECS.map((x) => <option key={x}>{x}</option>)}</select></td>
                    <td><select value={nf.pkg} onChange={(e) => setNf((p) => ({ ...p, pkg: e.target.value }))}>{PKGS.map((x) => <option key={x}>{x}</option>)}</select></td>
                    <td><select value={nf.gr} onChange={(e) => setNf((p) => ({ ...p, gr: e.target.value }))}>{GRADES.map((x) => <option key={x}>{x}</option>)}</select></td>
                    <td><select value={nf.ag} onChange={(e) => setNf((p) => ({ ...p, ag: e.target.value }))}>{AGINGS.map((x) => <option key={x}>{x}</option>)}</select></td>
                    <td><input type="number" placeholder="27000" value={nf.qty} onChange={(e) => setNf((p) => ({ ...p, qty: e.target.value }))} /></td>
                    <td><input type="number" step="0.01" placeholder="6.40" value={nf.ask} onChange={(e) => setNf((p) => ({ ...p, ask: e.target.value }))} /></td>
                    <td><input type="number" step="0.01" placeholder="5.80" value={nf.floor} onChange={(e) => setNf((p) => ({ ...p, floor: e.target.value }))} /></td>
                    <td><input type="text" placeholder="Notes..." value={nf.notes} onChange={(e) => setNf((p) => ({ ...p, notes: e.target.value }))} /></td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button type="button" className="cov4-add-confirm" onClick={addCut} disabled={!nf.cut || !nf.qty || !nf.ask}>+</button>
                        <button type="button" className="cov4-add-cancel" onClick={() => { setAddRow(false); setNewImgPrev(null); }}>✕</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!addRow && (
            <button type="button" className="cov4-add-row-btn" onClick={() => setAddRow(true)}>+ Add cut manually</button>
          )}
          {cuts.length === 0 && !addRow && !showAiImport && (
            <div className="cov4-empty"><span style={{ fontSize: 22 }}>📦</span><p>Add cuts manually or use AI Import</p></div>
          )}
        </main>

        {/* ═══════════ RIGHT: LIVE PREVIEW ═══════════ */}
        {showPreview && (
          <aside className="cov4-panel cov4-panel-r">
            <div className="cov4-prev-h">
              <span className="cov4-prev-h-t">👁 Live preview</span>
              <span className="cov4-prev-h-s">Buyer's view</span>
            </div>
            <div className="cov4-prev-card">
              <div className="cov4-prev-img">
                {cuts.length > 0 && (cutImgs[cuts[0].id] || cuts[0].cutImage) ? (
                  <img src={cutImgs[cuts[0].id] || (cuts[0].cutImage as string)} alt="" />
                ) : (
                  <span style={{ fontSize: 36, opacity: 0.3 }}>🥩</span>
                )}
              </div>
              <h3 className="cov4-prev-title">
                {cuts.length === 1 ? `${cuts[0].cat} ${cuts[0].cut}` : cuts.length > 1 ? "Mix FCL" : "Untitled Offer"}
              </h3>
              <div className="cov4-prev-meta">
                <PrevRow l="Origin" v="🇧🇷 Brazil, Santos" />
                <PrevRow l="Destination" v={selMarkets.map((m) => m.f + " " + m.n).join(", ") || "—"} />
                <PrevRow l="Incoterm" v={selInco.join(", ")} />
                <PrevRow l="Temperature" v={temp} />
                <PrevRow l="Container" v={`${csize} · ${tw.toLocaleString()} kg`} />
                {certifications.length > 0 && <PrevRow l="Certifications" v={certifications.join(", ")} />}
              </div>
              {cuts.length > 0 && (
                <div className="cov4-prev-cuts">
                  <div className="cov4-prev-cuts-t">Cuts included</div>
                  {cuts.map((c) => (
                    <div key={c.id} className="cov4-prev-cut-row">
                      <span>{c.cat} {c.cut}</span>
                      <span>US$ {Number(c.ask).toFixed(2)}/kg</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="cov4-prev-price">
                <span className="cov4-prev-price-l">Starting from</span>
                <span className="cov4-prev-price-v">
                  US$ {totalPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="cov4-prev-price-sub">per FCL</span>
              </div>
              <div className="cov4-prev-dist">
                <div className="cov4-prev-dist-t">Distribution</div>
                {distMarketplace && <span className="cov4-prev-dist-tag">🏪 Marketplace</span>}
                {distAllCustomers && <span className="cov4-prev-dist-tag">📨 All customers</span>}
                {distSpecific && <span className="cov4-prev-dist-tag">🎯 {selectedCustomers.length} selected</span>}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* FOOTER */}
      <footer className="cov4-footer">
        <span className="cov4-ft-sum">
          {selMarkets.length} market{selMarkets.length !== 1 ? "s" : ""} · {selInco.join(", ") || "—"} · {cuts.length} cut{cuts.length !== 1 ? "s" : ""} · {tw.toLocaleString()} kg · {payTerm.split(",")[0]}
        </span>
        <div className="cov4-ft-r">
          <button type="button" className="cov4-btn-s" onClick={handleCancel}>Cancel</button>
          <button type="button" className="cov4-btn-s" onClick={handleSaveDraft}>Save draft</button>
          <button type="button" className="cov4-btn-p" onClick={handlePublish} disabled={!canPublish}>
            Review &amp; publish →
          </button>
        </div>
      </footer>

      <MarketplaceLogisticsDrawer
        open={mlOpen}
        onClose={() => setMlOpen(false)}
        markets={MARKETS}
        csize={csize}
        origin="Santos (BRSSZ)"
        onApplyRate={applyMarketplaceRate}
      />
    </div>
  );
}

/* ── helpers ── */
function MarketplaceSourceTag({
  src,
  via,
}: {
  src?: MarketplaceRate["source"];
  via: string;
}) {
  if (!src) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      <span
        style={{
          background: src.carrierColor,
          color: src.carrierTextColor,
          borderRadius: 999,
          padding: "1px 7px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        {src.carrierShort}
      </span>
      <span style={{ fontSize: 10, color: "#6b7280" }}>{via}</span>
    </div>
  );
}

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

function PriceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="cov4-ip">
      <span className="cov4-ip-px">US$</span>
      <input type="number" placeholder="0.00" value={value} onChange={(e) => onChange(e.target.value)} />
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
