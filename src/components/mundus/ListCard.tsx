import type { ReactNode } from "react";

export type ListCardMeta = {
  label: ReactNode;
  value: ReactNode;
};

export type ListCardChip = {
  label: ReactNode;
  className?: string;
};

export type ListCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  chip?: ListCardChip;
  meta?: ListCardMeta[];
  cta?: ReactNode;
  onClick?: () => void;
};

export function ListCard({ title, subtitle, chip, meta, cta, onClick }: ListCardProps) {
  const interactive = Boolean(onClick);
  return (
    <article
      className={`lc ${interactive ? "is-interactive" : ""}`.trim()}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="lc-head">
        <div className="lc-title-wrap">
          <div className="lc-title">{title}</div>
          {subtitle && <div className="lc-subtitle">{subtitle}</div>}
        </div>
        {chip && <span className={`lc-chip ${chip.className ?? ""}`.trim()}>{chip.label}</span>}
      </div>
      {meta && meta.length > 0 && (
        <dl className="lc-meta">
          {meta.map((m, i) => (
            <div key={i} className="lc-meta-item">
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {cta && <div className="lc-cta">{cta}</div>}
    </article>
  );
}

export function ListCardList({ children }: { children: ReactNode }) {
  return <div className="lc-list">{children}</div>;
}