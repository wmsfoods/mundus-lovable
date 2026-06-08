import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserFullName(): { fullName: string; firstName: string; avatarUrl: string | null; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setName("");
      setAvatarUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const fallback =
        user.email?.split("@")[0]?.replace(/[._]/g, " ") ?? "";
      const resolved = (data?.name as string | null)?.trim() || fallback;
      setName(resolved);
      setAvatarUrl(((data?.avatar_url as string | null) ?? (user.user_metadata?.avatar_url as string | undefined) ?? null) || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const titled = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const firstName = titled.split(" ")[0] ?? "";
  return { fullName: titled, firstName, avatarUrl, loading };
}