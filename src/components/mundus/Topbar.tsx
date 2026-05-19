import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  GlobeIcon,
  ChevronDownIcon,
  BellIcon,
} from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { Logo } from "@/components/Logo";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";

export function Topbar() {
  const { user, signOut } = useAuth();
  const { company } = useCurrentCompany();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobileShell();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    toast.success(t("common.signedOut"));
    navigate("/login", { replace: true });
  };

  const initials = user?.email
    ? user.email.slice(0, 1).toUpperCase()
    : "A";

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ??
    SUPPORTED_LANGUAGES[0];

  return (
    <div className={`tb ${isMobile ? "tb-mobile" : ""}`.trim()}>
      {isMobile && (
        <div className="tb-brand">
          <Logo size="sm" />
        </div>
      )}
      {!isMobile && company?.name && (
        <div className="tb-posting-as">
          <span className="dot" aria-hidden="true" />
          <span className="tb-posting-label">{t("shell.postingAs")}</span>
          <span className="tb-posting-name">{company.name}</span>
        </div>
      )}
      {!isMobile && <div className="tb-spacer" />}
      <div ref={langRef} style={{ position: "relative" }}>
        <button
          className="tb-item"
          type="button"
          onClick={() => setLangOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={langOpen}
        >
          <GlobeIcon size={16} />
          {isMobile ? currentLang.code.toUpperCase() : currentLang.label}
          <ChevronDownIcon size={14} />
        </button>
        {langOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 8,
              background: "#fff",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-hover)",
              minWidth: 160,
              padding: 6,
              zIndex: 50,
            }}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  i18n.changeLanguage(l.code);
                  setLangOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  background:
                    l.code === currentLang.code ? "#f5f5f5" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--fs-sm)",
                  color: "var(--fg)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {!isMobile && <div className="tb-divider" />}
      {!isMobile && (
        <button className="tb-item" type="button">
          {t("shell.unit")}
          <ChevronDownIcon size={14} />
        </button>
      )}
      <button className="tb-bell" type="button" aria-label={t("shell.notifications")}>
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
              {t("common.signOut")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
