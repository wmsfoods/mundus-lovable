/**
 * Country name → emoji flag.
 * Uses regional indicator letters derived from ISO 3166-1 alpha-2 codes.
 */
const COUNTRY_TO_CODE: Record<string, string> = {
  "United States": "US", "USA": "US", "US": "US",
  "Brazil": "BR", "Brasil": "BR",
  "China": "CN",
  "United Arab Emirates": "AE", "UAE": "AE",
  "Argentina": "AR",
  "Australia": "AU",
  "Canada": "CA",
  "Chile": "CL",
  "Colombia": "CO",
  "Egypt": "EG",
  "France": "FR",
  "Germany": "DE",
  "Hong Kong": "HK",
  "India": "IN",
  "Indonesia": "ID",
  "Israel": "IL",
  "Italy": "IT",
  "Japan": "JP",
  "South Korea": "KR", "Korea": "KR",
  "Kuwait": "KW",
  "Malaysia": "MY",
  "Mexico": "MX",
  "Netherlands": "NL",
  "New Zealand": "NZ",
  "Nigeria": "NG",
  "Oman": "OM",
  "Paraguay": "PY",
  "Peru": "PE",
  "Philippines": "PH",
  "Poland": "PL",
  "Portugal": "PT",
  "Qatar": "QA",
  "Russia": "RU",
  "Saudi Arabia": "SA",
  "Singapore": "SG",
  "South Africa": "ZA",
  "Spain": "ES",
  "Thailand": "TH",
  "Turkey": "TR",
  "Ukraine": "UA",
  "United Kingdom": "GB", "UK": "GB",
  "Uruguay": "UY",
  "Venezuela": "VE",
  "Vietnam": "VN", "Viet Nam": "VN",
  "Palestine": "PS", "Palestine, State of": "PS",
  "Jordan": "JO",
};

function codeToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function countryFlag(country: string | null | undefined): string {
  if (!country) return "🌍";
  const code = COUNTRY_TO_CODE[country] || COUNTRY_TO_CODE[country.trim()];
  if (code) return codeToFlag(code);
  if (country.length === 2) return codeToFlag(country);
  return "🌍";
}

export function countryWithFlag(country: string | null | undefined): string {
  if (!country) return "🌍 Unknown";
  return `${countryFlag(country)} ${country}`;
}