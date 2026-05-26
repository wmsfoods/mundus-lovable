import { type ComponentType } from "react";
import "@/styles/mundus-tech-header.css";

export type TechHeaderStat = {
  label: string;
  value: string | number;
  accent?: "primary" | "success" | "warn" | "muted";
};

type Props = {
  icon: ComponentType<{ size?: number }>;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  stats?: TechHeaderStat[];
};

export function MobileTechHeader({ icon: Icon, eyebrow, title, subtitle, stats }: Props) {
  return (
    <header className="mth" role="banner">
      <div className="mth-grid" aria-hidden="true" />
      <div className="mth-glow" aria-hidden="true" />
      <div className="mth-top">
        <span className="mth-icon">
          <Icon size={18} />
        </span>
        <div className="mth-titles">
          {eyebrow && <span className="mth-eyebrow">{eyebrow}</span>}
          <h1 className="mth-title">{title}</h1>
          {subtitle && <p className="mth-sub">{subtitle}</p>}
        </div>
        <span className="mth-live" aria-hidden="true">
          <span className="mth-live-dot" />
          LIVE
        </span>
      </div>
      {stats && stats.length > 0 && (
        <div className="mth-stats">
          {stats.map((s, i) => (
            <div key={i} className={`mth-stat mth-stat--${s.accent ?? "primary"}`}>
              <span className="mth-stat-val">{s.value}</span>
              <span className="mth-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}