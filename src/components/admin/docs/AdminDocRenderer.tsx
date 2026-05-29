import { useEffect, useRef, useState, type ReactNode } from "react";
import { Printer } from "lucide-react";
import "@/styles/mundus-docs.css";

export type Lang = "pt" | "en" | "es" | "zh";

export const ADMIN_LANGS: Array<{ k: Lang; flag: string; label: string }> = [
  { k: "en", flag: "🇺🇸", label: "English" },
  { k: "pt", flag: "🇧🇷", label: "Português" },
  { k: "es", flag: "🇪🇸", label: "Español" },
  { k: "zh", flag: "🇨🇳", label: "中文" },
];

export type Block =
  | { kind: "p"; text: string }
  | { kind: "lede"; text: string }
  | { kind: "callout"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: Array<{ t: string; d?: string }> }
  | { kind: "cards2"; items: Array<{ t: string; d: string }> }
  | { kind: "cards3"; items: Array<{ t: string; d: string }> }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "quote"; text: string }
  | { kind: "h3"; text: string };

export type Section = {
  kicker: string;
  title: string;
  blocks: Block[];
};

export type DocContent = {
  tagline: string;
  hero: string;
  badge: string;
  sections: Section[];
  footer_kicker: string;
  footer_lines: string[];
  signature: string;
  print: string;
};

function RenderBlock({ b }: { b: Block }): ReactNode {
  switch (b.kind) {
    case "p":
      return <p className="mw-doc-body">{b.text}</p>;
    case "lede":
      return <p className="mw-doc-lede">{b.text}</p>;
    case "callout":
      return <p className="mw-doc-callout">{b.text}</p>;
    case "quote":
      return (
        <blockquote style={{
          borderLeft: "3px solid #9B2251", paddingLeft: 16, margin: "16px 0",
          fontStyle: "italic", color: "#4b5563",
        }}>{b.text}</blockquote>
      );
    case "h3":
      return <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: "24px 0 10px" }}>{b.text}</h3>;
    case "ul":
      return (
        <ul style={{ paddingLeft: 20, margin: "10px 0", color: "#374151" }}>
          {b.items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
        </ul>
      );
    case "ol":
      return (
        <ol className="mw-doc-steps">
          {b.items.map((s, i) => (
            <li key={i}>
              <span className="mw-doc-step-n">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="mw-doc-step-t">{s.t}</div>
                {s.d && <div className="mw-doc-step-d">{s.d}</div>}
              </div>
            </li>
          ))}
        </ol>
      );
    case "cards2":
      return (
        <div className="mw-doc-grid-2">
          {b.items.map((c, i) => (
            <div key={i} className="mw-doc-card">
              <div className="mw-doc-card-t">{c.t}</div>
              <div className="mw-doc-card-d">{c.d}</div>
            </div>
          ))}
        </div>
      );
    case "cards3":
      return (
        <div className="mw-doc-grid-3">
          {b.items.map((c, i) => (
            <div key={i} className="mw-doc-card">
              <div className="mw-doc-card-t">{c.t}</div>
              <div className="mw-doc-card-d">{c.d}</div>
            </div>
          ))}
        </div>
      );
    case "table":
      return (
        <table className="mw-doc-table">
          <thead>
            <tr>{b.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {b.rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j}>{j === 0 ? <strong>{cell}</strong> : cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

export function AdminDocView({
  content,
  scrollTarget,
}: {
  content: Record<Lang, DocContent>;
  scrollTarget?: string | null;
}) {
  const [lang, setLang] = useState<Lang>("pt");
  const c = content[lang];
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollTarget || !rootRef.current) return;
    const el = rootRef.current.querySelector<HTMLElement>(`#${CSS.escape(scrollTarget)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.style.transition = "background 1.2s ease";
      el.style.background = "#fdf2f7";
      setTimeout(() => { el.style.background = ""; }, 1400);
    }
  }, [scrollTarget, lang]);
  return (
    <div className="mw-docs-wrap" ref={rootRef}>
      <div className="mw-docs-toolbar no-print">
        <div className="mw-docs-langs">
          {ADMIN_LANGS.map((l) => (
            <button
              key={l.k}
              type="button"
              onClick={() => setLang(l.k)}
              className={`mw-docs-lang ${lang === l.k ? "active" : ""}`}
            >
              <span style={{ fontSize: 14 }}>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
        <button type="button" className="mw-docs-print" onClick={() => window.print()}>
          <Printer size={14} /> {c.print}
        </button>
      </div>

      <article className="mw-doc" lang={lang}>
        <header className="mw-doc-cover">
          <div className="mw-doc-tagline">{c.tagline}</div>
          <h1 className="mw-doc-hero">{c.hero}</h1>
          <div className="mw-doc-badge">{c.badge}</div>
        </header>

        {c.sections.map((s, i) => (
          <section key={i} id={`sec-${i}`} className="mw-doc-section">
            <div className="mw-doc-kicker">{s.kicker}</div>
            <h2 className="mw-doc-h2">{s.title}</h2>
            {s.blocks.map((b, j) => <RenderBlock key={j} b={b} />)}
          </section>
        ))}

        <footer className="mw-doc-footer">
          <div className="mw-doc-kicker">{c.footer_kicker}</div>
          <div className="mw-doc-channels">
            {c.footer_lines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
          <div className="mw-doc-signature">{c.signature}</div>
        </footer>
      </article>
    </div>
  );
}