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