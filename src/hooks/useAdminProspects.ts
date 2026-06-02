import { useSyncExternalStore } from "react";

export type ProspectStage =
  | "new" | "researching" | "contacted" | "qualified"
  | "onboarding" | "onboarded" | "lost";

export type ProspectRole = "potential_buyer" | "potential_supplier";
export type ProspectSource =
  | "linkedin" | "trade_show" | "referral" | "web_scrape"
  | "apollo" | "manual" | "inbound" | "wms_import";

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
  photoUrl?: string;
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
  hasCLevel?: boolean;
}

export const STAGES: ProspectStage[] = [
  "new", "researching", "contacted", "qualified", "onboarding", "onboarded", "lost",
];
export const PIPELINE_STAGES: ProspectStage[] = [
  "new", "researching", "contacted", "qualified", "onboarding", "onboarded",
];

import { getMundusTeamSync } from "./useMundusTeam";

/**
 * Real owners come from the Mundus team table (DB). This helper returns
 * the current snapshot; callers that need reactivity should use
 * `useMundusTeam()` directly.
 */
export const getOwners = (): Array<{ initials: string; name: string }> =>
  getMundusTeamSync().map((m) => ({ initials: m.initials, name: m.name }));

const ownerName = (initials: string) => {
  const team = getMundusTeamSync();
  return team.find((o) => o.initials === initials)?.name ?? initials;
};

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

type Seed = Omit<
  Prospect,
  "id" | "initials" | "ownerName" | "createdAt" | "updatedAt" | "lastActivity" | "activity"
    | "leadType" | "contacts" | "isActive" | "isOnboarded" | "street" | "city" | "state"
    | "zipCode" | "industry" | "website" | "companyLinkedin" | "mundusCompanyId"
    | "deactivationReason" | "deactivatedAt"
>;

const SEEDS: Seed[] = [
];

