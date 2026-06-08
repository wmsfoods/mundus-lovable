import { supabase } from "@/integrations/supabase/client";
import { renderWelcomeFromOverrides } from "./welcomeRender";
import { renderTemplate } from "./templateEngine";
import type { TemplateLayoutOverrides } from "../emailTemplates";

/** Templates with a dedicated rich renderer that overrides body content
 * beyond the generic header/CTA/color overrides. */
const RICH_RENDER = new Set<string>(["welcome"]);

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

/** Result the emailSender uses to override layout + subject for any template. */
export interface ResolvedOverrides {
  /** Rich-render branch returns already-rendered HTML+subject (welcome). */
  rendered?: { subject: string; html: string };
  /** Generic branch returns overrides to pass into masterLayout via the
   * template function, plus an optional subject override. */
  layout?: TemplateLayoutOverrides;
  subjectOverride?: string;
}

export async function tryResolveOverrides(
  templateKey: string,
  vars: any,
  locale: "pt" | "en" = "en",
): Promise<ResolvedOverrides | null> {
  try {
    const values = await loadActiveValues(templateKey, locale);
    if (!values) return null;
    if (RICH_RENDER.has(templateKey) && templateKey === "welcome") {
      return { rendered: renderWelcomeFromOverrides(values as any, vars) };
    }
    // Generic: interpolate {{vars}} into each known layout field.
    const flat: Record<string, any> = {};
    Object.keys(vars || {}).forEach((k) => {
      const v = (vars as any)[k];
      if (v === null || v === undefined || typeof v === "object") return;
      flat[k] = v;
    });
    const interp = (s?: string) => (s ? renderTemplate(s, flat) : undefined);
    const layout: TemplateLayoutOverrides = {
      heroTitle: interp(values.heroTitle),
      preheader: interp(values.preheader),
      ctaLabel: interp(values.ctaLabel),
      ctaUrl: interp(values.ctaUrl),
      primaryColor: values.primaryColor || undefined,
      logoUrl: values.logoUrl || undefined,
    };
    return { layout, subjectOverride: interp(values.subject) };
  } catch (e) {
    console.warn("[emailOverride] resolver failed:", e);
    return null;
  }
}