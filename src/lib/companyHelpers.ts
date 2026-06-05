/**
 * Small helpers for company shape used across pages.
 * Centralized so US-vs-RoW behavior never drifts.
 */
export function isUsCompany(company: { country?: string | null } | null | undefined): boolean {
  return (company?.country ?? "").trim().toLowerCase() === "united states";
}