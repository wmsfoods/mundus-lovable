import { z } from "zod";
import {
  parsePhoneNumberFromString,
  AsYouType,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Centralized signup validation: Zod schemas, per-field validators,
 * masks/normalizers and a shared `t`-friendly message catalog.
 *
 * Used by Signup.tsx (client) and mirrored in
 * supabase/functions/_shared/signupValidation.ts (server).
 */

/* ------------------------- name ------------------------- */
// Letters (Unicode), spaces, hyphen, apostrophe. Blocks digits and symbols.
export const nameRegex = /^[\p{L}][\p{L}\s'\-]{1,79}$/u;

export function validateName(v: string): string | null {
  const value = (v ?? "").trim();
  if (!value) return "required";
  if (value.length < 2) return "tooShort";
  if (value.length > 80) return "tooLong";
  if (!nameRegex.test(value)) return "nameInvalid";
  return null;
}

/* ------------------------- email ------------------------- */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "required")
  .max(255, "tooLong")
  .email("emailInvalid");

export function validateEmail(v: string): string | null {
  const r = emailSchema.safeParse(v);
  return r.success ? null : r.error.issues[0]?.message ?? "emailInvalid";
}

/* ------------------------- password ------------------------- */
export function validatePassword(v: string): string | null {
  const value = v ?? "";
  if (!value) return "required";
  if (value.length < 8) return "passwordWeak";
  if (!/[a-z]/.test(value)) return "passwordWeak";
  if (!/[A-Z]/.test(value)) return "passwordWeak";
  if (!/[^a-zA-Z0-9]/.test(value)) return "passwordWeak";
  return null;
}

/* ------------------------- company name ------------------------- */
export function validateCompanyName(v: string): string | null {
  const value = (v ?? "").trim();
  if (!value) return "required";
  if (value.length < 2) return "tooShort";
  if (value.length > 120) return "tooLong";
  if (/^\d+$/.test(value)) return "companyNameInvalid";
  return null;
}

/* ------------------------- address / city / state ------------------------- */
export function validateAddress(v: string): string | null {
  const value = (v ?? "").trim();
  if (!value) return "required";
  if (value.length < 4) return "tooShort";
  if (value.length > 200) return "tooLong";
  return null;
}
export function validateCity(v: string): string | null {
  const value = (v ?? "").trim();
  if (!value) return "required";
  if (value.length < 2) return "tooShort";
  if (value.length > 80) return "tooLong";
  return null;
}
export const validateState = validateCity;

/* ------------------------- ZIP by country ------------------------- */
const ZIP_RULES: Record<string, { pattern: RegExp; hint: string }> = {
  "United States": { pattern: /^\d{5}(-\d{4})?$/, hint: "12345 or 12345-6789" },
  Brazil: { pattern: /^\d{5}-?\d{3}$/, hint: "00000-000" },
  "United Kingdom": {
    pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    hint: "SW1A 1AA",
  },
  Germany: { pattern: /^\d{5}$/, hint: "10115" },
  France: { pattern: /^\d{5}$/, hint: "75001" },
  Argentina: { pattern: /^[A-Z]?\d{4}[A-Z]{0,3}$/i, hint: "C1000 / 1000" },
  China: { pattern: /^\d{6}$/, hint: "100000" },
  "United Arab Emirates": { pattern: /^\d{4,6}$/, hint: "00000" },
  "Saudi Arabia": { pattern: /^\d{5}(-\d{4})?$/, hint: "12345" },
  Australia: { pattern: /^\d{4}$/, hint: "2000" },
  Uruguay: { pattern: /^\d{5}$/, hint: "11000" },
  Paraguay: { pattern: /^\d{4}$/, hint: "1000" },
  Mexico: { pattern: /^\d{5}$/, hint: "01000" },
  Chile: { pattern: /^\d{7}$/, hint: "8320000" },
  Colombia: { pattern: /^\d{6}$/, hint: "110111" },
};
const DEFAULT_ZIP = { pattern: /^[A-Z0-9\- ]{3,12}$/i, hint: "3–12 characters" };

export function getZipRule(country?: string) {
  if (!country) return DEFAULT_ZIP;
  return ZIP_RULES[country] ?? DEFAULT_ZIP;
}

export function validateZip(v: string, country?: string): string | null {
  const value = (v ?? "").trim();
  if (!value) return "required";
  const rule = getZipRule(country);
  if (!rule.pattern.test(value)) return "zipInvalid";
  return null;
}

/* ------------------------- phone (libphonenumber-js) ------------------------- */
/** Map dial code like "+1" → ISO country code used by libphonenumber. */
const DIAL_TO_ISO: Record<string, CountryCode> = {
  "+1": "US",
  "+55": "BR",
  "+44": "GB",
  "+34": "ES",
  "+86": "CN",
  "+52": "MX",
  "+54": "AR",
};

export function isoFromDial(dial: string): CountryCode | undefined {
  return DIAL_TO_ISO[dial];
}

export function maskPhone(value: string, dial: string): string {
  const iso = isoFromDial(dial);
  if (!iso) return value;
  return new AsYouType(iso).input(value);
}

export function validatePhone(value: string, dial: string): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return "required";
  const iso = isoFromDial(dial);
  const full = `${dial} ${raw}`;
  const parsed = parsePhoneNumberFromString(full, iso);
  if (!parsed || !parsed.isValid()) return "phoneInvalid";
  return null;
}

