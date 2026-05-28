import { supabase } from "@/integrations/supabase/client";
import { emailTemplates, emailSubjects, type EmailTemplateName } from "./emailTemplates";

/**
 * Queues an email for sending by rendering one of the Mundus HTML templates
 * and inserting the full HTML into the `email_queue` table. A separate edge
 * function (deployed later) will pick up `queued` rows and dispatch them.
 * This is intentionally non-blocking — it never throws, so it cannot break
 * the calling business flow.
 */
export async function sendEmailNotification<T extends EmailTemplateName>(
  templateName: T,
  recipientEmail: string,
  templateVars: Parameters<typeof emailTemplates[T]>[0]
): Promise<void> {
  try {
    const templateFn = emailTemplates[templateName] as (vars: any) => string;
    const html = templateFn(templateVars);
    const subjectFn = emailSubjects[templateName];
    const subject = subjectFn ? subjectFn(templateVars) : "Mundus Trade Notification";

    const { data: queued, error } = await (supabase as any).from("email_queue").insert({
      to_email: recipientEmail,
      subject,
      html_body: html,
      template_name: templateName,
      template_vars: templateVars,
      status: "queued",
    }).select("id").single();
    if (error) {
      console.warn("[sendEmail] Queue failed:", error.message);
      return;
    }
    // Fire-and-forget immediate dispatch (never block the caller)
    if (queued?.id) {
      supabase.functions
        .invoke("send-email", { body: { email_id: queued.id } })
        .catch((e) => console.warn("[sendEmail] dispatch failed", e));
    }
  } catch (e) {
    console.warn("[sendEmail] Unexpected error:", e);
  }
}