import { useSyncExternalStore } from "react";

export type ProspectStage =
  | "new" | "researching" | "contacted" | "qualified"
  | "onboarding" | "onboarded" | "lost";

export type ProspectRole = "potential_buyer" | "potential_supplier";
export type ProspectSource =
  | "linkedin" | "trade_show" | "referral" | "web_scrape"
  | "apollo" | "manual" | "inbound";

export type LeadType = "buyer" | "supplier" | "buyer_supplier";
export type DecisionLevel = "c_level" | "vp" | "director" | "manager" | "specialist" | "other";

export interface ProspectContact {
  id: string;
  isPrimary: boolean;
  fullName: string;
  role?: string;
  email?: string;
  additionalEmail?: string;
  phone?: string;
  mobile?: string;
  linkedin?: string;
  decisionLevel?: DecisionLevel;
}

export interface ProspectActivity {
  id: string;
  type: "note" | "email" | "call" | "stage_change" | "system";
  body: string;
  actor: string;
  at: string; // relative or ISO
}

export interface Prospect {
  id: string;
  companyName: string;
  initials: string;
  country: string;
  role: ProspectRole;
  source: ProspectSource;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  notes: string;
  stage: ProspectStage;
  owner: string;
  ownerName: string;
  estGmv?: number;
  createdAt: string;
  updatedAt: string;
  lastActivity?: { type: ProspectActivity["type"]; when: string };
  activity: ProspectActivity[];
  // --- extended (editable) ---
  leadType: LeadType;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  industry?: string;
  website?: string;
  companyLinkedin?: string;
  contacts: ProspectContact[]; // primary first, then additional
  isActive: boolean;
  isOnboarded: boolean;
  mundusCompanyId?: string;
  deactivationReason?: string;
  deactivatedAt?: string;
}

export const STAGES: ProspectStage[] = [
  "new", "researching", "contacted", "qualified", "onboarding", "onboarded", "lost",
];
export const PIPELINE_STAGES: ProspectStage[] = [
  "new", "researching", "contacted", "qualified", "onboarding", "onboarded",
];

export const OWNERS: Array<{ initials: string; name: string }> = [
  { initials: "FN", name: "Fernando Nascimento" },
  { initials: "MS", name: "Maria Silva" },
  { initials: "JC", name: "João Costa" },
  { initials: "AT", name: "Ana Torres" },
];

const ownerName = (initials: string) =>
  OWNERS.find((o) => o.initials === initials)?.name ?? initials;

