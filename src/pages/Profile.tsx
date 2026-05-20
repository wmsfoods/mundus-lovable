import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { SUPPORTED_LANGUAGES } from "@/i18n";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { company } = useCurrentCompany();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";
  const displayName = user?.email?.split("@")[0] ?? t("shell.nav.profile", { defaultValue: "Profile" });

  const handleLogout = async () => {
    await signOut();
    toast.success(t("common.signedOut"));
    navigate("/login", { replace: true });
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <span className="profile-avatar">{initials}</span>
        <span className="profile-name">{displayName}</span>
        {user?.email && <span className="profile-sub">{user.email}</span>}
        {company?.name && <span className="profile-sub">{company.name}</span>}
      </div>

      <div className="profile-section">
        <h3>{t("common.language", { defaultValue: "Language" })}</h3>
        <div className="md-lang-row">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => i18n.changeLanguage(l.code)}
              className={`md-lang-btn ${i18n.resolvedLanguage === l.code ? "is-active" : ""}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="profile-spacer" />

      <button type="button" className="profile-logout" onClick={handleLogout}>
        {t("common.signOut")}
      </button>
    </div>
  );
}