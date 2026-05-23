import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, email, code } = await req.json();

    if (!action || !email) {
      return new Response(JSON.stringify({ error: "Missing action or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    if (action === "check") {
      const { data: users } = await supabase.auth.admin.listUsers();
      const exists =
        users?.users?.some((u) => u.email?.toLowerCase() === normalizedEmail) || false;

      return new Response(JSON.stringify({ exists }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send") {
      const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

      await supabase.from("email_verifications").delete().eq("email", normalizedEmail);

      const { error } = await supabase.from("email_verifications").insert({
        email: normalizedEmail,
        code: verificationCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      console.log(`[VERIFY] Code for ${normalizedEmail}: ${verificationCode}`);

      return new Response(
        JSON.stringify({
          sent: true,
          message: "Verification code sent",
          _dev_code: verificationCode,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "verify") {
      if (!code) {
        return new Response(JSON.stringify({ verified: false, error: "Missing code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: records } = await supabase
        .from("email_verifications")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1);

      const record = records?.[0];
      if (!record) {
        return new Response(
          JSON.stringify({
            verified: false,
            error: "No verification pending. Request a new code.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (new Date(record.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ verified: false, error: "Code expired. Request a new one." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (record.attempts >= record.max_attempts) {
        return new Response(
          JSON.stringify({
            verified: false,
            error: "Too many attempts. Request a new code.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (record.code === String(code)) {
        await supabase
          .from("email_verifications")
          .update({ verified: true })
          .eq("id", record.id);
        return new Response(JSON.stringify({ verified: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        await supabase
          .from("email_verifications")
          .update({ attempts: record.attempts + 1 })
          .eq("id", record.id);
        return new Response(
          JSON.stringify({
            verified: false,
            error: "Invalid code",
            attemptsRemaining: record.max_attempts - record.attempts - 1,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});