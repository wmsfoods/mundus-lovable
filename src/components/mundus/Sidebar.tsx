import { NavLink } from "react-router-dom";
import { Logo } from "@/components/Logo";

export type SidebarItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  accent?: boolean;
  badge?: number;
  end?: boolean;
};

type SidebarProps = {
  items: SidebarItem[];
  rolePill?: string;
  userName?: string;
  userSubtitle?: string;
};

export function Sidebar({ items, rolePill, userName, userSubtitle }: SidebarProps) {
  const initials = userName
    ? userName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <aside className="sb">
      <div className="sb-logo">
        <Logo />
        {rolePill && <span className="sb-role-pill">{rolePill}</span>}
      </div>
      <nav className="sb-nav">
        {items.map((item) => {
          const I = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sb-item ${isActive ? "is-active" : ""} ${item.accent ? "is-accent" : ""}`.trim()
              }
            >
              <I size={18} />
              <span className="sb-item-label">{item.label}</span>
              {item.badge ? <span className="sb-item-badge">{item.badge}</span> : null}
            </NavLink>
          );
        })}
      </nav>
      {userName && (
        <div className="sb-user">
          <span className="sb-user-av">{initials}</span>
          <div className="sb-user-meta">
            <span className="sb-user-name">{userName}</span>
            {userSubtitle && <span className="sb-user-sub">{userSubtitle}</span>}
          </div>
        </div>
      )}
    </aside>
  );
}