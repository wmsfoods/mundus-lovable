
-- =====================================================================
-- Mundus Whats — initial schema
-- All tables restricted to mundus_admin via is_mundus_admin()
-- =====================================================================

-- ---------- mw_instances ----------
CREATE TABLE public.mw_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT,
  evolution_instance_id TEXT,
  evolution_base_url TEXT,
  evolution_api_key TEXT,
  webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  last_connected_at TIMESTAMPTZ,
  message_count_30d INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_instances TO authenticated;
GRANT ALL ON public.mw_instances TO service_role;
ALTER TABLE public.mw_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_instances admin all" ON public.mw_instances
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_contacts ----------
CREATE TABLE public.mw_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES public.mw_instances(id) ON DELETE SET NULL,
  jid TEXT NOT NULL,
  phone TEXT,
  name TEXT,
  push_name TEXT,
  avatar_url TEXT,
  is_business BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  owner_user_id UUID,
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (instance_id, jid)
);
CREATE INDEX mw_contacts_phone_idx ON public.mw_contacts (phone);
CREATE INDEX mw_contacts_name_idx ON public.mw_contacts (name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_contacts TO authenticated;
GRANT ALL ON public.mw_contacts TO service_role;
ALTER TABLE public.mw_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_contacts admin all" ON public.mw_contacts
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_conversations ----------
CREATE TABLE public.mw_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.mw_instances(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.mw_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  sentiment TEXT,
  sentiment_confidence NUMERIC,
  topic_tags TEXT[] NOT NULL DEFAULT '{}',
  topic_confidence NUMERIC,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (instance_id, contact_id)
);
CREATE INDEX mw_conv_status_idx ON public.mw_conversations (status, last_message_at DESC);
CREATE INDEX mw_conv_assigned_idx ON public.mw_conversations (assigned_to);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_conversations TO authenticated;
GRANT ALL ON public.mw_conversations TO service_role;
ALTER TABLE public.mw_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_conv admin all" ON public.mw_conversations
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_messages ----------
CREATE TABLE public.mw_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.mw_conversations(id) ON DELETE CASCADE,
  external_id TEXT,
  from_me BOOLEAN NOT NULL DEFAULT false,
  sender_jid TEXT,
  sender_user_id UUID,
  type TEXT NOT NULL DEFAULT 'text',
  body TEXT,
  media_url TEXT,
  media_mime TEXT,
  media_size INTEGER,
  reply_to_id UUID REFERENCES public.mw_messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mw_messages_conv_idx ON public.mw_messages (conversation_id, sent_at DESC);
CREATE INDEX mw_messages_external_idx ON public.mw_messages (external_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_messages TO authenticated;
GRANT ALL ON public.mw_messages TO service_role;
ALTER TABLE public.mw_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_messages admin all" ON public.mw_messages
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_message_edits ----------
CREATE TABLE public.mw_message_edits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.mw_messages(id) ON DELETE CASCADE,
  previous_body TEXT,
  edited_by UUID,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_message_edits TO authenticated;
GRANT ALL ON public.mw_message_edits TO service_role;
ALTER TABLE public.mw_message_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_message_edits admin all" ON public.mw_message_edits
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_message_reactions ----------
CREATE TABLE public.mw_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.mw_messages(id) ON DELETE CASCADE,
  reactor_user_id UUID,
  reactor_jid TEXT,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, reactor_user_id, emoji),
  UNIQUE (message_id, reactor_jid, emoji)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_message_reactions TO authenticated;
GRANT ALL ON public.mw_message_reactions TO service_role;
ALTER TABLE public.mw_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_reactions admin all" ON public.mw_message_reactions
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_macros ----------
CREATE TABLE public.mw_macros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_macros TO authenticated;
GRANT ALL ON public.mw_macros TO service_role;
ALTER TABLE public.mw_macros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_macros admin all" ON public.mw_macros
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_assignment_rules ----------
CREATE TABLE public.mw_assignment_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  criteria JSONB NOT NULL DEFAULT '{}',
  target_user_id UUID,
  strategy TEXT NOT NULL DEFAULT 'direct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_assignment_rules TO authenticated;
GRANT ALL ON public.mw_assignment_rules TO service_role;
ALTER TABLE public.mw_assignment_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_rules admin all" ON public.mw_assignment_rules
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_conversation_notes ----------
CREATE TABLE public.mw_conversation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.mw_conversations(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_conversation_notes TO authenticated;
GRANT ALL ON public.mw_conversation_notes TO service_role;
ALTER TABLE public.mw_conversation_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_notes admin all" ON public.mw_conversation_notes
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_conversation_tasks ----------
CREATE TABLE public.mw_conversation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.mw_conversations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_at TIMESTAMPTZ,
  assigned_to UUID,
  created_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_conversation_tasks TO authenticated;
GRANT ALL ON public.mw_conversation_tasks TO service_role;
ALTER TABLE public.mw_conversation_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_tasks admin all" ON public.mw_conversation_tasks
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_conversation_summaries ----------
CREATE TABLE public.mw_conversation_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.mw_conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  sentiment TEXT,
  model TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_conversation_summaries TO authenticated;
GRANT ALL ON public.mw_conversation_summaries TO service_role;
ALTER TABLE public.mw_conversation_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_summaries admin all" ON public.mw_conversation_summaries
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_conversation_topics ----------
CREATE TABLE public.mw_conversation_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.mw_conversations(id) ON DELETE CASCADE,
  topics TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC,
  analysis TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_conversation_topics TO authenticated;
GRANT ALL ON public.mw_conversation_topics TO service_role;
ALTER TABLE public.mw_conversation_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_topics admin all" ON public.mw_conversation_topics
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_team_members ----------
CREATE TABLE public.mw_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_team_members TO authenticated;
GRANT ALL ON public.mw_team_members TO service_role;
ALTER TABLE public.mw_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_team admin all" ON public.mw_team_members
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- mw_setup_progress ----------
CREATE TABLE public.mw_setup_progress (
  user_id UUID NOT NULL PRIMARY KEY,
  steps JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mw_setup_progress TO authenticated;
GRANT ALL ON public.mw_setup_progress TO service_role;
ALTER TABLE public.mw_setup_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_setup admin all" ON public.mw_setup_progress
  FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- ---------- Trigger to keep updated_at fresh ----------
CREATE TRIGGER mw_instances_set_updated BEFORE UPDATE ON public.mw_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER mw_contacts_set_updated BEFORE UPDATE ON public.mw_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER mw_conv_set_updated BEFORE UPDATE ON public.mw_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER mw_macros_set_updated BEFORE UPDATE ON public.mw_macros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER mw_rules_set_updated BEFORE UPDATE ON public.mw_assignment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER mw_tasks_set_updated BEFORE UPDATE ON public.mw_conversation_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER mw_team_set_updated BEFORE UPDATE ON public.mw_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------- Realtime ----------
ALTER TABLE public.mw_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.mw_messages REPLICA IDENTITY FULL;
ALTER TABLE public.mw_message_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mw_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mw_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mw_message_reactions;

-- ---------- Storage bucket ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('mw-media', 'mw-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "mw-media admin select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'mw-media' AND public.is_mundus_admin());
CREATE POLICY "mw-media admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mw-media' AND public.is_mundus_admin());
CREATE POLICY "mw-media admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'mw-media' AND public.is_mundus_admin());
CREATE POLICY "mw-media admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'mw-media' AND public.is_mundus_admin());