function buildInitial(): Prospect[] {
  return SEEDS.map((s, i) => {
    const id = `pr-${String(i + 1).padStart(3, "0")}`;
    const seedN = i + 1;
    const activity = genActivity(seedN, s.owner, s.stage);
    const last = activity[0];
    const phone = `+${["55","598","54","86","81","82","84","63","966","971","20","212","60","66","51","57","27"][i % 17]} ${1000 + i}-${2000 + i}`;
    const domain = s.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
    const leadType: LeadType = s.role === "potential_buyer" ? "buyer" : "supplier";
    const isOnboarded = s.stage === "onboarded";
    const cityMap: Record<string, string> = { BR:"São Paulo", AR:"Buenos Aires", UY:"Montevideo", JP:"Tokyo", VN:"Hanoi", PH:"Manila", SA:"Riyadh", AE:"Dubai", EG:"Cairo", TH:"Bangkok", MY:"Kuala Lumpur", MA:"Casablanca", PE:"Lima", CO:"Bogotá", ZA:"Cape Town" };
    return {
      ...s,
      id,
      initials: initialsOf(s.companyName),
      ownerName: ownerName(s.owner),
      contactPhone: phone,
      createdAt: `2025-0${(i % 9) + 1}-1${(i % 9)}`,
      updatedAt: `2025-05-${10 + (i % 18)}`,
      lastActivity: last ? { type: last.type, when: last.at } : undefined,
      activity,
      leadType,
      street: `${100 + i} Main St`,
      city: cityMap[s.country] ?? "—",
      state: "—",
      zipCode: `${10000 + i}`,
      industry: s.role === "potential_buyer" ? "Food Distribution" : "Meat Processing",
      website: `https://${domain}`,
      companyLinkedin: `https://linkedin.com/company/${domain.replace(".com","")}`,
      contacts: [{
        id: `co-${id}-main`,
        isPrimary: true,
        fullName: s.contactName,
        email: s.contactEmail,
        phone,
        mobile: undefined,
        linkedin: undefined,
        decisionLevel: i % 4 === 0 ? "c_level" : i % 4 === 1 ? "director" : i % 4 === 2 ? "manager" : "vp",
      }],
      isActive: true,
      isOnboarded,
      mundusCompanyId: isOnboarded ? `mc-${id}` : undefined,
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
    leadType: input.role === "potential_buyer" ? "buyer" : "supplier",
    contacts: [{
      id: `co-${id}-main`,
      isPrimary: true,
      fullName: input.contactName,
      email: input.contactEmail,
      phone: input.contactPhone,
    }],
    isActive: true,
    isOnboarded: false,
  };
  STATE = [p, ...STATE];
  emit();
  return p;
}

// ===== mutations for detail page =========================================

export function updateProspect(id: string, patch: Partial<Prospect>) {
  STATE = STATE.map((p) => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString().slice(0,10) } : p);
  emit();
}

export function deactivateProspect(id: string, reason: string, actor = "FN") {
  STATE = STATE.map((p) => {
    if (p.id !== id) return p;
    const evt: ProspectActivity = {
      id: `ev-${id}-${Date.now()}`,
      type: "system",
      body: `Company deactivated${reason ? `: ${reason}` : ""}`,
      actor,
      at: "now",
    };
    return {
      ...p,
      isActive: false,
      deactivationReason: reason,
      deactivatedAt: new Date().toISOString(),
      contacts: p.contacts.map((c) => ({ ...c })),
      activity: [evt, ...p.activity],
      lastActivity: { type: "system", when: "now" },
      updatedAt: new Date().toISOString().slice(0,10),
    };
  });
  emit();
}

export function reactivateProspect(id: string, actor = "FN") {
  STATE = STATE.map((p) => {
    if (p.id !== id) return p;
    const evt: ProspectActivity = {
      id: `ev-${id}-${Date.now()}`, type: "system", body: "Company reactivated", actor, at: "now",
    };
    return { ...p, isActive: true, deactivationReason: undefined, deactivatedAt: undefined,
      activity: [evt, ...p.activity], lastActivity: { type: "system", when: "now" },
      updatedAt: new Date().toISOString().slice(0,10) };
  });
  emit();
}

export function deleteProspect(id: string): { ok: boolean; reason?: string } {
  const p = STATE.find((x) => x.id === id);
  if (!p) return { ok: false, reason: "not_found" };
  if (p.isOnboarded || p.mundusCompanyId) return { ok: false, reason: "onboarded" };
  STATE = STATE.filter((x) => x.id !== id);
  emit();
  return { ok: true };
}

// ===== Mundus companies (mock) ==========================================

export type MundusType = "buyer" | "supplier" | "buyer_supplier";

export interface MundusMasterUser {
  fullName: string;
  email: string;
  phone?: string;
}

export interface MundusCompanyMock {
  id: string;
  name: string;
  country: string;
  isBuyer: boolean;
  isSupplier: boolean;
  masterUser: MundusMasterUser;
  sourceProspectId: string;
  createdAt: string;
}

export const MUNDUS_COMPANIES: MundusCompanyMock[] = [];

export function convertProspectToMundus(
  id: string,
  input: { type: MundusType; master: MundusMasterUser },
  actor = "FN",
): { ok: boolean; mundusCompanyId?: string; reason?: string } {
  const p = STATE.find((x) => x.id === id);
  if (!p) return { ok: false, reason: "not_found" };
  if (p.isOnboarded || p.mundusCompanyId) return { ok: false, reason: "already_onboarded" };

  const mundusCompanyId = `mc-${id}-${Date.now()}`;
  const isBuyer = input.type === "buyer" || input.type === "buyer_supplier";
  const isSupplier = input.type === "supplier" || input.type === "buyer_supplier";

  MUNDUS_COMPANIES.push({
    id: mundusCompanyId,
    name: p.companyName,
    country: p.country,
    isBuyer,
    isSupplier,
    masterUser: input.master,
    sourceProspectId: p.id,
    createdAt: new Date().toISOString(),
  });

  const typeLabel = input.type === "buyer_supplier" ? "Buyer & Supplier"
    : input.type === "buyer" ? "Buyer" : "Supplier";
  const convertEvt: ProspectActivity = {
    id: `ev-${id}-${Date.now()}`,
    type: "system",
    body: `Converted to Mundus Company (${typeLabel}). Master user: ${input.master.fullName} <${input.master.email}>`,
    actor,
    at: "now",
  };
  const stageEvt: ProspectActivity = {
    id: `ev-${id}-${Date.now() + 1}`,
    type: "stage_change",
    body: `Stage moved to onboarded`,
    actor,
    at: "now",
  };

  STATE = STATE.map((x) => {
    if (x.id !== id) return x;
    return {
      ...x,
      isOnboarded: true,
      mundusCompanyId,
      leadType: input.type,
      stage: "onboarded",
      activity: [stageEvt, convertEvt, ...x.activity],
      lastActivity: { type: "stage_change", when: "now" },
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  });
  emit();
  return { ok: true, mundusCompanyId };
}

export function upsertContact(prospectId: string, contact: ProspectContact) {
  STATE = STATE.map((p) => {
    if (p.id !== prospectId) return p;
    const exists = p.contacts.some((c) => c.id === contact.id);
    const contacts = exists
      ? p.contacts.map((c) => c.id === contact.id ? contact : c)
      : [...p.contacts, contact];
    return { ...p, contacts, updatedAt: new Date().toISOString().slice(0,10) };
  });
  emit();
}

export function deleteContact(prospectId: string, contactId: string) {
  STATE = STATE.map((p) => {
    if (p.id !== prospectId) return p;
    return { ...p, contacts: p.contacts.filter((c) => c.id !== contactId || c.isPrimary) };
  });
  emit();
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
  for (const o of getOwners()) map.set(o.initials, { initials: o.initials, name: o.name, activeCount: 0, qualified: 0, onboarded: 0 });
  // Include any owners present in the list but missing from the team snapshot
  for (const p of list) {
    if (!map.has(p.owner)) {
      map.set(p.owner, { initials: p.owner, name: p.ownerName || p.owner, activeCount: 0, qualified: 0, onboarded: 0 });
    }
  }
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