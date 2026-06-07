import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseServiceAccount, sendFcmToToken } from "../_shared/fcm.ts";
import { parseApnsConfig, sendApnsToToken } from "../_shared/apns.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-secret",
};

type PushPayload = {
  user_id: string;
  title: string;
  body?: string | null;
  url?: string | null;
  category?: string | null;
  notification_id?: string | null;
};

function unauthorized(msg = "Unauthorized") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parsePayload(body: unknown): PushPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  // Supabase Database Webhook format
  if (b.type === "INSERT" && b.record && typeof b.record === "object") {
    const r = b.record as Record<string, unknown>;
    if (typeof r.user_id === "string" && typeof r.title === "string") {
      return {
        user_id: r.user_id,
        title: r.title,
        body: typeof r.body === "string" ? r.body : null,
        url: typeof r.link_url === "string" ? r.link_url : null,
        category: typeof r.category === "string" ? r.category : null,
        notification_id: typeof r.id === "string" ? r.id : null,
      };
    }
  }

  if (typeof b.user_id === "string" && typeof b.title === "string") {
    return {
      user_id: b.user_id,
      title: b.title,
      body: typeof b.body === "string" ? b.body : null,
      url: typeof b.url === "string" ? b.url : typeof b.link_url === "string" ? b.link_url : null,
      category: typeof b.category === "string" ? b.category : null,
      notification_id: typeof b.notification_id === "string" ? b.notification_id : null,
    };
  }

  return null;
}

function isPushAllowed(
  prefs: Record<string, boolean> | null,
  category: string | null | undefined,
  relatedType: string | null | undefined,
  title?: string | null,
): boolean {
  if (!prefs) return true;
  if (prefs.push === false) return false;

  const t = (title ?? "").toLowerCase();
  if (t.includes("deal closed") || t.includes("deal fechado")) {
    return prefs.deal_closed !== false;
  }
  if (t.includes("shipping instruction")) {
    return prefs.shipping_instructions !== false;
  }

  const cat = category ?? "system";
  if (cat === "negotiations") return prefs.negotiation_rounds !== false;
  if (cat === "orders") return prefs.order_status_changes !== false;
  if (cat === "offers") return prefs.offer_deactivated !== false;
  if (cat === "chat") return prefs.new_chat_message !== false;
  if (cat === "requests") {
    if (relatedType === "request") return prefs.new_request_response !== false;
    return prefs.new_buyer_request !== false;
  }
  if (cat === "system") return true;
  return true;
}

async function authorize(req: Request): Promise<boolean> {
  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
  const headerSecret = req.headers.get("x-push-secret") ?? "";
  if (webhookSecret && headerSecret === webhookSecret) return true;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (serviceRole && token === serviceRole) return true;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) return true;
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!(await authorize(req))) return unauthorized();

  const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") ?? "";
  const sa = parseServiceAccount(saRaw);
  const apns = parseApnsConfig();
  if (!sa && !apns) {
    return new Response(JSON.stringify({ ok: true, delivered: 0, skipped: true, reason: "push_not_configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = parsePayload(body);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", payload.user_id)
    .maybeSingle();

  let relatedType: string | null = null;
  if (payload.notification_id) {
    const { data: notif } = await supabase
      .from("app_notifications")
      .select("related_type")
      .eq("id", payload.notification_id)
      .maybeSingle();
    relatedType = notif?.related_type ?? null;
  }

  if (!isPushAllowed(prefs as Record<string, boolean> | null, payload.category, relatedType, payload.title)) {
    return new Response(JSON.stringify({ ok: true, delivered: 0, skipped: true, reason: "preferences" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: tokens } = await supabase
    .from("device_push_tokens")
    .select("id, token, platform")
    .eq("user_id", payload.user_id);

  if (!tokens?.length) {
    return new Response(JSON.stringify({ ok: true, delivered: 0, skipped: true, reason: "no_tokens" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let delivered = 0;
  const staleIds: string[] = [];
  const errors: Array<{ platform: string; reason?: string; status?: number }> = [];

  for (const row of tokens) {
    const platform = (row as { platform?: string }).platform ?? "";
    const msg = {
      title: payload.title,
      body: payload.body ?? undefined,
      url: payload.url ?? undefined,
    };

    if (platform === "ios") {
      if (!apns) {
        errors.push({ platform: "ios", reason: "apns_not_configured" });
        continue;
      }
      const result = await sendApnsToToken(apns, row.token, msg);
      if (result.ok) delivered++;
      else {
        errors.push({ platform: "ios", reason: result.reason, status: result.status });
        if (result.unregistered) staleIds.push(row.id);
      }
    } else {
      if (!sa) {
        errors.push({ platform: platform || "android", reason: "fcm_not_configured" });
        continue;
      }
      const result = await sendFcmToToken(sa, row.token, msg);
      if (result.ok) delivered++;
      else {
        errors.push({ platform: platform || "android", reason: result.error });
        if (result.unregistered) staleIds.push(row.id);
      }
    }
  }

  if (staleIds.length > 0) {
    await supabase.from("device_push_tokens").delete().in("id", staleIds);
  }

  return new Response(JSON.stringify({ ok: true, delivered, skipped: delivered === 0, errors }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
