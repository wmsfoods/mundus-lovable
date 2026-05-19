import { NavLink } from "react-router-dom";
import type { ComponentType } from "react";

export type BottomNavItem = {
  to?: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  accent?: boolean;
  end?: boolean;
  onClick?: () => void;
};

type BottomNavProps = {
  items: BottomNavItem[];
};

export function BottomNav({ items }: BottomNavProps) {
  return (
    <nav className="bn" aria-label="Primary">
      {items.map((item, idx) => {
        const I = item.icon;
        const content = (
          <>
            <span className={`bn-icon ${item.accent ? "is-accent" : ""}`}>
              <I size={22} />
            </span>
            <span className="bn-label">{item.label}</span>
          </>
        );
        if (item.onClick || !item.to) {
          return (
            <button
              key={idx}
              type="button"
              className="bn-item"
              onClick={item.onClick}
              aria-label={item.label}
            >
              {content}
            </button>
          );
        }
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `bn-item ${isActive ? "is-active" : ""}`.trim()
            }
          >
            {content}
          </NavLink>
        );
      })}
    </nav>
  );
}