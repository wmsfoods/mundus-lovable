import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { company, loading: companyLoading, error: companyError } = useCurrentCompany();
  const { isAdmin, loading: adminLoading } = useIsMundusAdmin();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await signOut();
    toast.success(t("common.signedOut"));
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (companyLoading || adminLoading) return;
    if (isAdmin) { navigate("/admin", { replace: true }); return; }
    if (company?.is_supplier) { navigate("/supplier", { replace: true }); return; }
    if (company?.is_buyer) { navigate("/buyer", { replace: true }); return; }
  }, [company, isAdmin, companyLoading, adminLoading, navigate]);

  if (companyLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#B64769] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 border-b bg-white">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="pill" />
          <button
            onClick={handleLogout}
            className="h-10 px-5 rounded-full border border-[#B64769] text-[#B64769] text-sm font-medium hover:bg-[#B64769]/5"
          >
            {t("common.signOut")}
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
          <h1 className="text-2xl font-bold text-foreground" style={{ marginBottom: 8 }}>
            Setting up your account...
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
            Your account is being configured. If this persists, your company profile may still be under review by the Mundus team.
          </p>
          {user?.email && (
            <p className="text-muted-foreground" style={{ fontSize: 13, marginBottom: 24, opacity: 0.7 }}>
              Signed in as {user.email}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "#B64769", color: "white", border: "none", cursor: "pointer" }}
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "white", color: "#6B7280", border: "1px solid #D1D5DB", cursor: "pointer" }}
            >
              {t("common.signOut")}
            </button>
          </div>
          {companyError && (
            <p style={{ fontSize: 11, color: "#DC2626", marginTop: 16, opacity: 0.8 }}>
              {companyError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}