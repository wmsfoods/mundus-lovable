import { supabase } from "@/integrations/supabase/client";
import { emailTemplates, emailSubjects, type EmailTemplateName } from "./emailTemplates";

const MUNDUS_ADMIN_EMAIL = "fn@mundustrade.com";
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
  const templateFn = emailTemplates[templateName] as (v: any) => string;
  const html = templateFn(vars);
  const subjectFn = emailSubjects[templateName];
  const subject = (subjectPrefix ? subjectPrefix : "") +
    (subjectFn ? subjectFn(vars) : "Mundus Trade Notification");
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