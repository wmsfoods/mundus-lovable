import { supabase } from "@/integrations/supabase/client";

const ATTACHMENT_BUCKET = "via-mundus-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SendViaMundusArgs {
  /** Direct negotiation id. Preferred when known. */
  negotiationId?: string;
  /** Order or Sale record id — used to resolve the underlying negotiation. */
  orderOrSaleDealId?: string;
  subject: string;
  body: string;
  urgent?: boolean;
  attachmentFile?: File | null;
}

export interface SendViaMundusResult {
  messageId: string;
  recipientName: string;
  recipientEmail: string;
  recipientCompany: string;
  emailedAt: string | null;
}

export class ViaMundusError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function uploadAttachment(file: File): Promise<{
  url: string;
  name: string;
  size: number;
}> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) throw new ViaMundusError("unauthenticated", "Not logged in");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${uid}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
  if (upErr) {
    throw new ViaMundusError(
      "attachment_upload_failed",
      `Upload failed: ${upErr.message}`,
    );
  }

  const { data: signed, error: sErr } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (sErr || !signed?.signedUrl) {
    throw new ViaMundusError(
      "attachment_upload_failed",
      "Could not create signed URL",
    );
  }
  return { url: signed.signedUrl, name: file.name, size: file.size };
}

async function resolveNegotiationId(
  args: SendViaMundusArgs,
): Promise<string> {
  if (args.negotiationId) return args.negotiationId;
  if (!args.orderOrSaleDealId) {
    throw new ViaMundusError(
      "invalid_payload",
      "negotiationId or orderOrSaleDealId required",
    );
  }
  const { data, error } = await supabase
    .from("orders")
    .select("negotiation_id")
    .eq("id", args.orderOrSaleDealId)
    .maybeSingle();
  if (error) {
    throw new ViaMundusError("db_error", error.message);
  }
  const negId = (data as any)?.negotiation_id;
  if (!negId) {
    throw new ViaMundusError(
      "no_negotiation_linked",
      "This order has no linked negotiation",
    );
  }
  return negId;
}

export async function sendViaMundus(
  args: SendViaMundusArgs,
): Promise<SendViaMundusResult> {
  if (!args.subject || args.subject.length > 200) {
    throw new ViaMundusError("invalid_payload", "Subject must be 1-200 chars");
  }
  if (!args.body || args.body.length > 2000) {
    throw new ViaMundusError("invalid_payload", "Body must be 1-2000 chars");
  }

  const negotiationId = await resolveNegotiationId(args);

  let attachment:
    | { url: string; name: string; size: number }
    | undefined;
  if (args.attachmentFile) {
    attachment = await uploadAttachment(args.attachmentFile);
  }

  const { data, error } = await supabase.functions.invoke("send-via-mundus", {
    body: {
      negotiation_id: negotiationId,
      subject: args.subject,
      body: args.body,
      urgent: Boolean(args.urgent),
      attachment_url: attachment?.url,
      attachment_name: attachment?.name,
      attachment_size_bytes: attachment?.size,
    },
  });

  if (error) {
    let serverMessage = error.message || "Failed to send";
    let serverCode = "invoke_failed";

    try {
      const resp = (error as any).context?.response;
      if (resp && typeof resp.json === "function") {
        const body = await resp.json();
        if (body?.error) serverCode = body.error;
        if (body?.message) serverMessage = body.message;
      }
    } catch {
      /* fall back to generic client error */
    }

    throw new ViaMundusError(serverCode, serverMessage);
  }
  if (!data?.success) {
    throw new ViaMundusError(
      (data?.error as string) || "send_failed",
      (data?.message as string) || "Failed to send message",
    );
  }

  return {
    messageId: data.message_id,
    recipientName: data.recipient?.name ?? "",
    recipientEmail: data.recipient?.email ?? "",
    recipientCompany: data.recipient?.company_name ?? "",
    emailedAt: data.emailed_at ?? null,
  };
}