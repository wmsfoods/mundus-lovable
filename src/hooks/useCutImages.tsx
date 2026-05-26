import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string | null>();

export function useCutImages(names: Array<string | null | undefined>): Record<string, string> {
  const key = Array.from(new Set(names.filter(Boolean) as string[])).sort().join("|");
  const [map, setMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const n of names) {
      if (!n) continue;
      const v = cache.get(n);
      if (v) initial[n] = v;
    }
    return initial;
  });

  useEffect(() => {
    const unique = Array.from(new Set(names.filter(Boolean) as string[]));
    const missing = unique.filter((n) => !cache.has(n));
    if (missing.length === 0) {
      // still hydrate from cache in case names changed
      const next: Record<string, string> = {};
      for (const n of unique) {
        const v = cache.get(n);
        if (v) next[n] = v;
      }
      setMap(next);
      return;
    }
    let cancelled = false;
    supabase
      .from("cuts")
      .select("name, image_url")
      .in("name", missing)
      .then(({ data }) => {
        if (cancelled) return;
        for (const n of missing) cache.set(n, null);
        for (const row of (data ?? []) as Array<{ name: string; image_url: string | null }>) {
          cache.set(row.name, row.image_url ?? null);
        }
        const next: Record<string, string> = {};
        for (const n of unique) {
          const v = cache.get(n);
          if (v) next[n] = v;
        }
        setMap(next);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
}

export function CutThumb({ src, size = 24 }: { src?: string | null; size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 6,
        overflow: "hidden",
        background: "#F3F4F6",
        flexShrink: 0,
        marginRight: 8,
        verticalAlign: "middle",
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>🥩</span>
      )}
    </span>
  );
}