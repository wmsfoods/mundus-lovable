import { Fragment, useCallback, useState, useEffect, useRef } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import {
  toDisplay,
  fromDisplay,
  priceLabel,
  qtyLabel,
  weightLabel,
  containerCapacityKg,
  fmtWeight,
  fmtPrice,
  type WeightUnit,
} from "@/lib/units";

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

/* Visual badge tokens for each incoterm pill in tables/pricing UI */
const INCO_BADGE: Record<string, { bg: string; fg: string }> = {
  FOB: { bg: "#FAEEDA", fg: "#633806" },
  CFR: { bg: "#E6F1FB", fg: "#0C447C" },
  CIF: { bg: "#FBEAF0", fg: "#72243E" },
  EXW: { bg: "#EEF2FF", fg: "#3730A3" },
  DDP: { bg: "#ECFDF5", fg: "#065F46" },
  DAP: { bg: "#FEF3C7", fg: "#92400E" },
};

/* Convert a price expressed in the primary incoterm into the secondary one.
   `adj` is the per-secondary delta the supplier provides; `insurance` is
   the CIF insurance cost (US$/kg) supplied via incoExtras.cifInsurance. */
function deriveSecondary(
  primaryPrice: number,
  primary: string,
  secondary: string,
  adj: number,
  insurance: number
): number {
  if (primary === secondary) return primaryPrice;
  if (primary === "CIF" && secondary === "CFR") return primaryPrice - insurance;
  if (primary === "CFR" && secondary === "CIF") return primaryPrice + insurance;
  if ((primary === "CFR" || primary === "CIF") && secondary === "FOB") return primaryPrice - adj;
  if (primary === "FOB" && secondary === "CFR") return primaryPrice + adj;
  if (primary === "FOB" && secondary === "CIF") return primaryPrice + adj + insurance;
  return primaryPrice + adj;
}

