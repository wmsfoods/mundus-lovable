import { supabase } from "@/integrations/supabase/client";
import { emailTemplates, emailSubjects, type EmailTemplateName } from "./emailTemplates";
import { tryResolveOverrides } from "./email/templateOverrideResolver";

const MUNDUS_ADMIN_EMAIL = "fn@mundustrade.com";

const localeCache = new Map<string, { value: "pt" | "en"; expiresAt: number }>();
async function resolveRecipientLocale(email: string): Promise<"pt" | "en"> {
  if (!email) return "en";
  const key = email.toLowerCase();
  const hit = localeCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  try {
    const { data } = await (supabase as any)
      .from("users")
      .select("preferred_locale")
      .eq("email", key)
      .maybeSingle();
    const v: "pt" | "en" = data?.preferred_locale === "pt" ? "pt" : "en";
    localeCache.set(key, { value: v, expiresAt: Date.now() + 5 * 60_000 });
    return v;
  } catch {
    return "en";
  }
}

const NEGOTIATION_TEMPLATES: EmailTemplateName[] = [
  "bidReceived" as EmailTemplateName,
  "counterReceived" as EmailTemplateName,
  "dealClosed" as EmailTemplateName,
  "dealAwaitingConfirmation" as EmailTemplateName,
  "negotiationRejected" as EmailTemplateName,
  "staleNudge" as EmailTemplateName,
];

async function queueOne(
  templateName: EmailTemplateName,
  to: string,
  vars: any,
  subjectPrefix = "",
) {
  // Look up the recipient's preferred locale (defaults to EN).
  const locale = await resolveRecipientLocale(to);
  const override = await tryResolveOverrides(templateName as string, vars, locale);
  let html: string;
  let subject: string;
  if (override?.rendered) {
    html = override.rendered.html;
    subject = (subjectPrefix || "") + override.rendered.subject;
  } else if (override?.layout) {
    const templateFn = emailTemplates[templateName] as (v: any, o?: any) => string;
    html = templateFn(vars, override.layout);
    const subjectFn = emailSubjects[templateName];
    subject = (subjectPrefix || "") + (override.subjectOverride || (subjectFn ? subjectFn(vars) : "Mundus Trade Notification"));
  } else {
    const templateFn = emailTemplates[templateName] as (v: any) => string;
    html = templateFn(vars);
    const subjectFn = emailSubjects[templateName];
    subject = (subjectPrefix || "") + (subjectFn ? subjectFn(vars) : "Mundus Trade Notification");
  }
  // Use SECURITY DEFINER RPC so non-admin authenticated users can both
  // insert into email_queue and read back the new id (the table's SELECT
  // policy is admin-only).
  const { data: newId, error } = await (supabase as any).rpc("enqueue_email", {
    p_to_email: to,
    p_subject: subject,
    p_html_body: html,
    p_template_name: templateName,
    p_template_vars: vars ?? {},
  });
  if (error) {
    console.warn("[sendEmail] Queue failed:", error.message);
    return;
  }
  if (newId) {
    supabase.functions
      .invoke("send-email", { body: { email_id: newId } })
      .catch((e) => console.warn("[sendEmail] dispatch failed", e));
  }
}

/**
 * Queues an email for sending by rendering one of the Mundus HTML templates
 * and inserting the full HTML into the `email_queue` table. A separate edge
 * function (deployed later) will pick up `queued` rows and dispatch them.
 * This is intentionally non-blocking — it never throws, so it cannot break
 * the calling business flow.
 *
 * For negotiation-related templates, if the supplier company is managed by
 * Mundus (mundus_managed_supplier = true), an admin CC copy is also queued.
 */
export async function sendEmailNotification<T extends EmailTemplateName>(
  templateName: T,
  recipientEmail: string,
  templateVars: Parameters<typeof emailTemplates[T]>[0]
): Promise<void> {
  try {
    await queueOne(templateName, recipientEmail, templateVars);

    // Admin CC for managed-supplier negotiation events
    if (NEGOTIATION_TEMPLATES.includes(templateName)) {
      const vars: any = templateVars ?? {};
      const supplierCompanyId = vars.supplierCompanyId || vars.companyId;
      if (supplierCompanyId) {
        try {
          const { data: company } = await (supabase as any)
            .from("companies")
            .select("mundus_managed_supplier")
            .eq("id", supplierCompanyId)
            .maybeSingle();
          if (company?.mundus_managed_supplier) {
            await queueOne(
              templateName,
              MUNDUS_ADMIN_EMAIL,
              { ...vars, _adminCopy: true, _originalRecipient: recipientEmail },
              "[MANAGED] ",
            );
          }
        } catch (e) {
          console.warn("[sendEmail] admin-cc check failed", e);
        }
      }
    }
  } catch (e) {
    console.warn("[sendEmail] Unexpected error:", e);
  }
}