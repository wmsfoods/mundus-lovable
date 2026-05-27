import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = Record<string, unknown>;

// Generic list hook
export function useMwList<T = Row>(table: string, opts?: { orderBy?: string; ascending?: boolean }) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = (supabase as unknown as { from: (t: string) => { select: (s: string) => unknown } })
      .from(table)
      .select("*") as { order?: (col: string, opts: { ascending: boolean }) => unknown };
    if (opts?.orderBy && q.order) {
      q = (q.order(opts.orderBy, { ascending: opts.ascending ?? false }) as unknown) as typeof q;
    }
    const { data, error } = (await (q as unknown as Promise<{ data: T[]; error: { message: string } | null }>));
    if (error) setError(error.message); else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [table]); // eslint-disable-line react-hooks/exhaustive-deps

  return { rows, loading, error, reload: load };
}

// ---- Instances ----
export type MwInstance = {
  id: string;
  name: string;
  phone_number: string | null;
  status: string;
  webhook_url: string | null;
  evolution_base_url: string | null;
  evolution_instance_id: string | null;
  evolution_api_key: string | null;
  provider_type: "self_hosted" | "cloud";
  instance_id_external: string | null;
  message_count_30d: number;
  last_connected_at: string | null;
  created_at: string;
};
export const useMwInstances = () => useMwList<MwInstance>("mw_instances", { orderBy: "created_at" });

// ---- Contacts ----
export type MwContact = {
  id: string;
  jid: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  tags: string[];
  last_seen_at: string | null;
};
export const useMwContacts = () => useMwList<MwContact>("mw_contacts", { orderBy: "updated_at" });

// ---- Conversations ----
export type MwConversation = {
  id: string;
  instance_id: string;
  contact_id: string;
  status: string;
  assigned_to: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  sentiment: string | null;
  topic_tags: string[];
};
export const useMwConversations = () => useMwList<MwConversation>("mw_conversations", { orderBy: "last_message_at" });

// ---- Macros ----
export type MwMacro = {
  id: string;
  slug: string;
  title: string;
  body: string;
  scope: string;
};
export const useMwMacros = () => useMwList<MwMacro>("mw_macros", { orderBy: "created_at", ascending: true });

// ---- Tasks ----
export type MwTask = {
  id: string;
  conversation_id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  assigned_to: string | null;
  created_at: string;
};
export const useMwTasks = () => useMwList<MwTask>("mw_conversation_tasks", { orderBy: "due_at", ascending: true });

// ---- Assignment rules ----
export type MwRule = {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
  criteria: Record<string, unknown>;
  target_user_id: string | null;
  strategy: string;
};
export const useMwRules = () => useMwList<MwRule>("mw_assignment_rules", { orderBy: "priority", ascending: true });

// ---- Team ----
export type MwTeamMember = {
  id: string;
  user_id: string;
  display_name: string | null;
  role: string;
  status: string;
};
export const useMwTeam = () => useMwList<MwTeamMember>("mw_team_members", { orderBy: "created_at", ascending: true });