import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-[#1A1A2E]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/home" className="flex items-center" aria-label="Mundus Trade">
            <Logo size={36} />
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/"
                className="rounded-md bg-[#B64769] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                {t("public.home.openApp", "Open app")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-[#1A1A2E] hover:text-[#B64769]">
                  {t("public.home.login", "Login")}
                </Link>
                <Link
                  to="/signup"
                  className="rounded-md bg-[#B64769] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  {t("public.home.signup", "Sign up")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}