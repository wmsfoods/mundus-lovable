import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  GlobeIcon,
  ChevronDownIcon,
  BellIcon,
  Icon,
} from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function MenuIcon({ size = 22 }: { size?: number }) {
  return (
    <Icon size={size}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </Icon>
  );
}

type TopbarProps = {
  onMenuClick?: () => void;
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  const initials = user?.email
    ? user.email.slice(0, 1).toUpperCase()
    : "A";

  return (
    <div className="tb">
      <button
        type="button"
        className="tb-menu"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <MenuIcon size={22} />
      </button>
      <button className="tb-item" type="button">
        <GlobeIcon size={16} />
        English
        <ChevronDownIcon size={14} />
      </button>
      <div className="tb-divider" />
      <button className="tb-item" type="button">
        kg
        <ChevronDownIcon size={14} />
      </button>
      <button className="tb-bell" type="button" aria-label="Notifications">
        <BellIcon size={18} />
        <span className="dot" />
      </button>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <button
          className="tb-avatar"
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="av">{initials}</span>
          <ChevronDownIcon size={14} />
        </button>
        {menuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 8,
              background: "#fff",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-hover)",
              minWidth: 180,
              padding: 6,
              zIndex: 50,
            }}
          >
            {user?.email && (
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "var(--fs-xs)",
                  color: "var(--fg-muted)",
                  borderBottom: "1px solid hsl(var(--border))",
                  marginBottom: 4,
                  wordBreak: "break-all",
                }}
              >
                {user.email}
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "var(--fs-sm)",
                color: "var(--danger)",
                borderRadius: "var(--radius-sm)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fef0f0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
