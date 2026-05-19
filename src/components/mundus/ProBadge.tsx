import type { MouseEvent } from "react";

type Props = {
  className?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  title?: string;
};

export function ProBadge({ className = "", onClick, title }: Props) {
  const cls = `pro-badge ${className}`.trim();
  if (onClick) {
    return (
      <button
        type="button"
        className={`${cls} pro-badge--btn`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick(e);
        }}
        title={title}
      >
        PRO
      </button>
    );
  }
  return <span className={cls}>PRO</span>;
}