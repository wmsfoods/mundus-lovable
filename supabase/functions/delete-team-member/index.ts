import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MASTER_ROLES = new Set([
  "master_supplier",
  "master_buyer",
  "supplier_global_director",
  "buyer_global_director",
]);

// Tables to scan for "any activity" by user_id. Each tuple = [table, column].
const ACTIVITY_CHECKS: Array<[string, string]> = [
  ["offers", "created_by"],
  ["offers", "supplier_user_id"],
  ["negotiations", "created_by"],
  ["negotiations", "buyer_user_id"],
  ["negotiations", "supplier_user_id"],
  ["negotiation_messages", "sender_user_id"],
  ["orders", "buyer_user_id"],
  ["orders", "supplier_user_id"],
  ["buyer_requests", "created_by"],
  ["auction_bids", "user_id"],
  ["counter_proposals", "created_by"],
  ["round_proposals", "created_by"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: auth } = await userClient.auth.getUser();
    const caller = auth?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const memberId: string | undefined = body?.member_id;
    if (!memberId) {
      return new Response(JSON.stringify({ error: "member_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load target membership
    const { data: member, error: mErr } = await admin
      .from("company_users")
      .select("id, company_id, user_id, email, role, status")
      .eq("id", memberId)
      .maybeSingle();
    if (mErr || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a Master Admin of the same company
    const { data: callerRow } = await admin
      .from("company_users")
      .select("role, status")
      .eq("company_id", member.company_id)
      .eq("user_id", caller.id)
      .eq("status", "active")
      .maybeSingle();
    if (!callerRow || !MASTER_ROLES.has(callerRow.role as string)) {
      return new Response(JSON.stringify({ error: "Only Master Admins can delete users" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (member.user_id && member.user_id === caller.id) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Activity check (only if linked to an auth user)
    if (member.user_id) {
      for (const [table, col] of ACTIVITY_CHECKS) {
        const { count, error } = await admin
          .from(table)
          .select("id", { head: true, count: "exact" })
          .eq(col, member.user_id)
          .limit(1);
        if (error) continue; // tolerate missing columns/tables
        if ((count ?? 0) > 0) {
          return new Response(JSON.stringify({
            error: "HAS_ACTIVITY",
            message: `User has activity in ${table}. Deactivate instead of deleting.`,
          }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    const targetUserId = member.user_id as string | null;

    // 1) Delete the company_users row
    const { error: delMemErr } = await admin
      .from("company_users").delete().eq("id", member.id);
    if (delMemErr) {
      return new Response(JSON.stringify({ error: delMemErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) If user is linked, check for other memberships
    if (targetUserId) {
      const { count: otherCount } = await admin
        .from("company_users")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", targetUserId);
      if ((otherCount ?? 0) === 0) {
        // Delete public.users row
        await admin.from("users").delete().eq("id", targetUserId);
        // Delete auth.users row
        await admin.auth.admin.deleteUser(targetUserId);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});