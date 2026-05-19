import { Link } from "react-router-dom";
import { Fragment } from "react";

export type Crumb = { label: string; to?: string };

export function Crumbs({ items }: { items: Crumb[] }) {
  return (
    <div className="crumbs">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          {i === items.length - 1 || !it.to ? (
            <b>{it.label}</b>
          ) : (
            <Link to={it.to}>{it.label}</Link>
          )}
        </Fragment>
      ))}
    </div>
  );
}