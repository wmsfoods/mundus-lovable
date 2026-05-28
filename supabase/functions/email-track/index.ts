// Email open/click tracker. Returns a 1x1 GIF for opens; 302 for clicks.
// No JWT required — invoked from email clients.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0),
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const action = url.searchParams.get("action") ?? "open";
  const redirectUrl = url.searchParams.get("url");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (id) {
      if (action === "click") {
        await supabase.rpc("track_email_click", { email_id: id });
      } else {
        await supabase.rpc("track_email_open", { email_id: id });
      }
    }
  } catch (e) {
    console.warn("[email-track]", e);
  }

  if (action === "click" && redirectUrl) {
    return new Response(null, { status: 302, headers: { Location: redirectUrl } });
  }
  return new Response(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      ...corsHeaders,
    },
  });
});