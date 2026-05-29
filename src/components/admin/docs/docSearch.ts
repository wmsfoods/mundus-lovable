import type { DocContent, Block } from "./AdminDocRenderer";

export type DocSearchHit = {
  docKey: string;
  docLabel: string;
  sectionIndex: number;
  sectionId: string;
  kicker: string;
  title: string;
  snippet: string;
};

export type DocRegistryEntry = {
  key: string;
  label: string;
  content: DocContent;
};

function blockText(b: Block): string {
  switch (b.kind) {
    case "p":
    case "lede":
    case "callout":
    case "quote":
    case "h3":
      return b.text;
    case "ul":
      return b.items.join(" · ");
    case "ol":
      return b.items.map((i) => `${i.t} ${i.d ?? ""}`).join(" · ");
    case "cards2":
    case "cards3":
      return b.items.map((i) => `${i.t} ${i.d}`).join(" · ");
    case "table":
      return [b.head.join(" "), ...b.rows.map((r) => r.join(" "))].join(" · ");
    default:
      return "";
  }
}

function makeSnippet(haystack: string, q: string, max = 160): string {
  const lower = haystack.toLowerCase();
  const i = lower.indexOf(q.toLowerCase());
  if (i < 0) return haystack.slice(0, max) + (haystack.length > max ? "…" : "");
  const start = Math.max(0, i - 40);
  const end = Math.min(haystack.length, i + q.length + 80);
  return (start > 0 ? "…" : "") + haystack.slice(start, end) + (end < haystack.length ? "…" : "");
}

export function searchDocs(query: string, registry: DocRegistryEntry[]): DocSearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits: DocSearchHit[] = [];
  for (const entry of registry) {
    entry.content.sections.forEach((s, idx) => {
      const haystack = [s.kicker, s.title, ...s.blocks.map(blockText)].join(" \n ");
      const lower = haystack.toLowerCase();
      if (terms.every((t) => lower.includes(t))) {
        hits.push({
          docKey: entry.key,
          docLabel: entry.label,
          sectionIndex: idx,
          sectionId: `sec-${idx}`,
          kicker: s.kicker,
          title: s.title,
          snippet: makeSnippet(haystack, terms[0]),
        });
      }
    });
  }
  return hits.slice(0, 30);
}