/* Validate ask >= floor. Returns ok=true if either is empty or ask >= floor. */
function validatePricePair(ask: string | number | null | undefined, floor: string | number | null | undefined): { ok: boolean; msg: string } {
  const a = typeof ask === "number" ? ask : parseFloat(String(ask ?? ""));
  const f = typeof floor === "number" ? floor : parseFloat(String(floor ?? ""));
  if (isNaN(a) || isNaN(f)) return { ok: true, msg: "" };
  if (a < f) return { ok: false, msg: "Asking must be ≥ floor" };
  return { ok: true, msg: "" };
}

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

  /* Display unit (kg vs lbs). All `cuts`/`nf` state is stored in kg; we only
     convert at the I/O boundary. */
  const { unit, setUnit } = useWeightUnit();
  const wLbl = weightLabel(unit);
  const pLbl = priceLabel(unit);
  const qLbl = qtyLabel(unit);
  const qtyPh = unit === "kg" ? "27000" : "59524";
  const askPh = unit === "kg" ? "6.40" : "2.90";
  const floorPh = unit === "kg" ? "5.80" : "2.63";

  const { markets: MARKETS, cutsByCategory, loading: dataLoading, error: dataError } = useSupplierOfferData();
  const isMobile = useIsMobile();
  const [moreMktsOpen, setMoreMktsOpen] = useState(false);
  const [cutPickerOpen, setCutPickerOpen] = useState(false);

  const [selMarkets, setSelMarkets] = useState<Market[]>([]);
  const [mktCfg, setMktCfg] = useState<Record<string, MktCfg>>({});
  const [csize, setCsize] = useState<"20ft" | "40ft">("40ft");
  const [temp, setTemp] = useState<"Frozen" | "Chilled">("Frozen");

  const [selInco, setSelInco] = useState<string[]>([]);
  const [incoExtras, setIncoExtras] = useState<IncoExtras>({});

  /* Multi-incoterm pricing */
  const [primaryInco, setPrimaryInco] = useState<string>("");
  const [incoAdjustments, setIncoAdjustments] = useState<Record<string, string>>({});
  const [cutIncoOverrides, setCutIncoOverrides] = useState<
    Record<string, Record<string, { ask?: string; floor?: string }>>
  >({});

  /* Uniform freight across markets */
  const [uniformFreight, setUniformFreight] = useState(false);
  const [uniformFreightValue, setUniformFreightValue] = useState("");

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

  /* Auto-pick the primary pricing incoterm: prefer CFR, then CIF, else first */
  useEffect(() => {
    if (selInco.length === 0) {
      if (primaryInco) setPrimaryInco("");
      return;
    }
    if (!selInco.includes(primaryInco)) {
      const preferred =
        selInco.find((i) => i === "CFR") ||
        selInco.find((i) => i === "CIF") ||
        selInco[0];
      setPrimaryInco(preferred);
    }
  }, [selInco, primaryInco]);

  const cap = containerCapacityKg(csize);
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
    if (!validatePricePair(nf.ask, nf.floor).ok) {
      toast.error("Asking price must be ≥ floor price");
      return;
    }
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

  /* Override / reset secondary-incoterm prices for a single cut */
  const setCutOverride = useCallback(
    (cutId: string, inco: string, field: "ask" | "floor", value: string | undefined) => {
      setCutIncoOverrides((prev) => {
        const next = { ...prev };
        const forCut = { ...(next[cutId] || {}) };
        const forInco = { ...(forCut[inco] || {}) };
        if (value === undefined || value === "") delete forInco[field];
        else forInco[field] = value;
        if (!forInco.ask && !forInco.floor) delete forCut[inco];
        else forCut[inco] = forInco;
        if (Object.keys(forCut).length === 0) delete next[cutId];
        else next[cutId] = forCut;
        return next;
      });
    },
    []
  );

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

  const distOk = distMarketplace || distAllCustomers || (distSpecific && selectedCustomers.length > 0);
  const publishSteps = [
    { key: "markets",  label: "Select at least one destination market", done: selMarkets.length > 0, anchor: "sec-markets" },
    { key: "cuts",     label: "Add at least one product cut",            done: cuts.length > 0,       anchor: "sec-cuts" },
    { key: "inco",     label: "Choose an incoterm",                      done: selInco.length > 0,    anchor: "sec-inco" },
    { key: "dist",     label: "Pick how to distribute the offer",        done: distOk,                anchor: "sec-dist" },
  ];
  const stepsDone = publishSteps.filter((s) => s.done).length;
  const nextStep  = publishSteps.find((s) => !s.done);
  const canPublish = !nextStep;
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("cov4-pulse");
    window.setTimeout(() => el.classList.remove("cov4-pulse"), 1400);
  }, []);
  const totalPriceUsd = cuts.reduce((s, c) => s + (parseFloat(c.ask) || 0) * (parseFloat(c.qty) || 0), 0);

  /* Secondary incoterms (everything in selInco except the primary one) */
  const secondaryIncos = selInco.filter((i) => i !== primaryInco);
  const multiInco = selInco.length > 1 && !!primaryInco;
  const cifInsuranceNum = parseFloat(incoExtras.cifInsurance || "0") || 0;

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

  const [publishing, setPublishing] = useState(false);
  const handlePublish = async () => {
    if (!canPublish || publishing) return;
    setPublishing(true);
    const MOCK_SUPPLIER_ID = "0c543bae-647d-4f2e-980a-e35e70a94674";
    try {
      // Derive shipment month/year (next calendar month if not specified)
      const now = new Date();
      const shipDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const shipment_month = shipDate.getMonth() + 1;
      const shipment_year = shipDate.getFullYear();

      // Total FCL from kg / container capacity
      const totalKg = cuts.reduce((s, c) => s + (parseFloat(c.qty) || 0), 0);
      const totalFcl = Math.max(1, Math.ceil(totalKg / cap));

      // Supplier name (fallback)
      let supplierName = "Mundus Supplier";
      const { data: supplierRow } = await supabase
        .from("companies").select("name").eq("id", MOCK_SUPPLIER_ID).maybeSingle();
      if (supplierRow?.name) supplierName = supplierRow.name;

      // 1. Create offer
      const { data: offer, error: offerErr } = await supabase
        .from("offers")
        .insert({
          supplier_id: MOCK_SUPPLIER_ID,
          supplier_name: supplierName,
          status: "active",
          origin_country: "Brazil",
          origin_port: "Santos (BRSSZ)",
          shipment_month,
          shipment_year,
          payment_terms: payTerm,
          container_size: csize,
          total_fcl: totalFcl,
          is_halal: certifications.includes("Halal"),
          is_kosher: certifications.includes("Kosher"),
        })
        .select("id, offer_number")
        .single();
      if (offerErr || !offer) throw offerErr ?? new Error("offer insert failed");

      // 2. Resolve/create customer_products per cut, then insert offer_items
      type OfferItemInsert = {
        offer_id: string; customer_product_id: string;
        amount: number; price: number; minimum_price: number;
        minimum_amount: number; maximum_amount: number;
        condition: string; aging_method: string | null;
      };
      const itemsRows: OfferItemInsert[] = [];
      for (const c of cuts) {
        if (!c.cutId) continue;
        const qty = parseFloat(c.qty) || 0;
        const ask = parseFloat(c.ask) || 0;
        const floor = parseFloat(c.floor);
        const floorVal = Number.isFinite(floor) && floor > 0 ? floor : ask;
        if (qty <= 0 || ask <= 0) continue;

        // find or create customer_product
        const { data: existing } = await supabase
          .from("customer_products")
          .select("id")
          .eq("company_id", MOCK_SUPPLIER_ID)
          .eq("standard_product_id", c.cutId)
          .maybeSingle();
        let customerProductId = existing?.id;
        if (!customerProductId) {
          const { data: created, error: cpErr } = await supabase
            .from("customer_products")
            .insert({
              company_id: MOCK_SUPPLIER_ID,
              standard_product_id: c.cutId,
              name: c.cut,
              is_active: true,
            })
            .select("id").single();
          if (cpErr || !created) throw cpErr ?? new Error("customer_products insert failed");
          customerProductId = created.id;
        }
        itemsRows.push({
          offer_id: offer.id,
          customer_product_id: customerProductId,
          amount: qty,
          price: ask,
          minimum_price: floorVal,
          minimum_amount: qty,
          maximum_amount: qty,
          condition: temp,
          aging_method: c.ag === "None" ? null : c.ag,
        });
      }
      if (itemsRows.length === 0) throw new Error("Add at least one cut with quantity and price");
      const { error: itemsErr } = await supabase.from("offer_items").insert(itemsRows);
      if (itemsErr) throw itemsErr;

      // 3. offer_allowed_incoterms
      const allowed = (selInco.length ? selInco : (primaryInco ? [primaryInco] : []))
        .filter((x) => ["CIF", "CFR", "FOB", "EXW", "FDB"].includes(x));
      if (allowed.length > 0) {
        const { error: incErr } = await supabase.from("offer_allowed_incoterms")
          .insert(allowed.map((it) => ({ offer_id: offer.id, incoterm_type: it })));
        if (incErr) throw incErr;
      }

      // 4. offer_markets — need markets.id (lookup by country_id == selMarkets[i].id)
      if (selMarkets.length > 0) {
        const countryIds = selMarkets.map((m) => m.id);
        const { data: mktRows, error: mktErr } = await supabase
          .from("markets")
          .select("id, country_id")
          .in("country_id", countryIds);
        if (mktErr) throw mktErr;
        const byCountry = new Map((mktRows ?? []).map((r) => [r.country_id, r.id]));
        const mktInserts = countryIds
          .map((cid) => byCountry.get(cid))
          .filter((v): v is string => !!v)
          .map((market_id) => ({ offer_id: offer.id, market_id }));
        if (mktInserts.length > 0) {
          const { error: omErr } = await supabase.from("offer_markets").insert(mktInserts);
          if (omErr) throw omErr;
        }
      }

      // 5. freight_options per port
      const freightInserts: Array<{ offer_id: string; port_id: string; cost: number; insurance: number }> = [];
      const insuranceVal = parseFloat(incoExtras.cifInsurance ?? "") || 0;
      for (const m of selMarkets) {
        const cfg = mktCfg[m.id];
        if (!cfg) continue;
        for (const pid of cfg.sp) {
          const rawFreight = uniformFreight
            ? uniformFreightValue
            : (cfg.sm || cfg.sp.length <= 1) ? cfg.gf : (cfg.pf[pid] ?? "");
          const cost = parseFloat(rawFreight) || 0;
          freightInserts.push({ offer_id: offer.id, port_id: pid, cost, insurance: insuranceVal });
        }
      }
      if (freightInserts.length > 0) {
        const { error: frErr } = await supabase.from("freight_options").insert(freightInserts);
        if (frErr) throw frErr;
      }

      toast.success(`Offer #${offer.offer_number} published successfully!`);
      navigate("/supplier/offers");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to publish offer";
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
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
          <div className="cov4-tgl" role="group" aria-label="Unit">
            {(["kg", "lbs"] as const).map((u) => (
              <button
                key={u}
                type="button"
                className={unit === u ? "on" : ""}
                onClick={() => setUnit(u)}
              >
                {u}
              </button>
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
                        {tm("moreMarkets")}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[320px]" align="start">
                      <Command>
                        <CommandInput placeholder={tm("searchMarketsPh") as string} />
                        <CommandList className="max-h-[320px]">
                          <CommandEmpty>{tm("noMarkets")}</CommandEmpty>
                          <CommandGroup>
                            {others.map((m) => {
                              const on = !!selMarkets.find((x) => x.id === m.id);
                              return (
                                <CommandItem
                                  key={m.id}
                                  value={`${m.n} ${m.f}`}
                                  onSelect={() => toggleMarket(m.id)}
                                >
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

          {/* ── Uniform freight toggle (only meaningful with 2+ markets) ── */}
          {selMarkets.length >= 2 && (
            <div
              style={{
                margin: "8px 0 4px",
                padding: "10px 12px",
                borderRadius: 8,
                background: uniformFreight ? "#E6F1FB" : "#F9FAFB",
                border: `1px solid ${uniformFreight ? "#BDD7F0" : "#E5E7EB"}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                transition: "background .15s, border-color .15s",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1, minWidth: 220 }}
                onClick={() => setUniformFreight((v) => !v)}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  🌐 Same freight for all markets and ports
                </span>
                <span
                  role="switch"
                  aria-checked={uniformFreight}
                  style={{
                    width: 36,
                    height: 20,
                    background: uniformFreight ? "var(--p800)" : "#d1d5db",
                    borderRadius: 999,
                    position: "relative",
                    transition: "background .15s",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: uniformFreight ? 18 : 2,
                      width: 16,
                      height: 16,
                      background: "#fff",
                      borderRadius: "50%",
                      transition: "left .15s",
                      boxShadow: "0 1px 2px rgba(0,0,0,.2)",
                    }}
                  />
                </span>
              </div>
              {uniformFreight && (
                <>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {selMarkets.map((m) => (
                      <span
                        key={m.id}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#fff",
                          border: "1px solid #BDD7F0",
                          fontSize: 11,
                          color: "#0C447C",
                        }}
                      >
                        {m.f} {m.n}
                      </span>
                    ))}
                  </div>
                  <PriceInput value={uniformFreightValue} onChange={setUniformFreightValue} />
                </>
              )}
            </div>
          )}

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
                {!uniformFreight && c.sp.length > 1 && (
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
                {uniformFreight ? null : (c.sm || c.sp.length <= 1) ? (
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
                {!uniformFreight && (c.sm || c.sp.length <= 1) && c.sp[0] && (
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
          <div id="sec-inco" className="cov4-sec">
            <div className="cov4-sec-t">Incoterms</div>
            <div className="cov4-inco-grid">
              {INCOTERMS.map((ic) => {
                const on = selInco.includes(ic.id);
                const conflicted = !on && INCO_EXCLUSIVE_GROUPS.some(
                  (grp) => grp.includes(ic.id) && grp.some((x) => x !== ic.id && selInco.includes(x))
                );
                return (
                  <button
                    key={ic.id}
                    type="button"
                    className={`cov4-inco-btn ${on ? "on" : ""} ${conflicted ? "disabled" : ""}`}
                    onClick={() => !conflicted && toggleInco(ic.id)}
                    disabled={conflicted}
                    title={conflicted ? (tm("incoConflict") as string) : undefined}
                  >
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

            {/* ── Multi-incoterm pricing: primary selector + per-secondary adjustment ── */}
            {selInco.length > 1 && (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  border: "1px solid #E5E7EB",
                  background: "#F9FAFB",
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  Primary pricing incoterm
                  <span style={{ marginLeft: 6, color: "var(--fg-muted)", fontWeight: 400 }}>
                    — Your prices are based on which incoterm?
                  </span>
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {selInco.map((ic) => {
                    const desc =
                      ic === "FOB" ? "my price is at origin, no freight"
                      : ic === "CFR" ? "my price already includes freight"
                      : ic === "CIF" ? "my price includes freight + insurance"
                      : ic;
                    return (
                      <label
                        key={ic}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}
                      >
                        <input
                          type="radio"
                          name="primaryInco"
                          checked={primaryInco === ic}
                          onChange={() => setPrimaryInco(ic)}
                        />
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: INCO_BADGE[ic]?.bg ?? "#eee",
                            color: INCO_BADGE[ic]?.fg ?? "#333",
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          {ic}
                        </span>
                        <span style={{ color: "var(--fg-muted)" }}>({desc})</span>
                      </label>
                    );
                  })}
                </div>
                {selInco
                  .filter((s) => s !== primaryInco)
                  .map((s) => {
                    const primaryIsFreight = primaryInco === "CFR" || primaryInco === "CIF";
                    const op =
                      primaryIsFreight && s === "FOB" ? "minus"
                      : primaryInco === "FOB" && (s === "CFR" || s === "CIF") ? "plus"
                      : "delta";
                    const icon = s === "FOB" ? "📦" : s === "CFR" || s === "CIF" ? "🚢" : "🔁";
                    const opLabel = op === "minus" ? "minus" : op === "plus" ? "plus" : "±";
                    return (
                      <div
                        key={s}
                        style={{
                          background: "#fff",
                          border: "1px solid #E5E7EB",
                          borderRadius: 10,
                          padding: "10px 12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                          <span style={{ fontSize: 14 }}>{icon}</span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: INCO_BADGE[s]?.bg ?? "#eee",
                              color: INCO_BADGE[s]?.fg ?? "#333",
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          >
                            {s}
                          </span>
                          <span style={{ fontWeight: 600 }}>pricing</span>
                          <span style={{ color: "var(--fg-muted)" }}>
                            — {s} = {primaryInco} {opLabel}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "stretch",
                              border: "1.5px solid #D1D5DB",
                              borderRadius: 8,
                              overflow: "hidden",
                              background: "#fff",
                              minWidth: 180,
                            }}
                          >
                            <span
                              style={{
                                background: "#F3F4F6",
                                padding: "8px 10px",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#374151",
                                borderRight: "1px solid #E5E7EB",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              US{pLbl}
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              placeholder="0.00"
                              value={incoAdjustments[s] || ""}
                              onChange={(e) =>
                                setIncoAdjustments((p) => ({ ...p, [s]: e.target.value }))
                              }
                              style={{
                                border: 0,
                                outline: "none",
                                padding: "8px 10px",
                                fontSize: 14,
                                fontWeight: 600,
                                width: 110,
                                background: "transparent",
                                color: "#111827",
                              }}
                            />
                          </label>
                          <span style={{ fontSize: 12, color: "var(--fg-muted)", flex: 1, minWidth: 200 }}>
                            Applied to all cuts. You can override individual prices in the table.
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
          <div id="sec-dist" className="cov4-sec">
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
                {fmtWeight(tw, unit)} / {fmtWeight(cap, unit)} {wLbl}
                <span className="cov4-cap-p" style={{ color: fc }}>({fp.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="cov4-pbar">
              <div className="cov4-pfill" style={{ width: `${fp}%`, background: fc }} />
            </div>
          </div>

          {/* Cuts table */}
          <div id="sec-cuts" className="cov4-tblw">
            <table className="cov4-tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Photo</th>
                  <th>Cut</th>
                  <th>Spec</th>
                  <th>Packaging</th>
                  <th>Grading</th>
                  <th>Aging</th>
                  <th className="num">{qLbl}</th>
                  <th className="num">
                    Ask {pLbl}
                    {multiInco && (
                      <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 999, background: INCO_BADGE[primaryInco]?.bg, color: INCO_BADGE[primaryInco]?.fg, fontSize: 9, fontWeight: 700 }}>{primaryInco}</span>
                    )}
                  </th>
                  <th className="num">
                    Floor {pLbl}
                    {multiInco && (
                      <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 999, background: INCO_BADGE[primaryInco]?.bg, color: INCO_BADGE[primaryInco]?.fg, fontSize: 9, fontWeight: 700 }}>{primaryInco}</span>
                    )}
                  </th>
                  {multiInco && secondaryIncos.map((s) => (
                    <Fragment key={`h-${s}`}>
                      <th className="num">
                        Ask {pLbl}
                        <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 999, background: INCO_BADGE[s]?.bg, color: INCO_BADGE[s]?.fg, fontSize: 9, fontWeight: 700 }}>{s}</span>
                      </th>
                      <th className="num">
                        Floor {pLbl}
                        <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 999, background: INCO_BADGE[s]?.bg, color: INCO_BADGE[s]?.fg, fontSize: 9, fontWeight: 700 }}>{s}</span>
                      </th>
                    </Fragment>
                  ))}
                  <th>Notes</th>
                  <th style={{ width: 28 }} aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {cuts.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      <CutPhotoCell
                        src={cutImgs[c.id] || c.cutImage || null}
                        label={`${c.cat} ${c.cut}`}
                        onFile={(f) => handleCutImg(c.id, f)}
                        isMobile={isMobile}
                      />
                    </td>
                    <td><span className="cov4-cut-nm">{c.cat} {c.cut}</span></td>
                    <td><span className="cov4-tag">{c.spec}</span></td>
                    <td><span className="cov4-tag">{c.pkg}</span></td>
                    <td><span className="cov4-tag">{c.gr !== "Not Classified" ? c.gr : "—"}</span></td>
                    <td><span className="cov4-tag">{c.ag !== "None" ? c.ag : "—"}</span></td>
                    <td className="num">{fmtWeight(Number(c.qty) || 0, unit)}</td>
                    <td className="num">{fmtPrice(Number(c.ask) || 0, unit)}</td>
                    <td className="num cov4-floor">{c.floor ? fmtPrice(Number(c.floor) || 0, unit) : "—"}</td>
                    {multiInco && secondaryIncos.map((s) => {
                      const ovr = cutIncoOverrides[c.id]?.[s];
                      const adj = parseFloat(incoAdjustments[s] || "0") || 0;
                      const askBase = parseFloat(c.ask) || 0;
                      const floorBase = c.floor ? parseFloat(c.floor) : NaN;
                      const calcAsk = deriveSecondary(askBase, primaryInco, s, adj, cifInsuranceNum);
                      const calcFloor = isNaN(floorBase)
                        ? null
                        : deriveSecondary(floorBase, primaryInco, s, adj, cifInsuranceNum);
                      const effAsk = ovr?.ask !== undefined ? parseFloat(ovr.ask) : calcAsk;
                      const effFloor = ovr?.floor !== undefined ? parseFloat(ovr.floor) : calcFloor;
                      const pair = validatePricePair(effAsk, effFloor);
                      return (
                        <Fragment key={`${c.id}-${s}`}>
                          <td className="num">
                            <SecondaryPriceCell
                              calculated={calcAsk}
                              override={ovr?.ask}
                              onOverride={(v) => setCutOverride(c.id, s, "ask", v)}
                              onReset={() => setCutOverride(c.id, s, "ask", undefined)}
                              invalid={!pair.ok}
                              invalidMsg="Asking must be ≥ floor"
                              unit={unit}
                            />
                          </td>
                          <td className="num">
                            <SecondaryPriceCell
                              calculated={calcFloor}
                              override={ovr?.floor}
                              onOverride={(v) => setCutOverride(c.id, s, "floor", v)}
                              onReset={() => setCutOverride(c.id, s, "floor", undefined)}
                              invalid={!pair.ok}
                              invalidMsg="Floor must be ≤ asking"
                              unit={unit}
                            />
                          </td>
                        </Fragment>
                      );
                    })}
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
                        <Popover open={cutPickerOpen} onOpenChange={setCutPickerOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="cov4-cut-trigger"
                              aria-label="Pick cut"
                            >
                              {nf.cut ? (
                                <span className="cov4-cut-trigger-v">{nf.cut}</span>
                              ) : (
                                <span className="cov4-cut-trigger-ph">
                                  {dataLoading ? "Loading..." : (tm("pickCut") as string)}
                                </span>
                              )}
                              <SearchIcon size={12} style={{ opacity: 0.5 }} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[300px]" align="start">
                            <Command>
                              <CommandInput placeholder={tm("searchCutsPh") as string} />
                              <CommandList className="max-h-[320px]">
                                <CommandEmpty>{tm("noCuts")}</CommandEmpty>
                                <CommandGroup>
                                  {(cutsByCategory[nf.cat] || []).map((c) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.displayName}
                                      onSelect={() => {
                                        setNf((p) => ({
                                          ...p,
                                          cutId: c.id,
                                          cut: c.displayName,
                                          cutImage: c.image_url ?? null,
                                        }));
                                        if (c.image_url) setNewImgPrev(c.image_url);
                                        setCutPickerOpen(false);
                                      }}
                                    >
                                      <span className="cov4-cut-opt-thumb">
                                        {c.image_url ? <img src={c.image_url} alt="" /> : <span>📷</span>}
                                      </span>
                                      <span style={{ flex: 1 }}>{c.displayName}</span>
                                      {nf.cutId === c.id && <Check size={14} className="text-primary" />}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </td>
                    <td><select value={nf.spec} onChange={(e) => setNf((p) => ({ ...p, spec: e.target.value }))}>{SPECS.map((x) => <option key={x}>{x}</option>)}</select></td>
                    <td><select value={nf.pkg} onChange={(e) => setNf((p) => ({ ...p, pkg: e.target.value }))}>{PKGS.map((x) => <option key={x}>{x}</option>)}</select></td>
                    <td><select value={nf.gr} onChange={(e) => setNf((p) => ({ ...p, gr: e.target.value }))}>{GRADES.map((x) => <option key={x}>{x}</option>)}</select></td>
                    <td><select value={nf.ag} onChange={(e) => setNf((p) => ({ ...p, ag: e.target.value }))}>{AGINGS.map((x) => <option key={x}>{x}</option>)}</select></td>
                    <td>
                      <input
                        type="number"
                        placeholder={qtyPh}
                        value={
                          nf.qty === ""
                            ? ""
                            : unit === "kg"
                              ? nf.qty
                              : toDisplay(parseFloat(nf.qty) || 0, "weight", unit).toFixed(0)
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") return setNf((p) => ({ ...p, qty: "" }));
                          const kg = fromDisplay(parseFloat(v) || 0, "weight", unit);
                          setNf((p) => ({ ...p, qty: String(kg) }));
                        }}
                      />
                    </td>
                    <td>
                      {(() => {
                        const v = validatePricePair(nf.ask, nf.floor);
                        const bad = !v.ok && !!nf.ask;
                        return (
                          <>
                            <input
                              type="number"
                              step="0.01"
                              placeholder={askPh}
                              value={
                                nf.ask === ""
                                  ? ""
                                  : unit === "kg"
                                    ? nf.ask
                                    : toDisplay(parseFloat(nf.ask) || 0, "price", unit).toFixed(2)
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") return setNf((p) => ({ ...p, ask: "" }));
                                const kg = fromDisplay(parseFloat(val) || 0, "price", unit);
                                setNf((p) => ({ ...p, ask: String(kg) }));
                              }}
                              style={bad ? { borderColor: "#dc2626", outlineColor: "#dc2626" } : undefined}
                              title={bad ? v.msg : undefined}
                            />
                            {bad && (
                              <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>≥ floor</div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const v = validatePricePair(nf.ask, nf.floor);
                        const bad = !v.ok && !!nf.floor;
                        return (
                          <>
                            <input
                              type="number"
                              step="0.01"
                              placeholder={floorPh}
                              value={
                                nf.floor === ""
                                  ? ""
                                  : unit === "kg"
                                    ? nf.floor
                                    : toDisplay(parseFloat(nf.floor) || 0, "price", unit).toFixed(2)
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") return setNf((p) => ({ ...p, floor: "" }));
                                const kg = fromDisplay(parseFloat(val) || 0, "price", unit);
                                setNf((p) => ({ ...p, floor: String(kg) }));
                              }}
                              style={bad ? { borderColor: "#dc2626", outlineColor: "#dc2626" } : undefined}
                              title={bad ? "Floor must be ≤ asking" : undefined}
                            />
                            {bad && (
                              <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>≤ asking</div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    {multiInco && secondaryIncos.map((s) => (
                      <Fragment key={`add-${s}`}>
                        <td className="num"><span style={{ color: "#bbb", fontSize: 11, fontStyle: "italic" }}>auto</span></td>
                        <td className="num"><span style={{ color: "#bbb", fontSize: 11, fontStyle: "italic" }}>auto</span></td>
                      </Fragment>
                    ))}
                    <td><input type="text" placeholder="Notes..." value={nf.notes} onChange={(e) => setNf((p) => ({ ...p, notes: e.target.value }))} /></td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button
                          type="button"
                          className="cov4-add-confirm"
                          onClick={addCut}
                          disabled={!nf.cut || !nf.qty || !nf.ask || !validatePricePair(nf.ask, nf.floor).ok}
                          title={!validatePricePair(nf.ask, nf.floor).ok ? validatePricePair(nf.ask, nf.floor).msg : undefined}
                        >+</button>
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
              <PreviewImages
                images={cuts
                  .map((c) => ({ id: c.id, src: cutImgs[c.id] || (c.cutImage as string) || "", label: `${c.cat} ${c.cut}` }))
                  .filter((x) => !!x.src)}
              />
              <h3 className="cov4-prev-title">
                {cuts.length === 1 ? `${cuts[0].cat} ${cuts[0].cut}` : cuts.length > 1 ? "Mix FCL" : "Untitled Offer"}
              </h3>
              <div className="cov4-prev-meta">
                <PrevRow l="Origin" v="🇧🇷 Brazil, Santos" />
                <PrevRow l="Destination" v={selMarkets.map((m) => m.f + " " + m.n).join(", ") || "—"} />
                <PrevRow l="Incoterm" v={selInco.join(", ")} />
                <PrevRow l="Temperature" v={temp} />
                <PrevRow l="Container" v={`${csize} · ${fmtWeight(tw, unit)} ${wLbl}`} />
                {certifications.length > 0 && <PrevRow l="Certifications" v={certifications.join(", ")} />}
              </div>
              {cuts.length > 0 && (
                <div className="cov4-prev-cuts">
                  <div className="cov4-prev-cuts-t">Cuts included</div>
                  {cuts.map((c) => (
                    <div key={c.id} className="cov4-prev-cut-row">
                      <span>{c.cat} {c.cut}</span>
                      <span>US$ {fmtPrice(Number(c.ask) || 0, unit)}/{wLbl}</span>
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
                {primaryInco && (
                  <span
                    style={{
                      marginLeft: 6,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: INCO_BADGE[primaryInco]?.bg ?? "#eee",
                      color: INCO_BADGE[primaryInco]?.fg ?? "#333",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {primaryInco}
                  </span>
                )}
                {multiInco && (
                  <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--fg-muted)" }}>
                    Also available as {secondaryIncos.join(", ")}
                  </span>
                )}
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
        <div className="cov4-ft-l">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`cov4-ready-pill ${canPublish ? "ready" : ""}`}
                aria-label="Publishing checklist"
              >
                <span className="cov4-ready-ring" aria-hidden>
                  <svg viewBox="0 0 36 36" width="22" height="22">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${(stepsDone / publishSteps.length) * 94.25} 94.25`}
                      transform="rotate(-90 18 18)"
                      style={{ transition: "stroke-dasharray .35s ease" }}
                    />
                  </svg>
                </span>
                <span className="cov4-ready-txt">
                  {canPublish
                    ? "Ready to publish"
                    : `${stepsDone} of ${publishSteps.length} ready · ${nextStep?.label.split(" ").slice(0, 4).join(" ")}…`}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="cov4-ready-pop p-0 w-[320px]">
              <div className="cov4-ready-head">
                {canPublish ? "All set — you can publish 🎉" : "A few things left"}
              </div>
              <ul className="cov4-ready-list">
                {publishSteps.map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      className={`cov4-ready-item ${s.done ? "done" : ""}`}
                      onClick={() => !s.done && scrollToSection(s.anchor)}
                      disabled={s.done}
                    >
                      <span className={`cov4-ready-dot ${s.done ? "done" : ""}`}>
                        {s.done ? <Check size={12} /> : ""}
                      </span>
                      <span className="cov4-ready-lbl">{s.label}</span>
                      {!s.done && <span className="cov4-ready-go">→</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="cov4-ready-foot">
                {selMarkets.length} market{selMarkets.length !== 1 ? "s" : ""} · {cuts.length} cut{cuts.length !== 1 ? "s" : ""} · {fmtWeight(tw, unit)} {wLbl}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="cov4-ft-r">
          <button type="button" className="cov4-btn-s" onClick={handleCancel}>Cancel</button>
          <button type="button" className="cov4-btn-s" onClick={handleSaveDraft}>Save draft</button>
          <button
            type="button"
            className="cov4-btn-p"
            onClick={() => {
              if (!canPublish && nextStep) { scrollToSection(nextStep.anchor); return; }
              handlePublish();
            }}
            title={nextStep ? `Next: ${nextStep.label}` : "Review & publish your offer"}
          >
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

function CutPhotoCell({
  src,
  label,
  onFile,
  isMobile,
}: {
  src: string | null;
  label: string;
  onFile: (f: File) => void;
  isMobile: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fileInput = (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
    />
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className={`cov4-img-box ${src ? "has" : ""}`}
          onClick={() => (src ? setOpen(true) : (document.getElementById(`cut-photo-${label}`) as HTMLInputElement)?.click())}
          aria-label={src ? "Preview photo" : "Upload photo"}
        >
          {src ? <img src={src} alt="" /> : <span style={{ fontSize: 12, color: "#aaa" }}>📷</span>}
        </button>
        <input
          id={`cut-photo-${label}`}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-[92vw] sm:max-w-md p-4">
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              {src && <img src={src} alt={label} style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 8 }} />}
              <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
              <label className="cov4-img-replace-btn">
                Trocar foto
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { onFile(f); setOpen(false); }
                  }}
                />
              </label>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>
        <label className={`cov4-img-box ${src ? "has" : ""}`}>
          {src ? <img src={src} alt="" /> : <span style={{ fontSize: 12, color: "#aaa" }}>📷</span>}
          {fileInput}
        </label>
      </HoverCardTrigger>
      {src && (
        <HoverCardContent side="right" align="start" className="w-auto p-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            <img src={src} alt={label} style={{ width: 240, height: 240, objectFit: "cover", borderRadius: 8 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{label}</div>
          </div>
        </HoverCardContent>
      )}
    </HoverCard>
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

/* Cell used for secondary-incoterm Ask/Floor prices in the cuts table.
   Shows the calculated value in italic + a pencil to override. Once the
   user overrides, shows an editable input + a reset (↺) button. */
function SecondaryPriceCell({
  calculated,
  override,
  onOverride,
  onReset,
  invalid,
  invalidMsg,
  unit = "kg",
}: {
  calculated: number | null;
  override?: string;
  onOverride: (v: string) => void;
  onReset: () => void;
  invalid?: boolean;
  invalidMsg?: string;
  unit?: WeightUnit;
}) {
  const [editing, setEditing] = useState(false);
  const errStyle = invalid ? { borderColor: "#dc2626", outlineColor: "#dc2626" } : {};
  const errTitle = invalid ? invalidMsg : undefined;

  if (override !== undefined) {
    // `override` is stored in kg (raw). Show it in display unit and convert back on edit.
    const overrideDisplay =
      override === "" ? "" : toDisplay(parseFloat(override) || 0, "price", unit).toFixed(2);
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
        <input
          type="number"
          step="0.01"
          value={overrideDisplay}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return onOverride("");
            const kg = fromDisplay(parseFloat(v) || 0, "price", unit);
            onOverride(String(kg));
          }}
          title={errTitle}
          style={{
            width: 64,
            padding: "2px 4px",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 12,
            textAlign: "right",
            ...errStyle,
          }}
        />
        <button
          type="button"
          onClick={onReset}
          title="Reset to calculated value"
          aria-label="Reset"
          style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: "var(--fg-muted)", padding: 0 }}
        >
          ↺
        </button>
      </span>
    );
  }

  if (calculated === null) {
    return <span style={{ color: "#bbb" }}>—</span>;
  }

  if (editing) {
    const initial = toDisplay(calculated, "price", unit).toFixed(2);
    return (
      <input
        type="number"
        step="0.01"
        autoFocus
        defaultValue={initial}
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value) {
            const kg = fromDisplay(parseFloat(e.target.value) || 0, "price", unit);
            if (kg !== calculated) onOverride(String(kg));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        title={errTitle}
        style={{
          width: 64,
          padding: "2px 4px",
          border: "1px solid var(--border)",
          borderRadius: 4,
          fontSize: 12,
          textAlign: "right",
          ...errStyle,
        }}
      />
    );
  }

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}
      title={errTitle}
    >
      <span style={{ fontStyle: "italic", color: invalid ? "#dc2626" : "var(--fg-muted)" }}>
        {toDisplay(calculated, "price", unit).toFixed(2)}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Override price"
        aria-label="Override"
        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--fg-muted)", padding: 0 }}
      >
        ✎
      </button>
    </span>
  );
}

function PreviewImages({ images }: { images: { id: string; src: string; label: string }[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [userPaused, setUserPaused] = useState(false);

  /* Auto-advance every 3.5s while there are 2+ images and the user hasn't
     interacted. Pauses permanently after any swipe/click on controls.
     Respects prefers-reduced-motion. */
  useEffect(() => {
    if (images.length < 2 || userPaused) return;
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % images.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 3500);
    return () => window.clearInterval(t);
  }, [images.length, userPaused]);

  if (images.length === 0) {
    return (
      <div className="cov4-prev-img">
        <span style={{ fontSize: 36, opacity: 0.3 }}>🥩</span>
      </div>
    );
  }

  const scrollTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  const pause = () => { if (!userPaused) setUserPaused(true); };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };

  return (
    <div className="cov4-prev-img cov4-prev-img-carousel">
      <div
        className="cov4-prev-img-scroller"
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={pause}
        onWheel={pause}
      >
        {images.map((im) => (
          <div key={im.id} className="cov4-prev-img-slide">
            <img src={im.src} alt={im.label} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="cov4-prev-img-nav prev"
            aria-label="Previous"
            onClick={() => { pause(); scrollTo(idx - 1); }}
            disabled={idx === 0}
          >‹</button>
          <button
            type="button"
            className="cov4-prev-img-nav next"
            aria-label="Next"
            onClick={() => { pause(); scrollTo(idx + 1); }}
            disabled={idx === images.length - 1}
          >›</button>
          <div className="cov4-prev-img-dots">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                className={`cov4-prev-img-dot ${i === idx ? "on" : ""}`}
                onClick={() => { pause(); scrollTo(i); }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
