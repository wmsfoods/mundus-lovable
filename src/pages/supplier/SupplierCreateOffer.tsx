import { Fragment, useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { formatOfferNumber } from "@/lib/offerNumber";
import { notifyCompanyUsers } from "@/lib/notifications";
import { useTranslation } from "react-i18next";
import { DEFAULT_PROTEINS, PROTEINS_WITH_US_NOMENCLATURE, resolveProteinProfile } from "@/lib/proteins";
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
import { useActiveOffice } from "@/hooks/useActiveOffice";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import {
  useOfficeAllowedPlants,
  useOfficeAllowedMarkets,
  type AllowedPlant,
} from "@/hooks/useOfficeScopedAccess";
import { usePaymentTerms } from "@/hooks/usePaymentTerms";
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
const SPECS = ["Bone-In", "Boneless", "Offals"];

/** Normalize a raw bone_spec value coming from the DB (cuts.bone_spec)
 *  to one of the options rendered in the Spec dropdown. */
function normalizeSpec(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "boneless") return "Boneless";
  if (v === "bone-in" || v === "bone in" || v === "bonein") return "Bone-In";
  if (v === "offals" || v === "offal") return "Offals";
  return "Bone-In";
}
const PACKING_OPTIONS: Record<string, string[]> = {
  Beef: ["IWP", "VP", "Bulk", "Tray", "Bag"],
  Pork: ["IWP", "VP", "Bulk", "Tray", "Bag"],
  Lamb: ["IWP", "VP", "Bulk", "Tray", "Bag"],
  Ovine: ["IWP", "VP", "Bulk", "Tray", "Bag"],
  Veal: ["IWP", "VP", "Bulk", "Tray", "Bag"],
  Poultry: ["IWP", "VP", "IQF", "Bulk"],
};
const PACKING_TOOLTIPS: Record<string, string> = {
  IWP: "Individually Wrapped Pieces",
  VP: "Vacuum Packed",
  IQF: "Individually Quick Frozen",
  Bulk: "Bulk packed in boxes",
  Tray: "Tray packed",
  Bag: "Bag packed",
};
const US_GRADES = ["Prime", "Choice", "Select", "Non Roll", "Ungraded"];
const AGINGS = ["None", "Wet Aged", "Dry Aged"];

// Primary destination markets shown as chips (in this order).
// Match is done against country english_name.
const PRIMARY_MARKETS = [
  "China", "Hong Kong", "Vietnam", "Taiwan", "Thailand",
  "South Korea", "Indonesia", "Egypt", "Russia", "Jordan",
  "United States", "Canada", "Mexico",
];

// Incoterms that are mutually exclusive (selecting one disables the others).
const INCO_EXCLUSIVE_GROUPS: string[][] = [];

type Incoterm = { id: string; name: string; extra: null | "insurance" | "city" };
const INCOTERMS: Incoterm[] = [
  { id: "FOB", name: "FOB - Free on Board", extra: null },
  { id: "CFR", name: "CFR - Cost and Freight", extra: null },
  { id: "CIF", name: "CIF - Cost, Insurance & Freight", extra: "insurance" },
  { id: "EXW", name: "EXW - Ex Works", extra: "city" },
  { id: "DDP", name: "DDP - Delivered Duty Paid", extra: "city" },
  { id: "DAP", name: "DAP - Delivered at Place", extra: "city" },
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
  plant: string;
  /** Phase 3: office-scoped plant UUID (FK to company_plants). Source of
   *  truth for `offer_items.plant_id`. `plant` (string) is kept for
   *  backward-compat display of plant_number. */
  plantId?: string;
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
  cat: "Beef", cut: "", spec: "Boneless", pkg: "\n", gr: "\n", ag: "None",
  qty: "", ask: "", floor: "", notes: "", plant: "", plantId: undefined,
};

