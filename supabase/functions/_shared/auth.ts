// Shared auth helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireUser(req: Request): Promise<
  | { ok: true; userId: string; email?: string; token: string }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  // Internal service-to-service: another edge function invoking this one
  // with the service_role key is a legitimate call (only same-project code
  // has access to that key). Skip user lookup.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { ok: true, userId: "service-role-internal", token };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
  }
  return { ok: true, userId: data.user.id, email: data.user.email ?? undefined, token };
}

export async function requireAdmin(req: Request): Promise<
  | { ok: true; userId: string; email?: string; token: string }
  | { ok: false; response: Response }
> {
  const u = await requireUser(req);
  if (!u.ok) return u;
  // Internal service-role bypass already accepted by requireUser
  if (u.userId === "service-role-internal") return u;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${u.token}` } } },
  );
  const { data, error } = await supabase.rpc("is_mundus_admin");
  if (error || data !== true) {
    return { ok: false, response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } }) };
  }
  return u;
}