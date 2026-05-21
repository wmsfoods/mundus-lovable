/**
 * Negotiation engine rules — round limits, item locking, expiration.
 * Pure helpers; no React, no Supabase imports.
 */
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";

export const MAX_DISPLAY_ROUNDS = 3;
export const MAX_RAW_ROUNDS = MAX_DISPLAY_ROUNDS * 2;
export const EXPIRATION_HOURS = 24;

export type AgreedItem = {
  offer_item_id: string;
  price_per_kg: number;
  agreed_at: string;
  agreed_round: number;
};

/** Read agreed_items from a raw negotiation; tolerant to missing/legacy data. */
export function getAgreedItems(neg: { agreed_items?: unknown } | null | undefined): AgreedItem[] {
  const a = (neg as { agreed_items?: unknown } | null | undefined)?.agreed_items;
  if (!Array.isArray(a)) return [];
  return a as AgreedItem[];
}

export function getAgreedMap(neg: { agreed_items?: unknown } | null | undefined): Map<string, AgreedItem> {
  const map = new Map<string, AgreedItem>();
  for (const a of getAgreedItems(neg)) map.set(a.offer_item_id, a);
  return map;
}

export function getMaxRaw(neg: RealNegotiationRow | null | undefined): number {
  return (neg?.rounds ?? []).reduce((m, r) => Math.max(m, r.round), 0);
}
export function getNextRaw(neg: RealNegotiationRow | null | undefined): number {
  return getMaxRaw(neg) + 1;
}
export function getDisplayRound(rawRound: number): number {
  return Math.ceil(rawRound / 2);
}
export function isFinalDisplayRound(displayRound: number): boolean {
  return displayRound >= MAX_DISPLAY_ROUNDS;
}
/** No more counters allowed (both sides used all 3 rounds). */
export function isCounterExhausted(neg: RealNegotiationRow | null | undefined): boolean {
  return getMaxRaw(neg) >= MAX_RAW_ROUNDS;
}

/** ISO timestamp 24h from now (or custom hours). */
export function nextExpirationIso(hours = EXPIRATION_HOURS): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export type ExpirationInfo = {
  expired: boolean;
  msLeft: number;
  label: string; // e.g. "23h 12m" or "Expired"
};
export function getExpirationInfo(expiresAt: string | null | undefined): ExpirationInfo | null {
  if (!expiresAt) return null;
  const t = new Date(expiresAt).getTime();
  if (!Number.isFinite(t)) return null;
  const msLeft = t - Date.now();
  if (msLeft <= 0) return { expired: true, msLeft: 0, label: "Expired" };
  const totalMin = Math.floor(msLeft / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { expired: false, msLeft, label };
}

/** Treat awaiting statuses as expired in UI when expires_at has passed. */
export function isNegotiationExpired(neg: { status: string; expires_at?: string | null } | null | undefined): boolean {
  if (!neg) return false;
  if (neg.status === "expired") return true;
  if (neg.status !== "awaiting_supplier" && neg.status !== "pending_buyer_review") return false;
  const info = getExpirationInfo(neg.expires_at ?? null);
  return !!info?.expired;
}

// TODO: Supabase Edge Function or pg_cron to auto-update status='expired' when expires_at passes