export function formatPhoneE164(value: string, dial: string): string | null {
  const iso = isoFromDial(dial);
  const parsed = parsePhoneNumberFromString(`${dial} ${value}`, iso);
  return parsed?.isValid() ? parsed.number : null;
}

/* ------------------------- website ------------------------- */
export function normalizeWebsite(v: string): string {
  const value = (v ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function validateWebsite(v: string): string | null {
  const value = (v ?? "").trim();
  if (!value) return null; // optional
  const normalized = normalizeWebsite(value);
  const r = z.string().url().safeParse(normalized);
  return r.success ? null : "websiteInvalid";
}

/* ------------------------- file upload ------------------------- */
const ALLOWED_DOC_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpg",
  "image/jpeg",
]);

export function validateCertificate(f: File | null): string | null {
  if (!f) return "required";
  if (f.size > 10 * 1024 * 1024) return "fileTooLarge";
  if (!ALLOWED_DOC_MIMES.has(f.type)) return "fileType";
  return null;
}

/* ------------------------- repeat password ------------------------- */
export function validateRepeatPassword(
  pwd: string,
  repeat: string,
): string | null {
  if (!repeat) return "required";
  if (pwd !== repeat) return "passwordsMismatch";
  return null;
}

/* ------------------------- role / proteins / countries ------------------------- */
export function validateRole(v: string): string | null {
  return v === "buyer" || v === "supplier" ? null : "required";
}
export function validateNonEmptyArray(arr: unknown[]): string | null {
  return arr && arr.length >= 1 ? null : "required";
}

/* ------------------------- error key → human message ------------------------- */
/** Resolve an error key via i18n with safe defaults. */
export function getErrorMessage(
  key: string | null,
  t: (k: string, opts?: Record<string, unknown>) => string,
  extra?: Record<string, unknown>,
): string | null {
  if (!key) return null;
  const k = `signup.errors.${key}`;
  return t(k, { defaultValue: defaultMessage(key), ...(extra ?? {}) });
}

function defaultMessage(key: string): string {
  const map: Record<string, string> = {
    required: "This field is required",
    tooShort: "Too short",
    tooLong: "Too long",
    nameInvalid: "Use only letters, spaces, hyphens and apostrophes",
    emailInvalid: "Enter a valid email address",
    emailTaken: "This email is already registered",
    passwordWeak: "Password does not meet all requirements",
    passwordsMismatch: "Passwords do not match",
    companyNameInvalid: "Company name must contain letters",
    taxIdInvalid: "Invalid tax ID format",
    phoneInvalid: "Enter a valid phone number",
    zipInvalid: "Invalid postal code for this country",
    websiteInvalid: "Enter a valid URL",
    fileTooLarge: "File must be 10MB or less",
    fileType: "Only PDF, PNG or JPG files are allowed",
  };
  return map[key] ?? key;
}