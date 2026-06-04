import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, getClientIp } from "../_shared/rateLimit.ts";

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

    const ip = getClientIp(req);
    const rl = await checkRateLimit(supabase, {
      key: `verify-email:ip:${ip}`,
      windowSeconds: 60,
      max: 10,
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

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

    if (action === "lookup") {
      const { data: users } = await supabase.auth.admin.listUsers();
      const found = users?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail,
      );
      return new Response(
        JSON.stringify({ user_id: found?.id ?? null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

      // Send email via Resend
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
      let emailSendError: string | null = null;
      let resendId: string | null = null;
      if (RESEND_API_KEY) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mundus Trade <noreply@mundustrade.com>",
            to: [normalizedEmail],
            subject: "Your Mundus Trade verification code",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <img src="https://app.mundustrade.us/__l5e/assets-v1/1af4d767-6b52-4c67-91bb-59ee4e40da24/mundus-logo-email.png" alt="Mundus Trade" width="180" style="display:inline-block;max-width:180px;height:auto;border:0;outline:none;text-decoration:none;" />
                </div>
                <h1 style="font-size: 24px; font-weight: 700; color: #111; text-align: center; margin: 0 0 8px;">Verify your email</h1>
                <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 32px;">Use the code below to complete your registration on Mundus Trade.</p>
                <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #8B2252; font-family: 'Courier New', monospace;">
                    ${verificationCode}
                  </div>
                </div>
                <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0 0 8px;">This code expires in <strong>10 minutes</strong>.</p>
                <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
                <p style="font-size: 11px; color: #d1d5db; text-align: center; margin: 0;">Mundus Trade · International Meat Trading Platform</p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          const errBody = await emailRes.text();
          console.error("[VERIFY] Resend error:", emailRes.status, errBody);
          emailSendError = `Resend ${emailRes.status}: ${errBody.slice(0, 300)}`;
        } else {
          try {
            const j = await emailRes.json();
            resendId = j?.id ?? j?.data?.id ?? null;
          } catch { /* ignore */ }
          console.log("[VERIFY] Email sent to", normalizedEmail, "resend_id:", resendId);
        }
      } else {
        emailSendError = "RESEND_API_KEY not configured";
        console.warn("[VERIFY] RESEND_API_KEY missing — email not sent");
      }

      if (emailSendError) {
        return new Response(
          JSON.stringify({
            sent: false,
            error: "Could not send verification email. Please try again.",
            _detail: emailSendError,
            ...(RESEND_API_KEY ? {} : { _dev_code: verificationCode }),
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          sent: true,
          message: "Verification code sent",
          resend_id: resendId,
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