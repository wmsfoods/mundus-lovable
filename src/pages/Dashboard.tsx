import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await signOut();
    toast.success(t("common.signedOut"));
    navigate("/login", { replace: true });
  };

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
        <h1 className="text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
        {user?.email && (
          <p className="mt-2 text-muted-foreground text-sm">
            {t("dashboard.signedInAs", { email: user.email })}
          </p>
        )}
      </main>
    </div>
  );
}