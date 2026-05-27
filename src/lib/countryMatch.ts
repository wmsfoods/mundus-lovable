import { countryToCode } from "@/lib/countryCodes";
import type { CountryRow } from "@/hooks/useCountriesList";

/**
 * Normalize a free-form country string (e.g. from Google Places) into a canonical
 * `english_name` from the `countries` table. Matching strategy:
 *   1. Exact case-insensitive english_name match
 *   2. ISO alpha-2 code match (if input is 2 letters)
 *   3. countryToCode() alias lookup → ISO match
 * Returns the canonical english_name or null when no match is found.
 */
export function matchCountry(input: string | null | undefined, list: CountryRow[]): string | null {
  if (!input) return null;
  const q = input.trim();
  if (!q || list.length === 0) return null;
  const lower = q.toLowerCase();
  const byName = list.find((c) => c.english_name.toLowerCase() === lower);
  if (byName) return byName.english_name;
  const upper = q.toUpperCase();
  if (q.length === 2) {
    const byIso = list.find((c) => c.iso_code === upper);
    if (byIso) return byIso.english_name;
  }
  const code = countryToCode(q);
  if (code) {
    const byIso = list.find((c) => c.iso_code === code);
    if (byIso) return byIso.english_name;
  }
  // Partial: input contains a country name, e.g. "Brasil, SP"
  const partial = list.find((c) => lower.includes(c.english_name.toLowerCase()));
  if (partial) return partial.english_name;
  return null;
}