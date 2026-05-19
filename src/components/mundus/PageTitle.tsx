import type { ComponentType, ReactNode } from "react";

type PageTitleProps = {
  icon?: ComponentType<{ size?: number }>;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function PageTitle({ icon: I, title, subtitle, right }: PageTitleProps) {
  return (
    <>
      <div className="page-title">
        {I && (
          <span className="chip">
            <I size={20} />
          </span>
        )}
        <h1>{title}</h1>
        {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
      </div>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </>
  );
}