import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { getActiveRole, setActiveRole, type ActiveRole } from "@/lib/activeRole";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { company } = useCurrentCompany();
  const { isAdmin } = useIsMundusAdmin();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const availableRoles: ActiveRole[] = [
    ...(company?.is_buyer ? (["buyer"] as ActiveRole[]) : []),
    ...(company?.is_supplier ? (["supplier"] as ActiveRole[]) : []),
    ...(isAdmin ? (["admin"] as ActiveRole[]) : []),
  ];
  const showSwitch = availableRoles.length >= 2;
  const inferredRole: ActiveRole = location.pathname.startsWith("/supplier")
    ? "supplier"
    : location.pathname.startsWith("/admin")
    ? "admin"
    : "buyer";
  const saved = getActiveRole();
  const currentRole: ActiveRole =
    saved && availableRoles.includes(saved) ? saved : inferredRole;

  const handleRoleChange = (role: ActiveRole) => {
    if (role === currentRole) return;
    setActiveRole(role);
    navigate(`/${role}`, { replace: true });
  };

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

      {showSwitch && (
        <div className="profile-section">
          <h3>{t("profile.activeRole", { defaultValue: "Active profile" })}</h3>
          <div className="role-switch">
            {availableRoles.map((role) => (
              <button
                key={role}
                type="button"
                className={`role-switch-btn ${currentRole === role ? "is-active" : ""}`}
                onClick={() => handleRoleChange(role)}
                aria-pressed={currentRole === role}
              >
                {t(`profile.${role}`, {
                  defaultValue: role.charAt(0).toUpperCase() + role.slice(1),
                })}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="profile-spacer" />

      <button type="button" className="profile-logout" onClick={handleLogout}>
        {t("common.signOut")}
      </button>
    </div>
  );
}