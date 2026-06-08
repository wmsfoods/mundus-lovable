import { supabase } from "@/integrations/supabase/client";
import { renderWelcomeFromOverrides } from "./welcomeRender";

/** Templates whose render currently honors admin overrides. */
const SUPPORTED = new Set<string>(["welcome"]);

interface Cached { values: Record<string, string>; expiresAt: number; }
const cache = new Map<string, Cached>();
const TTL_MS = 60_000;

async function loadActiveValues(templateKey: string, locale: "pt" | "en"): Promise<Record<string, string> | null> {
  const cacheKey = `${templateKey}:${locale}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.values;
  const { data } = await (supabase as any)
    .from("email_template_active")
    .select("version_id, email_template_versions:version_id(values)")
    .eq("template_key", templateKey)
    .eq("locale", locale)
    .maybeSingle();
  const values = data?.email_template_versions?.values || null;
  if (values) cache.set(cacheKey, { values, expiresAt: Date.now() + TTL_MS });
  return values;
}

/** Tries to render using admin overrides. Returns null if unsupported or no
 * active version exists, signaling the caller should fall back to code. */
export async function tryRenderWithOverrides(
  templateKey: string,
  vars: any,
  locale: "pt" | "en" = "en",
): Promise<{ subject: string; html: string } | null> {
  if (!SUPPORTED.has(templateKey)) return null;
  try {
    const values = await loadActiveValues(templateKey, locale);
    if (!values) return null;
    if (templateKey === "welcome") return renderWelcomeFromOverrides(values as any, vars);
  } catch (e) {
    console.warn("[emailOverride] resolver failed:", e);
  }
  return null;
}