/* ══════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════ */
export default function SupplierCreateOffer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Support both legacy `?from=` (supplier flow) and `?from_request=` (admin flow)
  const fromRequestId = searchParams.get("from") || searchParams.get("from_request");
  const location = useLocation();
  const { activeOfficeId } = useActiveOffice();
  const { company: realCompany, loading: companyLoading } = useCurrentCompany();
  const asCompanyId = searchParams.get("as_company");
  const [actingAsCompany, setActingAsCompany] = useState<any>(null);
  const [isAdminActor, setIsAdminActor] = useState(false);

  useEffect(() => {
    if (!asCompanyId) { setActingAsCompany(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        // Admin check — use SECURITY DEFINER RPC (single source of truth)
        let admin = false;
        try {
          const { data: isAdmin } = await (supabase as any).rpc("is_mundus_admin");
          admin = !!isAdmin;
        } catch { /* noop */ }
        if (!admin) {
          try {
            const { data: cu } = await (supabase as any)
              .from("company_users")
              .select("role, roles:role_id(name)")
              .eq("user_id", uid)
              .eq("status", "active");
            admin = (cu || []).some((r: any) =>
              r?.role === "mundus_admin" ||
              ["mundus_admin","mundus_ops","mundus_sales","mundus_support"].includes(r?.roles?.name)
            );
          } catch { /* noop */ }
        }
        if (cancelled) return;
        setIsAdminActor(admin);
        if (!admin) return;
        const { data: c } = await supabase
          .from("companies").select("*").eq("id", asCompanyId).maybeSingle();
        if (!cancelled) setActingAsCompany(c ?? null);
      } catch (e) {
        console.warn("[as_company] load failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, [asCompanyId]);

  // Effective company — admin acting on behalf of a managed supplier overrides
  // the current user's company context for the entire form.
  const company: any = (isAdminActor && actingAsCompany) ? actingAsCompany : realCompany;

  /* ─── Phase 3: resolve the ACTING OFFICE for this wizard session ───
   * Admin on-behalf: as_company is the office.
   * Normal supplier: the active office (or company id as fallback).
   * Global Director in "All Offices" must explicitly pick — handled by
   * the office picker below; until they pick, actingOfficeId = null. */
  const [directorChosenOfficeId, setDirectorChosenOfficeId] = useState<string | null>(null);
  const actingOfficeId: string | null = isAdminActor
    ? (asCompanyId ?? null)
    : (activeOfficeId ?? directorChosenOfficeId ?? company?.id ?? null);

  const { plants: allowedPlants, fallback: plantsFallback } =
    useOfficeAllowedPlants(actingOfficeId);
  const { allowedCountryIds, fallback: marketsFallback } =
    useOfficeAllowedMarkets(actingOfficeId);

  type FromRequest = {
    requestId: string;
    requestNumber: string;
    client: string;
    product: string;
    category: string;
    specification: string;
    quantity: number;
    targetPrice: number;
    destinationCountry: string;
    destinationPort: string;
    incoterms: string;
    containerSize: string;
    containerCount: number;
    temperature: string;
    shipmentDate: string;
    additionalInfo: string | null;
  };
  const stateFromRequest = (location.state as any)?.fromRequest as FromRequest | undefined;
  const [loadedFromRequest, setLoadedFromRequest] = useState<FromRequest | null>(null);
  // When opened via `?from_request=UUID` (e.g. admin path) and no state was
  // passed, fetch the buyer request from the DB and synthesize the same shape.
  useEffect(() => {
    if (stateFromRequest) return;
    if (!fromRequestId) return;
    let cancelled = false;
    (async () => {
      const { data: r } = await supabase
        .from("buyer_requests")
        .select("*, buyer_company:companies!buyer_requests_buyer_company_id_fkey(name)")
        .eq("id", fromRequestId)
        .maybeSingle();
      if (cancelled || !r) return;
      const reqNo = `R-${String((r as any).request_number ?? 0).padStart(6, "0")}-${new Date((r as any).created_at).getFullYear()}`;
      setLoadedFromRequest({
        requestId: (r as any).id,
        requestNumber: reqNo,
        client: (r as any).buyer_company?.name ?? "Buyer",
        product: (r as any).product_name ?? "",
        category: (r as any).category ?? "",
        specification: (r as any).specification ?? "",
        quantity: Number((r as any).quantity_kg ?? 0),
        targetPrice: (r as any).target_price_usd != null ? Number((r as any).target_price_usd) : 0,
        destinationCountry: (r as any).destination_country ?? "",
        destinationPort: (r as any).destination_port ?? "",
        incoterms: (r as any).incoterm ?? "",
        containerSize: (r as any).container_size ?? "40ft",
        containerCount: (r as any).container_count ?? 1,
        temperature: (r as any).temperature ?? "Frozen",
        shipmentDate: (r as any).shipment_date ?? "",
        additionalInfo: (r as any).additional_info ?? "",
      });
    })();
    return () => { cancelled = true; };
  }, [fromRequestId, stateFromRequest]);
  const fromRequest: FromRequest | undefined = stateFromRequest ?? loadedFromRequest ?? undefined;
  const cloneFrom = (location.state as any)?.cloneFrom as
    | {
        category: string;
        condition: "Frozen" | "Chilled";
        containerSize: string;
        containerCount: number;
        paymentTerms: string;
        isHalal: boolean;
        isKosher: boolean;
        cutRegion: "global" | "us";
        exwCity?: string;
        destinationCountries: string[];
        incoterms: string[];
        items: Array<{
          name: string;
          productNumber: number | null;
          amount: number;
          price: number;
          minimumPrice: number;
          condition: string;
          agingMethod: string | null;
        }>;
      }
    | undefined;
  const editOffer = (location.state as any)?.editOffer as
    | (NonNullable<typeof cloneFrom> & { offerId: string; offerNumber: number })
    | undefined;
  const isEditing = !!editOffer;
  // Reuse the clone hydration flow for editing — both pre-fill the same fields.
  const hydrateSource = editOffer ?? cloneFrom;
  const prefilledRef = useRef(false);
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

  // Supplier protein profile → controls which categories appear in the form.
  const [supplierProteins, setSupplierProteins] = useState<string[]>([]);
  useEffect(() => {
    if (!company?.id) {
      setSupplierProteins([...DEFAULT_PROTEINS]);
      return;
    }
    supabase
      .from("companies")
      .select("protein_profiles")
      .eq("id", company.id)
      .maybeSingle()
      .then(({ data }) => setSupplierProteins(resolveProteinProfile((data as any)?.protein_profiles)));
  }, [company?.id]);

  const filteredCutsByCategory = useMemo(() => {
    const out: typeof cutsByCategory = {} as any;
    for (const cat of Object.keys(cutsByCategory)) {
      if (supplierProteins.includes(cat)) out[cat] = cutsByCategory[cat];
    }
    // Failsafe: if the profile filters out everything available, fall back to the full catalog.
    return Object.keys(out).length === 0 ? cutsByCategory : out;
  }, [cutsByCategory, supplierProteins]);

  const [selMarkets, setSelMarkets] = useState<Market[]>([]);
  const [mktCfg, setMktCfg] = useState<Record<string, MktCfg>>({});
  const [csize, setCsize] = useState<"20ft" | "40ft">("40ft");
  const [temp, setTemp] = useState<"Frozen" | "Chilled">("Frozen");
  const [containerCount, setContainerCount] = useState(1);

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

  const { terms: PAY_TERMS } = usePaymentTerms({ scope: "international" });
  const [payTerm, setPayTerm] = useState<string>("");
  useEffect(() => {
    if (!payTerm && PAY_TERMS.length > 0) setPayTerm(PAY_TERMS[0]);
  }, [PAY_TERMS, payTerm]);
  const [certifications, setCertifications] = useState<string[]>([]);
  // Whether buyers can edit per-item quantities in chat proposals (total must still match).
  const [allowQtyNegotiation, setAllowQtyNegotiation] = useState<boolean>(false);

  // Hydrate allow_quantity_negotiation when editing an existing offer.
  useEffect(() => {
    if (!editOffer?.offerId) return;
    supabase
      .from("offers")
      .select("allow_quantity_negotiation")
      .eq("id", editOffer.offerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof (data as any).allow_quantity_negotiation === "boolean") {
          setAllowQtyNegotiation(Boolean((data as any).allow_quantity_negotiation));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOffer?.offerId]);

  const [cuts, setCuts] = useState<Cut[]>([]);
  const [cutImgs, setCutImgs] = useState<Record<string, string>>({});
  const [addRow, setAddRow] = useState(false);
  const [newImgPrev, setNewImgPrev] = useState<string | null>(null);
  const [nf, setNf] = useState<Omit<Cut, "id">>({ ...EMPTY_NF });

  // Keep `nf.cat` (the add-row category selector) inside the supplier's profile.
  useEffect(() => {
    const keys = Object.keys(filteredCutsByCategory);
    if (keys.length === 0) return;
    if (!keys.includes(nf.cat)) {
      setNf((p) => ({ ...p, cat: keys[0], cut: "", cutId: undefined, cutImage: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCutsByCategory]);

  // Cut nomenclature region (only meaningful when company is US-based and category is Beef)
  const [cutRegion, setCutRegion] = useState<"global" | "us">("global");
  const isUsCompany = (company?.country ?? "").trim().toLowerCase() === "united states";
  // Show US Grade column only for US suppliers whose destinations are all US.
  const isUsMarketName = (n: string) => {
    const v = (n ?? "").trim().toLowerCase();
    return v === "united states" || v === "us" || v === "usa" || v === "u.s.a.";
  };
  const showGradeColumn =
    isUsCompany &&
    selMarkets.length > 0 &&
    selMarkets.every((m) => isUsMarketName(m.n));
  // Dynamic nomenclature toggle label based on the supplier's proteins.
  // 1 protein → "Beef"; 2 → "Beef & Pork"; 0 → "" (falls back to "Cuts").
  const usToggleProteinLabel = (() => {
    const ps = supplierProteins.filter((p) =>
      (PROTEINS_WITH_US_NOMENCLATURE as readonly string[]).includes(p)
    );
    if (ps.length === 0) return "";
    if (ps.length === 1) return ps[0] + " ";
    return ps.join(" & ") + " ";
  })();

  const [distMarketplace, setDistMarketplace] = useState(true);
  const [distAllCustomers, setDistAllCustomers] = useState(false);
  const [distSpecific, setDistSpecific] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  const [showAiImport, setShowAiImport] = useState(false);
  const [aiMode, setAiMode] = useState<null | "paste" | "file" | "voice">(null);
  const [aiInput, setAiInput] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  /* Supplier plant numbers (USDA/SIF establishment numbers) loaded from
     the current user's company profile. Used to populate the per-cut
     "Plant Numbers" dropdown. */
  const [companyPlants, setCompanyPlants] = useState<string[]>([]);
  const [plantManual, setPlantManual] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: co }, { data: locs }] = await Promise.all([
          supabase.from("companies").select("plant_numbers").eq("id", company.id).maybeSingle(),
          (supabase as any)
            .from("company_locations")
            .select("plant_numbers, location_type, est_number")
            .eq("company_id", company.id),
        ]);
        if (cancelled) return;
        const merged = new Set<string>();
        ((co as any)?.plant_numbers as string[] | null ?? []).forEach((p) => p && merged.add(p));
        ((locs as any[]) ?? []).forEach((l) => {
          ((l?.plant_numbers as string[] | null) ?? []).forEach((p) => p && merged.add(p));
          if (l?.location_type === "factory" && l?.est_number) merged.add(String(l.est_number));
        });
        setCompanyPlants([...merged]);
      } catch {
        /* no-op: anonymous or no company; falls back to free text input */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  /* ── Origin port (filtered by supplier's countries) ─────────── */
  const [supplierCountries, setSupplierCountries] = useState<string[]>([]);
  const [originPorts, setOriginPorts] = useState<
    Array<{ id: string; name: string; code: string | null; city: string | null; country: string }>
  >([]);
  const [originPortId, setOriginPortId] = useState<string>("");
  const [originPickerOpen, setOriginPickerOpen] = useState(false);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    (async () => {
      const countries = new Set<string>();
      const { data: parent } = await (supabase as any)
        .from("companies")
        .select("country")
        .eq("id", company.id)
        .maybeSingle();
      if (parent?.country) countries.add(parent.country);
      const { data: children } = await (supabase as any)
        .from("companies")
        .select("country")
        .eq("parent_company_id", company.id);
      (children ?? []).forEach((o: any) => {
        if (o?.country) countries.add(o.country);
      });
      if (!cancelled) setSupplierCountries([...countries]);
    })();
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  useEffect(() => {
    if (supplierCountries.length === 0) {
      setOriginPorts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      // Country name normalization (codes & locale variants → english_name)
      const norm = (c: string): string => {
        const map: Record<string, string> = {
          BR: "Brazil", BRA: "Brazil", Brasil: "Brazil",
          US: "United States", USA: "United States", "U.S.": "United States", "U.S.A.": "United States",
          AR: "Argentina", ARG: "Argentina",
          CN: "China", CHN: "China",
          HK: "Hong Kong", HKG: "Hong Kong",
          KR: "South Korea", "Korea, Republic of": "South Korea",
        };
        return map[c] || c;
      };
      const wanted = Array.from(new Set(supplierCountries.map(norm).filter(Boolean)));

      // Resolve country_ids via english_name or iso_code (handles names with spaces).
      const { data: countryRows } = await (supabase as any)
        .from("countries")
        .select("id, english_name, iso_code");
      const wantedLc = new Set(wanted.map((w) => w.toLowerCase()));
      let countryIds: string[] = (countryRows ?? [])
        .filter(
          (r: any) =>
            wantedLc.has((r.english_name || "").toLowerCase()) ||
            wantedLc.has((r.iso_code || "").toLowerCase()),
        )
        .map((r: any) => r.id);
      if (countryIds.length === 0) {
        // Last-resort fallback: load all ports so the user can still pick.
        const { data: all } = await (supabase as any)
          .from("ports")
          .select("id, name, code, country_id, countries:country_id(english_name)")
          .order("name");
        if (!cancelled) {
          setOriginPorts(
            (all ?? []).map((p: any) => ({
              id: p.id, name: p.name, code: p.code, city: null,
              country: p.countries?.english_name ?? "",
            })),
          );
        }
        return;
      }
      const { data } = await (supabase as any)
        .from("ports")
        .select("id, name, code, country_id, countries:country_id(english_name)")
        .in("country_id", countryIds)
        .order("name");
      if (cancelled) return;
      setOriginPorts(
        (data ?? []).map((p: any) => ({
          id: p.id, name: p.name, code: p.code, city: null,
          country: p.countries?.english_name ?? "",
        })),
      );
    })();
    return () => { cancelled = true; };
  }, [supplierCountries]);

  const [mlOpen, setMlOpen] = useState(false);
  const [routeSources, setRouteSources] = useState<Record<string, MarketplaceRate["source"]>>({});

  useEffect(() => {
    if (fromRequestId) {
      toast.success(`Prefilled from request #${fromRequestId}`, { duration: 4000 });
    }
  }, [fromRequestId]);

  /* Prefill from a buyer's offer request (navigation state from Requests page). */
  useEffect(() => {
    if (prefilledRef.current) return;
    if (!fromRequest) return;
    if (!MARKETS || MARKETS.length === 0) return;
    prefilledRef.current = true;

    setUnit("kg");

    if (fromRequest.containerSize === "20ft" || fromRequest.containerSize === "40ft") {
      setCsize(fromRequest.containerSize);
    }
    if (fromRequest.temperature === "Frozen" || fromRequest.temperature === "Chilled") {
      setTemp(fromRequest.temperature);
    }
    if (fromRequest.containerCount && fromRequest.containerCount > 0) {
      setContainerCount(fromRequest.containerCount);
    }

    if (fromRequest.incoterms) {
      const incos = fromRequest.incoterms.split(",").map((s) => s.trim()).filter(Boolean);
      if (incos.length) {
        setSelInco(incos);
        setPrimaryInco(incos[0]);
      }
    }

    // Match destination market by country name (case-insensitive).
    const wanted = fromRequest.destinationCountry?.trim().toLowerCase();
    const market = wanted
      ? MARKETS.find((m) => m.n.trim().toLowerCase() === wanted) ||
        MARKETS.find((m) => m.n.trim().toLowerCase().includes(wanted))
      : undefined;
    if (market) {
      setSelMarkets([market]);
      // Match port by name within the market if possible.
      const portWanted = fromRequest.destinationPort?.trim().toLowerCase();
      const matchedPort = portWanted
        ? market.p.find((p) => p.n.trim().toLowerCase() === portWanted) ||
          market.p.find((p) => p.n.trim().toLowerCase().includes(portWanted))
        : undefined;
      setMktCfg({
        [market.id]: {
          sp: matchedPort ? [matchedPort.id] : market.p.map((p) => p.id),
          sm: true,
          gf: "",
          pf: Object.fromEntries(market.p.map((p) => [p.id, ""])),
        },
      });
    }

    // Parse cuts from additionalInfo (may contain multiple cuts + compliance + notes)
    const info = fromRequest.additionalInfo || "";
    const sections = info.split(/\n\n/);
    const parsedCuts: Cut[] = [];
    let notesText = "";
    const cat0 = fromRequest.category || "Beef";

    for (const sec of sections) {
      if (sec.startsWith("Cuts:")) {
        const lines = sec.replace(/^Cuts:\n?/, "").split("\n").filter(Boolean);
        for (const line of lines) {
          // Buyer format (all sections after cut name are optional):
          //   "CutName [BoneSpec] (Spec) — Marbling — 14000kg @ $6.40/kg"
          // Parse via successive extractions so missing fields never swallow qty/target.
          let remaining = line.trim();

          // qty: any "<number>kg" anywhere in the line
          let qty = "";
          const qtyMatch = remaining.match(/([\d.,]+)\s*kg\b/i);
          if (qtyMatch) {
            qty = qtyMatch[1].replace(/,/g, "");
            remaining = (remaining.slice(0, qtyMatch.index!) + remaining.slice(qtyMatch.index! + qtyMatch[0].length)).trim();
          }

          // target price: "@ $X/kg" or "@ $X" or "$X/kg"
          let target = "";
          const priceMatch = remaining.match(/@?\s*\$\s*([\d.]+)\s*(?:\/kg)?/i);
          if (priceMatch && parseFloat(priceMatch[1]) > 0) {
            target = priceMatch[1];
            remaining = (remaining.slice(0, priceMatch.index!) + remaining.slice(priceMatch.index! + priceMatch[0].length)).trim();
          }

          // bone spec: [Boneless] / [Bone-In] / [Offals]
          let boneSpec = "";
          const boneMatch = remaining.match(/\[(Boneless|Bone-In|Offals)\]/i);
          if (boneMatch) {
            boneSpec = boneMatch[1];
            remaining = (remaining.slice(0, boneMatch.index!) + remaining.slice(boneMatch.index! + boneMatch[0].length)).trim();
          }

          // spec in parens: (7-9 lb), (Defatted), ...
          let specInner = "";
          const specMatch = remaining.match(/\(([^)]+)\)/);
          if (specMatch) {
            specInner = specMatch[1];
            remaining = (remaining.slice(0, specMatch.index!) + remaining.slice(specMatch.index! + specMatch[0].length)).trim();
          }

          // Split remainder on em-dashes: first chunk = cut name, rest = marbling
          const parts = remaining.split(/\s*—\s*/).map((p) => p.trim()).filter(Boolean);
          const cutName = parts.shift() || "";
          let marbling = parts.join(" ").trim();
          if (!cutName) continue;
          if (marbling === "Not specified") marbling = "";

          const matched = (cutsByCategory[cat0] || []).find(
            (c) => c.displayName.toLowerCase() === cutName.toLowerCase()
          ) || (cutsByCategory[cat0] || []).find(
            (c) => c.displayName.toLowerCase().includes(cutName.toLowerCase()) ||
                   cutName.toLowerCase().includes(c.displayName.toLowerCase())
          );
          const spec = normalizeSpec(boneSpec || matched?.bone_spec || fromRequest.specification || specInner);
          parsedCuts.push({
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            cat: cat0,
            cut: matched?.displayName || cutName,
            cutId: matched?.id,
            cutImage: matched?.image_url ?? null,
            spec,
            pkg: "\n",
            gr: marbling || "\n",
            ag: "None",
            qty: qty || "",
            ask: target || "",
            floor: target ? (parseFloat(target) * 0.98).toFixed(2) : "",
            notes: "",
            plant: "",
          });
        }
      } else if (sec.startsWith("Compliance:")) {
        const list = sec.replace(/^Compliance:\s*/, "");
        const certs: string[] = [];
        if (/halal/i.test(list)) certs.push("Halal");
        if (/kosher/i.test(list)) certs.push("Kosher");
        setCertifications(certs);
      } else if (sec.startsWith("Notes:")) {
        notesText = sec.replace(/^Notes:\n?/, "").trim();
      }
    }

    if (parsedCuts.length > 0) {
      setCuts(parsedCuts);
      const imgs: Record<string, string> = {};
      for (const c of parsedCuts) {
        if (c.cutImage) imgs[c.id] = c.cutImage;
      }
      if (Object.keys(imgs).length) setCutImgs(imgs);
    } else {
      const ask = fromRequest.targetPrice ? fromRequest.targetPrice.toFixed(2) : "";
      const floor = fromRequest.targetPrice ? (fromRequest.targetPrice * 0.98).toFixed(2) : "";
      const qty = fromRequest.quantity ? String(fromRequest.quantity) : "";
      const cutName = fromRequest.product || "";
      const matched = (cutsByCategory[cat0] || []).find(
        (c) => c.displayName.toLowerCase() === cutName.toLowerCase()
      );
      setNf({
        cat: cat0,
        cut: matched?.displayName || cutName,
        cutId: matched?.id,
        cutImage: matched?.image_url ?? null,
        spec: normalizeSpec(matched?.bone_spec || fromRequest.specification),
        pkg: "\n",
        gr: "\n",
        ag: "None",
        qty,
        ask,
        floor,
        notes: notesText,
        plant: "",
      });
      if (matched?.image_url) setNewImgPrev(matched.image_url);
      setAddRow(true);
    }

    // Distribution: pre-check Marketplace + Specific Customers and select requester.
    setDistMarketplace(true);
    setDistAllCustomers(false);
    setDistSpecific(true);
    const customer = MOCK_CUSTOMERS.find(
      (c) => c.name.toLowerCase() === fromRequest.client.toLowerCase()
    );
    if (customer) setSelectedCustomers([customer.id]);
  }, [fromRequest, MARKETS, cutsByCategory, setUnit]);

  /* Prefill from an existing offer (Clone Offer). */
  const clonedRef = useRef(false);
  useEffect(() => {
    if (clonedRef.current) return;
    if (!hydrateSource) return;
    if (!MARKETS || MARKETS.length === 0) return;
    if (!cutsByCategory || Object.keys(cutsByCategory).length === 0) return;
    clonedRef.current = true;

    setUnit("kg");

    const src = hydrateSource;
    const cat0 = src.category || "Beef";
    setCsize((src.containerSize?.startsWith("20") ? "20ft" : "40ft"));
    setContainerCount(Math.max(1, Number(src.containerCount) || 1));
    if (src.condition === "Frozen" || src.condition === "Chilled") {
      setTemp(src.condition);
    }
    if (src.paymentTerms) {
      setPayTerm(src.paymentTerms);
    }
    const certs: string[] = [];
    if (src.isHalal) certs.push("Halal");
    if (src.isKosher) certs.push("Kosher");
    setCertifications(certs);
    if (src.cutRegion === "us" || src.cutRegion === "global") {
      setCutRegion(src.cutRegion);
    }

    if ((src as any).originPortId) {
      setOriginPortId((src as any).originPortId as string);
    }

    // Incoterms
    const incos = (src.incoterms ?? []).filter(Boolean);
    if (incos.length) {
      setSelInco(incos);
      setPrimaryInco(incos[0]);
      if (src.exwCity && incos.includes("EXW")) {
        setIncoExtras((prev) => ({ ...prev, exwCity: src.exwCity }));
      }
    }

    // Destination markets by country names
    const matchedMarkets = (src.destinationCountries ?? [])
      .map((cn) => {
        const w = cn.trim().toLowerCase();
        return (
          MARKETS.find((m) => m.n.trim().toLowerCase() === w) ||
          MARKETS.find((m) => m.n.trim().toLowerCase().includes(w))
        );
      })
      .filter(Boolean) as typeof MARKETS;
    if (matchedMarkets.length) {
      setSelMarkets(matchedMarkets);
      const cfg: Record<string, MktCfg> = {};
      for (const m of matchedMarkets) {
        cfg[m.id] = {
          sp: m.p.map((p) => p.id),
          sm: true,
          gf: "",
          pf: Object.fromEntries(m.p.map((p) => [p.id, ""])),
        };
      }
      setMktCfg(cfg);
    }

    // Cuts
    const catalog = cutsByCategory[cat0] || [];
    const newCuts: Cut[] = [];
    const imgs: Record<string, string> = {};
    for (const it of src.items ?? []) {
      const nameL = (it.name || "").trim().toLowerCase();
      const matched =
        (it.productNumber != null
          ? catalog.find((c) => (c as any).product_number === it.productNumber)
          : undefined) ||
        catalog.find((c) => c.displayName.toLowerCase() === nameL) ||
        catalog.find((c) => c.displayName.toLowerCase().includes(nameL));
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
      newCuts.push({
        id,
        cat: cat0,
        cut: matched?.displayName || it.name,
        cutId: matched?.id,
        cutImage: matched?.image_url ?? null,
        spec: normalizeSpec(matched?.bone_spec),
        pkg: "\n",
        gr: "\n",
        ag: it.agingMethod || "None",
        qty: it.amount ? String(it.amount) : "",
        ask: it.price ? Number(it.price).toFixed(2) : "",
        floor: it.minimumPrice ? Number(it.minimumPrice).toFixed(2) : "",
        notes: "",
        plant: "",
      });
      if (matched?.image_url) imgs[id] = matched.image_url;
    }
    if (newCuts.length) {
      setCuts(newCuts);
      if (Object.keys(imgs).length) setCutImgs(imgs);
    }

    toast.success(isEditing ? "Editing offer — make your changes and save" : "Cloned — review changes and publish");
  }, [hydrateSource, isEditing, MARKETS, cutsByCategory, setUnit]);

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

  // ─── Container/quantity rules (max 20 FCL, max 28,000 kg per container) ──
  // Quantities entered per cut are PER CONTAINER (one FCL). Do NOT divide by ccCount.
  const ccCount = Math.max(1, Math.min(20, containerCount || 1));
  const perContainerKg = tw;
  const fitsIn20 = perContainerKg <= 14000;
  const exceedsHardCap = perContainerKg > 28000;
  const oversized40Note =
    csize === "40ft" && tw > 0 && fitsIn20
      ? "Quantity fits in a 20' FCL — supplier offered a 40' FCL."
      : "";

  useEffect(() => {
    if (csize === "20ft" && tw > 0 && !fitsIn20) {
      setCsize("40ft");
      toast.message("Switched to 40' FCL", {
        description: "Quantity exceeds a 20' FCL capacity (14,000 kg per container).",
      });
    }
  }, [csize, tw, fitsIn20]);

  const pickCsize = (next: "20ft" | "40ft") => {
    if (next === "20ft" && tw > 0 && !fitsIn20) {
      toast.error("Due to the quantity, this must be a 40' FCL container.");
      return;
    }
    setCsize(next);
  };

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
        { id: Date.now().toString(), cat: "Beef", cut: "Forequarter", spec: "Boneless", pkg: "\n", gr: "\n", ag: "None", qty: "14000", ask: "6.40", floor: "5.80", notes: "98 VL", plant: "" },
        { id: (Date.now() + 1).toString(), cat: "Beef", cut: "Brisket", spec: "Boneless", pkg: "Carton Box", gr: "Medium", ag: "Wet Aged", qty: "13000", ask: "4.35", floor: "3.90", notes: "", plant: "" },
      ];
      setCuts((prev) => [...prev, ...mockParsed]);
      setAiProcessing(false);
      setShowAiImport(false);
      setAiMode(null);
      setAiInput("");
      toast.success("AI parsed 2 cuts");
    }, 1500);
  }, []);

  /* Inline-edit a finalized cut row */
  const updateCutField = useCallback(
    (cutId: string, field: keyof Cut, value: string) => {
      setCuts((prev) => prev.map((x) => (x.id === cutId ? { ...x, [field]: value } : x)));
    },
    []
  );

  const toggleCustomer = useCallback((id: string) => {
    setSelectedCustomers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const distOk = distMarketplace || distAllCustomers || (distSpecific && selectedCustomers.length > 0);
  const publishSteps = [
    { key: "markets",  label: "Select at least one destination market", done: selMarkets.length > 0, anchor: "sec-markets" },
    { key: "cuts",     label: "Add at least one product / cut",            done: cuts.length > 0,       anchor: "sec-cuts" },
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
  const secondaryIncos = selInco
    .filter((i) => i !== primaryInco)
    .filter((s) => {
      // CIF = CFR + Insurance — avoid redundant column when both selected.
      if (s === "CIF" && selInco.includes("CFR")) return false;
      if (s === "CFR" && primaryInco === "CIF") return false;
      return true;
    });
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
    if (companyLoading) return;
    if (!company?.id) {
      toast.error("No supplier company linked to your account");
      return;
    }
    if (selInco.includes("EXW") && !(incoExtras.exwCity || "").trim()) {
      toast.error("Please enter the EXW pickup location");
      return;
    }
    if (exceedsHardCap) {
      toast.error(
        `Quantity per container exceeds 28,000 kg (current: ${Math.round(perContainerKg).toLocaleString()} kg). Increase container count or reduce quantities.`,
      );
      return;
    }
    // Pre-validate that at least one cut has a resolvable name or cutId
    const hasResolvableCut = cuts.some(c => c.cutId || c.cut.trim().length > 0);
    if (!hasResolvableCut) {
      toast.error("Please add at least one product/cut with a valid name before publishing.");
      return;
    }
    // Ensure cuts have qty and price
    const invalidCuts = cuts.filter(c => !(parseFloat(c.qty) > 0) || !(parseFloat(c.ask) > 0));
    if (invalidCuts.length > 0) {
      toast.error(`${invalidCuts.length} cut(s) have missing quantity or price. Please fill all fields.`);
      return;
    }
    setPublishing(true);
    const supplierId = company.id;
    const supplierName = company.name || "Mundus Supplier";
    let offerCreated = false;
    let offerId = "";
    try {
      // Derive shipment month/year (next calendar month if not specified)
      const now = new Date();
      const shipDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const shipment_month = shipDate.getMonth() + 1;
      const shipment_year = shipDate.getFullYear();

      // Total FCL from kg / container capacity
      const totalKg = cuts.reduce((s, c) => s + (parseFloat(c.qty) || 0), 0);
      const totalFcl = containerCount;

      // Resolve selected origin port → country / display string
      const selectedOriginPort = originPorts.find((p) => p.id === originPortId) || null;
      const originCountryVal = selectedOriginPort?.country ?? null;
      const originPortLabel = selectedOriginPort
        ? `${selectedOriginPort.name}${selectedOriginPort.code ? ` (${selectedOriginPort.code})` : ""}`
        : null;

      // 1. Create offer
      let offer: { id: string; offer_number: number };
      if (isEditing && editOffer) {
        try {
          const { error } = await supabase
            .from("offers")
            .update({
              status: "active",
              shipment_month,
              shipment_year,
              payment_terms: payTerm,
              container_size: csize,
              total_fcl: totalFcl,
              is_halal: certifications.includes("Halal"),
              is_kosher: certifications.includes("Kosher"),
              exw_pickup_location: selInco.includes("EXW")
                ? ((incoExtras.exwCity || "").trim().slice(0, 255) || null)
                : null,
              cut_region: cutRegion,
              origin_port_id: originPortId || null,
              ...(originCountryVal ? { origin_country: originCountryVal } : {}),
              ...(originPortLabel ? { origin_port: originPortLabel } : {}),
              allow_quantity_negotiation: allowQtyNegotiation,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editOffer.offerId);
          if (error) throw error;
          offer = { id: editOffer.offerId, offer_number: editOffer.offerNumber };

          // Wipe child rows so we can re-insert with the same logic below.
          await supabase.from("offer_items").delete().eq("offer_id", editOffer.offerId);
          await supabase.from("offer_allowed_incoterms").delete().eq("offer_id", editOffer.offerId);
          await supabase.from("offer_markets").delete().eq("offer_id", editOffer.offerId);
          await supabase.from("freight_options").delete().eq("offer_id", editOffer.offerId);
        } catch (e) {
          const m = e instanceof Error ? e.message : String(e);
          throw new Error(`Update offer failed: ${m}`);
        }
      } else {
        try {
        const { data, error } = await supabase
          .from("offers")
          .insert({
            supplier_id: supplierId,
            supplier_name: supplierName,
            status: "active",
            origin_country: originCountryVal ?? (company?.country ?? null),
            origin_port: originPortLabel,
            origin_port_id: originPortId || null,
            shipment_month,
            shipment_year,
            payment_terms: payTerm,
            container_size: csize,
            total_fcl: totalFcl,
            is_halal: certifications.includes("Halal"),
            is_kosher: certifications.includes("Kosher"),
            office_id: activeOfficeId ?? supplierId,
            exw_pickup_location: selInco.includes("EXW")
              ? ((incoExtras.exwCity || "").trim().slice(0, 255) || null)
              : null,
            request_id: fromRequest?.requestId ?? null,
            cut_region: cutRegion,
            allow_quantity_negotiation: allowQtyNegotiation,
          })
          .select("id, offer_number")
          .single();
        if (error || !data) throw error ?? new Error("no data returned");
        offer = data;
        } catch (e) {
          const m = e instanceof Error ? e.message : String(e);
          throw new Error(`Step 1 failed: offer insert — ${m}`);
        }
      }
      if (!isEditing) {
        offerCreated = true;
        offerId = offer.id;
      }

      // 2. Resolve/create customer_products per cut, then insert offer_items
      type OfferItemInsert = {
        offer_id: string; customer_product_id: string;
        amount: number; price: number; minimum_price: number;
        minimum_amount: number; maximum_amount: number;
        condition: string; aging_method: string | null;
        packaging: string | null;
      };
      const itemsRows: OfferItemInsert[] = [];
      try {
        for (const c of cuts) {
          const qty = parseFloat(c.qty) || 0;
          const ask = parseFloat(c.ask) || 0;
          const floor = parseFloat(c.floor);
          const floorVal = Number.isFinite(floor) && floor > 0 ? floor : ask;
          if (qty <= 0 || ask <= 0) continue;

          // Fallback: resolve cutId from cut name if missing
          let cutId = c.cutId;
          let cutRow: { id: string; name: string; product_number: number | null; category: string | null } | null = null;
          if (cutId) {
            const { data } = await supabase
              .from("cuts")
              .select("id, name, product_number, category")
              .eq("id", cutId)
              .maybeSingle();
            cutRow = data ?? null;
          }
          if (!cutRow && c.cut) {
            // 1) Exact (case-insensitive) match
            const cleaned = c.cut.replace(/\s*\[[^\]]+\]\s*/g, " ").replace(/\s+/g, " ").trim();
            const { data: exact } = await supabase
              .from("cuts")
              .select("id, name, product_number, category")
              .ilike("name", cleaned)
              .maybeSingle();
            cutRow = exact ?? null;

            // 2) Substring match (DB name contains the typed cut, or vice versa)
            if (!cutRow) {
              const { data: partials } = await supabase
                .from("cuts")
                .select("id, name, product_number, category")
                .ilike("name", `%${cleaned}%`)
                .limit(5);
              if (partials && partials.length === 1) {
                cutRow = partials[0];
              } else if (partials && partials.length > 1) {
                cutRow =
                  partials.find((p) => p.name.toLowerCase() === cleaned.toLowerCase()) ||
                  partials[0];
              }
            }

            // 3) Last-resort fuzzy match on the trailing 2 words
            if (!cutRow) {
              const tokens = cleaned.split(/\s+/);
              const tail = tokens.slice(-2).join(" ");
              if (tail.length >= 4) {
                const { data: fuzzy } = await supabase
                  .from("cuts")
                  .select("id, name, product_number, category")
                  .ilike("name", `%${tail}%`)
                  .limit(3);
                if (fuzzy && fuzzy.length >= 1) cutRow = fuzzy[0];
              }
            }

            // 4) Resolve through the in-memory catalog the user picked from
            if (!cutRow) {
              const catCuts = (cutsByCategory[c.cat] || Object.values(cutsByCategory).flat()) as Array<{ id: string; displayName: string }>;
              const matched =
                catCuts.find((cc) => cc.displayName.toLowerCase() === cleaned.toLowerCase()) ||
                catCuts.find(
                  (cc) =>
                    cc.displayName.toLowerCase().includes(cleaned.toLowerCase()) ||
                    cleaned.toLowerCase().includes(cc.displayName.toLowerCase()),
                );
              if (matched?.id) {
                const { data } = await supabase
                  .from("cuts")
                  .select("id, name, product_number, category")
                  .eq("id", matched.id)
                  .maybeSingle();
                cutRow = data ?? null;
              }
            }
          }
          if (!cutRow) {
            console.warn("[publish] could not resolve cut:", c.cut, c.cutId, "— skipping");
            continue;
          }
          cutId = cutRow.id;

          // Resolve/create customer_product via SECURITY DEFINER RPC
          // (handles product_categories + standard_products + customer_products server-side,
          // bypassing RLS on the global catalog tables in a safe, authorized way).
          const { data: cpId, error: rpcErr } = await supabase.rpc("resolve_customer_product", {
            p_company_id: supplierId,
            p_cut_id: cutId,
          });
          if (rpcErr || !cpId) {
            throw new Error(
              `resolve_customer_product: ${rpcErr?.message || rpcErr?.details || rpcErr?.hint || "no id returned"}`,
            );
          }
          const customerProductId = cpId as string;
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
            packaging: c.pkg || null,
          });
        }
      } catch (e) {
        const m =
          (e as any)?.message ||
          (e as any)?.details ||
          (e as any)?.hint ||
          (e as any)?.code ||
          (typeof e === "string" ? e : JSON.stringify(e));
        throw new Error(`Step 2 failed: customer_products — ${m}`);
      }

      if (itemsRows.length === 0) {
        // ROLLBACK: Delete the offer we just created since no items could be resolved
        if (offerCreated && offerId) {
          console.error("[publish] No items resolved — rolling back offer", offer.id);
          await supabase.from("offers").delete().eq("id", offer.id);
          offerCreated = false;
        }
        throw new Error("No valid cuts could be resolved. Please ensure each cut has a quantity, price, and matches a product in our catalog. Try selecting cuts from the dropdown instead of typing manually.");
      }
      try {
        const { error } = await supabase.from("offer_items").insert(itemsRows);
        if (error) throw error;
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        throw new Error(`Step 3 failed: offer_items — ${m}`);
      }

      // 4. offer_allowed_incoterms
      const VALID_INCO = ["CIF", "CFR", "FOB", "EXW", "DDP", "DAP", "FAS", "DPU"];
      const allowed = (selInco.length ? selInco : (primaryInco ? [primaryInco] : []))
        .filter((x) => VALID_INCO.includes(x));
      if (allowed.length > 0) {
        try {
          const { error } = await supabase.from("offer_allowed_incoterms")
            .insert(allowed.map((it) => ({ offer_id: offer.id, incoterm_type: it })));
          if (error) throw error;
        } catch (e) {
          const m = e instanceof Error ? e.message : String(e);
          throw new Error(`Step 4 failed: offer_allowed_incoterms — ${m}`);
        }
      }

      // 5. offer_markets
      if (selMarkets.length > 0) {
        try {
          const countryIds = selMarkets.map((m) => m.id);
          const { data: mktRows, error: mktErr } = await supabase
            .from("markets")
            .select("id, country_id")
            .in("country_id", countryIds);
          if (mktErr) throw mktErr;
          console.log("[publish] markets lookup", { countryIds, found: mktRows });
          const byCountry = new Map((mktRows ?? []).map((r) => [r.country_id, r.id]));
          const missing = countryIds.filter((cid) => !byCountry.has(cid));
          if (missing.length) console.warn("[publish] no market row for country_ids:", missing);
          const mktInserts = countryIds
            .map((cid) => byCountry.get(cid))
            .filter((v): v is string => !!v)
            .map((market_id) => ({ offer_id: offer.id, market_id }));
          if (mktInserts.length > 0) {
            const { error: omErr } = await supabase.from("offer_markets").insert(mktInserts);
            if (omErr) throw omErr;
          }
        } catch (e) {
          const m = e instanceof Error ? e.message : String(e);
          throw new Error(`Step 5 failed: offer_markets — ${m}`);
        }
      }

      // 6. freight_options per port
      try {
        const freightInserts: Array<{ offer_id: string; port_id: string; cost: number; insurance: number }> = [];
        const insuranceVal = parseFloat(incoExtras.cifInsurance ?? "") || 0;
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const seen = new Set<string>();
        for (const m of selMarkets) {
          const cfg = mktCfg[m.id];
          if (!cfg) continue;
          for (const pid of cfg.sp) {
            const portId = typeof pid === "object" && pid !== null ? (pid as any).id : pid;
            if (!portId || !uuidRe.test(String(portId))) {
              console.warn("[publish] skipping invalid port_id", { market: m.id, pid });
              continue;
            }
            if (seen.has(portId)) continue;
            seen.add(portId);
            const rawFreight = uniformFreight
              ? uniformFreightValue
              : (cfg.sm || cfg.sp.length <= 1) ? cfg.gf : (cfg.pf[portId] ?? "");
            const cost = parseFloat(String(rawFreight ?? "").replace(/,/g, "")) || 0;
            freightInserts.push({ offer_id: offer.id as string, port_id: portId, cost, insurance: insuranceVal });
          }
        }
        if (freightInserts.length > 0) {
          const { error } = await supabase.from("freight_options").insert(freightInserts);
          if (error) {
            console.error("[publish] freight_options insert failed:", error, freightInserts);
            throw error;
          }
        }
      } catch (e) {
        const m =
          (e as any)?.message ||
          (e as any)?.details ||
          (e as any)?.hint ||
          (typeof e === "string" ? e : JSON.stringify(e));
        throw new Error(`Step 6 failed: freight_options — ${m}`);
      }

      toast.success(
        isEditing
          ? `Offer ${formatOfferNumber(offer.offer_number)} updated successfully!`
          : `Offer ${formatOfferNumber(offer.offer_number)} published successfully!`,
      );
      try {
        const { auditLog } = await import("@/lib/auditLog");
        auditLog({
          action: isEditing ? "offer.edited" : "offer.published",
          category: "offer",
          entityType: "offer",
          entityId: offer.id as string,
          entityLabel: formatOfferNumber(offer.offer_number as number),
          details: {
            itemCount: Array.isArray(itemsRows) ? itemsRows.length : undefined,
          },
        });
      } catch { /* never break flow */ }
      if (fromRequest?.requestId) {
        await supabase
          .from("buyer_requests")
          .update({ status: "with_responses", updated_at: new Date().toISOString() })
          .eq("id", fromRequest.requestId);

        // Notify the buyer that a supplier responded to their request
        try {
          const { data: req } = await supabase
            .from("buyer_requests")
            .select("buyer_company_id")
            .eq("id", fromRequest.requestId)
            .maybeSingle();
          if (req?.buyer_company_id) {
            notifyCompanyUsers({
              companyId: req.buyer_company_id as string,
              title: "Supplier responded to your request",
              body: `${company?.name ?? "A supplier"} submitted an offer for ${fromRequest.product || "your request"}`,
              icon: "package",
              category: "requests",
              linkUrl: `/buyer/requests/${fromRequest.requestId}`,
              relatedType: "request",
              relatedId: fromRequest.requestId,
            }).catch(() => {});
          }
        } catch (e) {
          console.warn("[notifications] supplier-response notification failed", e);
        }
      }
      if (isEditing && editOffer) {
        navigate(isAdminActor && asCompanyId ? `/admin/offers/${editOffer.offerId}` : `/supplier/offers/${editOffer.offerId}`);
      } else {
        navigate(isAdminActor && asCompanyId ? `/admin/companies/${asCompanyId}` : "/supplier/offers");
      }
    } catch (e: unknown) {
      // If we created an offer but something failed afterward, clean it up
      if (offerCreated && offerId && !isEditing) {
        console.error("[publish] Rolling back offer due to error:", offerId);
        await supabase.from("offer_items").delete().eq("offer_id", offerId);
        await supabase.from("offer_allowed_incoterms").delete().eq("offer_id", offerId);
        await supabase.from("offer_markets").delete().eq("offer_id", offerId);
        await supabase.from("freight_options").delete().eq("offer_id", offerId);
        await supabase.from("offers").delete().eq("id", offerId);
      }
      const msg =
        (e as any)?.message ||
        (e as any)?.details ||
        (e as any)?.hint ||
        (typeof e === "string" ? e : JSON.stringify(e)) ||
        "Failed to publish offer";
      console.error("[publish] Error:", e);
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  };
  const handleCancel = () => {
    if (confirm("Discard this offer?")) {
      navigate(isAdminActor && asCompanyId ? `/admin/companies/${asCompanyId}` : "/supplier/offers");
    }
  };

  return (
    <div className="cov4">
      {isAdminActor && actingAsCompany && (
        <div
          style={{
            padding: "10px 16px",
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: 8,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "#92400E",
          }}
        >
          ⚠️ Creating offer as <strong>{actingAsCompany.name}</strong> (Managed by Mundus)
        </div>
      )}
      {fromRequest && (
        <div
          className="rounded-lg p-4 mb-4 flex items-start gap-3"
          style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
          }}
        >
          <span style={{ color: "#3B82F6", fontSize: 18, lineHeight: 1 }}>ℹ️</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1E40AF" }}>
              Creating offer from request #{fromRequest.requestNumber}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "#2563EB" }}>
              Pre-filled with {fromRequest.client}'s request for {fromRequest.product}.
              Review and adjust the details before publishing.
            </p>
          </div>
        </div>
      )}
      {isEditing && editOffer && (
        <div
          className="rounded-lg p-4 mb-4 flex items-start gap-3"
          style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>✏️</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#92400E" }}>
              Editing offer {formatOfferNumber(editOffer.offerNumber)}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "#A16207" }}>
              Make your changes and save. The offer number stays the same.
            </p>
          </div>
        </div>
      )}
      {cloneFrom && !isEditing && (
        <div
          className="rounded-lg p-4 mb-4 flex items-start gap-3"
          style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>📋</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#065F46" }}>
              Cloning offer
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "#047857" }}>
              All details pre-filled. Review and publish as a new offer.
            </p>
          </div>
        </div>
      )}
      {/* HEADER */}
      <header className="cov4-header">
        <div className="cov4-hdr-l">
          <div>
            <h1>{isEditing && editOffer ? `Edit offer ${formatOfferNumber(editOffer.offerNumber)}` : "Create new offer"}</h1>
            <p>Markets · Products · Pricing · Distribution</p>
          </div>
        </div>
        <div className="cov4-hdr-r">
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

          {/* ── Origin Port ─────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Origin Port
            </label>
            {supplierCountries.length === 1 && (
              <span style={{ fontSize: 12, color: "#6B7280", marginBottom: 6, display: "block" }}>
                {supplierCountries[0]}
              </span>
            )}
            <Popover open={originPickerOpen} onOpenChange={setOriginPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    textAlign: "left",
                    padding: "9px 12px",
                    border: "1.5px solid #D1D5DB",
                    borderRadius: 8,
                    background: "#fff",
                    fontSize: 14,
                    color: originPortId ? "#111827" : "#9CA3AF",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {(() => {
                    const p = originPorts.find((x) => x.id === originPortId);
                    if (!p) return "Select origin port…";
                    return `${p.name}${p.code ? ` (${p.code})` : ""} — ${p.country}`;
                  })()}
                  <span style={{ color: "#9CA3AF" }}>▾</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0" style={{ width: 420 }}>
                <Command>
                  <CommandInput placeholder="Search ports…" />
                  <CommandList>
                    <CommandEmpty>
                      {supplierCountries.length === 0
                        ? "Set your company country in My Company first."
                        : "No ports found."}
                    </CommandEmpty>
                    {supplierCountries.map((c) => {
                      const list = originPorts.filter((p) => p.country === c);
                      if (list.length === 0) return null;
                      return (
                        <CommandGroup key={c} heading={c}>
                          {list.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.name} ${p.code ?? ""} ${p.city ?? ""} ${p.country}`}
                              onSelect={() => {
                                setOriginPortId(p.id);
                                setOriginPickerOpen(false);
                              }}
                            >
                              <Check
                                className="mr-2 h-4 w-4"
                                style={{ opacity: originPortId === p.id ? 1 : 0 }}
                              />
                              <span>
                                {p.name}
                                {p.code ? ` (${p.code})` : ""}
                                {p.city ? ` — ${p.city}` : ""}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {supplierCountries.length > 1 && (
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                Showing ports from: {supplierCountries.join(", ")}
              </p>
            )}
          </div>

          {/* Container & Temp */}
          <div className="cov4-cfg-row">
            <div className="cov4-cfg-g">
              <span className="cov4-cfg-l">Container</span>
              <div className="cov4-tgl">
                {(["20ft", "40ft"] as const).map((opt) => (
                  <button key={opt} type="button" className={csize === opt ? "on" : ""} onClick={() => pickCsize(opt)}>{opt}</button>
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
            <div className="cov4-cfg-g">
              <span className="cov4-cfg-l">FCL(s)</span>
              <input
                type="number"
                min={1}
                max={20}
                value={containerCount}
                onChange={(e) => {
                  const n = parseInt(e.target.value) || 1;
                  if (n > 20) { toast.error("Maximum is 20 containers per offer."); setContainerCount(20); return; }
                  setContainerCount(Math.max(1, n));
                }}
                style={{ width: 60, padding: "6px 8px", border: "1.5px solid #D1D5DB", borderRadius: 8, fontSize: 14, fontWeight: 600, textAlign: "center" }}
              />
            </div>
          </div>
          {(oversized40Note || exceedsHardCap) && (
            <div style={{ marginTop: 4 }}>
              {oversized40Note && (
                <div style={{ fontSize: 11, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 8px", marginBottom: 4 }}>
                  ⚠ {oversized40Note}
                </div>
              )}
              {exceedsHardCap && (
                <div style={{ fontSize: 11, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "6px 8px" }}>
                  ✕ Per-container quantity exceeds 28,000 kg. Add more containers or reduce qty.
                </div>
              )}
            </div>
          )}

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
                <input
                  className="cov4-text-in"
                  type="text"
                  name="exw-pickup-address"
                  autoComplete="street-address"
                  placeholder="City, warehouse address..."
                  value={incoExtras.exwCity || ""}
                  onChange={(e) => setIncoExtras((p) => ({ ...p, exwCity: e.target.value }))}
                />
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
                  .filter((s) => {
                    // CIF = CFR + Insurance (handled by CIF Insurance field).
                    // Hide CIF row when CFR is also selected; hide CFR row when primary is CIF.
                    if (s === "CIF" && selInco.includes("CFR")) return false;
                    if (s === "CFR" && primaryInco === "CIF") return false;
                    return true;
                  })
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

          {/* Negotiation rules */}
          <div className="cov4-sec">
            <div className="cov4-sec-t">Negotiation rules</div>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: 12,
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                background: "hsl(var(--muted))",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={allowQtyNegotiation}
                onChange={(e) => setAllowQtyNegotiation(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "hsl(var(--foreground))" }}>
                  Allow buyers to negotiate item quantities
                </div>
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                  When on, buyers may redistribute kg across items inside a chat proposal.
                  The total offered kg must always match the original offer — partial loads are never allowed.
                </div>
              </div>
            </label>
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
            <SectionHeader icon="🥩" t="PRODUCT / CUT & pricing" s="Products, specs, photos, ask & floor price" />
            <button type="button" className="cov4-ai-btn" onClick={() => setShowAiImport((v) => !v)}>
              ✨ AI Import
            </button>
            {cutRegion === "us" && (
              <span style={{ fontSize: 11, color: "#8B1A3A", background: "#FBEAF0", border: "1px solid rgba(139,26,58,.2)", padding: "4px 8px", borderRadius: 6, lineHeight: 1.35, maxWidth: 380, marginLeft: 8 }}>
                🇺🇸 Item list will be shown as per your cuts nomenclature selected: <strong>US Beef &amp; Pork Product / Cuts (IMPS)</strong>. To switch, use the <strong>🌐 Global Product / Cuts</strong> button above.
              </span>
            )}
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
            {isUsCompany && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (cuts.length === 0) setCutRegion("global");
                  }}
                  disabled={cuts.length > 0 && cutRegion !== "global"}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: cutRegion === "global" ? "2px solid #8B1A3A" : "1.5px solid #D1D5DB",
                    background: cutRegion === "global" ? "#F5E6EC" : cuts.length > 0 ? "#F3F4F6" : "white",
                    fontWeight: cutRegion === "global" ? 700 : 400,
                    color: cutRegion === "global" ? "#8B1A3A" : cuts.length > 0 ? "#D1D5DB" : "#6B7280",
                    cursor: (cuts.length > 0 && cutRegion !== "global") ? "not-allowed" : "pointer",
                    fontSize: 13,
                    opacity: (cuts.length > 0 && cutRegion !== "global") ? 0.5 : 1,
                  }}
                >
                  🌐 Global {usToggleProteinLabel}Cuts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (cuts.length === 0) setCutRegion("us");
                  }}
                  disabled={cuts.length > 0 && cutRegion !== "us"}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: cutRegion === "us" ? "2px solid #8B1A3A" : "1.5px solid #D1D5DB",
                    background: cutRegion === "us" ? "#F5E6EC" : cuts.length > 0 ? "#F3F4F6" : "white",
                    fontWeight: cutRegion === "us" ? 700 : 400,
                    color: cutRegion === "us" ? "#8B1A3A" : cuts.length > 0 ? "#D1D5DB" : "#6B7280",
                    cursor: (cuts.length > 0 && cutRegion !== "us") ? "not-allowed" : "pointer",
                    fontSize: 13,
                    opacity: (cuts.length > 0 && cutRegion !== "us") ? 0.5 : 1,
                  }}
                >
                  🇺🇸 US {usToggleProteinLabel}Cuts (IMPS)
                </button>
                {cuts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Remove all added cuts and start over?")) {
                        setCuts([]);
                        setCutImgs({});
                        setAddRow(false);
                        setNf({ ...EMPTY_NF });
                      }
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "1.5px solid #EF4444",
                      background: "white",
                      color: "#EF4444",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    🔄 Reset Product / Cuts
                  </button>
                )}
                {cuts.length > 0 && (
                  <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>
                    {cutRegion === "us"
                      ? `🇺🇸 Using US ${usToggleProteinLabel}Cuts (IMPS)`
                      : `🌐 Using Global ${usToggleProteinLabel}Cuts`} · {cuts.length} Product / Cut{cuts.length > 1 ? "s" : ""} added
                  </span>
                )}
              </div>
            )}
            <table className="cov4-tbl">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>Photo</th>
                  <th style={{ width: 120 }}>Protein</th>
                  <th style={{ width: 180 }}>Item / Cut</th>
                  <th style={{ width: 90 }}>Spec</th>
                  {showGradeColumn && <th style={{ width: 100 }}>Grade</th>}
                  <th style={{ width: 120 }}>Packing</th>
                  <th style={{ width: 80 }} title="USDA/SIF establishment number">Plant #</th>
                  <th className="num" style={{ width: 100 }}>{qLbl}</th>
                  <th className="num">
                    Ask {pLbl}
                    {multiInco && (
                      <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 999, background: INCO_BADGE[primaryInco]?.bg, color: INCO_BADGE[primaryInco]?.fg, fontSize: 9, fontWeight: 700 }}>{primaryInco}</span>
                    )}
                  </th>
                  <th className="num">
                    Floor {pLbl} <span style={{ fontWeight: 400, opacity: 0.7, textTransform: "none" }}>(optional)</span>
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
                  <th style={{ width: 120 }}>Notes</th>
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
                    <td><span className="cov4-cut-nm" style={{ fontWeight: 600 }}>{c.cat}</span></td>
                    <td><span className="cov4-cut-nm">{c.cut}</span></td>
                    <td>
                      <select
                        className="cov4-inline-edit"
                        value={c.spec}
                        onChange={(e) => updateCutField(c.id, "spec", e.target.value)}
                      >
                        {SPECS.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </td>
                    {showGradeColumn && (
                      <td>
                        <select
                          className="cov4-inline-edit"
                          value={c.gr === "\n" ? "" : c.gr}
                          onChange={(e) => updateCutField(c.id, "gr", e.target.value)}
                        >
                          <option value="">—</option>
                          {US_GRADES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      </td>
                    )}
                    <td>
                      <select
                        className="cov4-inline-edit"
                        value={c.pkg === "\n" ? "" : c.pkg}
                        onChange={(e) => updateCutField(c.id, "pkg", e.target.value)}
                        title={PACKING_TOOLTIPS[c.pkg] || ""}
                      >
                        <option value="">—</option>
                        {(PACKING_OPTIONS[c.cat] || PACKING_OPTIONS.Beef).map((x) => (
                          <option key={x} value={x} title={PACKING_TOOLTIPS[x]}>{x}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cov4-inline-edit"
                        value={c.plant || ""}
                        placeholder="—"
                        onChange={(e) => updateCutField(c.id, "plant", e.target.value)}
                        style={{ width: 70 }}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        step="1"
                        className="cov4-inline-edit num"
                        value={
                          unit === "kg"
                            ? c.qty
                            : toDisplay(parseFloat(c.qty) || 0, "weight", unit).toFixed(0)
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          const kg =
                            unit === "kg"
                              ? v
                              : String(fromDisplay(parseFloat(v) || 0, "weight", unit));
                          updateCutField(c.id, "qty", kg);
                        }}
                        style={{ width: 80, textAlign: "right" }}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        step="0.01"
                        className="cov4-inline-edit num"
                        value={
                          unit === "kg"
                            ? c.ask
                            : toDisplay(parseFloat(c.ask) || 0, "price", unit).toFixed(2)
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          const kg =
                            unit === "kg"
                              ? v
                              : String(fromDisplay(parseFloat(v) || 0, "price", unit));
                          updateCutField(c.id, "ask", kg);
                        }}
                        style={{ width: 80, textAlign: "right" }}
                      />
                    </td>
                    <td className="num cov4-floor">
                      <input
                        type="number"
                        step="0.01"
                        className="cov4-inline-edit num"
                        value={
                          !c.floor
                            ? ""
                            : unit === "kg"
                              ? c.floor
                              : toDisplay(parseFloat(c.floor) || 0, "price", unit).toFixed(2)
                        }
                        placeholder="—"
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) { updateCutField(c.id, "floor", ""); return; }
                          const kg =
                            unit === "kg"
                              ? v
                              : String(fromDisplay(parseFloat(v) || 0, "price", unit));
                          updateCutField(c.id, "floor", kg);
                        }}
                        style={{ width: 80, textAlign: "right" }}
                      />
                    </td>
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
                    <td>
                      <input
                        type="text"
                        className="cov4-inline-edit"
                        value={c.notes || ""}
                        placeholder="—"
                        onChange={(e) => updateCutField(c.id, "notes", e.target.value)}
                        style={{ minWidth: 100 }}
                      />
                    </td>
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
                      <select
                        value={nf.cat}
                        onChange={(e) => setNf((p) => ({ ...p, cat: e.target.value, cut: "", cutId: undefined, cutImage: null, pkg: "" }))}
                      >
                        {Object.keys(filteredCutsByCategory).map((c) => (
                          <option key={c} value={c}>
                            {t(`admin.marketplace.cuts.categories.${c}`, { defaultValue: c })}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
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
                          <PopoverContent className="p-0 w-[320px]" align="start">
                            <Command>
                              <CommandInput placeholder={tm("searchCutsPh") as string} />
                              <CommandList className="max-h-[320px]">
                                <CommandEmpty>{tm("noCuts")}</CommandEmpty>
                                <CommandGroup>
                                  {(filteredCutsByCategory[nf.cat] || [])
                                    .filter((c) => {
                                      if (!["Beef", "Pork"].includes(nf.cat)) return c.region === "global";
                                      if (cutRegion === "us") return c.region === "us" || c.bone_spec === "Offals";
                                      return c.region === "global";
                                    })
                                    .map((c) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.displayName}
                                      onSelect={() => {
                                        setNf((p) => ({
                                          ...p,
                                          cutId: c.id,
                                          cut: c.displayName,
                                         cutImage: c.image_url ?? null,
                                         spec: normalizeSpec(c.bone_spec),
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
                    </td>
                    <td><select value={nf.spec} onChange={(e) => setNf((p) => ({ ...p, spec: e.target.value }))}>{SPECS.map((x) => <option key={x}>{x}</option>)}</select></td>
                    {showGradeColumn && (
                      <td>
                        <select value={nf.gr === "\n" ? "" : nf.gr} onChange={(e) => setNf((p) => ({ ...p, gr: e.target.value }))}>
                          <option value="">—</option>
                          {US_GRADES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      </td>
                    )}
                    <td>
                      <select
                        value={nf.pkg === "\n" ? "" : nf.pkg}
                        onChange={(e) => setNf((p) => ({ ...p, pkg: e.target.value }))}
                        title={PACKING_TOOLTIPS[nf.pkg] || ""}
                      >
                        <option value="">—</option>
                        {(PACKING_OPTIONS[nf.cat] || PACKING_OPTIONS.Beef).map((x) => (
                          <option key={x} value={x} title={PACKING_TOOLTIPS[x]}>{x}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {companyPlants.length > 0 && !plantManual["__nf"] ? (
                        <select
                          value={nf.plant}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "__custom__") {
                              setPlantManual((p) => ({ ...p, __nf: true }));
                              setNf((p) => ({ ...p, plant: "" }));
                            } else {
                              setNf((p) => ({ ...p, plant: v }));
                            }
                          }}
                          title="USDA/SIF establishment number"
                        >
                          <option value="">Select...</option>
                          {companyPlants.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                          <option value="__custom__">+ Enter manually</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="e.g. 4554"
                          value={nf.plant}
                          onChange={(e) => setNf((p) => ({ ...p, plant: e.target.value }))}
                          title="USDA/SIF establishment number"
                          style={{ width: 80 }}
                        />
                      )}
                    </td>
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
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--fg-muted, #6b7280)" }}>
            <button
              type="button"
              onClick={() => navigate("/supplier/profile/plants")}
              style={{ background: "none", border: "none", padding: 0, color: "var(--p800, #8B2252)", cursor: "pointer", textDecoration: "underline", fontSize: 12 }}
            >
              Manage plant numbers
            </button>
          </div>
          {cuts.length === 0 && !addRow && !showAiImport && (
            <div className="cov4-empty"><span style={{ fontSize: 22 }}>📦</span><p>Add product / cuts manually or use AI Import</p></div>
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
                  <div className="cov4-prev-cuts-t">Product / Cuts included</div>
                  {cuts.map((c) => (
                    <div key={c.id} className="cov4-prev-cut-row">
                      <span>
                        {c.cat} {c.cut}
                        {c.plant && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: "#6b7280" }}>
                            · Plant {c.plant}
                          </span>
                        )}
                      </span>
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
                {selMarkets.length} market{selMarkets.length !== 1 ? "s" : ""} · {cuts.length} product / cut{cuts.length !== 1 ? "s" : ""} · {fmtWeight(tw, unit)} {wLbl}
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
            title={nextStep ? `Next: ${nextStep.label}` : (isEditing ? "Save changes" : "Review & publish your offer")}
          >
            {isEditing ? "Save changes →" : "Review & publish →"}
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