const initialsOf = (name: string) => {
  const parts = name.replace(/[^A-Za-z\s]/g, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
};

// deterministic activity generator
function genActivity(seed: number, owner: string, stage: ProspectStage): ProspectActivity[] {
  const r = (i: number) => ((Math.sin(seed * 1000 + i * 13.7) + 1) / 2);
  const count = 4 + Math.floor(r(0) * 5); // 4-8
  const out: ProspectActivity[] = [];
  const types: ProspectActivity["type"][] = ["note", "email", "call", "stage_change", "system"];
  const bodies: Record<ProspectActivity["type"], string[]> = {
    note: [
      "Interested in monthly volumes around 2 FCL of striploin",
      "Asked for HALAL certification options",
      "Prefers FOB Santos shipping terms",
      "Mentioned competitor pricing 5% lower",
      "Looking for premium aged cuts only",
    ],
    email: [
      "Sent intro deck and pricing reference",
      "Replied with logistics questions",
      "Sent follow-up after no response",
      "Forwarded supplier credentials packet",
    ],
    call: [
      "30min discovery call — strong fit",
      "Quick check-in call, planning next steps",
      "Call with their procurement lead",
      "Voicemail left — awaiting callback",
    ],
    stage_change: [
      `Stage moved to ${stage}`,
    ],
    system: [
      "Enriched contact data via Apollo",
      "LinkedIn profile linked",
      "Added to nurture sequence",
    ],
  };
  for (let i = 0; i < count; i++) {
    const t = types[Math.floor(r(i + 1) * types.length)];
    const pool = bodies[t];
    const body = pool[Math.floor(r(i + 2) * pool.length)];
    const daysAgo = Math.floor(r(i + 3) * 30) + i;
    out.push({
      id: `ev-${seed}-${i}`,
      type: t,
      body,
      actor: owner,
      at: daysAgo < 1 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`,
    });
  }
  // ensure at least one stage_change
  out[out.length - 1] = {
    id: `ev-${seed}-sc`,
    type: "stage_change",
    body: `Stage moved to ${stage}`,
    actor: owner,
    at: `${1 + Math.floor(r(99) * 5)}d ago`,
  };
  return out;
}

type Seed = Omit<Prospect, "id" | "initials" | "ownerName" | "createdAt" | "updatedAt" | "lastActivity" | "activity">;

const SEEDS: Seed[] = [
  // SUPPLIERS
  { companyName: "JBS Brasil", country: "BR", role: "potential_supplier", stage: "qualified", owner: "FN", estGmv: 4_200_000, source: "linkedin", contactName: "Carlos Mendonça", contactEmail: "carlos.mendonca@jbs.com.br", notes: "Major BR exporter, multiple plants approved for CN/EU." },
  { companyName: "Frigorífico Pampa", country: "UY", role: "potential_supplier", stage: "contacted", owner: "MS", estGmv: 1_800_000, source: "trade_show", contactName: "Diego Martínez", contactEmail: "diego@pampa.com.uy", notes: "Met at Anuga 2024, strong Asian focus." },
  { companyName: "Beef Argentina SA", country: "AR", role: "potential_supplier", stage: "new", owner: "FN", estGmv: 2_400_000, source: "apollo", contactName: "Lucía Fernández", contactEmail: "l.fernandez@beefarg.com", notes: "Mid-size AR plant, hilton quota holder." },
  { companyName: "Minerva Foods", country: "BR", role: "potential_supplier", stage: "researching", owner: "JC", estGmv: 5_100_000, source: "referral", contactName: "Patricia Souza", contactEmail: "psouza@minerva.com.br", notes: "Referred by Marfrig contact." },
  { companyName: "Maturatta Foods", country: "BR", role: "potential_supplier", stage: "lost", owner: "MS", source: "linkedin", contactName: "Roberto Lima", contactEmail: "rlima@maturatta.com.br", notes: "Lost: already has established export channel." },
  { companyName: "Forrajes del Sur", country: "UY", role: "potential_supplier", stage: "onboarding", owner: "FN", estGmv: 1_200_000, source: "manual", contactName: "Andrés Bouza", contactEmail: "a.bouza@forrajes.uy", notes: "Sent platform invite, awaiting docs." },
  { companyName: "Cabaña Las Lilas", country: "AR", role: "potential_supplier", stage: "onboarded", owner: "JC", estGmv: 890_000, source: "trade_show", contactName: "Pedro Aristegui", contactEmail: "pedro@laslilas.ar", notes: "Premium boutique, completed onboarding Q4." },
  { companyName: "Patagonia Beef Co", country: "AR", role: "potential_supplier", stage: "contacted", owner: "MS", estGmv: 1_500_000, source: "linkedin", contactName: "Mariana Olmedo", contactEmail: "m.olmedo@patagoniabeef.com", notes: "Grass-fed positioning, good for EU buyers." },
  { companyName: "Marfrig Uruguay", country: "UY", role: "potential_supplier", stage: "qualified", owner: "FN", estGmv: 3_400_000, source: "referral", contactName: "Federico Soto", contactEmail: "fsoto@marfrig.uy", notes: "Big player, multiple regional plants." },
  { companyName: "Bauer Holdings", country: "BR", role: "potential_supplier", stage: "new", owner: "JC", estGmv: 2_100_000, source: "web_scrape", contactName: "Klaus Bauer", contactEmail: "kbauer@bauerhold.com.br", notes: "Family-owned mid-size BR exporter." },
  { companyName: "Texel Cordeiros", country: "UY", role: "potential_supplier", stage: "researching", owner: "MS", estGmv: 640_000, source: "apollo", contactName: "Joaquín Pérez", contactEmail: "jperez@texel.uy", notes: "Lamb specialist, niche but high-margin." },
  { companyName: "Aves do Sul", country: "BR", role: "potential_supplier", stage: "contacted", owner: "FN", estGmv: 1_900_000, source: "inbound", contactName: "Renata Cardoso", contactEmail: "rcardoso@avesdosul.com.br", notes: "Poultry, approached us via website form." },

  // BUYERS
  { companyName: "Tokyo Premium Imports", country: "JP", role: "potential_buyer", stage: "qualified", owner: "FN", estGmv: 3_800_000, source: "trade_show", contactName: "Hiroshi Yamada", contactEmail: "h.yamada@tokyo-premium.jp", notes: "Wagyu and premium aged cuts, restaurant supply." },
  { companyName: "Hanoi Premium Foods", country: "VN", role: "potential_buyer", stage: "contacted", owner: "MS", estGmv: 1_400_000, source: "linkedin", contactName: "Nguyen Van Anh", contactEmail: "nva@hanoi-premium.vn", notes: "Growing VN HoReCa distributor." },
  { companyName: "Manila Foods Group", country: "PH", role: "potential_buyer", stage: "new", owner: "JC", estGmv: 980_000, source: "apollo", contactName: "Maria Reyes", contactEmail: "mreyes@manilafoods.ph", notes: "PH supermarket chain, frozen beef focus." },
  { companyName: "Riyadh Trading LLC", country: "SA", role: "potential_buyer", stage: "researching", owner: "FN", estGmv: 2_600_000, source: "referral", contactName: "Ahmed Al-Saud", contactEmail: "ahmed@riyadhtrading.sa", notes: "HALAL only, large monthly volumes." },
  { companyName: "Dubai Gourmet Markets", country: "AE", role: "potential_buyer", stage: "contacted", owner: "MS", estGmv: 3_200_000, source: "linkedin", contactName: "Fatima Al-Maktoum", contactEmail: "fatima@dubaigourmet.ae", notes: "Premium retail, prefers small batches." },
  { companyName: "Cairo Mediterranean Imports", country: "EG", role: "potential_buyer", stage: "lost", owner: "JC", source: "apollo", contactName: "Omar Hassan", contactEmail: "omar@cairo-med.eg", notes: "Lost: requires payment via LC, not TT." },
  { companyName: "Bangkok Premium Cuts", country: "TH", role: "potential_buyer", stage: "onboarding", owner: "FN", estGmv: 1_700_000, source: "trade_show", contactName: "Somchai Charoen", contactEmail: "somchai@bangkokpremium.th", notes: "Onboarding in progress, KYC submitted." },
  { companyName: "Kuala Lumpur Foods", country: "MY", role: "potential_buyer", stage: "onboarded", owner: "MS", estGmv: 2_200_000, source: "referral", contactName: "Tan Wei Ming", contactEmail: "tan@klfoods.my", notes: "Active since Q3, HALAL distributor." },
  { companyName: "Casablanca Trading", country: "MA", role: "potential_buyer", stage: "new", owner: "JC", estGmv: 890_000, source: "web_scrape", contactName: "Youssef Benali", contactEmail: "y.benali@casablanca-trading.ma", notes: "North Africa, mid-tier importer." },
  { companyName: "Lima Premium Meats", country: "PE", role: "potential_buyer", stage: "contacted", owner: "FN", estGmv: 1_100_000, source: "linkedin", contactName: "Sofía Vargas", contactEmail: "svargas@limapremium.pe", notes: "Peruvian retail chain, niche premium." },
  { companyName: "Bogotá Distribuciones", country: "CO", role: "potential_buyer", stage: "researching", owner: "MS", estGmv: 1_800_000, source: "apollo", contactName: "Camilo Restrepo", contactEmail: "crestrepo@bogota-dist.co", notes: "Colombia foodservice distributor." },
  { companyName: "Cape Town Imports", country: "ZA", role: "potential_buyer", stage: "qualified", owner: "JC", estGmv: 2_400_000, source: "inbound", contactName: "Naledi Mokoena", contactEmail: "naledi@capetown-imports.co.za", notes: "ZA premium retail, ready to onboard." },
];

function buildInitial(): Prospect[] {
  return SEEDS.map((s, i) => {
    const id = `pr-${String(i + 1).padStart(3, "0")}`;
    const seedN = i + 1;
    const activity = genActivity(seedN, s.owner, s.stage);
    const last = activity[0];
    return {
      ...s,
      id,
      initials: initialsOf(s.companyName),
      ownerName: ownerName(s.owner),
      contactPhone: `+${["55","598","54","86","81","82","84","63","966","971","20","212","60","66","51","57","27"][i % 17]} ${1000 + i}-${2000 + i}`,
      createdAt: `2025-0${(i % 9) + 1}-1${(i % 9)}`,
      updatedAt: `2025-05-${10 + (i % 18)}`,
      lastActivity: last ? { type: last.type, when: last.at } : undefined,
      activity,
    };
  });
}

// ===== store ============================================================

let STATE: Prospect[] = buildInitial();
const listeners = new Set<() => void>();
const emit = () => { listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => STATE;

export function useAdminProspects(): Prospect[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useProspect(id: string | undefined): Prospect | undefined {
  const list = useAdminProspects();
  return id ? list.find((p) => p.id === id) : undefined;
}

export function updateProspectStage(id: string, stage: ProspectStage, actor = "FN") {
  STATE = STATE.map((p) => {
    if (p.id !== id) return p;
    const evt: ProspectActivity = {
      id: `ev-${id}-${Date.now()}`,
      type: "stage_change",
      body: `Stage moved to ${stage}`,
      actor,
      at: "now",
    };
    return {
      ...p,
      stage,
      updatedAt: new Date().toISOString().slice(0, 10),
      lastActivity: { type: "stage_change", when: "now" },
      activity: [evt, ...p.activity],
    };
  });
  emit();
}

export function addProspectActivity(id: string, evt: Omit<ProspectActivity, "id">) {
  STATE = STATE.map((p) => {
    if (p.id !== id) return p;
    const full: ProspectActivity = { ...evt, id: `ev-${id}-${Date.now()}` };
    return {
      ...p,
      lastActivity: { type: full.type, when: full.at },
      activity: [full, ...p.activity],
    };
  });
  emit();
}

export interface AddProspectInput {
  companyName: string;
  country: string;
  role: ProspectRole;
  source: ProspectSource;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  estGmv?: number;
  owner: string;
  notes?: string;
}

export function addProspect(input: AddProspectInput): Prospect {
  const id = `pr-${String(STATE.length + 1).padStart(3, "0")}`;
  const now = new Date().toISOString().slice(0, 10);
  const evt: ProspectActivity = {
    id: `ev-${id}-init`,
    type: "system",
    body: "Prospect added manually",
    actor: input.owner,
    at: "now",
  };
  const p: Prospect = {
    id,
    companyName: input.companyName,
    initials: initialsOf(input.companyName),
    country: input.country.toUpperCase(),
    role: input.role,
    source: input.source,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    notes: input.notes ?? "",
    stage: "new",
    owner: input.owner,
    ownerName: ownerName(input.owner),
    estGmv: input.estGmv,
    createdAt: now,
    updatedAt: now,
    lastActivity: { type: "system", when: "now" },
    activity: [evt],
  };
  STATE = [p, ...STATE];
  emit();
  return p;
}

export function addProspectsBulk(inputs: AddProspectInput[]): number {
  let added = 0;
  inputs.forEach((i) => { addProspect(i); added++; });
  return added;
}

// ===== analytics helpers ================================================

export function getStageCounts(list: Prospect[]): Record<ProspectStage, number> {
  const init: Record<ProspectStage, number> = {
    new: 0, researching: 0, contacted: 0, qualified: 0,
    onboarding: 0, onboarded: 0, lost: 0,
  };
  for (const p of list) init[p.stage]++;
  return init;
}

export function getFunnelMetrics(_list: Prospect[]): Array<{ from: ProspectStage; to: ProspectStage; percent: number }> {
  // hardcoded plausible values per spec
  return [
    { from: "new", to: "researching", percent: 75 },
    { from: "researching", to: "contacted", percent: 68 },
    { from: "contacted", to: "qualified", percent: 55 },
    { from: "qualified", to: "onboarding", percent: 72 },
    { from: "onboarding", to: "onboarded", percent: 80 },
  ];
}

export function getOwnerLeaderboard(list: Prospect[]) {
  const map = new Map<string, { initials: string; name: string; activeCount: number; qualified: number; onboarded: number }>();
  for (const o of OWNERS) map.set(o.initials, { initials: o.initials, name: o.name, activeCount: 0, qualified: 0, onboarded: 0 });
  for (const p of list) {
    const row = map.get(p.owner);
    if (!row) continue;
    if (p.stage !== "lost" && p.stage !== "onboarded") row.activeCount++;
    if (p.stage === "qualified") row.qualified++;
    if (p.stage === "onboarded") row.onboarded++;
  }
  return Array.from(map.values()).sort((a, b) => b.activeCount - a.activeCount);
}

export function getSourceBreakdown(list: Prospect[]) {
  const counts = new Map<ProspectSource, number>();
  for (const p of list) counts.set(p.source, (counts.get(p.source) ?? 0) + 1);
  const total = list.length || 1;
  return Array.from(counts.entries())
    .map(([source, count]) => ({ source, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}