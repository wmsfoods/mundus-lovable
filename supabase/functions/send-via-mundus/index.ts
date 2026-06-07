import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildViaMundusEmail } from "../_shared/viaMundusEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_BASE_URL =
  Deno.env.get("APP_BASE_URL") ?? "https://app.mundustrade.us";

function urlForSide(
  side: "buyer" | "supplier" | "mundus",
  negotiationId: string,
): string {
  switch (side) {
    case "buyer":
      return `${APP_BASE_URL}/buyer/negotiations/${negotiationId}`;
    case "supplier":
      return `${APP_BASE_URL}/supplier/negotiations/${negotiationId}`;
    case "mundus":
      return `${APP_BASE_URL}/admin/negotiations/${negotiationId}`;
  }
}

type ErrCode =
  | "unauthenticated"
  | "forbidden"
  | "negotiation_not_found"
  | "recipient_unreachable"
  | "invalid_payload"
  | "db_error";

function err(code: ErrCode, message: string, status: number, extra: any = {}) {
  return new Response(
    JSON.stringify({ success: false, error: code, message, ...extra }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return err("invalid_payload", "POST required", 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader =
    req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return err("unauthenticated", "Missing bearer token", 401);
  }

  // userClient — preserves user JWT for auth.getUser + RLS-bound reads
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  // admin client — writes message + audit + dispatch
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Auth ────────────────────────────────────────────────────────────────
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return err("unauthenticated", "Invalid session", 401);
  }
  const userId = userRes.user.id;
  const userEmail = userRes.user.email ?? "";

  // ── Payload ─────────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return err("invalid_payload", "Invalid JSON body", 400);
  }
  const negotiationId: string | undefined = body?.negotiation_id;
  const subject: string = String(body?.subject ?? "").trim();
  const messageBody: string = String(body?.body ?? "").trim();
  const urgent: boolean = Boolean(body?.urgent ?? false);
  const attachmentUrl: string | undefined = body?.attachment_url || undefined;
  const attachmentName: string | undefined = body?.attachment_name || undefined;
  const attachmentSizeBytes: number | undefined =
    typeof body?.attachment_size_bytes === "number"
      ? body.attachment_size_bytes
      : undefined;

  if (
    !negotiationId ||
    subject.length < 1 ||
    subject.length > 200 ||
    messageBody.length < 1 ||
    messageBody.length > 2000
  ) {
    return err(
      "invalid_payload",
      "negotiation_id required; subject 1-200; body 1-2000",
      400,
    );
  }

  // ── Load negotiation + supplier (via offer) ─────────────────────────────
  const { data: neg, error: negErr } = await admin
    .from("negotiations")
    .select("id, buyer_company_id, offer_id, offers:offer_id(supplier_id)")
    .eq("id", negotiationId)
    .maybeSingle();
  if (negErr) return err("db_error", negErr.message, 500);
  if (!neg) return err("negotiation_not_found", "Negotiation not found", 404);

  const buyerCompanyId: string | null = (neg as any).buyer_company_id ?? null;
  const supplierCompanyId: string | null =
    (neg as any).offers?.supplier_id ?? null;
  if (!buyerCompanyId || !supplierCompanyId) {
    return err("negotiation_not_found", "Negotiation missing parties", 404);
  }

  // ── Determine user side ─────────────────────────────────────────────────
  const { data: myCompanies, error: myErr } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId);
  if (myErr) return err("db_error", myErr.message, 500);
  const myCompanyIds = new Set((myCompanies ?? []).map((r: any) => r.company_id));

  let isAdmin = false;
  try {
    const { data } = await userClient.rpc("is_mundus_admin");
    isAdmin = data === true;
  } catch {
    /* ignore */
  }

  let senderSide: "buyer" | "supplier" | "mundus";
  let senderCompanyId: string | null;
  let recipientCompanyId: string;
  if (myCompanyIds.has(buyerCompanyId)) {
    senderSide = "buyer";
    senderCompanyId = buyerCompanyId;
    recipientCompanyId = supplierCompanyId;
  } else if (myCompanyIds.has(supplierCompanyId)) {
    senderSide = "supplier";
    senderCompanyId = supplierCompanyId;
    recipientCompanyId = buyerCompanyId;
  } else if (isAdmin) {
    senderSide = "mundus";
    senderCompanyId = null;
    // Default admin → buyer; future: allow caller to pick recipient
    recipientCompanyId = body?.recipient_company_id || buyerCompanyId;
  } else {
    return err("forbidden", "Not a participant of this negotiation", 403);
  }

  // ── Resolve sender + recipient identity ─────────────────────────────────
  const { data: senderRow } = await admin
    .from("company_users")
    .select("full_name, email")
    .eq("user_id", userId)
    .maybeSingle();
  const senderName =
    (senderRow as any)?.full_name ||
    userEmail.split("@")[0] ||
    "A Mundus user";
  const senderEmail = (senderRow as any)?.email || userEmail;

  const [{ data: senderCoRow }, { data: recipientCoRow }] = await Promise.all([
    senderCompanyId
      ? admin
          .from("companies")
          .select("name")
          .eq("id", senderCompanyId)
          .maybeSingle()
      : Promise.resolve({ data: { name: "Mundus Trade" } }) as any,
    admin
      .from("companies")
      .select("name")
      .eq("id", recipientCompanyId)
      .maybeSingle(),
  ]);
  const senderCompanyName =
    (senderCoRow as any)?.name || (senderSide === "mundus" ? "Mundus Trade" : "");
  const recipientCompanyName = (recipientCoRow as any)?.name || "";

  // Recipient primary contact via SECURITY DEFINER RPC
  const { data: contactRows, error: contactErr } = await userClient.rpc(
    "get_company_primary_contact",
    { p_company_id: recipientCompanyId },
  );
  if (contactErr) return err("db_error", contactErr.message, 500);
  const contact = Array.isArray(contactRows) ? contactRows[0] : contactRows;
  const recipientEmail: string | undefined = (contact as any)?.email;
  const recipientName: string =
    (contact as any)?.full_name || recipientCompanyName || "there";
  if (!recipientEmail) {
    return err(
      "recipient_unreachable",
      "No contact e-mail on file for the recipient company",
      422,
    );
  }

  // ── Insert negotiation_messages (service role bypasses RLS) ─────────────
  const structuredData = {
    subject,
    urgent,
    attachment_url: attachmentUrl ?? null,
    attachment_name: attachmentName ?? null,
    attachment_size_bytes: attachmentSizeBytes ?? null,
    recipient_email: recipientEmail,
    recipient_company_id: recipientCompanyId,
    recipient_name: recipientName,
  };

  const { data: msgRow, error: insertErr } = await admin
    .from("negotiation_messages")
    .insert({
      negotiation_id: negotiationId,
      sender_user_id: userId,
      sender_side: senderSide,
      message_type: "via_mundus",
      content: messageBody,
      structured_data: structuredData,
      emailed: false,
    })
    .select("id, created_at")
    .single();
  if (insertErr || !msgRow) {
    return err("db_error", insertErr?.message ?? "insert failed", 500);
  }

  // ── Build email + enqueue (recipient + CC copy to sender) ───────────────
  const recipientSide: "buyer" | "supplier" | "mundus" =
    senderSide === "buyer"
      ? "supplier"
      : senderSide === "supplier"
        ? "buyer"
        : "mundus";
  const recipientUrl = urlForSide(recipientSide, negotiationId);
  const senderUrl = senderCompanyId
    ? urlForSide(senderSide, negotiationId)
    : recipientUrl;

  const commonBuild = {
    senderName,
    senderCompany: senderCompanyName,
    recipientName,
    recipientCompany: recipientCompanyName,
    subject,
    body: messageBody,
    urgent,
    recordId: negotiationId,
    recordType: "negotiation" as const,
    attachmentUrl,
    attachmentName,
    attachmentSizeBytes,
  };
  const builtRecipient = buildViaMundusEmail({
    ...commonBuild,
    recordUrl: recipientUrl,
  });
  const builtSenderCopy = buildViaMundusEmail({
    ...commonBuild,
    recordUrl: senderUrl,
  });

  const templateVars = {
    message_id: msgRow.id,
    negotiation_id: negotiationId,
    sender_user_id: userId,
    sender_side: senderSide,
    urgent,
  };

  const enqueueOne = async (
    toEmail: string,
    built: { subject: string; html: string },
    isCopy = false,
  ) => {
    const { data: id, error: e } = await userClient.rpc("enqueue_email", {
      p_to_email: toEmail,
      p_subject: isCopy ? `[copy] ${built.subject}` : built.subject,
      p_html_body: built.html,
      p_template_name: "via_mundus",
      p_template_vars: { ...templateVars, copy: isCopy },
    });
    if (e) {
      console.warn("[send-via-mundus] enqueue failed", e.message);
      return null;
    }
    // Best-effort dispatch
    admin.functions
      .invoke("send-email", { body: { email_id: id } })
      .catch((x) => console.warn("[send-via-mundus] dispatch failed", x));
    return id;
  };

  const recipientQueueId = await enqueueOne(recipientEmail, builtRecipient, false);
  if (senderEmail && senderEmail.toLowerCase() !== recipientEmail.toLowerCase()) {
    await enqueueOne(senderEmail, builtSenderCopy, true);
  }

  // ── Mark message as emailed ─────────────────────────────────────────────
  const emailedAt = new Date().toISOString();
  if (recipientQueueId) {
    await admin
      .from("negotiation_messages")
      .update({ emailed: true, emailed_at: emailedAt })
      .eq("id", msgRow.id);
  }

  // ── Audit (best-effort) ─────────────────────────────────────────────────
  await admin.from("negotiation_audit").insert({
    negotiation_id: negotiationId,
    action: "via_mundus_sent",
    actor_user_id: userId,
    actor_role: senderSide,
    on_behalf_of_company_id: senderCompanyId,
    details: {
      message_id: msgRow.id,
      recipient_email: recipientEmail,
      recipient_company_id: recipientCompanyId,
      urgent,
      has_attachment: Boolean(attachmentUrl),
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      message_id: msgRow.id,
      recipient: {
        name: recipientName,
        email: recipientEmail,
        company_name: recipientCompanyName,
      },
      emailed_at: recipientQueueId ? emailedAt : null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});