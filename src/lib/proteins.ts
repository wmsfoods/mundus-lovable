// Canonical protein list used to filter what categories show up in
// create-offer / create-request flows. Add new proteins here as the
// catalog grows.
export const ALL_PROTEINS = ["Beef", "Pork", "Poultry", "Lamb", "Ovine", "Veal"] as const;
export type ProteinType = (typeof ALL_PROTEINS)[number];

// Categories that have US (IMPS) nomenclature variants.
export const PROTEINS_WITH_US_NOMENCLATURE = ["Beef", "Pork"] as const;

export const DEFAULT_PROTEINS: readonly string[] = ["Beef", "Pork", "Poultry", "Lamb"];

/**
 * Resolve a company's effective protein profile.
 * If the column is null/empty, fall back to the defaults so existing
 * accounts keep seeing every category until they configure their profile.
 */
export function resolveProteinProfile(profile: string[] | null | undefined): string[] {
  return profile && profile.length ? profile : [...DEFAULT_PROTEINS];
}