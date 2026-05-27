/**
 * Country name → emoji flag.
 * Uses regional indicator letters derived from ISO 3166-1 alpha-2 codes.
 * The full name → ISO lookup lives in `@/lib/countryCodes`.
 */
import { countryToCode } from "@/lib/countryCodes";

function codeToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function countryFlag(country: string | null | undefined): string {
  if (!country) return "🌍";
  const code = countryToCode(country);
  if (code) return codeToFlag(code);
  if (country.length === 2) return codeToFlag(country);
  return "🌍";
}

export function countryWithFlag(country: string | null | undefined): string {
  if (!country) return "🌍 Unknown";
  return `${countryFlag(country)} ${country}`;
}