import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { ShiningButton } from "@/components/ui/shining-button";

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
                className="rounded-md bg-[#B64769] px-6 py-3 text-base font-semibold text-white hover:opacity-90"
              >
                {t("public.home.openApp", "Open app")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-base font-semibold text-[#1A1A2E] hover:text-[#B64769] px-3 py-2">
                  {t("public.home.login", "Login")}
                </Link>
                <ShiningButton
                  onClick={() => (window.location.href = "/signup")}
                  className="!rounded-md px-6 py-3 text-base font-semibold"
                >
                  {t("public.home.signup", "Sign up")}
                </ShiningButton>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}