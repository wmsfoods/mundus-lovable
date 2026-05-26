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
    (async () => {
      // 1) Exact match on requested names
      const { data: exactRows } = await supabase
        .from("cuts")
        .select("name, image_url")
        .in("name", missing);
      const exactByLower = new Map<string, string>();
      for (const row of (exactRows ?? []) as Array<{ name: string; image_url: string | null }>) {
        if (row.image_url) exactByLower.set(row.name.toLowerCase(), row.image_url);
      }

      // 2) For anything still missing, do a fuzzy lookup across all cuts that have images
      const stillMissing = missing.filter((n) => !exactByLower.has(n.toLowerCase()));
      let allWithImages: Array<{ name: string; image_url: string }> = [];
      if (stillMissing.length > 0) {
        const { data } = await supabase
          .from("cuts")
          .select("name, image_url")
          .not("image_url", "is", null);
        allWithImages = ((data ?? []) as Array<{ name: string; image_url: string | null }>)
          .filter((r) => !!r.image_url)
          .map((r) => ({ name: r.name, image_url: r.image_url as string }));
      }

      if (cancelled) return;

      const resolve = (n: string): string | null => {
        const lower = n.toLowerCase().trim();
        const exact = exactByLower.get(lower);
        if (exact) return exact;
        // Strip bracketed bone spec like "[Boneless]" and trailing spec in parens
        const cleaned = lower.replace(/\s*\[[^\]]*\]\s*/g, " ").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
        if (cleaned !== lower) {
          const exact2 = exactByLower.get(cleaned);
          if (exact2) return exact2;
        }
        // Substring either direction
        let m = allWithImages.find((d) => d.name.toLowerCase() === cleaned);
        if (!m) {
          m = allWithImages.find((d) => {
            const dn = d.name.toLowerCase();
            return cleaned.includes(dn) || dn.includes(cleaned);
          });
        }
        // Last 2 meaningful words
        if (!m) {
          const words = cleaned.split(/[\s,]+/).filter((w) => w.length > 2);
          const tail = words.slice(-2).join(" ");
          if (tail) m = allWithImages.find((d) => d.name.toLowerCase().includes(tail));
        }
        return m?.image_url ?? null;
      };

      for (const n of missing) {
        cache.set(n, resolve(n));
      }
      const next: Record<string, string> = {};
      for (const n of unique) {
        const v = cache.get(n);
        if (v) next[n] = v;
      }
      setMap(next);
    })();
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