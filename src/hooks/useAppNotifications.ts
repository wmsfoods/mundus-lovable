import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

export type AppNotification = {
  id: string;
  user_id: string;
  company_id: string | null;
  title: string;
  body: string | null;
  icon: string;
  category: string;
  link_url: string | null;
  link_label: string | null;
  related_type: string | null;
  related_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
};

const POLL_MS = 15000;

export function useAppNotifications(opts: { limit?: number } = {}) {
  const limit = opts.limit ?? 20;
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshCount = useCallback(async () => {
    if (!userId) return;
    const { count } = await supabase
      .from("app_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    setUnreadCount(count ?? 0);
  }, [userId]);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("app_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    setNotifications((data ?? []) as AppNotification[]);
    setLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    if (!userId) return;
    refreshCount();
    const t = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(t);
  }, [userId, refreshCount]);

  const onRealtimeChange = useCallback(() => {
    refreshCount();
    loadNotifications();
  }, [refreshCount, loadNotifications]);

  useRealtimeRefresh({
    table: "app_notifications",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onRefresh: onRealtimeChange,
    enabled: !!userId,
  });

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await supabase
        .from("app_notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", id);
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await supabase
      .from("app_notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("read", false);
  }, [userId]);

  return {
    userId,
    unreadCount,
    notifications,
    loading,
    refreshCount,
    loadNotifications,
    markRead,
    markAllRead,
  };
}