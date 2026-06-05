import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { company, loading: companyLoading, error: companyError } = useCurrentCompany();
  const { isAdmin, loading: adminLoading } = useIsMundusAdmin();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success(t("common.signedOut"));
    navigate("/login", { replace: true });
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      // Try to claim any pending invites for this email; if anything links,
      // a reload will pick up the new company association.
      const { data } = await supabase.rpc("claim_pending_invites");
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.first_company_id) {
        window.location.reload();
        return;
      }
    } catch {
      /* ignore */
    }
    setRetrying(false);
    window.location.reload();
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

  const supportMailto = `mailto:contact@mundustrade.com?subject=${encodeURIComponent(
    t("noAccess.mailSubject"),
  )}&body=${encodeURIComponent(
    t("noAccess.mailBody", { email: user?.email ?? "", uid: user?.id ?? "" }),
  )}`;

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
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
          <h1 className="text-2xl font-bold text-foreground" style={{ marginBottom: 10 }}>
            {t("noAccess.title")}
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
            {t("noAccess.body1")}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            {t("noAccess.body2")}
          </p>
          {user?.email && (
            <p className="text-muted-foreground" style={{ fontSize: 13, marginBottom: 24, opacity: 0.75 }}>
              {t("noAccess.loggedAs")} <strong>{user.email}</strong>
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            <a
              href={supportMailto}
              style={{ padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "#B64769", color: "white", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            >
              {t("noAccess.contact")}
            </a>
            <button
              onClick={handleRetry}
              disabled={retrying}
              style={{ padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "white", color: "#374151", border: "1px solid #D1D5DB", cursor: retrying ? "wait" : "pointer" }}
            >
              {retrying ? t("noAccess.retrying") : t("noAccess.retry")}
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "white", color: "#6B7280", border: "1px solid #D1D5DB", cursor: "pointer" }}
            >
              {t("common.signOut")}
            </button>
          </div>
          {companyError && companyError !== "no_company_linked" && (
            <p style={{ fontSize: 11, color: "#DC2626", marginTop: 16, opacity: 0.8 }}>
              {companyError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}